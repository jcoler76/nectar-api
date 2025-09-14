/**
 * Users Routes - GraphQL Integration
 * Converted from MongoDB to GraphQL-based operations
 */

const express = require('express');
const router = express.Router();
const { USER_QUERIES } = require('../utils/graphqlQueries');
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

// Get all users using GraphQL
router.get('/', createListHandler(USER_QUERIES.GET_ALL, 'users'));

// Get current user profile using GraphQL
router.get('/me', async (req, res) => {
  const context = createGraphQLContext(req);

  const result = await executeGraphQLQuery(
    res,
    USER_QUERIES.GET_ME,
    {},
    context,
    'get current user'
  );

  if (!result) return; // Error already handled

  res.json(result.me);
});

// Get single user by ID using GraphQL
router.get('/:id', createGetHandler(USER_QUERIES.GET_BY_ID, 'user'));

// Create new user using GraphQL
router.post('/', validate(validationRules.user.create), async (req, res) => {
  const { firstName, lastName, email, password, isAdmin, isActive, roleIds } = req.body;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    USER_QUERIES.CREATE,
    {
      input: {
        firstName,
        lastName,
        email,
        password,
        isAdmin,
        isActive,
        roleIds,
      },
    },
    context,
    'create user'
  );

  if (!result) return; // Error already handled

  res.status(201).json(result.createUser);
});

// Update user using GraphQL
router.put('/:id', validate(validationRules.user.update), async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, password, isAdmin, isActive, roleIds } = req.body;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    USER_QUERIES.UPDATE,
    {
      id,
      input: {
        firstName,
        lastName,
        email,
        password,
        isAdmin,
        isActive,
        roleIds,
      },
    },
    context,
    'update user'
  );

  if (!result) return; // Error already handled

  res.json(result.updateUser);
});

// Delete user using GraphQL
router.delete('/:id', createDeleteHandler(USER_QUERIES.DELETE, 'deleteUser'));

// Get user profile with roles
router.get('/:id/profile', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLQuery(
    res,
    USER_QUERIES.GET_BY_ID,
    { id },
    context,
    'get user profile'
  );

  if (!result) return; // Error already handled

  const user = result.user;

  res.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
    createdAt: user.createdAt,
    roles: user.roles.map(role => ({
      id: role.id,
      name: role.name,
      service: role.service
        ? {
            id: role.service.id,
            name: role.service.name,
          }
        : null,
    })),
  });
});

// Update user password
router.post('/:id/password', async (req, res) => {
  const { id } = req.params;
  const { password, currentPassword } = req.body;
  const context = createGraphQLContext(req);

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required',
    });
  }

  // For self-password changes, currentPassword might be required
  // This would need additional validation logic

  const result = await executeGraphQLMutation(
    res,
    USER_QUERIES.UPDATE,
    {
      id,
      input: { password },
    },
    context,
    'update user password'
  );

  if (!result) return; // Error already handled

  res.json({
    success: true,
    message: 'Password updated successfully',
  });
});

// Batch operations for users
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
            USER_QUERIES.UPDATE,
            {
              id,
              input: { isActive: operation === 'activate' },
            },
            context,
            `batch ${operation}`
          );
          results.push({ id, success: true, data: result?.updateUser });
          break;

        case 'delete':
          result = await executeGraphQLMutation(
            null, // Don't send response yet
            USER_QUERIES.DELETE,
            { id },
            context,
            'batch delete'
          );
          results.push({ id, success: result?.deleteUser || false });
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
