const { getRedisService } = require('../services/redisService');
const { logger } = require('./logger');
const crypto = require('crypto');

/**
 * Advanced rate limiting middleware with Redis backend and fallback
 */

// In-memory store fallback for when Redis is unavailable
class InMemoryStore {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  async increment(key, windowMs) {
    const now = Date.now();
    const resetTime = now + windowMs;

    if (!this.store.has(key)) {
      this.store.set(key, { count: 1, resetTime });

      // Auto-cleanup after window expires
      const timer = setTimeout(() => {
        this.store.delete(key);
        this.timers.delete(key);
      }, windowMs);

      this.timers.set(key, timer);

      return { totalHits: 1, resetTime };
    }

    const record = this.store.get(key);
    if (now > record.resetTime) {
      // Window expired, reset
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
    }

    return { totalHits: record.count, resetTime: record.resetTime };
  }

  async reset(key) {
    this.store.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}

// Rate limiter configuration factory
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    max = 100, // max requests per window
    message = 'Too many requests, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    keyGenerator = req => req.ip,
    skip = () => false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    requestPropertyName = 'rateLimit',
    handler = null,
    onLimitReached = null,
    store = null, // Will be set dynamically
    prefix = 'rl:',
    // Advanced options
    points = null, // For more complex rate limiting (points consumed per request)
    blockDuration = null, // Block duration after limit reached
    execEvenly = false, // Spread requests evenly
    keyPrefix = '',
    tableName = '',
    storeClient = null,
    insuranceLimiter = null, // Backup limiter
    customResponseSchema = null,
    // Dynamic rate limiting
    dynamicRateLimit = null, // Function to determine rate limit based on user/request
    // Distributed rate limiting
    enableDistributed = true,
    nodeId = process.env.NODE_ID || crypto.randomBytes(4).toString('hex'),
  } = options;

  let inMemoryStore = new InMemoryStore();
  let redisAvailable = false;
  let redisService = null;

  // Initialize Redis connection
  const initializeRedis = async () => {
    try {
      redisService = await getRedisService();
      redisAvailable = redisService && redisService.isConnected;
      if (redisAvailable) {
        logger.info('Rate limiter using Redis store');
      } else {
        logger.warn('Rate limiter falling back to in-memory store');
      }
    } catch (error) {
      logger.error('Failed to initialize Redis for rate limiting', { error: error.message });
      redisAvailable = false;
    }
  };

  // Initialize Redis on first use
  initializeRedis();

  return async (req, res, next) => {
    // Skip if configured
    if (skip(req, res)) {
      return next();
    }

    try {
      // Generate key for this request
      const key = `${prefix}${keyPrefix}${keyGenerator(req)}`;

      // Get dynamic rate limit if configured
      const dynamicMax = dynamicRateLimit ? await dynamicRateLimit(req) : max;
      const dynamicWindowMs = dynamicRateLimit
        ? (await dynamicRateLimit(req)).windowMs || windowMs
        : windowMs;

      let totalHits, resetTime;

      if (redisAvailable && redisService) {
        try {
          // Use Redis with atomic increment
          const multi = redisService.getClient().multi();

          multi.incr(key);
          multi.expire(key, Math.ceil(dynamicWindowMs / 1000));

          const results = await multi.exec();
          totalHits = results[0][1];

          // Get TTL for reset time
          const ttl = await redisService.getClient().ttl(key);
          resetTime = Date.now() + ttl * 1000;

          // Handle distributed rate limiting
          if (enableDistributed) {
            const distributedKey = `${key}:distributed`;
            const nodeCount = await redisService.getClient().scard(`${prefix}nodes`);

            if (nodeCount > 1) {
              // Adjust limit based on number of nodes
              const adjustedMax = Math.ceil(dynamicMax / nodeCount);
              if (totalHits > adjustedMax) {
                totalHits = dynamicMax + 1; // Force limit exceeded
              }
            }

            // Register this node
            await redisService.getClient().sadd(`${prefix}nodes`, nodeId);
            await redisService.getClient().expire(`${prefix}nodes`, 300); // 5 min TTL
          }

          // Implement execEvenly option
          if (execEvenly && totalHits <= dynamicMax) {
            const delay = Math.floor(dynamicWindowMs / dynamicMax);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          logger.error('Redis rate limit error, falling back to in-memory', {
            error: error.message,
          });
          redisAvailable = false;
          const result = await inMemoryStore.increment(key, dynamicWindowMs);
          totalHits = result.totalHits;
          resetTime = result.resetTime;
        }
      } else {
        // Use in-memory store
        const result = await inMemoryStore.increment(key, dynamicWindowMs);
        totalHits = result.totalHits;
        resetTime = result.resetTime;
      }

      // Store rate limit info on request
      req[requestPropertyName] = {
        limit: dynamicMax,
        current: totalHits,
        remaining: Math.max(0, dynamicMax - totalHits),
        resetTime: new Date(resetTime),
      };

      // Set headers if enabled
      if (standardHeaders) {
        res.setHeader('RateLimit-Limit', dynamicMax);
        res.setHeader('RateLimit-Remaining', req[requestPropertyName].remaining);
        res.setHeader('RateLimit-Reset', new Date(resetTime).toISOString());
        res.setHeader('RateLimit-Policy', `${dynamicMax};w=${Math.ceil(dynamicWindowMs / 1000)}`);
      }

      if (legacyHeaders) {
        res.setHeader('X-RateLimit-Limit', dynamicMax);
        res.setHeader('X-RateLimit-Remaining', req[requestPropertyName].remaining);
        res.setHeader('X-RateLimit-Reset', resetTime);
      }

      // Check if limit exceeded
      if (totalHits > dynamicMax) {
        logger.warn('Rate limit exceeded', {
          key,
          totalHits,
          limit: dynamicMax,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        // Call onLimitReached callback if provided
        if (onLimitReached) {
          await onLimitReached(req, res, options);
        }

        // Apply block duration if configured
        if (blockDuration && redisAvailable) {
          const blockKey = `${key}:blocked`;
          await redisService.getClient().set(blockKey, '1', 'EX', blockDuration);
        }

        // Custom handler or default response
        if (handler) {
          return handler(req, res, next, options);
        }

        // Custom response schema
        if (customResponseSchema) {
          return res.status(429).json(customResponseSchema);
        }

        // Default response
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: typeof message === 'function' ? message(req, res) : message,
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
            limit: dynamicMax,
            current: totalHits,
          },
        });

        return;
      }

      // Check if blocked (from previous limit exceeded)
      if (blockDuration && redisAvailable) {
        const blockKey = `${key}:blocked`;
        const isBlocked = await redisService.getClient().get(blockKey);

        if (isBlocked) {
          const ttl = await redisService.getClient().ttl(blockKey);
          return res.status(429).json({
            error: {
              code: 'TEMPORARILY_BLOCKED',
              message: 'You have been temporarily blocked due to too many requests',
              retryAfter: ttl,
            },
          });
        }
      }

      // Skip counting successful/failed requests if configured
      const originalSend = res.send;
      const originalJson = res.json;

      if (skipSuccessfulRequests || skipFailedRequests) {
        const checkAndResetCount = async () => {
          const statusCode = res.statusCode;
          const shouldSkip =
            (skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400);

          if (shouldSkip && totalHits === 1) {
            // Reset the count since we're skipping this request
            if (redisAvailable) {
              await redisService.getClient().del(key);
            } else {
              await inMemoryStore.reset(key);
            }
          }
        };

        res.send = function (...args) {
          checkAndResetCount();
          return originalSend.apply(res, args);
        };

        res.json = function (...args) {
          checkAndResetCount();
          return originalJson.apply(res, args);
        };
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error', { error: error.message });
      // Fail open - allow request on error
      next();
    }
  };
};

// Pre-configured rate limiters
const rateLimiters = {
  // Standard API rate limiter
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: 'Too many API requests, please try again later.',
    keyPrefix: 'api:',
    standardHeaders: true,
    skip: req => process.env.NODE_ENV === 'test',
  }),

  // Strict auth rate limiter
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
    keyPrefix: 'auth:',
    blockDuration: 60 * 60, // Block for 1 hour after limit
    skipSuccessfulRequests: true,
    onLimitReached: async (req, res, options) => {
      logger.warn('Potential brute force attack', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
      });
    },
  }),

  // File upload rate limiter
  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Too many file uploads, please try again later.',
    keyPrefix: 'upload:',
    points: 5, // Each upload consumes 5 points
  }),

  // GraphQL rate limiter with query complexity
  graphql: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200,
    message: 'Too many GraphQL requests, please try again later.',
    keyPrefix: 'graphql:',
    dynamicRateLimit: async req => {
      // Adjust based on query complexity
      const complexity = req.body?.query?.length || 0;
      return {
        max: complexity > 1000 ? 50 : 200,
        windowMs: 5 * 60 * 1000,
      };
    },
  }),

  // Per-user rate limiter
  user: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000,
    message: 'Too many requests, please try again later.',
    keyPrefix: 'user:',
    keyGenerator: req => req.user?.id || req.ip,
    dynamicRateLimit: async req => {
      // Different limits based on user tier
      const userTier = req.user?.tier || 'free';
      const limits = {
        free: 100,
        basic: 500,
        premium: 2000,
        enterprise: 10000,
      };
      return {
        max: limits[userTier] || 100,
        windowMs: 60 * 60 * 1000,
      };
    },
  }),

  // WebSocket/real-time rate limiter
  websocket: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 1 per second average
    message: 'Too many WebSocket messages, please slow down.',
    keyPrefix: 'ws:',
    execEvenly: true, // Spread requests evenly
  }),
};

// Utility to create custom rate limiters
const createCustomRateLimiter = (name, options) => {
  rateLimiters[name] = createRateLimiter(options);
  return rateLimiters[name];
};

// Reset rate limit for a specific key
const resetRateLimit = async key => {
  try {
    const redisService = await getRedisService();
    if (redisService && redisService.isConnected) {
      await redisService.getClient().del(key);
    }
  } catch (error) {
    logger.error('Failed to reset rate limit', { error: error.message });
  }
};

module.exports = {
  createRateLimiter,
  rateLimiters,
  createCustomRateLimiter,
  resetRateLimit,
  // Maintain backward compatibility
  apiRateLimiter: rateLimiters.api,
  loginRateLimiter: rateLimiters.auth,
};
