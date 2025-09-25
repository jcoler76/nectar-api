/**
 * Roles Routes - GraphQL Integration
 * Converted from MongoDB to GraphQL-based operations
 */

const express = require('express');
const router = express.Router();
const { ROLE_QUERIES } = require('../utils/graphqlQueries');
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
const prismaService = require('../services/prismaService');
const prisma = prismaService.getRLSClient();

// Get all roles using GraphQL
router.get('/', createListHandler(ROLE_QUERIES.GET_ALL, 'roles'));

// Get single role by ID using GraphQL
router.get('/:id', createGetHandler(ROLE_QUERIES.GET_BY_ID, 'role'));

// Create new role using GraphQL
router.post(
  '/',
  checkFreemiumLimits('roles'),
  validate(validationRules.role.create),
  async (req, res) => {
    try {
      const { name, description, serviceId, permissions, isActive } = req.body;
      const context = createGraphQLContext(req);

      logger.info('Creating role', {
        name,
        serviceId,
        permissions: permissions || [],
        permissionsLength: (permissions || []).length,
        permissionsType: typeof permissions,
        isActive,
        user: req.user
          ? {
              userId: req.user.userId,
              organizationId: req.user.organizationId,
              email: req.user.email,
            }
          : 'NO USER',
      });

      const result = await executeGraphQLMutation(
        res,
        ROLE_QUERIES.CREATE,
        {
          input: {
            name,
            description,
            serviceId,
            permissions: permissions || [],
            isActive,
          },
        },
        context,
        'create role'
      );

      if (!result) return; // Error already handled

      res.status(201).json(result.createRole);
    } catch (error) {
      logger.error('Role creation route error', { error: error.message, stack: error.stack });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// Update role using GraphQL
router.put('/:id', validate(validationRules.role.update), async (req, res) => {
  const { id } = req.params;
  const { name, description, serviceId, permissions, isActive } = req.body;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    ROLE_QUERIES.UPDATE,
    {
      id,
      input: {
        name,
        description,
        serviceId,
        permissions,
        isActive,
      },
    },
    context,
    'update role'
  );

  if (!result) return; // Error already handled

  res.json(result.updateRole);
});

// Delete role using GraphQL
router.delete('/:id', createDeleteHandler(ROLE_QUERIES.DELETE, 'deleteRole'));

// Add permission to role
router.post('/:id/permissions', async (req, res) => {
  const { id } = req.params;
  const permission = req.body;
  const context = createGraphQLContext(req);

  const ADD_PERMISSION = `
    mutation AddPermission($roleId: ID!, $permission: PermissionInput!) {
      addPermission(roleId: $roleId, permission: $permission) {
        id
        name
        permissions
        updatedAt
      }
    }
  `;

  const result = await executeGraphQLMutation(
    res,
    ADD_PERMISSION,
    { roleId: id, permission },
    context,
    'add permission to role'
  );

  if (!result) return; // Error already handled

  res.json(result.addPermission);
});

// Remove permission from role
router.delete('/:id/permissions', async (req, res) => {
  const { id } = req.params;
  const { serviceId, objectName } = req.query;
  const context = createGraphQLContext(req);

  if (!serviceId || !objectName) {
    return res.status(400).json({
      success: false,
      message: 'serviceId and objectName are required',
    });
  }

  const REMOVE_PERMISSION = `
    mutation RemovePermission($roleId: ID!, $serviceId: ID!, $objectName: String!) {
      removePermission(roleId: $roleId, serviceId: $serviceId, objectName: $objectName) {
        id
        name
        permissions
        updatedAt
      }
    }
  `;

  const result = await executeGraphQLMutation(
    res,
    REMOVE_PERMISSION,
    { roleId: id, serviceId, objectName },
    context,
    'remove permission from role'
  );

  if (!result) return; // Error already handled

  res.json(result.removePermission);
});

// Test role permissions
router.post('/:id/test', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  const TEST_ROLE = `
    mutation TestRole($id: ID!) {
      testRole(id: $id) {
        success
        message
        permissions {
          objectName
          actions
          accessible
          errors
        }
      }
    }
  `;

  const result = await executeGraphQLMutation(
    res,
    TEST_ROLE,
    { id },
    context,
    'test role permissions'
  );

  if (!result) return; // Error already handled

  res.json(result.testRole);
});

// Refresh role schemas
router.post('/:id/refresh-schemas', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  const REFRESH_SCHEMAS = `
    mutation RefreshRoleSchemas($id: ID!) {
      refreshRoleSchemas(id: $id) {
        id
        name
        permissions
        updatedAt
      }
    }
  `;

  const result = await executeGraphQLMutation(
    res,
    REFRESH_SCHEMAS,
    { id },
    context,
    'refresh role schemas'
  );

  if (!result) return; // Error already handled

  res.json({
    success: true,
    message: 'Role schemas refreshed successfully',
    role: result.refreshRoleSchemas,
  });
});

// Get service schema for role creation
router.get('/service/:serviceId/schema', async (req, res) => {
  try {
    const { serviceId } = req.params;

    logger.info('=== SCHEMA REQUEST START ===');
    logger.info('Fetching service schema for service:', serviceId);

    const context = createGraphQLContext(req);
    logger.info('GraphQL context created:', {
      hasUser: !!context.user,
      organizationId: context.user?.organizationId,
    });

    // GraphQL query to get service with objects
    const GET_SERVICE_SCHEMA = `
      query GetServiceSchema($id: ID!) {
        service(id: $id) {
          id
          name
          objects
        }
      }
    `;

    logger.info('Executing GraphQL query with variables:', { id: serviceId });

    const result = await executeGraphQLQuery(
      res,
      GET_SERVICE_SCHEMA,
      { id: serviceId },
      context,
      'get service schema'
    );

    // Don't log the full result as it may have non-standard prototype
    logger.info('GraphQL query result received');

    if (!result) {
      logger.error('GraphQL query returned null result');
      return; // Error already handled
    }

    const service = result.service;
    logger.info('Service from GraphQL:', {
      serviceId: service?.id,
      serviceName: service?.name,
      hasObjects: !!service?.objects,
    });

    if (!service) {
      logger.info('Service not found for schema request');
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Parse the objects JSON and transform to expected schema format
    let objects = service.objects || [];

    // Ensure objects is always an array
    if (!Array.isArray(objects)) {
      if (typeof objects === 'string') {
        try {
          objects = JSON.parse(objects);
        } catch (e) {
          logger.error('Failed to parse objects JSON:', { error: e.message, objects });
          objects = [];
        }
      } else {
        objects = [];
      }
    }

    // If no objects are found, try to refresh the schema
    if (!objects || objects.length === 0) {
      logger.info(`No objects found for service ${serviceId}, attempting to refresh schema`);

      try {
        // Get the service with connection details from Prisma directly
        const serviceWithConnection = await prisma.service.findFirst({
          where: {
            id: serviceId,
            organizationId: context.user.organizationId,
          },
          include: {
            connection: true,
          },
        });

        if (!serviceWithConnection?.connection) {
          logger.info(`Service ${serviceId} has no connection, skipping schema refresh`);
        } else {
          // Use the DatabaseService to get database objects
          const DatabaseService = require('../services/database/DatabaseService');
          const { decryptDatabasePassword } = require('../utils/encryption');

          const decryptedPassword = decryptDatabasePassword(
            serviceWithConnection.connection.passwordEncrypted
          );

          const connectionConfig = {
            host: serviceWithConnection.connection.host,
            port: serviceWithConnection.connection.port,
            user: serviceWithConnection.connection.username,
            password: decryptedPassword,
            database: serviceWithConnection.database,
            sslEnabled: serviceWithConnection.connection.sslEnabled,
          };

          const fetchedObjects = await DatabaseService.getDatabaseObjects(connectionConfig);

          // Transform the objects and update the service
          const transformedObjects = fetchedObjects.map(obj => ({
            name: obj.name,
            schema: obj.schema_name || 'dbo',
            type: obj.type_desc,
            path: `/${obj.type_desc === 'USER_TABLE' ? 'table' : obj.type_desc === 'VIEW' ? 'view' : 'proc'}/${obj.name}`,
          }));

          // Update the service with the fetched objects
          await prisma.service.update({
            where: { id: serviceId },
            data: { objects: transformedObjects },
          });

          objects = transformedObjects;
          logger.info(
            `Schema refreshed successfully for service ${serviceId}, found ${objects.length} objects`
          );
        }
      } catch (refreshError) {
        logger.error('Failed to refresh schema:', {
          serviceId,
          error: refreshError.message,
          stack: refreshError.stack,
        });
      }
    }

    logger.info(`Found ${objects.length} objects for service ${serviceId}`, {
      objects: objects.slice(0, 3),
    });

    console.log(
      'DEBUG: objects type:',
      typeof objects,
      'isArray:',
      Array.isArray(objects),
      'length:',
      objects?.length
    );

    // Log first few objects to debug filtering
    logger.info('DEBUG: Sample objects for filtering:', {
      sampleObjects: objects.slice(0, 5),
      firstObject: objects[0] ? Object.keys(objects[0]) : 'no objects',
    });

    // Final check to ensure objects is an array before filtering
    if (!Array.isArray(objects)) {
      logger.error('Objects is not an array after processing:', { objects, type: typeof objects });
      objects = [];
    }

    // Count different types for debugging
    const typeDescCounts = {};
    objects.forEach(obj => {
      const typeDesc = obj.type_desc;
      typeDescCounts[typeDesc] = (typeDescCounts[typeDesc] || 0) + 1;
    });

    logger.info('Object type distribution:', typeDescCounts);

    // Fixed filtering based on actual SQL Server type values
    // SQL Server types: 'U' = tables, 'V' = views, 'P'/'PC' = procedures
    const tableObjects = objects.filter(obj => {
      return (
        obj.type_desc === 'USER_TABLE' ||
        obj.type?.trim() === 'U' ||
        obj.object_category === 'TABLE' ||
        obj.path?.startsWith('/table/')
      );
    });

    const viewObjects = objects.filter(obj => {
      return (
        obj.type_desc === 'VIEW' ||
        obj.type?.trim() === 'V' ||
        obj.object_category === 'VIEW' ||
        obj.path?.startsWith('/view/')
      );
    });

    const procedureObjects = objects.filter(obj => {
      return (
        obj.type_desc === 'SQL_STORED_PROCEDURE' ||
        obj.type?.trim() === 'P' ||
        obj.type?.trim() === 'PC' ||
        obj.object_category === 'PROCEDURE' ||
        obj.path?.startsWith('/proc/')
      );
    });

    logger.info('DEBUG: Filtering results:', {
      totalObjects: objects.length,
      tablesFound: tableObjects.length,
      viewsFound: viewObjects.length,
      proceduresFound: procedureObjects.length,
      sampleProcedure: procedureObjects[0] || 'none found',
    });

    const schema = {
      tables: tableObjects.map(t => ({
        name: t.name || t.path?.split('/').pop(),
        path: t.path || `/table/${t.name}`,
        schema: t.schema || t.schema_name || 'dbo',
      })),
      views: viewObjects.map(v => ({
        name: v.name || v.path?.split('/').pop(),
        path: v.path || `/view/${v.name}`,
        schema: v.schema || v.schema_name || 'dbo',
      })),
      procedures: procedureObjects.map(p => ({
        name: p.name || p.path?.split('/').pop(),
        path: p.path || `/proc/${p.name}`,
        schema: p.schema || p.schema_name || 'dbo',
      })),
    };

    logger.info('Schema object counts:', {
      tables: schema.tables.length,
      views: schema.views.length,
      procedures: schema.procedures.length,
    });

    logger.info('=== SCHEMA REQUEST SUCCESS ===');
    res.json(schema);
  } catch (error) {
    logger.error('=== SCHEMA REQUEST ERROR ===');
    logger.error('Error fetching service schema:', {
      serviceId: req.params.serviceId,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service schema',
      error: error.message,
    });
  }
});

// Get roles for a specific service
router.get('/service/:serviceId', async (req, res) => {
  const { serviceId } = req.params;
  const context = createGraphQLContext(req);

  const SERVICE_ROLES = `
    query ServiceRoles($serviceId: ID!) {
      serviceRoles(serviceId: $serviceId) {
        id
        name
        description
        isActive
        permissions
        creator {
          id
          email
          firstName
          lastName
        }
      }
    }
  `;

  const result = await executeGraphQLQuery(
    res,
    SERVICE_ROLES,
    { serviceId },
    context,
    'get service roles'
  );

  if (!result) return; // Error already handled

  res.json(result.serviceRoles);
});

// Batch operations for roles
router.post('/batch', async (req, res) => {
  const { operation, ids } = req.body;
  const context = createGraphQLContext(req);

  if (!['activate', 'deactivate', 'delete'].includes(operation)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid batch operation. Allowed: activate, deactivate, delete',
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
            ROLE_QUERIES.UPDATE,
            {
              id,
              input: { isActive: operation === 'activate' },
            },
            context,
            `batch ${operation}`
          );
          results.push({ id, success: true, data: result?.updateRole });
          break;

        case 'delete':
          result = await executeGraphQLMutation(
            null, // Don't send response yet
            ROLE_QUERIES.DELETE,
            { id },
            context,
            'batch delete'
          );
          results.push({ id, success: result?.deleteRole || false });
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
