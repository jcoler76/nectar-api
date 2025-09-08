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
  handleGraphQLError
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
router.post('/', checkFreemiumLimits('services'), validate(validationRules.service.create), async (req, res) => {
  const { name, host, port, database, username, password, connectionId, isActive } = req.body;
  const context = createGraphQLContext(req);
  
  const result = await executeGraphQLMutation(
    res,
    SERVICE_QUERIES.CREATE,
    { 
      input: {
        name,
        host,
        port,
        database,
        username,
        password,
        connectionId,
        isActive
      }
    },
    context,
    'create service'
  );
  
  if (!result) return; // Error already handled
  
  res.status(201).json(result.createService);
});

// Update service using GraphQL
router.put('/:id', validate(validationRules.service.update), async (req, res) => {
  const { id } = req.params;
  const { name, host, port, database, username, password, connectionId, isActive } = req.body;
  const context = createGraphQLContext(req);
  
  const result = await executeGraphQLMutation(
    res,
    SERVICE_QUERIES.UPDATE,
    { 
      id,
      input: {
        name,
        host,
        port,
        database,
        username,
        password,
        connectionId,
        isActive
      }
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
    const connectionTest = testResult?.testService || { success: false, error: 'Connection test failed' };
    
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
        error: connectionTest.error
      },
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    handleGraphQLError(res, error, 'service health check');
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
      lastUpdated: new Date().toISOString()
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
      message: 'Invalid batch operation. Allowed: activate, deactivate, delete, test'
    });
  }
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'IDs array is required for batch operations'
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
              input: { isActive: operation === 'activate' }
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
            connectionResult: result?.testService
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
    errors
  });
});

module.exports = router;