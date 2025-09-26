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
const { schemaLimiter } = require('../middleware/dynamicRateLimiter');

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
router.post('/:id/refresh-schema', schemaLimiter, async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  try {
    const prismaService = require('../services/prismaService');

    const service = await prismaService.withTenantContext(context.user.organizationId, async tx => {
      return await tx.service.findFirst({
        where: {
          id,
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
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or you do not have permission to access it',
      });
    }

    // Verify user has permission to refresh schema for this service
    // RLS already ensures the service belongs to user's organization
    // Additional check: verify service is active and user has admin permissions
    if (!service.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cannot refresh schema for inactive service',
        errorCode: 'SERVICE_INACTIVE',
      });
    }

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

    // Debug logging (password removed for security)
    logger.info('Attempting database connection for schema refresh', {
      serviceId: service.id,
      connectionId: service.connection.id,
      host: connectionConfig.host,
      port: connectionConfig.port,
      username: connectionConfig.username,
      database: connectionConfig.database,
      hasPassword: !!connectionConfig.password,
      passwordLength: connectionConfig.password?.length,
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
      await prismaService.withTenantContext(context.user.organizationId, async tx => {
        // Clear existing database objects for this service
        await tx.databaseObject.deleteMany({
          where: {
            serviceId: service.id,
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
          await tx.databaseObject.createMany({
            data: databaseObjectsToCreate,
          });
        }

        logger.info('Database objects stored in databaseObject table', {
          serviceId: service.id,
          objectsStored: databaseObjectsToCreate.length,
        });
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

    // Sanitize error messages for production
    let sanitizedMessage = 'Failed to refresh service schema';

    if (process.env.NODE_ENV === 'development') {
      // Show detailed errors only in development
      sanitizedMessage = error.message || sanitizedMessage;
    } else {
      // In production, provide user-friendly messages based on error type
      if (error.message?.includes('connection')) {
        sanitizedMessage = 'Database connection failed. Please check service configuration.';
      } else if (error.message?.includes('timeout')) {
        sanitizedMessage = 'Schema refresh timed out. Please try again later.';
      } else if (error.message?.includes('permission')) {
        sanitizedMessage = 'Insufficient permissions to refresh schema.';
      }
    }

    res.status(500).json({
      success: false,
      message: sanitizedMessage,
      errorCode: 'SCHEMA_REFRESH_FAILED',
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
router.post('/batch', schemaLimiter, async (req, res) => {
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
  const authorizedServices = [];

  // First, verify user has access to all requested services
  const prismaService = require('../services/prismaService');

  try {
    const accessibleServices = await prismaService.withTenantContext(
      context.user.organizationId,
      async tx => {
        return await tx.service.findMany({
          where: {
            id: { in: ids },
          },
          select: { id: true, name: true, isActive: true },
        });
      }
    );

    // Check which services the user can access
    for (const id of ids) {
      const service = accessibleServices.find(s => s.id === id);
      if (service) {
        authorizedServices.push(service);
      } else {
        errors.push({
          id,
          error: 'Service not found or you do not have permission to access it',
          errorCode: 'UNAUTHORIZED_ACCESS',
        });
      }
    }
  } catch (authError) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify service permissions',
      error: authError.message,
    });
  }

  // Process only authorized services
  for (const service of authorizedServices) {
    try {
      let result;

      switch (operation) {
        case 'activate':
        case 'deactivate':
          // Additional check: don't allow deactivating already inactive services
          if (operation === 'deactivate' && !service.isActive) {
            errors.push({
              id: service.id,
              error: 'Service is already inactive',
              errorCode: 'ALREADY_INACTIVE',
            });
            break;
          }

          result = await executeGraphQLMutation(
            null, // Don't send response yet
            SERVICE_QUERIES.UPDATE,
            {
              id: service.id,
              input: { isActive: operation === 'activate' },
            },
            context,
            `batch ${operation}`
          );
          results.push({ id: service.id, success: true, data: result?.updateService });
          break;

        case 'delete':
          result = await executeGraphQLMutation(
            null, // Don't send response yet
            SERVICE_QUERIES.DELETE,
            { id: service.id },
            context,
            'batch delete'
          );
          results.push({ id: service.id, success: result?.deleteService || false });
          break;

        case 'test':
          result = await executeGraphQLMutation(
            null, // Don't send response yet
            SERVICE_QUERIES.TEST_CONNECTION,
            { id: service.id },
            context,
            'batch test'
          );
          results.push({
            id: service.id,
            success: result?.testService?.success || false,
            connectionResult: result?.testService,
          });
          break;
      }
    } catch (error) {
      // Sanitize error messages for security
      let sanitizedError = 'Operation failed';

      if (process.env.NODE_ENV === 'development') {
        sanitizedError = error.message || sanitizedError;
      } else {
        // Provide user-friendly error messages
        if (error.message?.includes('not found')) {
          sanitizedError = 'Service not found';
        } else if (error.message?.includes('permission')) {
          sanitizedError = 'Permission denied';
        } else if (error.message?.includes('connection')) {
          sanitizedError = 'Connection failed';
        }
      }

      errors.push({
        id: service.id,
        error: sanitizedError,
        errorCode: 'BATCH_OPERATION_FAILED',
      });
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
