/**
 * Application Authorization Middleware
 *
 * CRITICAL SECURITY IMPLEMENTATION
 * - Enforces role-based access control for application operations
 * - Implements tenant-aware authorization per CLAUDE.md requirements
 * - Prevents unauthorized application management and API key access
 * - Blocks cross-tenant application access
 */

const { logger } = require('../utils/logger');
const prismaService = require('../services/prismaService');

/**
 * SECURITY: Application permission levels
 */
const APPLICATION_PERMISSIONS = {
  READ: 'APPLICATION_READ',
  CREATE: 'APPLICATION_CREATE',
  UPDATE: 'APPLICATION_UPDATE',
  DELETE: 'APPLICATION_DELETE',
  MANAGE: 'APPLICATION_MANAGE', // Full administrative access
  MANAGE_KEYS: 'APPLICATION_MANAGE_KEYS', // API key operations
};

/**
 * SECURITY: Check if user has required application permission
 * @param {Object} user - Current user object
 * @param {string} permission - Required permission level
 * @param {string} organizationId - Tenant context
 * @returns {boolean} - Permission granted
 */
const hasApplicationPermission = async (user, permission, organizationId) => {
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
        APPLICATION_PERMISSIONS.READ,
        APPLICATION_PERMISSIONS.CREATE,
        APPLICATION_PERMISSIONS.UPDATE,
        APPLICATION_PERMISSIONS.DELETE,
        APPLICATION_PERMISSIONS.MANAGE,
        APPLICATION_PERMISSIONS.MANAGE_KEYS,
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
                resource: 'APPLICATION',
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

    return userPermissions.some(p => p.action === permission && p.resource === 'APPLICATION');
  } catch (error) {
    logger.error('Application permission check failed', {
      userId: user.id,
      organizationId,
      permission,
      error: error.message,
    });
    return false;
  }
};

/**
 * SECURITY: Require specific application permission middleware
 * @param {string} permission - Required permission level
 * @param {Object} options - Additional options
 * @returns {Function} - Express middleware function
 */
const requireApplicationPermission = (permission, options = {}) => {
  const { requireOwnership = false, requireTenantContext = true } = options;

  return async (req, res, next) => {
    try {
      const currentUser = req.user;

      // SECURITY: Validate user authentication
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for application operations',
        });
      }

      // SECURITY: Validate tenant context if required
      if (requireTenantContext && !currentUser.organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required for application access',
        });
      }

      const organizationId = currentUser.organizationId;

      // SECURITY: Check application permission
      const hasPermission = await hasApplicationPermission(currentUser, permission, organizationId);
      if (!hasPermission) {
        logger.warn('Application access denied', {
          userId: currentUser.id,
          organizationId,
          permission,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for application operation',
        });
      }

      // SECURITY: Additional ownership verification if required
      if (requireOwnership && req.params.id) {
        const applicationId = req.params.id;

        // SECURITY: Validate UUID format
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            applicationId
          )
        ) {
          return res.status(400).json({
            success: false,
            message: 'Invalid application ID format',
          });
        }

        // CRITICAL: Use tenant-aware query to verify ownership
        const application = await prismaService.withTenantContext(organizationId, async tx => {
          return await tx.application.findFirst({
            where: {
              id: applicationId,
              organizationId: organizationId, // Ensure tenant isolation
            },
            select: { id: true, organizationId: true },
          });
        });

        if (!application) {
          return res.status(404).json({
            success: false,
            message: 'Application not found',
          });
        }
      }

      // SECURITY: Attach validated context to request
      req.applicationContext = {
        userId: currentUser.id,
        organizationId,
        permission,
        hasManagePermission: await hasApplicationPermission(
          currentUser,
          APPLICATION_PERMISSIONS.MANAGE,
          organizationId
        ),
        hasKeyPermission: await hasApplicationPermission(
          currentUser,
          APPLICATION_PERMISSIONS.MANAGE_KEYS,
          organizationId
        ),
      };

      next();
    } catch (error) {
      logger.error('Application authorization middleware error', {
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
 * SECURITY: Create authorization stack for application operations
 * @param {string} operation - Operation type (read, create, update, delete, manage, manage_keys)
 * @param {Object} options - Additional options
 * @returns {Array} - Array of middleware functions
 */
const createApplicationAuthStack = (operation, options = {}) => {
  const permissionMap = {
    read: APPLICATION_PERMISSIONS.READ,
    create: APPLICATION_PERMISSIONS.CREATE,
    update: APPLICATION_PERMISSIONS.UPDATE,
    delete: APPLICATION_PERMISSIONS.DELETE,
    manage: APPLICATION_PERMISSIONS.MANAGE,
    manage_keys: APPLICATION_PERMISSIONS.MANAGE_KEYS,
  };

  const permission = permissionMap[operation] || APPLICATION_PERMISSIONS.READ;

  return [requireApplicationPermission(permission, options)];
};

/**
 * SECURITY: Validate application context for operations
 * @param {Object} context - Application context to validate
 * @param {Object} user - Current user
 * @param {string} organizationId - Tenant context
 * @returns {boolean} - Context is valid
 */
const validateApplicationContext = (context, user, organizationId) => {
  try {
    // SECURITY: Check for dangerous context properties
    const dangerousKeys = [
      '__proto__',
      'constructor',
      'prototype',
      'eval',
      'function',
      'require',
      'process',
      'global',
      'module',
    ];

    const checkObject = (obj, depth = 0) => {
      if (depth > 10) return false; // Prevent deep recursion attacks

      if (obj === null || typeof obj !== 'object') return true;

      for (const key in obj) {
        if (dangerousKeys.includes(key.toLowerCase())) {
          logger.warn('Dangerous key detected in application context', {
            key,
            userId: user.id,
            organizationId,
          });
          return false;
        }

        if (!checkObject(obj[key], depth + 1)) {
          return false;
        }
      }
      return true;
    };

    return checkObject(context);
  } catch (error) {
    logger.error('Application context validation error', {
      error: error.message,
      userId: user.id,
      organizationId,
    });
    return false;
  }
};

/**
 * SECURITY: Sanitize application context
 * @param {Object} context - Context to sanitize
 * @returns {Object} - Sanitized context
 */
const sanitizeApplicationContext = context => {
  try {
    // Deep clone to avoid mutation
    const sanitized = JSON.parse(JSON.stringify(context));

    // Remove dangerous properties recursively
    const sanitizeObject = obj => {
      if (obj === null || typeof obj !== 'object') return obj;

      const dangerous = ['__proto__', 'constructor', 'prototype'];
      for (const key of dangerous) {
        delete obj[key];
      }

      for (const key in obj) {
        obj[key] = sanitizeObject(obj[key]);
      }
      return obj;
    };

    return sanitizeObject(sanitized);
  } catch (error) {
    logger.error('Application context sanitization error', { error: error.message });
    return {}; // Return empty context on error
  }
};

module.exports = {
  APPLICATION_PERMISSIONS,
  hasApplicationPermission,
  requireApplicationPermission,
  createApplicationAuthStack,
  validateApplicationContext,
  sanitizeApplicationContext,
};
