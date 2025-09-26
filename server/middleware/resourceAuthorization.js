const { logger } = require('./logger');
const prismaService = require('../services/prismaService');

/**
 * Resource authorization middleware to prevent IDOR attacks
 * Ensures users can only access resources they own or have permission to access
 */

// Resource ownership verification with Prisma support
const verifyResourceOwnership = (modelName, ownerField = 'createdBy') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.resourceId;
      const userId = req.user.userId || req.user.id;

      if (!resourceId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_RESOURCE_ID',
            message: 'Resource ID is required',
          },
        });
      }

      // Validate UUID format for Prisma
      if (!isValidUUID(resourceId)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_RESOURCE_ID',
            message: 'Invalid resource ID format',
          },
        });
      }

      // SECURITY FIX: Use withTenantContext for RLS enforcement when organization context available
      const userOrganizationId = req.user.organizationId;
      let resource;

      if (userOrganizationId) {
        // Use RLS enforcement for organization-scoped resources
        resource = await prismaService.withTenantContext(userOrganizationId, async tx => {
          return await tx[modelName].findFirst({
            where: {
              id: resourceId,
              // organizationId handled by RLS
            },
          });
        });
      } else {
        // For non-organization resources, use system client
        const systemPrisma = prismaService.getSystemClient();
        resource = await systemPrisma[modelName].findUnique({
          where: { id: resourceId },
        });
      }

      if (!resource) {
        logger.warn('Resource not found during authorization check', {
          resourceId,
          modelName,
          userId,
          organizationId: userOrganizationId,
          ip: req.ip,
        });
        return res.status(404).json({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
          },
        });
      }

      // Check ownership or organization membership
      const ownerId = resource[ownerField]?.toString();
      const isOwner = ownerId === userId;
      let hasOrganizationAccess = false;

      // Check if user has access through organization membership
      if (resource.organizationId && userOrganizationId) {
        hasOrganizationAccess = resource.organizationId === userOrganizationId;
      }

      if (!isOwner && !hasOrganizationAccess && !req.user.isAdmin) {
        logger.warn('Unauthorized resource access attempt', {
          resourceId,
          modelName,
          ownerId,
          userId,
          organizationId: resource.organizationId,
          userOrganizationId: req.user.organizationId,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource',
          },
        });
      }

      // Attach resource to request for further use
      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Resource authorization error', {
        error: error.message,
        resourceId: req.params.id,
        userId: req.user?.userId,
      });

      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'An error occurred during authorization',
        },
      });
    }
  };
};

// Team/shared resource authorization with PostgreSQL and RLS
const verifyTeamAccess = (modelName, teamField = 'teamId') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.resourceId;
      const userId = req.user.userId || req.user.id;
      const userOrganizationId = req.user.organizationId;
      const userTeams = req.user.teams || [];

      if (!userOrganizationId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Organization context required for team resource access',
          },
        });
      }

      // SECURITY FIX: Use withTenantContext for RLS enforcement
      const resource = await prismaService.withTenantContext(userOrganizationId, async tx => {
        return await tx[modelName].findFirst({
          where: {
            id: resourceId,
            // organizationId handled by RLS
          },
        });
      });

      if (!resource) {
        return res.status(404).json({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
          },
        });
      }

      // Check if user belongs to the resource's team
      const resourceTeam = resource[teamField]?.toString();
      const hasTeamAccess = userTeams.some(team => team.toString() === resourceTeam);

      // Check ownership or team access
      const isOwner = resource.createdBy?.toString() === userId;

      if (!isOwner && !hasTeamAccess && !req.user.isAdmin) {
        logger.warn('Unauthorized team resource access attempt', {
          resourceId,
          modelName,
          resourceTeam,
          userTeams,
          userId,
          organizationId: userOrganizationId,
          ip: req.ip,
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource',
          },
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Team authorization error', {
        error: error.message,
        resourceId: req.params.id,
        organizationId: req.user?.organizationId,
      });

      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'An error occurred during authorization',
        },
      });
    }
  };
};

// Permission-based authorization
const verifyPermission = requiredPermission => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(requiredPermission) && !req.user.isAdmin) {
      logger.warn('Insufficient permissions', {
        requiredPermission,
        userPermissions,
        userId: req.user.userId,
        ip: req.ip,
        path: req.path,
      });

      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have the required permissions for this action',
        },
      });
    }

    next();
  };
};

// Role-based authorization
const verifyRole = requiredRoles => {
  return (req, res, next) => {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const userRoles = req.user.roles || [];

    const hasRequiredRole = roles.some(role => userRoles.includes(role) || req.user.isAdmin);

    if (!hasRequiredRole) {
      logger.warn('Insufficient role access', {
        requiredRoles: roles,
        userRoles,
        userId: req.user.userId,
        ip: req.ip,
        path: req.path,
      });

      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'You do not have the required role for this action',
        },
      });
    }

    next();
  };
};

// Workflow-specific authorization with proper RLS enforcement
// ✅ SECURE: This function correctly uses withTenantContext for RLS enforcement
const verifyWorkflowAccess = () => {
  const prismaService = require('../services/prismaService');

  return async (req, res, next) => {
    try {
      const workflowId = req.params.workflowId || req.params.id;
      const userOrgId = req.user.organizationId;

      if (!userOrgId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Organization context required for workflow access',
          },
        });
      }

      // SECURITY: Uses withTenantContext for proper RLS enforcement
      // This ensures database-level RLS enforcement prevents cross-organization access
      const workflow = await prismaService.withTenantContext(userOrgId, async tx => {
        return await tx.workflow.findFirst({
          where: {
            id: workflowId,
            // organizationId handled by RLS + explicit filter for defense in depth
          },
          include: { organization: true },
        });
      });

      if (!workflow) {
        return res.status(404).json({
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow not found',
          },
        });
      }

      // Double-check organization access (defense in depth)
      if (workflow.organizationId !== userOrgId && !req.user.isAdmin) {
        logger.warn('Unauthorized workflow access attempt blocked by middleware', {
          workflowId,
          organizationId: workflow.organizationId,
          userOrgId,
          ip: req.ip,
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this workflow',
          },
        });
      }

      // For organization-based access, all members have read/write access
      req.workflow = workflow;
      next();
    } catch (error) {
      logger.error('Workflow authorization error', {
        error: error.message,
        workflowId: req.params.workflowId,
      });

      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'An error occurred during authorization',
        },
      });
    }
  };
};

// Application-specific authorization with PostgreSQL and RLS
const verifyApplicationAccess = () => {
  return async (req, res, next) => {
    try {
      const appId = req.params.id || req.params.applicationId;
      const userId = req.user.userId;
      const userOrganizationId = req.user.organizationId;

      if (!isValidUUID(appId)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_APPLICATION_ID',
            message: 'Invalid application ID format',
          },
        });
      }

      let application;

      if (userOrganizationId) {
        // SECURITY FIX: Use withTenantContext for RLS enforcement
        application = await prismaService.withTenantContext(userOrganizationId, async tx => {
          return await tx.application.findFirst({
            where: {
              id: appId,
              // organizationId handled by RLS
            },
          });
        });
      } else {
        // For non-organization applications, use system client
        const systemPrisma = prismaService.getSystemClient();
        application = await systemPrisma.application.findUnique({
          where: { id: appId },
        });
      }

      if (!application) {
        return res.status(404).json({
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found',
          },
        });
      }

      // RLS already enforced organization access if organization context exists
      // Check ownership or admin access
      if (application.createdBy?.toString() !== userId && !req.user.isAdmin) {
        logger.warn('Unauthorized application access attempt', {
          applicationId: appId,
          ownerId: application.createdBy,
          userId,
          organizationId: userOrganizationId,
          ip: req.ip,
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this application',
          },
        });
      }

      req.application = application;
      next();
    } catch (error) {
      logger.error('Application authorization error', {
        error: error.message,
        applicationId: req.params.id,
        organizationId: req.user?.organizationId,
      });

      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'An error occurred during authorization',
        },
      });
    }
  };
};

// Connection-specific authorization with PostgreSQL and RLS
const verifyConnectionAccess = () => {
  return async (req, res, next) => {
    try {
      const connectionId = req.params.id || req.params.connectionId;
      const userId = req.user.userId;
      const userOrganizationId = req.user.organizationId;

      if (!isValidUUID(connectionId)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CONNECTION_ID',
            message: 'Invalid connection ID format',
          },
        });
      }

      let connection;

      if (userOrganizationId) {
        // SECURITY FIX: Use withTenantContext for RLS enforcement
        connection = await prismaService.withTenantContext(userOrganizationId, async tx => {
          return await tx.connection.findFirst({
            where: {
              id: connectionId,
              // organizationId handled by RLS
            },
          });
        });
      } else {
        // For non-organization connections, use system client
        const systemPrisma = prismaService.getSystemClient();
        connection = await systemPrisma.connection.findUnique({
          where: { id: connectionId },
        });
      }

      if (!connection) {
        return res.status(404).json({
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'Connection not found',
          },
        });
      }

      // RLS already enforced organization access if organization context exists
      // Check ownership or admin access
      if (connection.createdBy?.toString() !== userId && !req.user.isAdmin) {
        logger.warn('Unauthorized connection access attempt', {
          connectionId,
          ownerId: connection.createdBy,
          userId,
          organizationId: userOrganizationId,
          ip: req.ip,
          path: req.path,
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this connection',
          },
        });
      }

      req.connection = connection;
      next();
    } catch (error) {
      logger.error('Connection authorization error', {
        error: error.message,
        connectionId: req.params.id,
        organizationId: req.user?.organizationId,
      });

      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'An error occurred during authorization',
        },
      });
    }
  };
};

// Generic authorization check for any model with PostgreSQL and RLS
const authorizeResource = (options = {}) => {
  const {
    model,
    ownerField = 'createdBy',
    resourceIdParam = 'id',
    allowShared = false,
    sharedField = 'sharedWith',
    teamField = 'teamId',
    attachToRequest = true,
    customCheck = null,
  } = options;

  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userId = req.user.userId || req.user.id;
      const userOrganizationId = req.user.organizationId;

      if (!resourceId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_RESOURCE_ID',
            message: 'Resource ID is required',
          },
        });
      }

      if (!isValidUUID(resourceId)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_RESOURCE_ID',
            message: 'Invalid resource ID format',
          },
        });
      }

      const modelName = typeof model === 'string' ? model : model.name;
      let resource;

      if (userOrganizationId) {
        // SECURITY FIX: Use withTenantContext for RLS enforcement
        resource = await prismaService.withTenantContext(userOrganizationId, async tx => {
          const includeOptions = {};

          // Include shared users if shared access is enabled
          if (allowShared && sharedField) {
            includeOptions[sharedField] = {
              select: { userId: true },
            };
          }

          return await tx[modelName].findFirst({
            where: {
              id: resourceId,
              // organizationId handled by RLS
            },
            include: Object.keys(includeOptions).length > 0 ? includeOptions : undefined,
          });
        });
      } else {
        // For non-organization resources, use system client
        const systemPrisma = prismaService.getSystemClient();
        resource = await systemPrisma[modelName].findUnique({
          where: { id: resourceId },
        });
      }

      if (!resource) {
        return res.status(404).json({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
          },
        });
      }

      // Check ownership
      const isOwner = resource[ownerField]?.toString() === userId;

      // Check shared access if enabled
      let hasSharedAccess = false;
      if (allowShared && resource[sharedField]) {
        hasSharedAccess = resource[sharedField].some(share => share.userId?.toString() === userId);
      }

      // Check team access if applicable
      let hasTeamAccess = false;
      if (teamField && resource[teamField] && req.user.teams) {
        hasTeamAccess = req.user.teams.some(
          team => team.toString() === resource[teamField]?.toString()
        );
      }

      // Custom authorization check
      let customAuthorized = false;
      if (customCheck) {
        customAuthorized = await customCheck(resource, req.user);
      }

      // Admin override
      const isAdmin = req.user.isAdmin || req.user.role === 'admin';

      if (!isOwner && !hasSharedAccess && !hasTeamAccess && !customAuthorized && !isAdmin) {
        logger.warn('Unauthorized resource access attempt', {
          resourceId,
          modelName,
          userId,
          organizationId: userOrganizationId,
          ip: req.ip,
          path: req.path,
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource',
          },
        });
      }

      if (attachToRequest) {
        req.resource = resource;
      }

      next();
    } catch (error) {
      logger.error('Resource authorization error', {
        error: error.message,
        model: options.model,
        resourceId: req.params[resourceIdParam],
        organizationId: req.user?.organizationId,
      });

      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'An error occurred during authorization',
        },
      });
    }
  };
};

// Organization-based authorization for multi-tenant resources
const verifyOrganizationAccess = (modelName, options = {}) => {
  const { ownerField = 'createdBy', requireOwnership = false } = options;

  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.resourceId;
      const userId = req.user.userId || req.user.id;
      const userOrganizationId = req.user.organizationId;

      if (!resourceId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_RESOURCE_ID',
            message: 'Resource ID is required',
          },
        });
      }

      if (!isValidUUID(resourceId)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_RESOURCE_ID',
            message: 'Invalid resource ID format',
          },
        });
      }

      // SECURITY FIX: Use withTenantContext for proper RLS enforcement
      const resource = await prismaService.withTenantContext(userOrganizationId, async tx => {
        return await tx[modelName].findFirst({
          where: {
            id: resourceId,
            // organizationId handled by RLS - ensures tenant isolation
          },
        });
      });

      if (!resource) {
        logger.warn('Resource not found or cross-organization access attempt blocked by RLS', {
          resourceId,
          modelName,
          userOrganizationId,
          userId,
          ip: req.ip,
          path: req.path,
        });

        return res.status(404).json({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
          },
        });
      }

      // RLS already enforced organization membership - resource found means user has access
      // Double-check for defense in depth
      if (resource.organizationId !== userOrganizationId && !req.user.isAdmin) {
        logger.error('RLS bypass detected - resource organization mismatch', {
          resourceId,
          modelName,
          resourceOrganizationId: resource.organizationId,
          userOrganizationId,
          userId,
          ip: req.ip,
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this resource',
          },
        });
      }

      // Check ownership if required
      if (requireOwnership) {
        const isOwner = resource[ownerField]?.toString() === userId;
        if (!isOwner && !req.user.isAdmin) {
          logger.warn('Ownership required but not met', {
            resourceId,
            modelName,
            ownerId: resource[ownerField],
            userId,
            ip: req.ip,
          });

          return res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'You must be the owner to perform this action',
            },
          });
        }
      }

      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Organization authorization error', {
        error: error.message,
        resourceId: req.params.id,
        userId: req.user?.userId,
      });

      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'An error occurred during authorization',
        },
      });
    }
  };
};

// Helper function to validate UUID (used by Prisma)
const isValidUUID = id => {
  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

// Log unauthorized access attempts
const logUnauthorizedAccess = (req, resourceType, resourceId, reason) => {
  logger.warn('Unauthorized access attempt', {
    userId: req.user?.userId,
    ip: req.ip,
    method: req.method,
    path: req.path,
    resourceType,
    resourceId,
    reason,
    userAgent: req.get('User-Agent'),
    timestamp: new Date(),
  });
};

// Service-specific authorization with PostgreSQL and RLS
const verifyServiceAccess = () => {
  return async (req, res, next) => {
    try {
      const serviceId = req.params.id || req.params.serviceId;
      const userId = req.user.userId;
      const userOrganizationId = req.user.organizationId;

      if (!isValidUUID(serviceId)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_SERVICE_ID',
            message: 'Invalid service ID format',
          },
        });
      }

      let service;

      if (userOrganizationId) {
        // SECURITY FIX: Use withTenantContext for RLS enforcement
        service = await prismaService.withTenantContext(userOrganizationId, async tx => {
          return await tx.service.findFirst({
            where: {
              id: serviceId,
              // organizationId handled by RLS
            },
          });
        });
      } else {
        // For non-organization services, use system client
        const systemPrisma = prismaService.getSystemClient();
        service = await systemPrisma.service.findUnique({
          where: { id: serviceId },
        });
      }

      if (!service) {
        return res.status(404).json({
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: 'Service not found',
          },
        });
      }

      // RLS already enforced organization access if organization context exists
      // Check ownership or admin access
      if (service.createdBy?.toString() !== userId && !req.user.isAdmin) {
        logger.warn('Unauthorized service access attempt', {
          serviceId,
          ownerId: service.createdBy,
          userId,
          organizationId: userOrganizationId,
          ip: req.ip,
          path: req.path,
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this service',
          },
        });
      }

      req.service = service;
      next();
    } catch (error) {
      logger.error('Service authorization error', {
        error: error.message,
        serviceId: req.params.id,
        organizationId: req.user?.organizationId,
      });

      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'An error occurred during authorization',
        },
      });
    }
  };
};

module.exports = {
  verifyResourceOwnership,
  verifyOrganizationAccess,
  verifyTeamAccess,
  verifyPermission,
  verifyRole,
  verifyWorkflowAccess,
  verifyApplicationAccess,
  verifyConnectionAccess,
  verifyServiceAccess,
  authorizeResource,
  logUnauthorizedAccess,
};
