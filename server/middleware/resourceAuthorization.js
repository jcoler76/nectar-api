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

      // Get Prisma client and find the resource
      const prisma = await prismaService.getClient();
      const resource = await prisma[modelName].findUnique({
        where: { id: resourceId }
      });

      if (!resource) {
        logger.warn('Resource not found during authorization check', {
          resourceId,
          modelName,
          userId,
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
      if (resource.organizationId && req.user.organizationId) {
        hasOrganizationAccess = resource.organizationId === req.user.organizationId;
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

// Team/shared resource authorization
const verifyTeamAccess = (Model, teamField = 'teamId') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.resourceId;
      const userId = req.user.userId || req.user.id;
      const userTeams = req.user.teams || [];

      // Find the resource
      const resource = await Model.findById(resourceId);

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
          model: Model.modelName,
          resourceTeam,
          userTeams,
          userId,
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

// Workflow-specific authorization
const verifyWorkflowAccess = () => {
  const { PrismaClient } = require('../prisma/generated/client');
  const prisma = new PrismaClient();

  return async (req, res, next) => {
    try {
      const workflowId = req.params.workflowId || req.params.id;
      const userOrgId = req.user.organizationId;

      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { organization: true }
      });

      if (!workflow) {
        return res.status(404).json({
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow not found',
          },
        });
      }

      // Check organization access (org-level security in new model)
      const hasOrgAccess = workflow.organizationId === userOrgId;

      if (!hasOrgAccess && !req.user.isAdmin) {
        logger.warn('Unauthorized workflow access attempt', {
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
      // More granular permissions can be implemented later if needed

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

// Application-specific authorization
const verifyApplicationAccess = () => {
  const Application = require('../models/Application');

  return async (req, res, next) => {
    try {
      const appId = req.params.id || req.params.applicationId;
      const userId = req.user.userId;

      const application = await Application.findById(appId);

      if (!application) {
        return res.status(404).json({
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found',
          },
        });
      }

      // Check ownership or admin access
      if (application.createdBy?.toString() !== userId && !req.user.isAdmin) {
        logger.warn('Unauthorized application access attempt', {
          applicationId: appId,
          ownerId: application.createdBy,
          userId,
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

// Connection-specific authorization
const verifyConnectionAccess = () => {
  const Connection = require('../models/Connection');

  return async (req, res, next) => {
    try {
      const connectionId = req.params.id || req.params.connectionId;
      const userId = req.user.userId;

      const connection = await Connection.findById(connectionId).select('+password');

      if (!connection) {
        return res.status(404).json({
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'Connection not found',
          },
        });
      }

      // Check ownership or admin access
      if (connection.createdBy?.toString() !== userId && !req.user.isAdmin) {
        logger.warn('Unauthorized connection access attempt', {
          connectionId,
          ownerId: connection.createdBy,
          userId,
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

// Generic authorization check for any model
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

      if (!resourceId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_RESOURCE_ID',
            message: 'Resource ID is required',
          },
        });
      }

      const Model = typeof model === 'string' ? require(`../models/${model}`) : model;
      const resource = await Model.findById(resourceId);

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
          model: Model.modelName,
          userId,
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

      const prisma = await prismaService.getClient();
      const resource = await prisma[modelName].findUnique({
        where: { id: resourceId }
      });

      if (!resource) {
        return res.status(404).json({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
          },
        });
      }

      // Check organization membership first
      const hasOrganizationAccess = resource.organizationId === userOrganizationId;
      
      if (!hasOrganizationAccess) {
        logger.warn('Cross-organization access attempt', {
          resourceId,
          modelName,
          resourceOrganizationId: resource.organizationId,
          userOrganizationId,
          userId,
          ip: req.ip,
          path: req.path,
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

// Service-specific authorization
const verifyServiceAccess = () => {
  const Service = require('../models/Service');

  return async (req, res, next) => {
    try {
      const serviceId = req.params.id || req.params.serviceId;
      const userId = req.user.userId;

      const service = await Service.findById(serviceId).select('+password');

      if (!service) {
        return res.status(404).json({
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: 'Service not found',
          },
        });
      }

      // Check ownership or admin access
      if (service.createdBy?.toString() !== userId && !req.user.isAdmin) {
        logger.warn('Unauthorized service access attempt', {
          serviceId,
          ownerId: service.createdBy,
          userId,
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
