/**
 * Role Management Authorization Middleware
 *
 * CRITICAL SECURITY IMPLEMENTATION
 * - Enforces server-side authorization for ALL role operations
 * - Uses tenant-aware Prisma client per CLAUDE.md requirements
 * - Prevents unauthorized role creation, modification, and deletion
 * - Implements proper RBAC with organization-level isolation
 */

const { logger } = require('../utils/logger');
const { userHasPermission, PERMISSIONS } = require('../utils/rolePermissions');
const prismaService = require('../services/prismaService');

/**
 * CRITICAL: Authorization check for role management operations
 * Must be applied to ALL role endpoints before any data access
 */
const requireRoleManagementPermission = (action = 'manage') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('Unauthorized role access attempt - no user', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent'],
        });
        return res.status(401).json({
          success: false,
          message: 'Authentication required for role management',
          code: 'AUTH_REQUIRED',
        });
      }

      const { userId, organizationId, isSuperAdmin, isAdmin } = req.user;

      if (!organizationId && !isSuperAdmin) {
        logger.warn('Role access denied - no organization context', {
          userId,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({
          success: false,
          message: 'Organization context required for role management',
          code: 'ORG_CONTEXT_REQUIRED',
        });
      }

      // Define required permissions based on action
      let requiredPermission;
      switch (action) {
        case 'create':
          requiredPermission = PERMISSIONS.API_MANAGE;
          break;
        case 'read':
          requiredPermission = PERMISSIONS.API_VIEW;
          break;
        case 'update':
          requiredPermission = PERMISSIONS.API_MANAGE;
          break;
        case 'delete':
          requiredPermission = PERMISSIONS.API_MANAGE;
          break;
        case 'manage':
        default:
          requiredPermission = PERMISSIONS.API_MANAGE;
          break;
      }

      // Check permissions
      const hasPermission = userHasPermission(req.user, requiredPermission, organizationId);

      if (!hasPermission && !isSuperAdmin && !isAdmin) {
        logger.warn('Role access denied - insufficient permissions', {
          userId,
          organizationId,
          requiredPermission,
          action,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for role management',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission,
        });
      }

      // Log successful authorization
      logger.info('Role management authorization successful', {
        userId,
        organizationId,
        action,
        hasPermission,
        isSuperAdmin,
        isAdmin,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Role authorization middleware error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.userId,
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        code: 'AUTH_ERROR',
      });
    }
  };
};

/**
 * CRITICAL: Verify role ownership and organization access
 * Uses proper tenant-aware Prisma client per CLAUDE.md RLS requirements
 */
const verifyRoleAccess = (options = {}) => {
  const { requireOwnership = false, allowRead = true, resourceIdParam = 'id' } = options;

  return async (req, res, next) => {
    try {
      const roleId = req.params[resourceIdParam];
      const { userId, organizationId, isSuperAdmin, isAdmin } = req.user;

      if (!roleId) {
        return res.status(400).json({
          success: false,
          message: 'Role ID is required',
          code: 'MISSING_ROLE_ID',
        });
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(roleId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID format',
          code: 'INVALID_ROLE_ID',
        });
      }

      // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
      // ✅ CORRECT: All database operations must use prismaService.withTenantContext()
      const role = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.role.findFirst({
          where: {
            id: roleId,
          },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            service: {
              select: { id: true, name: true, organizationId: true },
            },
          },
        });
      });

      if (!role) {
        logger.warn('Role access denied - role not found or no access', {
          roleId,
          userId,
          organizationId,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });
        return res.status(404).json({
          success: false,
          message: 'Role not found or access denied',
          code: 'ROLE_NOT_FOUND',
        });
      }

      // Verify organization isolation (RLS should handle this, but double-check)
      if (role.organizationId !== organizationId && !isSuperAdmin) {
        logger.error('CRITICAL: RLS bypass detected - cross-tenant role access', {
          roleId,
          roleOrganizationId: role.organizationId,
          userOrganizationId: organizationId,
          userId,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({
          success: false,
          message: 'Access denied - organization mismatch',
          code: 'ORG_MISMATCH',
        });
      }

      // Check ownership if required
      if (requireOwnership) {
        const isOwner = role.createdBy === userId;
        if (!isOwner && !isSuperAdmin && !isAdmin) {
          logger.warn('Role access denied - ownership required', {
            roleId,
            ownerId: role.createdBy,
            userId,
            requireOwnership,
            ip: req.ip,
            path: req.path,
            method: req.method,
          });
          return res.status(403).json({
            success: false,
            message: 'You must be the role owner to perform this action',
            code: 'OWNERSHIP_REQUIRED',
          });
        }
      }

      // Attach role to request for further use
      req.role = role;

      logger.info('Role access verification successful', {
        roleId,
        roleName: role.name,
        userId,
        organizationId,
        isOwner: role.createdBy === userId,
        requireOwnership,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Role access verification error', {
        error: error.message,
        stack: error.stack,
        roleId: req.params[resourceIdParam],
        userId: req.user?.userId,
        organizationId: req.user?.organizationId,
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        message: 'Role access verification failed',
        code: 'VERIFICATION_ERROR',
      });
    }
  };
};

/**
 * CRITICAL: Verify service access for role operations
 * Ensures users can only create roles for services they have access to
 */
const verifyServiceAccess = () => {
  return async (req, res, next) => {
    try {
      const serviceId = req.body.serviceId || req.params.serviceId;
      const { userId, organizationId, isSuperAdmin, isAdmin } = req.user;

      if (!serviceId) {
        return res.status(400).json({
          success: false,
          message: 'Service ID is required',
          code: 'MISSING_SERVICE_ID',
        });
      }

      // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
      const service = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.service.findFirst({
          where: {
            id: serviceId,
          },
          select: {
            id: true,
            name: true,
            organizationId: true,
            createdBy: true,
          },
        });
      });

      if (!service) {
        logger.warn('Service access denied - service not found or no access', {
          serviceId,
          userId,
          organizationId,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });
        return res.status(404).json({
          success: false,
          message: 'Service not found or access denied',
          code: 'SERVICE_NOT_FOUND',
        });
      }

      // Verify organization isolation
      if (service.organizationId !== organizationId && !isSuperAdmin) {
        logger.error('CRITICAL: Cross-tenant service access attempt', {
          serviceId,
          serviceOrganizationId: service.organizationId,
          userOrganizationId: organizationId,
          userId,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({
          success: false,
          message: 'Access denied - service organization mismatch',
          code: 'SERVICE_ORG_MISMATCH',
        });
      }

      // Attach service to request
      req.service = service;

      logger.info('Service access verification successful', {
        serviceId,
        serviceName: service.name,
        userId,
        organizationId,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Service access verification error', {
        error: error.message,
        stack: error.stack,
        serviceId: req.body?.serviceId || req.params?.serviceId,
        userId: req.user?.userId,
        organizationId: req.user?.organizationId,
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        message: 'Service access verification failed',
        code: 'SERVICE_VERIFICATION_ERROR',
      });
    }
  };
};

/**
 * CRITICAL: Rate limiting specifically for role operations
 * Prevents abuse of role management endpoints
 */
const roleOperationRateLimit = () => {
  const rateLimit = require('express-rate-limit');

  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: req => {
      // Different limits based on user type
      if (req.user?.isSuperAdmin) return 200;
      if (req.user?.isAdmin) return 100;
      return 20; // Regular users
    },
    message: {
      success: false,
      message: 'Too many role management requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => {
      // Rate limit by user and organization
      return `${req.user?.userId}:${req.user?.organizationId}:role-ops`;
    },
    handler: (req, res) => {
      logger.warn('Role operation rate limit exceeded', {
        userId: req.user?.userId,
        organizationId: req.user?.organizationId,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      res.status(429).json({
        success: false,
        message: 'Too many role management requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      });
    },
  });
};

/**
 * CRITICAL: Comprehensive role authorization middleware stack
 * Apply this to ALL role-related endpoints
 */
const createRoleAuthStack = (action = 'manage', options = {}) => {
  const stack = [roleOperationRateLimit(), requireRoleManagementPermission(action)];

  // Add resource verification for operations on specific roles
  if (options.requireRoleAccess) {
    stack.push(verifyRoleAccess(options));
  }

  // Add service verification for role creation/updates
  if (options.requireServiceAccess) {
    stack.push(verifyServiceAccess());
  }

  return stack;
};

module.exports = {
  requireRoleManagementPermission,
  verifyRoleAccess,
  verifyServiceAccess,
  roleOperationRateLimit,
  createRoleAuthStack,
};
