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

// Get single user by ID using GraphQL
router.get('/:id', createGetHandler(USER_QUERIES.GET_BY_ID, 'user'));

// Create new user using GraphQL
router.post('/', validate(validationRules.user.create), async (req, res) => {
  const { email, firstName, lastName, password, isAdmin, isActive } = req.body;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    USER_QUERIES.CREATE,
    {
      input: {
        email,
        firstName,
        lastName,
        password,
        isAdmin: isAdmin || false,
        isActive: isActive !== false,
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
  const { email, firstName, lastName, isAdmin, isActive } = req.body;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    USER_QUERIES.UPDATE,
    {
      id,
      input: {
        email,
        firstName,
        lastName,
        isAdmin,
        isActive,
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

// Update user profile
router.put('/:id/profile', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email } = req.body;
  const context = createGraphQLContext(req);

  const UPDATE_PROFILE = `
    mutation UpdateUserProfile($id: ID!, $input: UpdateUserInput!) {
      updateUser(id: $id, input: $input) {
        id
        email
        firstName
        lastName
        fullName
        updatedAt
      }
    }
  `;

  const result = await executeGraphQLMutation(
    res,
    UPDATE_PROFILE,
    {
      id,
      input: { firstName, lastName, email },
    },
    context,
    'update user profile'
  );

  if (!result) return; // Error already handled

  res.json(result.updateUser);
});

// Change user password
router.put('/:id/password', async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;
  const context = createGraphQLContext(req);

  const CHANGE_PASSWORD = `
    mutation ChangeUserPassword($id: ID!, $currentPassword: String!, $newPassword: String!) {
      changeUserPassword(id: $id, currentPassword: $currentPassword, newPassword: $newPassword) {
        success
        message
      }
    }
  `;

  const result = await executeGraphQLMutation(
    res,
    CHANGE_PASSWORD,
    { id, currentPassword, newPassword },
    context,
    'change user password'
  );

  if (!result) return; // Error already handled

  res.json(result.changeUserPassword);
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
