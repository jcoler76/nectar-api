/**
 * Connections Routes - GraphQL Integration
 * Converted from MongoDB to GraphQL-based operations
 */

const express = require('express');
const router = express.Router();
const { CONNECTION_QUERIES } = require('../utils/graphqlQueries');
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
const { checkDatasourceLimit } = require('../middleware/userLimitMiddleware');

// Get all connections using GraphQL
router.get('/', createListHandler(CONNECTION_QUERIES.GET_ALL, 'connections'));

// Get single connection by ID using GraphQL
router.get('/:id', createGetHandler(CONNECTION_QUERIES.GET_BY_ID, 'connection'));

// Create new connection using GraphQL
router.post(
  '/',
  checkDatasourceLimit,
  validate(validationRules.connection.create),
  async (req, res) => {
    const {
      name,
      type,
      host,
      port,
      username,
      password,
      database,
      sslEnabled,
      isActive,
      failoverHost,
      databases,
    } = req.body;
    const context = createGraphQLContext(req);

    const result = await executeGraphQLMutation(
      res,
      CONNECTION_QUERIES.CREATE,
      {
        input: {
          name,
          type,
          host,
          port,
          username,
          password,
          database,
          sslEnabled: sslEnabled || false,
          isActive: isActive !== undefined ? isActive : true,
          failoverHost,
          databases,
        },
      },
      context,
      'create connection'
    );

    if (!result) return; // Error already handled

    res.status(201).json(result.createConnection);
  }
);

// Update connection using GraphQL
router.put('/:id', validate(validationRules.connection.update), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    type,
    host,
    port,
    username,
    password,
    database,
    sslEnabled,
    isActive,
    failoverHost,
    databases,
  } = req.body;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    CONNECTION_QUERIES.UPDATE,
    {
      id,
      input: {
        name,
        type,
        host,
        port,
        username,
        password,
        database,
        sslEnabled,
        isActive,
        failoverHost,
        databases,
      },
    },
    context,
    'update connection'
  );

  if (!result) return; // Error already handled

  res.json(result.updateConnection);
});

// Delete connection using GraphQL
router.delete('/:id', createDeleteHandler(CONNECTION_QUERIES.DELETE, 'deleteConnection'));

// Test connection using GraphQL
router.post('/:id/test', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    CONNECTION_QUERIES.TEST_CONNECTION,
    { id },
    context,
    'test connection'
  );

  if (!result) return; // Error already handled

  res.json(result.testConnection);
});

// Test connection without saving (for connection setup)
router.post('/test', async (req, res) => {
  const { type, host, port, username, password, database, sslEnabled, connectionId } = req.body;
  const context = createGraphQLContext(req);

  const TEST_CONNECTION_TEMP = `
    mutation TestConnectionTemp($input: TestConnectionInput!) {
      testConnectionTemp(input: $input) {
        success
        message
        error
        databases
      }
    }
  `;

  const result = await executeGraphQLMutation(
    res,
    TEST_CONNECTION_TEMP,
    {
      input: {
        type,
        host,
        port,
        username,
        password,
        database,
        sslEnabled: sslEnabled || false,
        connectionId,
      },
    },
    context,
    'test temporary connection'
  );

  if (!result) return; // Error already handled

  res.json(result.testConnectionTemp);
});

// Get databases for a connection
router.get('/:id/databases', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  const GET_CONNECTION_DATABASES = `
    query GetConnectionDatabases($id: ID!) {
      connection(id: $id) {
        id
        name
        databases
        host
        port
      }
    }
  `;

  const result = await executeGraphQLQuery(
    res,
    GET_CONNECTION_DATABASES,
    { id },
    context,
    'get connection databases'
  );

  if (!result) return; // Error already handled

  res.json(result.connection.databases || []);
});

// Refresh databases for a connection
router.post('/:id/databases/refresh', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  const REFRESH_DATABASES = `
    mutation RefreshConnectionDatabases($id: ID!) {
      refreshConnectionDatabases(id: $id) {
        id
        name
        databases
        updatedAt
      }
    }
  `;

  const result = await executeGraphQLMutation(
    res,
    REFRESH_DATABASES,
    { id },
    context,
    'refresh connection databases'
  );

  if (!result) return; // Error already handled

  res.json({
    message: 'Database list refreshed successfully',
    databases: result.refreshConnectionDatabases.databases,
  });
});

// Refresh databases (alternative endpoint)
router.post('/:id/refresh-databases', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  const REFRESH_DATABASES = `
    mutation RefreshConnectionDatabases($id: ID!) {
      refreshConnectionDatabases(id: $id) {
        id
        name
        databases
        updatedAt
      }
    }
  `;

  const result = await executeGraphQLMutation(
    res,
    REFRESH_DATABASES,
    { id },
    context,
    'refresh connection databases'
  );

  if (!result) return; // Error already handled

  res.json({
    message: 'Database list refreshed successfully.',
    databases: result.refreshConnectionDatabases.databases,
  });
});

// Get table columns for a specific table (for database triggers)
router.post('/:id/table-columns', async (req, res) => {
  const { id } = req.params;
  const { database, table } = req.body;
  const context = createGraphQLContext(req);

  if (!database || !table) {
    return res.status(400).json({
      success: false,
      message: 'Database and table are required',
    });
  }

  const GET_TABLE_COLUMNS = `
    mutation GetTableColumns($connectionId: ID!, $database: String!, $table: String!) {
      getTableColumns(connectionId: $connectionId, database: $database, table: $table) {
        success
        columns
        error
      }
    }
  `;

  const result = await executeGraphQLMutation(
    res,
    GET_TABLE_COLUMNS,
    { connectionId: id, database, table },
    context,
    'get table columns'
  );

  if (!result) return; // Error already handled

  if (!result.getTableColumns.success) {
    return res.status(400).json({
      success: false,
      message: result.getTableColumns.error,
    });
  }

  res.json(result.getTableColumns.columns);
});

// Get connection health status
router.get('/:id/health', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  try {
    // First get the connection details
    const connectionResult = await executeGraphQLQuery(
      res,
      CONNECTION_QUERIES.GET_BY_ID,
      { id },
      context,
      'connection health check'
    );

    if (!connectionResult) return; // Error already handled

    // Then test the connection
    const testResult = await executeGraphQLMutation(
      null, // Don't send response yet
      CONNECTION_QUERIES.TEST_CONNECTION,
      { id },
      context,
      'test connection for health'
    );

    const connection = connectionResult.connection;
    const connectionTest = testResult?.testConnection || {
      success: false,
      error: 'Connection test failed',
    };

    res.json({
      id: connection.id,
      name: connection.name,
      host: connection.host,
      port: connection.port,
      isActive: connection.isActive,
      isHealthy: connection.isActive && connectionTest.success,
      connectionTest: {
        success: connectionTest.success,
        message: connectionTest.message,
        error: connectionTest.error,
      },
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    handleGraphQLError(res, error, 'connection health check');
  }
});

// Batch operations for connections
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
            CONNECTION_QUERIES.UPDATE,
            {
              id,
              input: { isActive: operation === 'activate' },
            },
            context,
            `batch ${operation}`
          );
          results.push({ id, success: true, data: result?.updateConnection });
          break;

        case 'delete':
          result = await executeGraphQLMutation(
            null, // Don't send response yet
            CONNECTION_QUERIES.DELETE,
            { id },
            context,
            'batch delete'
          );
          results.push({ id, success: result?.deleteConnection || false });
          break;

        case 'test':
          result = await executeGraphQLMutation(
            null, // Don't send response yet
            CONNECTION_QUERIES.TEST_CONNECTION,
            { id },
            context,
            'batch test'
          );
          results.push({
            id,
            success: result?.testConnection?.success || false,
            connectionResult: result?.testConnection,
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
