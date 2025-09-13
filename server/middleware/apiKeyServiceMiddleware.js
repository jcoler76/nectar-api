const { PrismaClient } = require('../prisma/generated/client');
const bcryptjs = require('bcryptjs');
const { logger } = require('./logger');

const prisma = new PrismaClient();

class AuthenticationError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function getHeaderCaseInsensitive(headers, targetHeader) {
  if (headers[targetHeader]) return headers[targetHeader];
  const lower = targetHeader.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

const apiKeyServiceMiddleware = async (req, res, next) => {
  const started = Date.now();
  try {
    let apiKey = getHeaderCaseInsensitive(req.headers, 'x-nectarstudio-api-key');
    if (!apiKey) apiKey = req.query.api_key;
    if (!apiKey) throw new AuthenticationError('API key required', 401);

    const prefix = apiKey.substring(0, 4);
    const apps = await prisma.application.findMany({
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

    const service = await prisma.service.findFirst({
      where: { name: serviceName, isActive: true, organizationId: application.organizationId },
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
