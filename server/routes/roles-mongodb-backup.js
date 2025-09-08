const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
// Auth middleware not needed - handled at app level
const { fetchDatabaseObjects, updateDatabaseObjects } = require('../utils/schemaUtils');
const { logger } = require('../middleware/logger');
const Service = require('../models/Service');
const { asyncHandler, errorResponses } = require('../utils/errorHandler');
const {
  verifyResourceOwnership,
  verifyServiceAccess,
} = require('../middleware/resourceAuthorization');
const { validate } = require('../middleware/validation');
const validationRules = require('../middleware/validationRules');
const { cacheStaticResponse, noCache } = require('../middleware/httpCache');

// Apply auth middleware to all routes
// Authentication is already handled at app level in server.js

// Get all roles (cached for 5 minutes since roles don't change frequently)
router.get('/', cacheStaticResponse(300), async (req, res) => {
  try {
    const roles = await Role.find().populate('createdBy', 'firstName lastName');
    res.json(roles);
  } catch (error) {
    logger.error('Error fetching roles:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Get a single role by ID
router.get('/:id', verifyResourceOwnership(Role), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }
    res.json(role);
  } catch (error) {
    errorResponses.serverError(res, error);
  }
});

// Create new role
router.post('/', validate(validationRules.role.create), async (req, res) => {
  try {
    logger.info('Creating role with data:', req.body);

    const role = new Role({
      ...req.body,
      createdBy: req.user.userId,
    });

    // Validate service exists
    const service = await Service.findById(role.serviceId);
    if (!service) {
      logger.error('Service not found:', { serviceId: role.serviceId });
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    }

    // Validate permissions
    if (!role.permissions || !Array.isArray(role.permissions)) {
      logger.error('Invalid permissions format:', { permissions: role.permissions });
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: 'Invalid permissions format' } });
    }

    // Log validation before save
    logger.info('Role before save:', {
      name: role.name,
      serviceId: role.serviceId,
      permissionCount: role.permissions.length,
    });

    await role.save();
    logger.info('Role saved successfully:', { roleId: role._id, name: role.name });

    res.status(201).json(role);
  } catch (error) {
    logger.error('Error creating role:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Update role
router.put(
  '/:id',
  validate(validationRules.role.update),
  verifyResourceOwnership(Role),
  async (req, res) => {
    try {
      logger.info('Updating role with data:', req.body);
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
      }

      // Update the role fields
      role.name = req.body.name;
      role.description = req.body.description;
      role.serviceId = req.body.serviceId;
      role.permissions = req.body.permissions;
      role.isActive = req.body.isActive;

      // Update permissions to remove dbo prefix
      if (role.permissions) {
        role.permissions = role.permissions.map(perm => {
          if (perm.objectName && perm.objectName.startsWith('/proc/dbo.')) {
            perm.objectName = perm.objectName.replace('/proc/dbo.', '/proc/');
          }
          return perm;
        });
      }

      await role.save();
      logger.info('Role updated successfully:', { roleId: role._id, name: role.name });
      res.json(role);
    } catch (error) {
      logger.error('Role update error:', { error: error.message });
      errorResponses.serverError(res, error);
    }
  }
);

// Delete role
router.delete('/:id', verifyResourceOwnership(Role), async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    errorResponses.serverError(res, error);
  }
});

// Refresh service schema
router.post('/:id/refresh-schema', verifyServiceAccess(), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    }

    const { decryptDatabasePassword } = require('../utils/encryption');

    const config = {
      server: service.host,
      port: service.port,
      database: service.database,
      user: service.username,
      password: decryptDatabasePassword(service.password),
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    };

    const objects = await fetchDatabaseObjects(config);
    const result = await updateDatabaseObjects(service._id, objects);

    res.json({
      message: 'Service schema refreshed successfully',
      totalObjects: result.totalObjects,
      tables: result.tables.length,
      views: result.views.length,
      procedures: result.procedures.length,
    });
  } catch (error) {
    errorResponses.serverError(res, error);
  }
});

// Get service schema
router.get('/service/:id/schema', verifyServiceAccess(), async (req, res) => {
  try {
    logger.info('Fetching database objects for service:', req.params.id);

    // Get the service with its objects
    const service = await Service.findById(req.params.id).lean();

    if (!service) {
      logger.info('Service not found');
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    }

    if (!service.objects || service.objects.length === 0) {
      logger.info('No objects found for service');
      return res.json({ tables: [], views: [], procedures: [] });
    }

    logger.info(`Found ${service.objects.length} objects`);

    // Transform the objects array into the expected schema format
    const schema = {
      tables: service.objects
        .filter(obj => obj.path && obj.path.startsWith('/table/'))
        .map(t => ({
          name: t.path.split('/').pop(),
          path: t.path,
        })),
      views: service.objects
        .filter(obj => obj.path && obj.path.startsWith('/view/'))
        .map(v => ({
          name: v.path.split('/').pop(),
          path: v.path,
        })),
      procedures: service.objects
        .filter(obj => obj.path && obj.path.startsWith('/proc/'))
        .map(p => ({
          name: p.path.split('/').pop(),
          path: p.path,
        })),
    };

    logger.info('Schema object counts:', {
      tables: schema.tables.length,
      views: schema.views.length,
      procedures: schema.procedures.length,
    });

    res.json(schema);
  } catch (error) {
    logger.error('Route error:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

module.exports = router;
