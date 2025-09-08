const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Connection = require('../models/Connection');
const { encryptDatabasePassword } = require('../utils/encryption');
const DatabaseService = require('../services/databaseService');
const { logger } = require('../middleware/logger');
const { errorResponses } = require('../utils/errorHandler');
const {
  verifyResourceOwnership,
  verifyServiceAccess,
} = require('../middleware/resourceAuthorization');
const { validate } = require('../middleware/validation');
const validationRules = require('../middleware/validationRules');
const { servicesCache } = require('../utils/cache');

// Authentication is handled at app level in server.js (persistentAuth)

const createService = async serviceData => {
  const connection = await Connection.findById(serviceData.connectionId);
  if (!connection) {
    throw new Error('Connection not found');
  }

  // Create new service
  const service = new Service({
    name: serviceData.name,
    label: serviceData.label,
    description: serviceData.description,
    host: connection.host,
    port: connection.port,
    database: serviceData.database,
    username: connection.username,
    password: connection.password,
    connectionId: connection._id,
    createdBy: serviceData.createdBy,
  });

  await service.save();
  return service;
};

// Helper to create SQL Server connection pool with enhanced error handling
async function createSQLConnection(service) {
  try {
    const connection = await DatabaseService.createConnection(service);
    return connection;
  } catch (error) {
    logger.error('SQL connection error', {
      error: error.message,
      database: service.database,
      host: service.host,
    });
    throw error;
  }
}

const testServiceConnection = async service => {
  try {
    const connection = await createSQLConnection(service);
    await connection.request().query('SELECT 1 as test');
    await connection.close();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Create new service
router.post('/', validate(validationRules.service.create), async (req, res) => {
  try {
    logger.info('Creating service with data:', {
      name: req.body.name,
      database: req.body.database,
      connectionId: req.body.connectionId,
      userId: req.user?.userId,
    });

    const serviceData = {
      ...req.body,
      createdBy: req.user.userId,
    };

    const service = await createService(serviceData);

    // Clear services cache
    servicesCache.clear();

    logger.info('Service created successfully:', {
      serviceId: service._id,
      name: service.name,
      userId: req.user?.userId,
    });

    res.status(201).json(service);
  } catch (error) {
    logger.error('Service creation error:', {
      error: error.message,
      body: req.body,
      userId: req.user?.userId,
    });
    errorResponses.serverError(res, error);
  }
});

// Test a service connection
router.post('/test', async (req, res) => {
  try {
    const { database, connectionId, ...connectionData } = req.body;

    let serviceToTest;

    if (connectionId) {
      // Test with existing connection
      const connection = await Connection.findById(connectionId);
      if (!connection) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Connection not found' } });
      }

      serviceToTest = {
        host: connection.host,
        port: connection.port,
        database: database || connection.database,
        username: connection.username,
        password: connection.password,
      };
    } else {
      // Test with provided connection data
      serviceToTest = connectionData;
    }

    const result = await testServiceConnection(serviceToTest);

    if (result.success) {
      res.json({ message: 'Connection successful' });
    } else {
      res.status(400).json({
        error: {
          code: 'CONNECTION_FAILED',
          message: result.error,
        },
      });
    }
  } catch (error) {
    logger.error('Connection test error:', error);
    errorResponses.serverError(res, error);
  }
});

// Refresh service schema and clear cache
router.post('/:serviceId/refresh-schema', verifyServiceAccess(), async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    }

    // Resolve connection details if service uses connectionId
    let serviceWithConnection = service;
    if (service.connectionId && (!service.host || !service.username)) {
      const connection = await Connection.findById(service.connectionId);
      if (!connection) {
        return res.status(500).json({
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'Connection referenced by service not found',
          },
        });
      }

      // Create a service object with connection details
      serviceWithConnection = {
        ...service.toObject(),
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password,
      };
    }

    // Clear cache
    try {
      DatabaseService.clearObjectsCache(service._id.toString());
      servicesCache.clear();
    } catch (cacheError) {
      logger.error('Cache clear error:', cacheError);
    }

    const objects = await DatabaseService.getDatabaseObjects(serviceWithConnection);

    // Transform objects to the expected format and save to service
    const transformedObjects = objects.map(obj => ({
      name: obj.name,
      schema: obj.schema_name,
      type: obj.object_category,
      path: `/${
        obj.object_category.toLowerCase() === 'table'
          ? 'table'
          : obj.object_category.toLowerCase() === 'view'
            ? 'view'
            : 'proc'
      }/${obj.name}`,
    }));

    // Update service with the new objects
    service.objects = transformedObjects;
    await service.save();

    const result = {
      serviceName: service.name,
      totalObjects: objects.length,
      tables: objects.filter(obj => obj.object_category === 'TABLE'),
      views: objects.filter(obj => obj.object_category === 'VIEW'),
      procedures: objects.filter(obj => obj.object_category === 'PROCEDURE'),
    };

    logger.info(
      `Schema refreshed successfully for service: ${service.name}, ${objects.length} objects`
    );
    res.json(result);
  } catch (error) {
    logger.error('Schema refresh error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to refresh schema',
        details: error.message,
      },
    });
  }
});

router.get('/:serviceId/objects', verifyServiceAccess(), async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    }

    // Return cached objects from the service document, not live database query
    const objects = service.objects || [];
    res.json(objects);
  } catch (error) {
    logger.error('Error fetching objects:', error);
    errorResponses.serverError(res, error);
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = `services_${userId}`;

    // Try to get from cache first
    let services = servicesCache.get(cacheKey);

    if (!services) {
      // Admin users can see all services, others only see their own
      const query = req.user.isAdmin ? {} : { createdBy: userId };
      services = await Service.find(query)
        .select('-password -username -objects') // Exclude sensitive fields AND objects array
        .lean() // Use lean() for better performance
        .sort({ name: 1 }); // Sort by name for consistent ordering

      // Add objects count to each service for display purposes (efficiently)
      const servicesWithCount = services.map(service => ({
        ...service,
        objectsCount: 0, // We'll update this only when needed, not in list view
      }));

      // Cache the results
      servicesCache.set(cacheKey, servicesWithCount);
      services = servicesWithCount;
    }

    res.json(services);
  } catch (error) {
    logger.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get a single service by ID
router.get('/:id', verifyResourceOwnership(Service), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).select('-password');
    if (!service) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    }
    res.json(service);
  } catch (error) {
    logger.error('Error fetching service:', error);
    errorResponses.serverError(res, error);
  }
});

// Update service
router.put(
  '/:id',
  validate(validationRules.service.update),
  verifyResourceOwnership(Service),
  async (req, res) => {
    try {
      const existingService = await Service.findById(req.params.id);
      if (!existingService) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
      }

      const updateData = { ...req.body };

      // Handle password separately if provided
      if (updateData.password) {
        if (!updateData.password.includes(':')) {
          try {
            updateData.password = encryptDatabasePassword(updateData.password);
          } catch (encryptError) {
            logger.error('Failed to encrypt password for service:', req.params.id);
            return res
              .status(500)
              .json({ message: 'Failed to encrypt password: ' + encryptError.message });
          }
        }
      } else {
        delete updateData.password;
      }

      const service = await Service.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true }
      ).select('-password');

      // Clear cache
      servicesCache.clear();
      DatabaseService.clearObjectsCache(req.params.id);

      res.json(service);
    } catch (error) {
      logger.error('Error updating service:', { error: error.message });
      errorResponses.serverError(res, error);
    }
  }
);

// Delete service
router.delete('/:id', verifyResourceOwnership(Service), async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    }

    // Clear cache
    servicesCache.clear();
    DatabaseService.clearObjectsCache(req.params.id);

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    logger.error('Error deleting service:', error);
    errorResponses.serverError(res, error);
  }
});

module.exports = router;
