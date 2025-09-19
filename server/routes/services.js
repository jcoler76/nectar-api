/**
 * Services Routes - GraphQL Integration
 * Converted from MongoDB to GraphQL-based operations
 */

const express = require('express');
const router = express.Router();
const { SERVICE_QUERIES } = require('../utils/graphqlQueries');
const {
  createListHandler,
  createGetHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler,
  executeGraphQLMutation,
  executeGraphQLQuery,
  createGraphQLContext,
  handleGraphQLError,
} = require('../utils/routeHelpers');
const { logger } = require('../utils/logger');
const { validate } = require('../middleware/validation');
const validationRules = require('../middleware/validationRules');
const { checkFreemiumLimits } = require('../middleware/freemiumLimits');

// Get all services using GraphQL
router.get('/', createListHandler(SERVICE_QUERIES.GET_ALL, 'services'));

// Get single service by ID using GraphQL
router.get('/:id', createGetHandler(SERVICE_QUERIES.GET_BY_ID, 'service'));

// Create new service using GraphQL
router.post(
  '/',
  checkFreemiumLimits('services'),
  validate(validationRules.service.create),
  async (req, res) => {
    const {
      name,
      label,
      description,
      host,
      port,
      database,
      username,
      password,
      connectionId,
      isActive,
    } = req.body;
    const context = createGraphQLContext(req);

    const result = await executeGraphQLMutation(
      res,
      SERVICE_QUERIES.CREATE,
      {
        input: {
          name,
          label,
          description,
          host,
          port,
          database,
          username,
          password,
          connectionId,
          isActive,
        },
      },
      context,
      'create service'
    );

    if (!result) return; // Error already handled

    res.status(201).json(result.createService);
  }
);

// Update service using GraphQL
router.put('/:id', validate(validationRules.service.update), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    label,
    description,
    host,
    port,
    database,
    username,
    password,
    connectionId,
    isActive,
  } = req.body;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    SERVICE_QUERIES.UPDATE,
    {
      id,
      input: {
        name,
        label,
        description,
        host,
        port,
        database,
        username,
        password,
        connectionId,
        isActive,
      },
    },
    context,
    'update service'
  );

  if (!result) return; // Error already handled

  res.json(result.updateService);
});

// Delete service using GraphQL
router.delete('/:id', createDeleteHandler(SERVICE_QUERIES.DELETE, 'deleteService'));

// Test service connection using GraphQL
router.post('/:id/test', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    SERVICE_QUERIES.TEST_CONNECTION,
    { id },
    context,
    'test service connection'
  );

  if (!result) return; // Error already handled

  res.json(result.testService);
});

// Refresh service schema
router.post('/:id/refresh-schema', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  try {
    // BYPASS GraphQL and use direct Prisma query due to resolver issues
    const { PrismaClient } = require('../prisma/generated/client');
    const prisma = new PrismaClient();

    const service = await prisma.service.findFirst({
      where: {
        id,
        organizationId: context.user.organizationId,
      },
      include: {
        connection: {
          select: {
            id: true,
            name: true,
            type: true,
            host: true,
            port: true,
            username: true,
            passwordEncrypted: true,
            sslEnabled: true,
          },
        },
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // DEBUG: Log the direct Prisma response
    console.log('Direct Prisma service response:', {
      serviceId: service.id,
      connectionId: service.connectionId,
      hasConnection: !!service.connection,
      connectionPasswordEncrypted: service.connection?.passwordEncrypted,
      connectionPasswordLength: service.connection?.passwordEncrypted?.length,
      connectionPasswordType: typeof service.connection?.passwordEncrypted,
    });

    if (!service.connection) {
      return res.status(400).json({
        success: false,
        message: 'Service must have a connection to refresh schema',
      });
    }

    // Use the DatabaseService to get database objects
    const DatabaseService = require('../services/database/DatabaseService');
    const { decryptDatabasePassword } = require('../utils/encryption');

    // Decrypt the connection password
    let decryptedPassword = '';
    if (service.connection.passwordEncrypted) {
      try {
        decryptedPassword = decryptDatabasePassword(service.connection.passwordEncrypted);
      } catch (decryptError) {
        logger.error('Password decryption failed', {
          serviceId: service.id,
          connectionId: service.connection.id,
          error: decryptError.message,
        });

        // Provide helpful error message for encryption key mismatch
        if (decryptError.message.includes('bad decrypt')) {
          return res.status(422).json({
            success: false,
            message:
              'Connection password cannot be decrypted. This may occur if the encryption key has changed. Please update the connection with the correct password.',
            errorCode: 'DECRYPTION_FAILED',
            connectionId: service.connection.id,
            suggestedAction: 'UPDATE_CONNECTION_PASSWORD',
          });
        }

        return res.status(500).json({
          success: false,
          message: 'Failed to decrypt connection password',
        });
      }
    } else {
      logger.warn('Connection has no password set', {
        serviceId: service.id,
        connectionId: service.connection.id,
      });
    }

    const connectionConfig = {
      type: service.connection.type,
      host: service.connection.host,
      port: service.connection.port,
      username: service.connection.username,
      password: decryptedPassword,
      database: service.database,
      sslEnabled: service.connection.sslEnabled,
    };

    // Debug logging
    logger.info('Attempting database connection for schema refresh', {
      serviceId: service.id,
      connectionId: service.connection.id,
      host: connectionConfig.host,
      port: connectionConfig.port,
      username: connectionConfig.username,
      database: connectionConfig.database,
      hasPassword: !!connectionConfig.password,
      passwordLength: connectionConfig.password?.length,
      actualPassword: connectionConfig.password, // TEMP: Show actual password for debugging
    });

    const objects = await DatabaseService.getDatabaseObjects(connectionConfig, service.database);

    logger.info('Schema objects retrieved', {
      serviceId: service.id,
      database: service.database,
      totalObjects: objects.length,
      sampleObjects: objects.slice(0, 3).map(obj => ({ name: obj.name, type: obj.type_desc })),
    });

    // Store objects in databaseObject table
    try {
      // Clear existing database objects for this service
      await prisma.databaseObject.deleteMany({
        where: {
          serviceId: service.id,
          organizationId: context.user.organizationId,
        },
      });

      // Create new database object records
      const databaseObjectsToCreate = objects.map(obj => ({
        serviceId: service.id,
        organizationId: context.user.organizationId,
        name: obj.name,
        schema: obj.schema_name || null,
        type: obj.type_desc || 'TABLE',
        metadata: {
          objectId: obj.object_id,
          parentObjectId: obj.parent_object_id,
          schemaId: obj.schema_id,
          createDate: obj.create_date,
          modifyDate: obj.modify_date,
          isPublished: obj.is_published,
          isSchemaPublished: obj.is_schema_published,
        },
      }));

      if (databaseObjectsToCreate.length > 0) {
        await prisma.databaseObject.createMany({
          data: databaseObjectsToCreate,
        });
      }

      logger.info('Database objects stored in databaseObject table', {
        serviceId: service.id,
        objectsStored: databaseObjectsToCreate.length,
      });
    } catch (dbObjectError) {
      logger.error('Failed to store database objects', {
        serviceId: service.id,
        error: dbObjectError.message,
      });
      // Continue execution even if this fails
    }

    // Also update the service with the retrieved objects for backward compatibility
    const updateResult = await executeGraphQLMutation(
      null, // Don't send response yet
      SERVICE_QUERIES.UPDATE,
      {
        id,
        input: { objects: JSON.stringify(objects) },
      },
      context,
      'update service objects'
    );

    if (!updateResult) {
      logger.warn(
        'Failed to update service objects field, but databaseObject records were created',
        {
          serviceId: service.id,
        }
      );
    }

    // Return schema refresh results
    const tables = objects.filter(obj => obj.type_desc === 'USER_TABLE');
    const views = objects.filter(obj => obj.type_desc === 'VIEW');
    const procedures = objects.filter(obj => obj.type_desc === 'SQL_STORED_PROCEDURE');

    logger.info('Sending refresh-schema response', {
      serviceId: service.id,
      totalObjects: objects.length,
      tablesCount: tables.length,
      viewsCount: views.length,
      proceduresCount: procedures.length,
    });

    res.json({
      success: true,
      serviceName: service.name,
      totalObjects: objects.length,
      tables: tables,
      views: views,
      procedures: procedures,
      message: `Schema refreshed: ${objects.length} objects found`,
    });
  } catch (error) {
    logger.error('Service schema refresh error', { error: error.message, serviceId: id });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to refresh service schema',
    });
  }
});

// Get service health status
router.get('/:id/health', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  try {
    // First get the service details
    const serviceResult = await executeGraphQLQuery(
      res,
      SERVICE_QUERIES.GET_BY_ID,
      { id },
      context,
      'service health check'
    );

    if (!serviceResult) return; // Error already handled

    // Then test the connection
    const testResult = await executeGraphQLMutation(
      null, // Don't send response yet
      SERVICE_QUERIES.TEST_CONNECTION,
      { id },
      context,
      'test service connection for health'
    );

    const service = serviceResult.service;
    const connectionTest = testResult?.testService || {
      success: false,
      error: 'Connection test failed',
    };

    res.json({
      id: service.id,
      name: service.name,
      database: service.database,
      host: service.effectiveHost || service.host,
      port: service.port,
      isActive: service.isActive,
      isHealthy: service.isActive && connectionTest.success,
      connectionTest: {
        success: connectionTest.success,
        message: connectionTest.message,
        error: connectionTest.error,
      },
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    handleGraphQLError(res, error, 'service health check');
  }
});

// Get service database objects
router.get('/:id/objects', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  try {
    const result = await executeGraphQLQuery(
      res,
      SERVICE_QUERIES.GET_BY_ID,
      { id },
      context,
      'get service objects'
    );

    if (!result) return; // Error already handled

    const service = result.service;

    // Parse objects from stored JSON
    let objects = [];
    if (service.objects) {
      try {
        objects = JSON.parse(service.objects);
      } catch (parseError) {
        logger.warn('Failed to parse service objects JSON', {
          serviceId: service.id,
          error: parseError.message,
        });
      }
    }

    res.json(objects);
  } catch (error) {
    handleGraphQLError(res, error, 'get service objects');
  }
});

// Get service schemas/database objects
router.get('/:id/schemas', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  try {
    const result = await executeGraphQLQuery(
      res,
      SERVICE_QUERIES.GET_BY_ID,
      { id },
      context,
      'get service schemas'
    );

    if (!result) return; // Error already handled

    const service = result.service;

    // For now, return basic schema info - this could be enhanced
    // to fetch actual database schemas via the service connection
    res.json({
      serviceId: service.id,
      serviceName: service.name,
      database: service.database,
      host: service.effectiveHost || service.host,
      schemas: [], // TODO: Implement actual schema fetching
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    handleGraphQLError(res, error, 'get service schemas');
  }
});

// Batch operations for services
router.post('/batch', async (req, res) => {
  const { operation, ids } = req.body;
  const context = createGraphQLContext(req);

  if (!['activate', 'deactivate', 'delete', 'test'].includes(operation)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid batch operation. Allowed: activate, deactivate, delete, test',
    });
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'IDs array is required for batch operations',
    });
  }

  const results = [];
  const errors = [];

  for (const id of ids) {
    try {
      let result;

      switch (operation) {
        case 'activate':
        case 'deactivate':
          result = await executeGraphQLMutation(
            null, // Don't send response yet
            SERVICE_QUERIES.UPDATE,
            {
              id,
              input: { isActive: operation === 'activate' },
            },
            context,
            `batch ${operation}`
          );
          results.push({ id, success: true, data: result?.updateService });
          break;

        case 'delete':
          result = await executeGraphQLMutation(
            null, // Don't send response yet
            SERVICE_QUERIES.DELETE,
            { id },
            context,
            'batch delete'
          );
          results.push({ id, success: result?.deleteService || false });
          break;

        case 'test':
          result = await executeGraphQLMutation(
            null, // Don't send response yet
            SERVICE_QUERIES.TEST_CONNECTION,
            { id },
            context,
            'batch test'
          );
          results.push({
            id,
            success: result?.testService?.success || false,
            connectionResult: result?.testService,
          });
          break;
      }
    } catch (error) {
      errors.push({ id, error: error.message });
    }
  }

  res.json({
    success: errors.length === 0,
    operation,
    processed: ids.length,
    successful: results.filter(r => r.success).length,
    failed: errors.length,
    results,
    errors,
  });
});

module.exports = router;
