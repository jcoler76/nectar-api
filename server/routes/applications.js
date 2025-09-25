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
  handleGraphQLError,
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
  const { name, description, defaultRole, isActive } = req.body;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    APPLICATION_QUERIES.CREATE,
    {
      input: {
        name,
        description,
        defaultRoleId: defaultRole, // Map frontend field name to GraphQL field name
        isActive,
      },
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
  const { name, description, defaultRole, isActive } = req.body;
  const context = createGraphQLContext(req);

  const result = await executeGraphQLMutation(
    res,
    APPLICATION_QUERIES.UPDATE,
    {
      id,
      input: {
        name,
        description,
        defaultRoleId: defaultRole, // Map frontend field name to GraphQL field name
        isActive,
      },
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
    application: result.regenerateApiKey,
  });
});

// Allow admin to set a specific API key value (BYO key)
router.post('/:id/set-key', async (req, res) => {
  try {
    if (!req.user?.isAdmin && !req.user?.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const { apiKey } = req.body || {};
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ success: false, message: 'apiKey must be a string' });
    }
    const trimmed = apiKey.trim();
    const errors = [];
    if (trimmed.length < 32) errors.push('at least 32 characters');
    if (!/[a-z]/.test(trimmed)) errors.push('one lowercase letter');
    if (!/[A-Z]/.test(trimmed)) errors.push('one uppercase letter');
    if (!/[0-9]/.test(trimmed)) errors.push('one number');
    if (!/[^A-Za-z0-9]/.test(trimmed)) errors.push('one symbol');
    if (/\s/.test(trimmed)) errors.push('no whitespace');
    // very simple repetition pattern guard
    if (/^(.)\1{7,}$/.test(trimmed)) errors.push('not a repeated character');
    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: `apiKey does not meet strength requirements: ${errors.join(', ')}`,
      });
    }

    const prismaService = require('../services/prismaService');
    const prisma = prismaService.getRLSClient();
    const bcryptjs = require('bcryptjs');
    const { encryptApiKey } = require('../utils/encryption');

    const hash = await bcryptjs.hash(trimmed, 10);
    const prefix = trimmed.substring(0, 4);
    const encrypted = encryptApiKey(trimmed);

    const updated = await prisma.application.update({
      where: { id },
      data: {
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
        apiKeyEncrypted: encrypted,
      },
      include: { defaultRole: true },
    });

    return res.json({
      success: true,
      message: 'API key set successfully',
      // Do NOT return the raw apiKey back; client already provided it.
      application: { id: updated.id, name: updated.name },
    });
  } catch (err) {
    logger.error('Set API key failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to set API key' });
  }
});

// Get API key from cache (admin only)
router.get('/:id/api-key', async (req, res) => {
  const { id } = req.params;

  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required to view API keys',
    });
  }

  const cached = getCachedApiKey(id);
  if (!cached) {
    return res.status(404).json({
      success: false,
      message: 'API key not found in cache or expired',
    });
  }

  res.json({
    success: true,
    apiKey: cached.key,
    cachedAt: cached.cachedAt,
    cachedBy: cached.cachedBy,
  });
});

// Reveal API key (admin only) - decrypts the stored key
router.get('/:id/reveal-key', async (req, res) => {
  const { id } = req.params;
  const context = createGraphQLContext(req);

  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required to reveal API keys',
      requiresRegeneration: true,
    });
  }

  try {
    // Custom query to get encrypted API key
    const REVEAL_KEY_QUERY = `
      query GetApplicationForReveal($id: ID!) {
        application(id: $id) {
          id
          name
          apiKeyEncrypted
        }
      }
    `;

    const result = await executeGraphQLQuery(
      res,
      REVEAL_KEY_QUERY,
      { id },
      context,
      'reveal API key'
    );

    if (!result) return; // Error already handled

    const application = result.application;

    // Try to decrypt the API key
    const { decryptApiKey } = require('../utils/encryption');
    try {
      const decryptedKey = decryptApiKey(application.apiKeyEncrypted);

      res.json({
        success: true,
        apiKey: decryptedKey,
        applicationName: application.name,
        lastRevealed: {
          at: new Date().toISOString(),
          by: req.user.email,
        },
      });

      // Cache the revealed key for future access
      cacheApiKey(id, decryptedKey, req.user.userId);
    } catch (decryptError) {
      // If decryption fails, the key needs to be regenerated
      logger.error('Failed to decrypt API key', {
        applicationId: id,
        error: decryptError.message,
      });

      return res.status(400).json({
        success: false,
        message: 'Unable to decrypt API key. Please regenerate the key.',
        requiresRegeneration: true,
      });
    }
  } catch (error) {
    handleGraphQLError(res, error, 'reveal API key');
  }
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
      defaultRole: application.defaultRole
        ? {
            id: application.defaultRole.id,
            name: application.defaultRole.name,
          }
        : null,
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
            APPLICATION_QUERIES.UPDATE,
            {
              id,
              input: { isActive: operation === 'activate' },
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
    errors,
  });
});

module.exports = router;
