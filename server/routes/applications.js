/**
 * Applications Routes - GraphQL Integration
 * Converted from MongoDB to GraphQL-based operations
 */

const express = require('express');
const router = express.Router();
const { APPLICATION_QUERIES } = require('../utils/graphqlQueries');
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

// In-memory cache for recently generated API keys (admins only, 1 hour TTL)
const apiKeyCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const cacheApiKey = (applicationId, apiKey, userId) => {
  apiKeyCache.set(applicationId, {
    key: apiKey,
    cachedAt: new Date(),
    cachedBy: userId,
  });

  // Auto-cleanup after TTL
  setTimeout(() => {
    apiKeyCache.delete(applicationId);
  }, CACHE_TTL);
};

const getCachedApiKey = applicationId => {
  const cached = apiKeyCache.get(applicationId);
  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.cachedAt.getTime() > CACHE_TTL) {
    apiKeyCache.delete(applicationId);
    return null;
  }

  return cached;
};

// Get all applications using GraphQL
router.get('/', createListHandler(APPLICATION_QUERIES.GET_ALL, 'applications'));

// Get single application by ID using GraphQL
router.get('/:id', createGetHandler(APPLICATION_QUERIES.GET_BY_ID, 'application'));

// Create new application using GraphQL
router.post('/', validate(validationRules.application.create), async (req, res) => {
  const { name, description, defaultRoleId, isActive } = req.body;
  const context = createGraphQLContext(req);
  
  const result = await executeGraphQLMutation(
    res,
    APPLICATION_QUERIES.CREATE,
    { 
      input: {
        name,
        description, 
        defaultRoleId,
        isActive
      }
    },
    context,
    'create application'
  );
  
  if (!result) return; // Error already handled
  
  // Cache the API key for admin access
  if (req.user?.isAdmin && result.createApplication?.apiKey) {
    cacheApiKey(result.createApplication.id, result.createApplication.apiKey, req.user.userId);
  }
  
  res.status(201).json(result.createApplication);
});

// Update application using GraphQL
router.put('/:id', validate(validationRules.application.update), async (req, res) => {
  const { id } = req.params;
  const { name, description, defaultRoleId, isActive } = req.body;
  const context = createGraphQLContext(req);
  
  const result = await executeGraphQLMutation(
    res,
    APPLICATION_QUERIES.UPDATE,
    { 
      id,
      input: {
        name,
        description,
        defaultRoleId,
        isActive
      }
    },
    context,
    'update application'
  );
  
  if (!result) return; // Error already handled
  
  res.json(result.updateApplication);
});

// Delete application using GraphQL
router.delete('/:id', createDeleteHandler(APPLICATION_QUERIES.DELETE, 'deleteApplication'));

// Regenerate API key using GraphQL
router.post('/:id/regenerate-key', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);
  
  const result = await executeGraphQLMutation(
    res,
    APPLICATION_QUERIES.REGENERATE_API_KEY,
    { id },
    context,
    'regenerate API key'
  );
  
  if (!result) return; // Error already handled
  
  // Cache the new API key for admin access
  if (req.user?.isAdmin && result.regenerateApiKey?.apiKey) {
    cacheApiKey(id, result.regenerateApiKey.apiKey, req.user.userId);
  }
  
  res.json({
    success: true,
    message: 'API key regenerated successfully',
    application: result.regenerateApiKey
  });
});

// Get API key from cache (admin only)
router.get('/:id/api-key', async (req, res) => {
  const { id } = req.params;
  
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required to view API keys'
    });
  }
  
  const cached = getCachedApiKey(id);
  if (!cached) {
    return res.status(404).json({
      success: false,
      message: 'API key not found in cache or expired'
    });
  }
  
  res.json({
    success: true,
    apiKey: cached.key,
    cachedAt: cached.cachedAt,
    cachedBy: cached.cachedBy
  });
});

// Health check endpoint
router.get('/:id/health', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);
  
  try {
    const result = await executeGraphQLQuery(
      res,
      APPLICATION_QUERIES.GET_BY_ID,
      { id },
      context,
      'application health check'
    );
    
    if (!result) return; // Error already handled
    
    const application = result.application;
    const isHealthy = application && application.isActive;
    
    res.json({
      id: application.id,
      name: application.name,
      isActive: application.isActive,
      isHealthy,
      lastChecked: new Date().toISOString(),
      defaultRole: application.defaultRole ? {
        id: application.defaultRole.id,
        name: application.defaultRole.name
      } : null
    });
  } catch (error) {
    handleGraphQLError(res, error, 'application health check');
  }
});

// Batch operations endpoint
router.post('/batch', async (req, res) => {
  const { operation, ids, data } = req.body;
  const context = createGraphQLContext(req);
  
  if (!['activate', 'deactivate', 'delete'].includes(operation)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid batch operation. Allowed: activate, deactivate, delete'
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
            APPLICATION_QUERIES.UPDATE,
            { 
              id,
              input: { isActive: operation === 'activate' }
            },
            context,
            `batch ${operation}`
          );
          results.push({ id, success: true, data: result?.updateApplication });
          break;
          
        case 'delete':
          result = await executeGraphQLMutation(
            null, // Don't send response yet  
            APPLICATION_QUERIES.DELETE,
            { id },
            context,
            'batch delete'
          );
          results.push({ id, success: result?.deleteApplication || false });
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