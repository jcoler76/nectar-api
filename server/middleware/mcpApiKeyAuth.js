/**
 * MCP API Key Authentication Middleware
 *
 * SECURITY: Validates Application API keys for MCP server access
 * - Enforces RLS-compliant tenant isolation
 * - Verifies role has MCP enabled
 * - Provides application context to MCP operations
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
 * SECURITY: Validate API key and set up MCP context
 * - Verifies application exists and is active
 * - Checks role has mcpEnabled: true
 * - Attaches application, role, organization to req.user
 */
const mcpApiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required for MCP server access',
        hint: 'Provide API key in Authorization header: "Bearer <your-api-key>"',
      });
    }

    // SECURITY: Validate API key format (should start with 'mapi_')
    if (!apiKey.startsWith('mapi_')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key format',
      });
    }

    // Extract the prefix for lookup
    const keyPrefix = apiKey.substring(0, 10); // mapi_ + first 5 chars

    // SECURITY: Find application using system context first (to get organizationId)
    const application = await prismaService.systemPrisma.application.findFirst({
      where: {
        apiKeyPrefix: keyPrefix,
        isActive: true,
      },
      include: {
        defaultRole: {
          include: {
            service: {
              include: {
                connection: true,
              },
            },
          },
        },
        organization: true,
      },
    });

    if (!application) {
      logger.warn('MCP authentication failed - application not found', {
        keyPrefix,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        message: 'Invalid or inactive API key',
      });
    }

    // SECURITY: Verify the full API key hash (constant-time comparison)
    const isValidKey = await bcrypt.compare(apiKey, application.apiKeyHash);

    if (!isValidKey) {
      logger.warn('MCP authentication failed - invalid key', {
        applicationId: application.id,
        organizationId: application.organizationId,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        message: 'Invalid API key',
      });
    }

    // SECURITY: Verify role exists and has MCP enabled
    if (!application.defaultRole) {
      return res.status(403).json({
        success: false,
        message: 'No role assigned to this application',
      });
    }

    if (!application.defaultRole.mcpEnabled) {
      return res.status(403).json({
        success: false,
        message: 'MCP server not enabled for this role',
        hint: 'Enable MCP on the role in the Roles management page',
      });
    }

    // SECURITY: Set up request context with RLS compliance
    req.user = {
      id: application.id,
      organizationId: application.organizationId,
      userId: application.createdBy,
      role: application.defaultRole,
      application: {
        id: application.id,
        name: application.name,
        isActive: application.isActive,
      },
      // Flag to indicate this is API key auth (not session)
      authType: 'api_key',
      isMCPAuth: true,
    };

    // Log successful authentication
    logger.info('MCP API key authenticated', {
      applicationId: application.id,
      applicationName: application.name,
      organizationId: application.organizationId,
      roleName: application.defaultRole.name,
      roleId: application.defaultRole.id,
      ip: req.ip,
    });

    // Update application last used timestamp (non-blocking)
    prismaService
      .withTenantContext(application.organizationId, async tx => {
        await tx.application.update({
          where: { id: application.id },
          data: { updatedAt: new Date() },
        });
      })
      .catch(err => {
        logger.error('Failed to update application last used', {
          applicationId: application.id,
          error: err.message,
        });
      });

    next();
  } catch (error) {
    logger.error('MCP API key authentication error', {
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
 * SECURITY: Optional middleware to require specific MCP permissions
 * Can be chained after mcpApiKeyAuth for additional checks
 */
const requireMCPPermission = requiredPermission => {
  return (req, res, next) => {
    if (!req.user?.isMCPAuth) {
      return res.status(403).json({
        success: false,
        message: 'MCP authentication required',
      });
    }

    const role = req.user.role;
    if (!role?.permissions) {
      return res.status(403).json({
        success: false,
        message: 'No permissions found for this role',
      });
    }

    // Check if role has the required permission
    const permissions = Array.isArray(role.permissions)
      ? role.permissions
      : JSON.parse(role.permissions || '[]');

    const hasPermission = permissions.some(p => {
      if (requiredPermission.objectName) {
        return p.objectName === requiredPermission.objectName;
      }
      if (requiredPermission.path) {
        return p.path?.includes(requiredPermission.path);
      }
      return false;
    });

    if (!hasPermission) {
      logger.warn('MCP permission denied', {
        applicationId: req.user.application.id,
        roleName: role.name,
        requiredPermission,
      });

      return res.status(403).json({
        success: false,
        message: 'Role does not have permission for this operation',
      });
    }

    next();
  };
};

module.exports = {
  mcpApiKeyAuth,
  requireMCPPermission,
  extractApiKey,
};
