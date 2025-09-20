const { PrismaClient } = require('../prisma/generated/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();
const { logger } = require('./logger');

class AuthenticationError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const { getConfiguredApiKey } = require('../utils/headerUtils');

const consolidatedApiKeyMiddleware = async (req, res, next) => {
  const requestStart = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    // 1. Validate API key exists (support both headers and query parameters for backward compatibility)
    const { apiKey, headerUsed } = getConfiguredApiKey(req);
    if (headerUsed === 'x-nectarstudio-string-api-key') {
      req.isLegacyClient = true;
    }
    if (headerUsed === 'query:api_key') {
      req.isLegacyClient = true;
    }

    if (!apiKey) {
      throw new AuthenticationError('API key missing or invalid', 401);
    }

    // 2. Find and validate application
    // First try to find by prefix for efficiency
    const apiKeyPrefix = apiKey.substring(0, 8);
    const potentialApps = await prisma.application.findMany({
      where: { apiKeyPrefix },
      include: {
        defaultRole: {
          include: {
            service: true,
          },
        },
        organization: true,
      },
    });

    // Validate API key against hashes
    let application = null;
    for (const app of potentialApps) {
      const isValid = await bcryptjs.compare(apiKey, app.apiKeyHash);
      if (isValid) {
        application = app;
        break;
      }
    }

    if (!application || !application.isActive) {
      throw new AuthenticationError('Invalid or inactive API key', 401);
    }

    if (!application.defaultRole || !application.defaultRole.isActive) {
      throw new AuthenticationError('No active role associated with this application', 403);
    }

    // Extract permissions for processing
    const permissions = Array.isArray(application.defaultRole.permissions)
      ? application.defaultRole.permissions
      : [];

    logger.info('Role and permissions check', {
      requestId,
      role: application.defaultRole.name,
      permissionCount: permissions.length,
    });

    // 3. Parse URL for service and procedure
    const serviceName = req.params.serviceName;
    const procedureName = req.params.procedureName;

    if (!serviceName || !procedureName) {
      throw new AuthenticationError('Invalid API URL format', 400, {
        expectedFormat: '/api/v2/{service}/_proc/{procedure}',
      });
    }

    // 4. Find and validate service
    const service = await prisma.service.findFirst({
      where: {
        name: serviceName,
        isActive: true,
        organizationId: application.organizationId, // Multi-tenant security
      },
    });

    if (!service) {
      throw new AuthenticationError('Service not found or inactive', 404, {
        serviceName,
      });
    }

    // 5. Validate procedure permission
    // Check if the role has permission for this procedure and service
    const hasPermission = permissions.some(perm => {
      try {
        return (
          perm.serviceId &&
          perm.serviceId === service.id && // Match service ID
          (perm.objectName === procedureName || // Match procedure name directly
            perm.objectName === `/proc/${procedureName}`) && // Match with /proc/ prefix
          perm.actions &&
          perm.actions[req.method]
        ); // Check method permission
      } catch (err) {
        logger.warn('Error checking permission', {
          error: err.message,
          permission: perm,
          requestId,
        });
        return false;
      }
    });

    if (!hasPermission) {
      throw new AuthenticationError('Insufficient permissions', 403, {
        procedure: procedureName,
        service: serviceName,
        method: req.method,
      });
    }

    // Set consistent request properties
    req.application = application;
    req.service = service;
    req.role = application.defaultRole;
    req.procedureName = procedureName;

    logger.info('Authentication successful', {
      requestId,
      application: application.name,
      service: service.name,
      procedure: procedureName,
      processingTime: Date.now() - requestStart,
    });

    next();
  } catch (error) {
    const errorResponse = {
      message: error.message,
      requestId,
    };

    if (error instanceof AuthenticationError) {
      if (error.details) {
        errorResponse.details = error.details;
      }

      logger.warn('Authentication failed', {
        requestId,
        error: error.message,
        details: error.details,
        processingTime: Date.now() - requestStart,
      });

      return res.status(error.statusCode).json(errorResponse);
    }

    logger.error('Authentication error', {
      requestId,
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - requestStart,
    });

    return res.status(500).json({
      message: 'Internal server error',
      requestId,
    });
  }
};

module.exports = { consolidatedApiKeyMiddleware };
