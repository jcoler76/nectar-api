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

// SECURITY: Import application authorization middleware
const {
  createApplicationAuthStack,
  APPLICATION_PERMISSIONS,
  validateApplicationContext,
  sanitizeApplicationContext,
} = require('../middleware/applicationAuthorization');
const prismaService = require('../services/prismaService');

/**
 * SECURITY: Enhanced audit logging for application operations
 * Logs security-critical events with standardized metadata
 * @param {string} event - Event type for categorization
 * @param {Object} metadata - Event-specific metadata
 * @param {Object} user - Current user context
 * @param {string} organizationId - Tenant context
 */
const auditLog = async (event, metadata = {}, user = null, organizationId = null) => {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId: user?.id,
    organizationId,
    userAgent: metadata.userAgent,
    ip: metadata.ip,
    applicationId: metadata.applicationId,
    applicationName: metadata.applicationName,
    operation: metadata.operation,
    severity: metadata.severity || 'INFO',
    success: metadata.success !== false, // Default to true unless explicitly false
    metadata: {
      ...metadata,
      // Remove redundant fields to avoid duplication
      userAgent: undefined,
      ip: undefined,
      applicationId: undefined,
      applicationName: undefined,
      operation: undefined,
      severity: undefined,
      success: undefined,
    },
  };

  // SECURITY: Log to application logger with structured data
  logger.info(`APPLICATION_AUDIT: ${event}`, auditEntry);

  // SECURITY: Store audit trail in database with tenant context
  if (organizationId) {
    try {
      await prismaService.withTenantContext(organizationId, async tx => {
        await tx.auditLog.create({
          data: {
            action: event,
            resourceType: 'APPLICATION',
            resourceId: metadata.applicationId,
            userId: user?.id,
            organizationId,
            metadata: auditEntry,
            createdAt: new Date(),
          },
        });
      });
    } catch (error) {
      logger.error('Failed to store application audit log', {
        error: error.message,
        event,
        userId: user?.id,
        organizationId,
      });
    }
  }
};

// SECURITY: Tenant-aware cache for recently generated API keys (admins only, 1 hour TTL)
const apiKeyCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * SECURITY: Cache API key with tenant isolation
 * @param {string} applicationId - Application ID
 * @param {string} apiKey - API key to cache
 * @param {string} userId - User who cached the key
 * @param {string} organizationId - Tenant context
 */
const cacheApiKey = (applicationId, apiKey, userId, organizationId) => {
  // SECURITY: Use tenant-aware cache key to prevent cross-tenant access
  const tenantCacheKey = `${organizationId}:${applicationId}`;

  apiKeyCache.set(tenantCacheKey, {
    key: apiKey,
    cachedAt: new Date(),
    cachedBy: userId,
    organizationId: organizationId,
    applicationId: applicationId,
  });

  // Auto-cleanup after TTL
  setTimeout(() => {
    apiKeyCache.delete(tenantCacheKey);
  }, CACHE_TTL);
};

/**
 * SECURITY: Get cached API key with tenant validation
 * @param {string} applicationId - Application ID
 * @param {string} organizationId - Tenant context for validation
 * @returns {Object|null} - Cached key data or null
 */
const getCachedApiKey = (applicationId, organizationId) => {
  // SECURITY: Use tenant-aware cache key
  const tenantCacheKey = `${organizationId}:${applicationId}`;
  const cached = apiKeyCache.get(tenantCacheKey);

  if (!cached) return null;

  // SECURITY: Double-check tenant isolation
  if (cached.organizationId !== organizationId) {
    logger.warn('Cross-tenant cache access attempt blocked', {
      requestedOrg: organizationId,
      cachedOrg: cached.organizationId,
      applicationId,
    });
    return null;
  }

  // Check if expired
  if (Date.now() - cached.cachedAt.getTime() > CACHE_TTL) {
    apiKeyCache.delete(tenantCacheKey);
    return null;
  }

  return cached;
};

// Get all applications using GraphQL
router.get(
  '/',
  createApplicationAuthStack('read'),
  createListHandler(APPLICATION_QUERIES.GET_ALL, 'applications')
);

// Get single application by ID using GraphQL
router.get(
  '/:id',
  createApplicationAuthStack('read', { requireOwnership: true }),
  createGetHandler(APPLICATION_QUERIES.GET_BY_ID, 'application')
);

// Create new application using GraphQL
router.post(
  '/',
  createApplicationAuthStack('create'),
  validate(validationRules.application.create),
  async (req, res) => {
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
      cacheApiKey(
        result.createApplication.id,
        result.createApplication.apiKey,
        req.user.userId,
        req.user.organizationId
      );
    }

    res.status(201).json(result.createApplication);
  }
);

// Update application using GraphQL
router.put(
  '/:id',
  createApplicationAuthStack('update', { requireOwnership: true }),
  validate(validationRules.application.update),
  async (req, res) => {
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
  }
);

// Delete application using GraphQL
router.delete(
  '/:id',
  createApplicationAuthStack('delete', { requireOwnership: true }),
  createDeleteHandler(APPLICATION_QUERIES.DELETE, 'deleteApplication')
);

// Regenerate API key using GraphQL
router.post(
  '/:id/regenerate-key',
  createApplicationAuthStack('manage_keys', { requireOwnership: true }),
  async (req, res) => {
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
      cacheApiKey(id, result.regenerateApiKey.apiKey, req.user.userId, req.user.organizationId);
    }

    res.json({
      success: true,
      message: 'API key regenerated successfully',
      application: result.regenerateApiKey,
    });
  }
);

// Allow admin to set a specific API key value (BYO key)
router.post(
  '/:id/set-key',
  createApplicationAuthStack('manage_keys', { requireOwnership: true }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { apiKey } = req.body || {};

      // SECURITY: Enhanced input validation
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ success: false, message: 'apiKey must be a string' });
      }

      const trimmed = apiKey.trim();
      const errors = [];

      // SECURITY: Comprehensive API key strength validation
      if (trimmed.length < 32) errors.push('at least 32 characters');
      if (trimmed.length > 256) errors.push('no more than 256 characters');
      if (!/[a-z]/.test(trimmed)) errors.push('one lowercase letter');
      if (!/[A-Z]/.test(trimmed)) errors.push('one uppercase letter');
      if (!/[0-9]/.test(trimmed)) errors.push('one number');
      if (!/[^A-Za-z0-9]/.test(trimmed)) errors.push('one symbol');
      if (/\s/.test(trimmed)) errors.push('no whitespace');
      if (/[<>'"&]/.test(trimmed)) errors.push('no HTML/script characters');

      // SECURITY: Pattern-based validation to prevent weak keys
      if (/^(.)\1{7,}$/.test(trimmed)) errors.push('not a repeated character');
      if (/^(..)\1{7,}$/.test(trimmed)) errors.push('not a repeated pattern');
      if (/^[a-zA-Z]+$/.test(trimmed)) errors.push('must contain numbers and symbols');
      if (/^[0-9]+$/.test(trimmed)) errors.push('must contain letters and symbols');

      if (errors.length) {
        return res.status(400).json({
          success: false,
          message: `apiKey does not meet strength requirements: ${errors.join(', ')}`,
        });
      }

      const prismaService = require('../services/prismaService');
      const bcryptjs = require('bcryptjs');
      const { encryptApiKey } = require('../utils/encryption');

      // SECURITY: Validate user has access to application within their tenant
      if (!req.user.organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context required',
        });
      }

      const hash = await bcryptjs.hash(trimmed, 10);
      const prefix = trimmed.substring(0, 4);
      const encrypted = encryptApiKey(trimmed);

      // SECURITY: Use proper RLS enforcement via withTenantContext
      let updated = null;
      await prismaService.withTenantContext(req.user.organizationId, async tx => {
        updated = await tx.application.update({
          where: {
            id,
            organizationId: req.user.organizationId, // Ensure tenant isolation
          },
          data: {
            apiKeyHash: hash,
            apiKeyPrefix: prefix,
            apiKeyEncrypted: encrypted,
          },
          include: { defaultRole: true },
        });
      });

      // SECURITY: Audit API key setting operation
      await auditLog(
        'APPLICATION_API_KEY_SET',
        {
          applicationId: id,
          applicationName: updated.name,
          operation: 'SET_API_KEY',
          severity: 'HIGH',
          keyStrength: 'CUSTOM',
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        },
        req.user,
        req.user.organizationId
      );

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
  }
);

// Get API key from cache (admin only)
router.get(
  '/:id/api-key',
  createApplicationAuthStack('manage_keys', { requireOwnership: true }),
  async (req, res) => {
    const { id } = req.params;

    // SECURITY: Use tenant-aware cache access
    const cached = getCachedApiKey(id, req.user.organizationId);
    if (!cached) {
      return res.status(404).json({
        success: false,
        message: 'API key not found in cache or expired',
      });
    }

    // SECURITY: Audit API key access from cache
    await auditLog(
      'APPLICATION_API_KEY_ACCESSED',
      {
        applicationId: id,
        operation: 'ACCESS_CACHED_KEY',
        severity: 'MEDIUM',
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      },
      req.user,
      req.user.organizationId
    );

    res.json({
      success: true,
      apiKey: cached.key,
      cachedAt: cached.cachedAt,
      cachedBy: cached.cachedBy,
    });
  }
);

// Reveal API key (admin only) - decrypts the stored key
router.get(
  '/:id/reveal-key',
  createApplicationAuthStack('manage_keys', { requireOwnership: true }),
  async (req, res) => {
    const { id } = req.params;
    const context = createGraphQLContext(req);

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

        // SECURITY: Audit API key revelation - HIGH SECURITY EVENT
        await auditLog(
          'APPLICATION_API_KEY_REVEALED',
          {
            applicationId: id,
            applicationName: application.name,
            operation: 'REVEAL_ENCRYPTED_KEY',
            severity: 'HIGH',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          },
          req.user,
          req.user.organizationId
        );

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
        cacheApiKey(id, decryptedKey, req.user.userId, req.user.organizationId);
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
  }
);

// Health check endpoint
router.get(
  '/:id/health',
  createApplicationAuthStack('read', { requireOwnership: true }),
  async (req, res) => {
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
  }
);

// Batch operations endpoint
router.post('/batch', createApplicationAuthStack('manage'), async (req, res) => {
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
