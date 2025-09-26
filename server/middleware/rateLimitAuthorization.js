/**
 * Rate Limit Authorization Middleware
 *
 * CRITICAL SECURITY IMPLEMENTATION
 * - Enforces role-based access control for rate limit operations
 * - Implements tenant-aware authorization per CLAUDE.md requirements
 * - Prevents unauthorized rate limit manipulation
 * - Blocks cross-tenant rate limit access
 */

const { logger } = require('../utils/logger');
const prismaService = require('../services/prismaService');

/**
 * SECURITY: Rate limit permission levels
 */
const RATE_LIMIT_PERMISSIONS = {
  READ: 'RATE_LIMIT_READ',
  CREATE: 'RATE_LIMIT_CREATE',
  UPDATE: 'RATE_LIMIT_UPDATE',
  DELETE: 'RATE_LIMIT_DELETE',
  MANAGE: 'RATE_LIMIT_MANAGE', // Full administrative access
  RESET: 'RATE_LIMIT_RESET', // Redis key reset operations
};

/**
 * SECURITY: Check if user has required rate limit permission
 * @param {Object} user - Current user object
 * @param {string} permission - Required permission level
 * @param {string} organizationId - Tenant context
 * @returns {boolean} - Permission granted
 */
const hasRateLimitPermission = async (user, permission, organizationId) => {
  if (!user || !organizationId) {
    return false;
  }

  // SECURITY: Super admins have all permissions
  if (user.isSuperAdmin || user.role === 'SUPER_ADMIN') {
    return true;
  }

  // SECURITY: Organization admins have manage permissions within their tenant
  if (user.isAdmin || user.role === 'ORGANIZATION_ADMIN') {
    // CRITICAL: Verify user belongs to the organization (RLS enforcement)
    if (user.organizationId === organizationId) {
      return [
        RATE_LIMIT_PERMISSIONS.READ,
        RATE_LIMIT_PERMISSIONS.CREATE,
        RATE_LIMIT_PERMISSIONS.UPDATE,
        RATE_LIMIT_PERMISSIONS.DELETE,
        RATE_LIMIT_PERMISSIONS.MANAGE,
        RATE_LIMIT_PERMISSIONS.RESET,
      ].includes(permission);
    }
    return false;
  }

  // SECURITY: Check specific user permissions via tenant-aware query
  try {
    const userPermissions = await prismaService.withTenantContext(organizationId, async tx => {
      const userRole = await tx.userRole.findFirst({
        where: {
          userId: user.id,
          role: {
            permissions: {
              some: {
                action: permission,
                resource: 'RATE_LIMIT',
              },
            },
          },
        },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      return userRole?.role?.permissions || [];
    });

    return userPermissions.some(p => p.action === permission && p.resource === 'RATE_LIMIT');
  } catch (error) {
    logger.error('Rate limit permission check failed', {
      userId: user.id,
      organizationId,
      permission,
      error: error.message,
    });
    return false;
  }
};

/**
 * SECURITY: Require specific rate limit permission middleware
 * @param {string} permission - Required permission level
 * @param {Object} options - Additional options
 * @returns {Function} - Express middleware function
 */
const requireRateLimitPermission = (permission, options = {}) => {
  const { requireOwnership = false, requireTenantContext = true } = options;

  return async (req, res, next) => {
    try {
      const currentUser = req.user;

      // SECURITY: Validate user authentication
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for rate limit operations',
        });
      }

      // SECURITY: Validate tenant context if required
      if (requireTenantContext && !currentUser.organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required for rate limit access',
        });
      }

      const organizationId = currentUser.organizationId;

      // SECURITY: Check rate limit permission
      const hasPermission = await hasRateLimitPermission(currentUser, permission, organizationId);
      if (!hasPermission) {
        logger.warn('Rate limit access denied', {
          userId: currentUser.id,
          organizationId,
          permission,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for rate limit operation',
        });
      }

      // SECURITY: Additional ownership verification if required
      if (requireOwnership && req.params.id) {
        const rateLimitId = req.params.id;

        // SECURITY: Validate UUID format
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            rateLimitId
          )
        ) {
          return res.status(400).json({
            success: false,
            message: 'Invalid rate limit configuration ID format',
          });
        }

        // CRITICAL: Use tenant-aware query to verify ownership
        const rateLimitConfig = await prismaService.withTenantContext(organizationId, async tx => {
          return await tx.rateLimitConfig.findFirst({
            where: { id: rateLimitId },
            select: { id: true, createdBy: true },
          });
        });

        if (!rateLimitConfig) {
          return res.status(404).json({
            success: false,
            message: 'Rate limit configuration not found',
          });
        }

        // SECURITY: Verify user owns the resource (for non-admin users)
        if (!currentUser.isAdmin && rateLimitConfig.createdBy !== currentUser.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied - resource ownership required',
          });
        }
      }

      // SECURITY: Attach validated context to request
      req.rateLimitContext = {
        userId: currentUser.id,
        organizationId,
        permission,
        hasManagePermission: await hasRateLimitPermission(
          currentUser,
          RATE_LIMIT_PERMISSIONS.MANAGE,
          organizationId
        ),
      };

      next();
    } catch (error) {
      logger.error('Rate limit authorization middleware error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }
  };
};

/**
 * SECURITY: Create authorization stack for rate limit operations
 * @param {string} operation - Operation type (read, create, update, delete, manage)
 * @param {Object} options - Additional options
 * @returns {Array} - Array of middleware functions
 */
const createRateLimitAuthStack = (operation, options = {}) => {
  const permissionMap = {
    read: RATE_LIMIT_PERMISSIONS.READ,
    create: RATE_LIMIT_PERMISSIONS.CREATE,
    update: RATE_LIMIT_PERMISSIONS.UPDATE,
    delete: RATE_LIMIT_PERMISSIONS.DELETE,
    manage: RATE_LIMIT_PERMISSIONS.MANAGE,
    reset: RATE_LIMIT_PERMISSIONS.RESET,
  };

  const permission = permissionMap[operation] || RATE_LIMIT_PERMISSIONS.READ;

  return [requireRateLimitPermission(permission, options)];
};

/**
 * SECURITY: Verify Redis key access for rate limit operations
 * @param {string} key - Redis key to validate
 * @param {string} organizationId - Tenant context
 * @returns {boolean} - Key access allowed
 */
const verifyRedisKeyAccess = (key, organizationId) => {
  // SECURITY: Allowed Redis key prefixes for rate limiting
  const allowedPrefixes = [
    'rl:api:',
    'rl:auth:',
    'rl:upload:',
    'rl:graphql:',
    'rl:websocket:',
    'rl:custom:',
  ];

  // SECURITY: Block keys that don't match allowed patterns
  const hasValidPrefix = allowedPrefixes.some(prefix => key.startsWith(prefix));
  if (!hasValidPrefix) {
    return false;
  }

  // SECURITY: Block dangerous key patterns
  const dangerousPatterns = [
    /\.\./, // Path traversal
    /[<>"'`]/, // Script injection
    /\*|\?/, // Wildcard patterns
    /^admin:/, // Admin namespace
    /^system:/, // System namespace
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(key)) {
      return false;
    }
  }

  // SECURITY: Ensure tenant isolation in Redis keys
  // Rate limit keys should include organization context
  if (organizationId) {
    const tenantKeyPattern = new RegExp(`org:${organizationId}:|tenant:${organizationId}:`);
    if (!tenantKeyPattern.test(key)) {
      // Allow global rate limits but log for audit
      logger.info('Global rate limit key accessed', {
        key,
        organizationId,
        timestamp: new Date(),
      });
    }
  }

  return true;
};

/**
 * SECURITY: Redis key validation middleware
 */
const validateRedisKey = () => {
  return (req, res, next) => {
    try {
      const { key } = req.params;
      const prefix = req.query.prefix || 'rl:api:';
      const currentUser = req.user;
      const organizationId = currentUser?.organizationId;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'Redis key is required',
        });
      }

      const fullKey = `${prefix}${key}`;

      // SECURITY: Validate Redis key access
      if (!verifyRedisKeyAccess(fullKey, organizationId)) {
        logger.warn('Blocked Redis key access attempt', {
          key: fullKey,
          userId: currentUser?.id,
          organizationId,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied - invalid Redis key pattern',
        });
      }

      req.validatedRedisKey = fullKey;
      next();
    } catch (error) {
      logger.error('Redis key validation error', {
        error: error.message,
        key: req.params.key,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: 'Key validation failed',
      });
    }
  };
};

module.exports = {
  RATE_LIMIT_PERMISSIONS,
  hasRateLimitPermission,
  requireRateLimitPermission,
  createRateLimitAuthStack,
  verifyRedisKeyAccess,
  validateRedisKey,
};
