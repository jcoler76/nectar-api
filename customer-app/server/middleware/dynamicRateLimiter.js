const rateLimitService = require('../services/rateLimitService');

/**
 * Dynamic rate limiter that uses database configuration
 * This middleware replaces the hardcoded rate limiters with database-driven ones
 */
function createDynamicRateLimiter(configName) {
  return async (req, res, next) => {
    try {
      const result = await rateLimitService.checkRateLimit(configName, req);

      if (!result.allowed) {
        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': result.maxAllowed,
          'X-RateLimit-Remaining': Math.max(0, result.maxAllowed - result.currentCount),
          'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000),
          'X-RateLimit-Config': result.configName,
          'X-RateLimit-Source': result.source,
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000),
        });

        // Log rate limit violation
        console.warn(`Rate limit exceeded: ${result.configName}`, {
          key: result.key,
          currentCount: result.currentCount,
          maxAllowed: result.maxAllowed,
          source: result.source,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          application: req.application?.name,
          role: req.role?.name,
          service: req.service?.name,
          procedure: req.procedureName,
        });

        return res.status(429).json({
          success: false,
          message: `Too many requests. Rate limit exceeded for ${result.source}.`,
          error: {
            type: 'RATE_LIMIT_EXCEEDED',
            config: result.configName,
            current: result.currentCount,
            max: result.maxAllowed,
            resetTime: result.resetTime,
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          },
        });
      }

      // Add informational headers for successful requests
      res.set({
        'X-RateLimit-Limit': result.maxAllowed,
        'X-RateLimit-Remaining': Math.max(0, result.maxAllowed - result.currentCount),
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000),
        'X-RateLimit-Config': result.configName,
        'X-RateLimit-Source': result.source,
      });

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if there's an error
      next();
    }
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
module.exports = {
  createDynamicRateLimiter,

  // Common rate limiters
  apiLimiter: createDynamicRateLimiter('api'),
  authLimiter: createDynamicRateLimiter('auth'),
  uploadLimiter: createDynamicRateLimiter('upload'),
  graphqlLimiter: createDynamicRateLimiter('graphql'),
  websocketLimiter: createDynamicRateLimiter('websocket'),
};
