const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const { logger } = require('../utils/logger');

// Compression middleware for responses
const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
});

// Rate limiting per organization
const createOrganizationRateLimit = (windowMs = 15 * 60 * 1000, max = 1000) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: req => {
      // Rate limit by organization ID
      return req.user?.organizationId || req.ip;
    },
    message: {
      error: 'Too many requests from your organization, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: (req, res, options) => {
      logger.warn('Rate limit exceeded', {
        organizationId: req.user?.organizationId,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
    },
  });
};

// Database connection pooling optimization
const optimizeDatabaseQueries = (req, res, next) => {
  const startTime = Date.now();

  // Log slow queries
  const originalQuery = req.prisma?.$executeRaw;
  if (originalQuery) {
    req.prisma.$executeRaw = async (...args) => {
      const queryStartTime = Date.now();
      const result = await originalQuery.apply(req.prisma, args);
      const queryDuration = Date.now() - queryStartTime;

      if (queryDuration > 1000) {
        // Log queries slower than 1 second
        logger.warn('Slow database query detected', {
          duration: queryDuration,
          organizationId: req.user?.organizationId,
          path: req.path,
          method: req.method,
        });
      }

      return result;
    };
  }

  // Log slow API responses
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    if (duration > 3000) {
      // Log responses slower than 3 seconds
      logger.warn('Slow API response detected', {
        duration,
        organizationId: req.user?.organizationId,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
      });
    }
  });

  next();
};

// Caching middleware for expensive operations
const cacheExpensiveOperations = () => {
  const cache = new Map();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key
    const cacheKey = `${req.user?.organizationId || 'anonymous'}:${req.originalUrl}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug('Cache hit', { cacheKey, path: req.path });
      return res.json(cached.data);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function (data) {
      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });

        // Cleanup old cache entries
        if (cache.size > 1000) {
          const entries = Array.from(cache.entries());
          entries.slice(0, 100).forEach(([key]) => cache.delete(key));
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = {
  compressionMiddleware,
  createOrganizationRateLimit,
  optimizeDatabaseQueries,
  cacheExpensiveOperations,
};
