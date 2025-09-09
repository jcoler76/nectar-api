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
    const { name, description, serviceId, permissions, isActive } = req.body;
    const context = createGraphQLContext(req);

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

    logger.info('GraphQL query result:', { result });

    if (!result) {
      logger.error('GraphQL query returned null result');
      return; // Error already handled
    }

    const service = result.service;
    logger.info('Service from GraphQL:', { service });

    if (!service) {
      logger.info('Service not found for schema request');
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Parse the objects JSON and transform to expected schema format
    const objects = service.objects || [];
    logger.info(`Found ${objects.length} objects for service ${serviceId}`, {
      objects: objects.slice(0, 3),
    });

    const schema = {
      tables: objects
        .filter(obj => obj.path && obj.path.startsWith('/table/'))
        .map(t => ({
          name: t.path.split('/').pop(),
          path: t.path,
        })),
      views: objects
        .filter(obj => obj.path && obj.path.startsWith('/view/'))
        .map(v => ({
          name: v.path.split('/').pop(),
          path: v.path,
        })),
      procedures: objects
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
