const prismaService = require('../services/prismaService');
const bcryptjs = require('bcryptjs');
const { logger } = require('./logger');

// SECURITY FIX: Using withTenantContext for proper tenant isolation
const { getConfiguredApiKey } = require('../utils/headerUtils');

class AuthenticationError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const apiKeyServiceMiddleware = async (req, res, next) => {
  const started = Date.now();
  try {
    const { apiKey } = getConfiguredApiKey(req);
    if (!apiKey) throw new AuthenticationError('API key missing or invalid', 401);

    const prefix = apiKey.substring(0, 8);
    // SECURITY NOTE: This initial lookup must be global since we don't know the organization yet
    // Using system client for API key authentication - this is the exception to RLS rule
    const systemPrisma = prismaService.getSystemClient();
    const apps = await systemPrisma.application.findMany({
      where: { apiKeyPrefix: prefix },
      include: { defaultRole: true, organization: true },
    });
    let application = null;
    for (const app of apps) {
      const ok = await bcryptjs.compare(apiKey, app.apiKeyHash);
      if (ok) {
        application = app;
        break;
      }
    }
    if (!application || !application.isActive) {
      throw new AuthenticationError('Invalid or inactive API key', 401);
    }

    const serviceName = req.params.serviceName;
    if (!serviceName) {
      throw new AuthenticationError('Missing service name in URL', 400, {
        expectedFormat: '/api/v2/{service}/_table/...',
      });
    }

    // SECURITY FIX: Once we have organization context, use proper RLS for service lookup
    const service = await prismaService.withTenantContext(application.organizationId, async tx => {
      return await tx.service.findFirst({
        where: { name: serviceName, isActive: true },
      });
    });
    if (!service) {
      throw new AuthenticationError('Service not found or inactive', 404, { serviceName });
    }

    req.application = application;
    req.organization = application.organization;
    req.role = application.defaultRole;
    req.service = service;

    logger.info('API key auth success (auto-rest)', {
      service: service.name,
      org: application.organizationId,
      ms: Date.now() - started,
    });
    next();
  } catch (error) {
    const status = error.statusCode || 500;
    logger.warn('API key auth failed (auto-rest)', {
      message: error.message,
      details: error.details,
    });
    res
      .status(status)
      .json({ error: { code: 'AUTH_FAILED', message: error.message, details: error.details } });
  }
};

module.exports = { apiKeyServiceMiddleware };
