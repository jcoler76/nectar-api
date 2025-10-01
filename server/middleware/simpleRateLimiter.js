/**
 * Simple Rate Limiter - Lightweight and Reliable
 *
 * Minimal rate limiting without complex dependencies
 * Focused on basic protection without hanging risks
 */

const { logger } = require('../utils/logger');

class SimpleRateLimiter {
  constructor() {
    // In-memory store for rate limiting
    this.requests = new Map();
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Create a simple rate limiter middleware
   */
  createLimiter(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      maxRequests = 5, // 5 attempts per window
      keyGenerator = req => req.ip,
      skipSuccessfulRequests = false,
      message = 'Too many requests, please try again later',
    } = options;

    return (req, res, next) => {
      const key = keyGenerator(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get or create record for this key
      let record = this.requests.get(key) || { requests: [], firstRequest: now };

      // Remove old requests outside the window
      record.requests = record.requests.filter(time => time > windowStart);

      // Check if limit exceeded
      if (record.requests.length >= maxRequests) {
        logger.warn('Rate limit exceeded', {
          key: key.substring(0, 10) + '...', // Partial IP for privacy
          requestCount: record.requests.length,
          path: req.path,
          userAgent: req.headers['user-agent']?.substring(0, 100),
        });

        return res.status(429).json({
          success: false,
          message,
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      // Add this request (unless skipping successful requests and this succeeds)
      if (!skipSuccessfulRequests) {
        record.requests.push(now);
      } else {
        // We'll add it after the response if it fails
        const originalJson = res.json;
        res.json = function (data) {
          // Add to rate limit count only if this was a failed request
          if (!data.success) {
            record.requests.push(now);
            this.requests.set(key, record);
          }
          return originalJson.call(this, data);
        }.bind(this);
      }

      // Update the record
      this.requests.set(key, record);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - record.requests.length),
        'X-RateLimit-Reset': Math.ceil((now + windowMs) / 1000),
      });

      next();
    };
  }

  /**
   * Cleanup old records
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, record] of this.requests.entries()) {
      if (now - record.firstRequest > maxAge) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Start cleanup timer
   */
  startCleanup() {
    setInterval(() => {
      try {
        this.cleanup();
      } catch (error) {
        logger.debug('Rate limiter cleanup error:', error);
      }
    }, this.cleanupInterval);
  }
}

// Create singleton instance
const rateLimiter = new SimpleRateLimiter();

// Pre-configured limiters for common use cases
module.exports = {
  // Strict auth rate limiting - only 5 login attempts per 15 minutes
  authLimiter: rateLimiter.createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: true, // Only count failed login attempts
    message: 'Too many login attempts. Please try again in 15 minutes.',
  }),

  // Basic API rate limiting - 100 requests per minute
  basicApiLimiter: rateLimiter.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'API rate limit exceeded. Please slow down.',
  }),

  // Create custom limiter
  createLimiter: rateLimiter.createLimiter.bind(rateLimiter),
};
