const rateLimitService = require('../services/rateLimitService');

// Lazy load securityMonitoring to avoid blocking module initialization
let securityMonitoring = null;
function getSecurityMonitoring() {
  if (!securityMonitoring) {
    try {
      securityMonitoring = require('../services/securityMonitoringService').securityMonitoring;
    } catch (error) {
      securityMonitoring = null; // Mark as attempted but failed
    }
  }
  return securityMonitoring;
}

/**
 * Enhanced Dynamic Rate Limiter
 * - Supports IP, user, and organization-based rate limiting
 * - Integrates with security monitoring for suspicious activity detection
 * - Progressive rate limiting based on risk assessment
 */
function createDynamicRateLimiter(configName, options = {}) {
  const {
    perUser = false,
    perOrganization = false,
    progressive = true, // Enable progressive limiting based on security score
    baseLimit = 100,
    windowMs = 60 * 1000, // 1 minute default
  } = options;

  return async (req, res, next) => {
    try {
      // Get base rate limit result
      let result = await rateLimitService.checkRateLimit(configName, req);

      // Enhanced rate limiting with user/org/progressive logic
      if (perUser || perOrganization || progressive) {
        result = await applyEnhancedRateLimit(req, result, {
          perUser,
          perOrganization,
          progressive,
          baseLimit,
          windowMs,
          configName,
        });
      }

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
 * Apply enhanced rate limiting logic
 */
async function applyEnhancedRateLimit(req, baseResult, options) {
  const { perUser, perOrganization, progressive, baseLimit, windowMs, configName } = options;

  try {
    // Create rate limiting counters in memory (could be moved to Redis)
    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }
    const rateLimitStore = global.rateLimitStore;
    const now = Date.now();

    let effectiveLimit = baseResult.maxAllowed || baseLimit;
    let currentCount = baseResult.currentCount || 0;
    let resetTime = baseResult.resetTime || now + windowMs;

    // Progressive rate limiting based on security risk
    if (progressive) {
      const securityService = getSecurityMonitoring();
      const ipRisk = securityService?.getRiskAssessment?.('ip', req.ip) || { level: 'LOW' };
      const userRisk =
        req.user && securityService?.getRiskAssessment
          ? securityService.getRiskAssessment('user', req.user.userId) || { level: 'LOW' }
          : { level: 'LOW' };

      // Adjust limits based on risk level
      const riskMultipliers = {
        LOW: 1.0,
        MEDIUM: 0.7,
        HIGH: 0.4,
        CRITICAL: 0.1,
      };

      const ipMultiplier = riskMultipliers[ipRisk.level] || 1.0;
      const userMultiplier = riskMultipliers[userRisk.level] || 1.0;

      // Use the most restrictive multiplier
      const finalMultiplier = Math.min(ipMultiplier, userMultiplier);
      effectiveLimit = Math.floor(effectiveLimit * finalMultiplier);

      // Minimum of 5 requests even for high-risk
      effectiveLimit = Math.max(effectiveLimit, 5);
    }

    // Per-user rate limiting
    if (perUser && req.user) {
      const userKey = `${configName}:user:${req.user.userId}`;
      const userLimit = await getOrUpdateRateLimit(
        rateLimitStore,
        userKey,
        effectiveLimit,
        windowMs
      );

      if (userLimit.currentCount >= userLimit.maxAllowed) {
        return {
          allowed: false,
          maxAllowed: userLimit.maxAllowed,
          currentCount: userLimit.currentCount,
          resetTime: userLimit.resetTime,
          configName: `${configName}:user`,
          source: 'user-limit',
          key: userKey,
        };
      }

      // Update counts
      currentCount = Math.max(currentCount, userLimit.currentCount);
    }

    // Per-organization rate limiting
    if (perOrganization && req.user?.organizationId) {
      const orgKey = `${configName}:org:${req.user.organizationId}`;
      const orgLimit = await getOrUpdateRateLimit(
        rateLimitStore,
        orgKey,
        effectiveLimit * 10,
        windowMs
      ); // 10x limit for org

      if (orgLimit.currentCount >= orgLimit.maxAllowed) {
        return {
          allowed: false,
          maxAllowed: orgLimit.maxAllowed,
          currentCount: orgLimit.currentCount,
          resetTime: orgLimit.resetTime,
          configName: `${configName}:org`,
          source: 'organization-limit',
          key: orgKey,
        };
      }
    }

    // Track rapid requests for security monitoring (non-blocking)
    if (currentCount > baseLimit * 0.8) {
      const securityService = getSecurityMonitoring();
      if (securityService?.trackRapidRequests) {
        securityService
          .trackRapidRequests({
            ip: req.ip,
            userId: req.user?.userId,
            requestCount: currentCount,
            timeWindow: windowMs,
            userAgent: req.headers['user-agent'],
            paths: [req.path],
          })
          .catch(() => {}); // Silently ignore errors to avoid blocking
      }
    }

    return {
      allowed: currentCount < effectiveLimit,
      maxAllowed: effectiveLimit,
      currentCount: currentCount + 1,
      resetTime,
      configName,
      source: baseResult.source || 'enhanced',
      key: baseResult.key,
    };
  } catch (error) {
    console.error('Enhanced rate limiting error:', error);
    // Fall back to base result on error
    return baseResult;
  }
}

/**
 * Get or update rate limit counter
 */
async function getOrUpdateRateLimit(store, key, maxAllowed, windowMs) {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetTime) {
    // Create new window
    const newRecord = {
      currentCount: 1,
      maxAllowed,
      resetTime: now + windowMs,
      firstRequest: now,
    };
    store.set(key, newRecord);
    return newRecord;
  }

  // Update existing window
  existing.currentCount += 1;
  return existing;
}

/**
 * Pre-configured rate limiters for common use cases
 */
module.exports = {
  createDynamicRateLimiter,

  // Enhanced rate limiters with per-user/org support
  apiLimiter: createDynamicRateLimiter('api', {
    perUser: true,
    perOrganization: true,
    progressive: true,
    baseLimit: 1000,
    windowMs: 60 * 1000,
  }),

  authLimiter: createDynamicRateLimiter('auth', {
    progressive: true,
    baseLimit: 10,
    windowMs: 60 * 1000,
  }),

  uploadLimiter: createDynamicRateLimiter('upload', {
    perUser: true,
    perOrganization: true,
    baseLimit: 10,
    windowMs: 60 * 1000,
  }),

  graphqlLimiter: createDynamicRateLimiter('graphql', {
    perUser: true,
    progressive: true,
    baseLimit: 200,
    windowMs: 60 * 1000,
  }),

  websocketLimiter: createDynamicRateLimiter('websocket', {
    perUser: true,
    baseLimit: 50,
    windowMs: 60 * 1000,
  }),

  schemaLimiter: createDynamicRateLimiter('schema', {
    perOrganization: true,
    baseLimit: 20,
    windowMs: 60 * 1000,
  }),

  // Utility functions
  applyEnhancedRateLimit,
  getOrUpdateRateLimit,
};
