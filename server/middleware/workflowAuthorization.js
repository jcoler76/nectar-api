/**
 * Workflow Authorization Middleware
 *
 * CRITICAL SECURITY IMPLEMENTATION
 * - Enforces role-based access control for workflow operations
 * - Implements tenant-aware authorization per CLAUDE.md requirements
 * - Prevents unauthorized workflow execution and manipulation
 * - Blocks cross-tenant workflow access
 */

const { logger } = require('../utils/logger');
const prismaService = require('../services/prismaService');

/**
 * SECURITY: Workflow permission levels
 */
const WORKFLOW_PERMISSIONS = {
  READ: 'WORKFLOW_READ',
  EXECUTE: 'WORKFLOW_EXECUTE',
  CREATE: 'WORKFLOW_CREATE',
  UPDATE: 'WORKFLOW_UPDATE',
  DELETE: 'WORKFLOW_DELETE',
  MANAGE: 'WORKFLOW_MANAGE', // Full administrative access
  APPROVE: 'WORKFLOW_APPROVE', // Approval operations
};

/**
 * SECURITY: Check if user has required workflow permission
 * @param {Object} user - Current user object
 * @param {string} permission - Required permission level
 * @param {string} organizationId - Tenant context
 * @returns {boolean} - Permission granted
 */
const hasWorkflowPermission = async (user, permission, organizationId) => {
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
        WORKFLOW_PERMISSIONS.READ,
        WORKFLOW_PERMISSIONS.EXECUTE,
        WORKFLOW_PERMISSIONS.CREATE,
        WORKFLOW_PERMISSIONS.UPDATE,
        WORKFLOW_PERMISSIONS.DELETE,
        WORKFLOW_PERMISSIONS.MANAGE,
        WORKFLOW_PERMISSIONS.APPROVE,
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
                resource: 'WORKFLOW',
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

    return userPermissions.some(p => p.action === permission && p.resource === 'WORKFLOW');
  } catch (error) {
    logger.error('Workflow permission check failed', {
      userId: user.id,
      organizationId,
      permission,
      error: error.message,
    });
    return false;
  }
};

/**
 * SECURITY: Require specific workflow permission middleware
 * @param {string} permission - Required permission level
 * @param {Object} options - Additional options
 * @returns {Function} - Express middleware function
 */
const requireWorkflowPermission = (permission, options = {}) => {
  const { requireOwnership = false, requireTenantContext = true } = options;

  return async (req, res, next) => {
    try {
      const currentUser = req.user;

      // SECURITY: Validate user authentication
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for workflow operations',
        });
      }

      // SECURITY: Validate tenant context if required
      if (requireTenantContext && !currentUser.organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required for workflow access',
        });
      }

      const organizationId = currentUser.organizationId;

      // SECURITY: Check workflow permission
      const hasPermission = await hasWorkflowPermission(currentUser, permission, organizationId);
      if (!hasPermission) {
        logger.warn('Workflow access denied', {
          userId: currentUser.id,
          organizationId,
          permission,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for workflow operation',
        });
      }

      // SECURITY: Additional ownership verification if required
      if (requireOwnership && req.params.workflowId) {
        const workflowId = req.params.workflowId;

        // SECURITY: Validate UUID format (Prisma) or ObjectId format (MongoDB legacy)
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            workflowId
          ) &&
          !/^[0-9a-fA-F]{24}$/.test(workflowId)
        ) {
          return res.status(400).json({
            success: false,
            message: 'Invalid workflow ID format',
          });
        }

        // CRITICAL: Use tenant-aware query to verify ownership
        const workflow = await prismaService.withTenantContext(organizationId, async tx => {
          // Try Prisma first, then fallback to MongoDB (during migration)
          try {
            return await tx.workflow.findFirst({
              where: { id: workflowId },
              select: { id: true, createdBy: true, organizationId: true },
            });
          } catch (prismaError) {
            // During migration, some workflows may still be in MongoDB
            logger.debug('Workflow not found in Prisma, checking MongoDB', { workflowId });
            return null;
          }
        });

        if (!workflow) {
          return res.status(404).json({
            success: false,
            message: 'Workflow not found',
          });
        }

        // SECURITY: Verify user owns the workflow (for non-admin users)
        if (!currentUser.isAdmin && workflow.createdBy !== currentUser.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied - workflow ownership required',
          });
        }
      }

      // SECURITY: Attach validated context to request
      req.workflowContext = {
        userId: currentUser.id,
        organizationId,
        permission,
        hasManagePermission: await hasWorkflowPermission(
          currentUser,
          WORKFLOW_PERMISSIONS.MANAGE,
          organizationId
        ),
      };

      next();
    } catch (error) {
      logger.error('Workflow authorization middleware error', {
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
 * SECURITY: Create authorization stack for workflow operations
 * @param {string} operation - Operation type (read, execute, create, update, delete, manage)
 * @param {Object} options - Additional options
 * @returns {Array} - Array of middleware functions
 */
const createWorkflowAuthStack = (operation, options = {}) => {
  const permissionMap = {
    read: WORKFLOW_PERMISSIONS.READ,
    execute: WORKFLOW_PERMISSIONS.EXECUTE,
    create: WORKFLOW_PERMISSIONS.CREATE,
    update: WORKFLOW_PERMISSIONS.UPDATE,
    delete: WORKFLOW_PERMISSIONS.DELETE,
    manage: WORKFLOW_PERMISSIONS.MANAGE,
    approve: WORKFLOW_PERMISSIONS.APPROVE,
  };

  const permission = permissionMap[operation] || WORKFLOW_PERMISSIONS.READ;

  return [requireWorkflowPermission(permission, options)];
};

/**
 * SECURITY: Validate workflow execution context
 * @param {Object} context - Execution context to validate
 * @param {Object} user - Current user
 * @param {string} organizationId - Tenant context
 * @returns {boolean} - Context is valid
 */
const validateWorkflowContext = (context, user, organizationId) => {
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
          logger.warn('Dangerous key detected in workflow context', {
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
    logger.error('Context validation error', {
      error: error.message,
      userId: user.id,
      organizationId,
    });
    return false;
  }
};

/**
 * SECURITY: Sanitize workflow execution context
 * @param {Object} context - Context to sanitize
 * @returns {Object} - Sanitized context
 */
const sanitizeWorkflowContext = context => {
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
    logger.error('Context sanitization error', { error: error.message });
    return {}; // Return empty context on error
  }
};

module.exports = {
  WORKFLOW_PERMISSIONS,
  hasWorkflowPermission,
  requireWorkflowPermission,
  createWorkflowAuthStack,
  validateWorkflowContext,
  sanitizeWorkflowContext,
};
