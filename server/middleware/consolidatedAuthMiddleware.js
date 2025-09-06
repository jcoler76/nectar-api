const mongoose = require('mongoose');

const Application = require('../models/Application');
const Service = require('../models/Service');

const { logger } = require('./logger');

class AuthenticationError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Helper function for case-insensitive header lookup
function getHeaderCaseInsensitive(headers, targetHeader) {
  // First try exact match (most common)
  if (headers[targetHeader]) {
    return headers[targetHeader];
  }

  // Then try case-insensitive search
  const lowerTarget = targetHeader.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerTarget) {
      return value;
    }
  }
  return null;
}

const consolidatedApiKeyMiddleware = async (req, res, next) => {
  const requestStart = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    // 1. Validate API key exists (support both headers and query parameters for backward compatibility)
    let apiKey = null;
    let usedDreamFactoryHeader = false;

    // Check for Mirabel API key (case-insensitive)
    apiKey = getHeaderCaseInsensitive(req.headers, 'x-mirabel-api-key');

    // Check for DreamFactory API key (case-insensitive) if Mirabel key not found
    if (!apiKey) {
      apiKey = getHeaderCaseInsensitive(req.headers, 'x-dreamfactory-api-key');
      if (apiKey) {
        usedDreamFactoryHeader = true;
      }
    }

    // Fallback to query parameters for legacy clients
    if (!apiKey) {
      apiKey = req.query.api_key;
      if (apiKey) {
        // Treat query parameter API key usage as legacy client
        req.isLegacyClient = true;
      }
    }

    // Mark as legacy client if DreamFactory header was used
    if (usedDreamFactoryHeader) {
      req.isLegacyClient = true;
    }

    if (!apiKey) {
      throw new AuthenticationError('API key required', 401);
    }

    // 2. Find and validate application
    // First try to find by prefix for efficiency
    const apiKeyPrefix = apiKey.substring(0, 4);
    const potentialApps = await Application.find({ apiKeyPrefix })
      .select('+apiKeyHash')
      .populate({
        path: 'defaultRole',
        populate: {
          path: 'permissions',
        },
      })
      .exec();

    // Validate API key against hashes
    let application = null;
    for (const app of potentialApps) {
      const isValid = await Application.validateApiKey(apiKey, app.apiKeyHash);
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

    logger.info('Role and permissions check', {
      requestId,
      role: application.defaultRole.name,
      permissionCount: application.defaultRole.permissions
        ? application.defaultRole.permissions.length
        : 0,
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
    const service = await Service.findOne({
      name: serviceName,
      isActive: true,
    });

    if (!service) {
      throw new AuthenticationError('Service not found or inactive', 404, {
        serviceName,
      });
    }

    // 5. Validate procedure permission
    // Check if the role has permission for this procedure and service
    const hasPermission = application.defaultRole.permissions.some(perm => {
      try {
        // Convert subdocument to plain object if needed
        const permission = perm.toObject ? perm.toObject() : perm;

        return (
          permission.serviceId &&
          permission.serviceId.toString() === service._id.toString() && // Match service
          (permission.objectName === procedureName || // Match procedure name directly
            permission.objectName === `/proc/${procedureName}`) && // Match with /proc/ prefix
          permission.actions &&
          permission.actions[req.method]
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
