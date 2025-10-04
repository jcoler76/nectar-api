/**
 * Folder API Key Authentication Middleware
 *
 * SECURITY: Validates folder-scoped API keys for MCP folder access
 * - Enforces RLS-compliant tenant isolation
 * - Verifies key is scoped to the requested folder
 * - Provides folder context to query operations
 */

const bcrypt = require('bcryptjs');
const prismaService = require('../services/prismaService');
const { logger } = require('../utils/logger');

/**
 * Extract API key from Authorization header
 * Supports: "Bearer <key>" or just "<key>"
 */
const extractApiKey = req => {
  const authHeader = req.headers.authorization || req.headers['x-api-key'];

  if (!authHeader) {
    return null;
  }

  // Handle "Bearer <key>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Handle direct key
  return authHeader;
};

/**
 * SECURITY: Validate folder API key
 * - Verifies API key exists and is active
 * - Checks key is scoped to the requested folder
 * - Attaches key info and folder to req.user
 */
const folderApiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required for folder MCP access',
        hint: 'Provide API key in Authorization header: "Bearer <your-folder-api-key>"',
      });
    }

    // SECURITY: Validate API key format (should start with 'nk_folder_')
    if (!apiKey.startsWith('nk_folder_')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid folder API key format',
      });
    }

    // Extract the prefix for lookup
    const keyPrefix = `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`;

    // SECURITY: Find API key using system context first (to get organizationId)
    const apiKeyRecord = await prismaService.systemPrisma.apiKey.findFirst({
      where: {
        keyPrefix,
        isActive: true,
        folderId: { not: null }, // Must be folder-scoped
      },
      include: {
        folder: {
          include: {
            organization: true,
          },
        },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!apiKeyRecord) {
      logger.warn('Folder API key authentication failed - key not found', {
        keyPrefix,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        message: 'Invalid or inactive folder API key',
      });
    }

    // SECURITY: Verify the full API key hash (constant-time comparison)
    const isValidKey = await bcrypt.compare(apiKey, apiKeyRecord.keyHash);

    if (!isValidKey) {
      logger.warn('Folder API key authentication failed - invalid key', {
        apiKeyId: apiKeyRecord.id,
        folderId: apiKeyRecord.folderId,
        organizationId: apiKeyRecord.organizationId,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        message: 'Invalid folder API key',
      });
    }

    // SECURITY: Check if key has expired
    if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
      return res.status(403).json({
        success: false,
        message: 'API key has expired',
      });
    }

    // SECURITY: Verify folder in URL matches key's folder (if folderId in params)
    const requestedFolderId = req.params.folderId;
    if (requestedFolderId && requestedFolderId !== apiKeyRecord.folderId) {
      logger.warn('Folder API key mismatch', {
        apiKeyId: apiKeyRecord.id,
        keyFolderId: apiKeyRecord.folderId,
        requestedFolderId,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        message: 'API key is not authorized for this folder',
      });
    }

    // SECURITY: Verify folder has MCP enabled
    if (!apiKeyRecord.folder.mcpEnabled) {
      return res.status(403).json({
        success: false,
        message: 'MCP is not enabled for this folder',
      });
    }

    // SECURITY: Set up request context with RLS compliance
    req.user = {
      id: apiKeyRecord.createdBy.id,
      organizationId: apiKeyRecord.organizationId,
      apiKeyId: apiKeyRecord.id,
      folderId: apiKeyRecord.folderId,
      folder: {
        id: apiKeyRecord.folder.id,
        name: apiKeyRecord.folder.name,
        path: apiKeyRecord.folder.path,
        mcpEnabled: apiKeyRecord.folder.mcpEnabled,
      },
      // Flag to indicate this is folder API key auth
      authType: 'folder_api_key',
      isFolderApiKeyAuth: true,
      permissions: apiKeyRecord.permissions || [],
    };

    // Log successful authentication
    logger.info('Folder API key authenticated', {
      apiKeyId: apiKeyRecord.id,
      apiKeyName: apiKeyRecord.name,
      folderId: apiKeyRecord.folderId,
      folderPath: apiKeyRecord.folder.path,
      organizationId: apiKeyRecord.organizationId,
      ip: req.ip,
    });

    // Update API key last used timestamp (non-blocking)
    prismaService
      .withTenantContext(apiKeyRecord.organizationId, async tx => {
        await tx.apiKey.update({
          where: { id: apiKeyRecord.id },
          data: { lastUsedAt: new Date() },
        });
      })
      .catch(err => {
        logger.error('Failed to update API key last used', {
          apiKeyId: apiKeyRecord.id,
          error: err.message,
        });
      });

    next();
  } catch (error) {
    logger.error('Folder API key authentication error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * SECURITY: Optional middleware to require specific folder permissions
 * Can be chained after folderApiKeyAuth for additional checks
 */
const requireFolderPermission = requiredPermission => {
  return (req, res, next) => {
    if (!req.user?.isFolderApiKeyAuth) {
      return res.status(403).json({
        success: false,
        message: 'Folder API key authentication required',
      });
    }

    const permissions = req.user.permissions || [];

    if (!permissions.includes(requiredPermission)) {
      logger.warn('Folder permission denied', {
        apiKeyId: req.user.apiKeyId,
        folderId: req.user.folderId,
        requiredPermission,
        availablePermissions: permissions,
      });

      return res.status(403).json({
        success: false,
        message: `Permission denied. Required: ${requiredPermission}`,
      });
    }

    next();
  };
};

module.exports = {
  folderApiKeyAuth,
  requireFolderPermission,
  extractApiKey,
};
