const subscriptionLimitService = require('../services/subscriptionLimitService');
const { logger } = require('./logger');

/**
 * Enhanced middleware to track public API usage for billing purposes
 * This middleware ensures only public API endpoints count toward monthly limits
 */

/**
 * Define which routes should count as "public API" calls for billing
 * These are external-facing APIs that customers use programmatically
 */
const PUBLIC_API_PATTERNS = [
  // Exclude internal/system endpoints that shouldn't count (must come first)
  { pattern: /^\/api\/v[12]\/test\/_proc\/usage-info$/, exclude: true }, // Usage info calls don't count
  { pattern: /^\/api\/v[12]\/test\/_proc\/reset-usage$/, exclude: true }, // Reset calls don't count

  // Main public API endpoints (include rules)
  { pattern: /^\/api\/v[12]\/.*\/_proc\/.*/, exclude: false }, // All stored procedure calls
  { pattern: /^\/api\/v[12]\/.*\/.*$/, exclude: false }, // General public API patterns
];

/**
 * Define routes that should NEVER count toward API limits
 * These are internal system operations, auth, and management functions
 */
const INTERNAL_API_PATTERNS = [
  // Authentication and session management
  /^\/api\/auth\/.*/,
  /^\/api\/csrf-token$/,
  /^\/health$/,

  // Internal application management
  /^\/api\/users\/.*/,
  /^\/api\/organizations\/.*/,
  /^\/api\/roles\/.*/,
  /^\/api\/applications\/.*/,
  /^\/api\/services\/.*/,
  /^\/api\/connections\/.*/,
  /^\/api\/reports\/.*/,
  /^\/api\/dashboard\/.*/,

  // File and data management (not billable API calls)
  /^\/api\/files\/.*/,
  /^\/api\/fileStorage\/.*/,
  /^\/api\/data-retention\/.*/,

  // System and admin functions
  /^\/api\/tracking\/.*/,
  /^\/api\/webhooks\/.*/,
  /^\/api\/contact-chat\/.*/,
  /^\/api\/documentation\/.*/,
  /^\/api\/apiKeys\/.*/,

  // Workflow management (internal tools)
  /^\/api\/workflows\/.*/,
  /^\/api\/blueprints\/.*/,
  /^\/api\/folders\/.*/,

  // Development and testing
  /^\/api\/playground\/.*/,
  /^\/api\/sdk\/.*/,
];

/**
 * Determine if a request path should count as a billable public API call
 * @param {string} path - The request path
 * @param {string} method - The HTTP method
 * @returns {boolean} - True if this should count toward API limits
 */
function shouldCountAsBillableApi(path, method) {
  // First check if it's explicitly an internal API
  for (const pattern of INTERNAL_API_PATTERNS) {
    if (pattern.test(path)) {
      return false;
    }
  }

  // Then check public API patterns
  for (const rule of PUBLIC_API_PATTERNS) {
    if (typeof rule === 'object' && rule.pattern) {
      // Handle exclude rules first
      if (rule.exclude && rule.pattern.test(path)) {
        return false;
      }
    }
  }

  // Then check include rules
  for (const rule of PUBLIC_API_PATTERNS) {
    if (typeof rule === 'object' && rule.pattern) {
      if (!rule.exclude && rule.pattern.test(path)) {
        return true;
      }
    } else if (rule.test && rule.test(path)) {
      return true;
    }
  }

  return false;
}

/**
 * Enhanced API usage tracking middleware
 * Only tracks usage for actual public API endpoints that should be billed
 */
const trackPublicApiUsage = (options = {}) => {
  const { incrementBy = 1, category = 'public-api', logAllRequests = false } = options;

  return async (req, res, next) => {
    try {
      const path = req.path || req.url;
      const method = req.method;
      const organizationId = req.application?.organizationId || req.user?.organizationId;

      // Determine if this should count as a billable API call
      const isBillableApi = shouldCountAsBillableApi(path, method);

      // Always log the decision for debugging (in development)
      if (process.env.NODE_ENV !== 'production' || logAllRequests) {
        logger.debug('API tracking decision', {
          path,
          method,
          organizationId,
          isBillableApi,
          application: req.application?.name,
          category,
        });
      }

      // Add tracking info to the request for use by other middleware/routes
      req.apiTracking = {
        isBillableApi,
        category,
        incrementBy: isBillableApi ? incrementBy : 0,
        path,
        method,
      };

      // Only track usage if this is a billable API call and we have an organization
      if (isBillableApi && organizationId) {
        // Track the API call asynchronously to not slow down the request
        setImmediate(async () => {
          try {
            await subscriptionLimitService.updateUsageMetrics(organizationId, {
              apiCalls: incrementBy,
            });

            logger.info('Billable API call tracked', {
              organizationId,
              path,
              method,
              incrementBy,
              category,
              application: req.application?.name,
            });
          } catch (error) {
            logger.error('Failed to track billable API usage:', {
              error: error.message,
              organizationId,
              path,
              method,
            });
          }
        });
      }

      next();
    } catch (error) {
      logger.error('API usage tracking failed:', {
        error: error.message,
        path: req.path,
        method: req.method,
      });
      next(); // Don't block the request on tracking errors
    }
  };
};

/**
 * Middleware to check if user is approaching their API limits
 * Returns warnings in response headers
 */
const checkApiLimits = async (req, res, next) => {
  try {
    const organizationId = req.application?.organizationId || req.user?.organizationId;

    if (organizationId && req.apiTracking?.isBillableApi) {
      const [usage, limits, warnings] = await Promise.all([
        subscriptionLimitService.getCurrentUsage(organizationId),
        subscriptionLimitService.getOrganizationLimits(organizationId),
        subscriptionLimitService.getUsageWarnings(organizationId),
      ]);

      const remainingCalls =
        limits.apiCallLimit === -1
          ? 'unlimited'
          : Math.max(0, limits.apiCallLimit - usage.usage.apiCalls);
      const usagePercent =
        limits.apiCallLimit === -1 ? 0 : (usage.usage.apiCalls / limits.apiCallLimit) * 100;

      // Add usage info to response headers
      res.setHeader('X-API-Usage-Current', usage.usage.apiCalls);
      res.setHeader('X-API-Usage-Limit', limits.apiCallLimit);
      res.setHeader('X-API-Usage-Remaining', remainingCalls);
      res.setHeader('X-API-Usage-Period', usage.period);
      res.setHeader('X-API-Usage-Plan', limits.plan);
      res.setHeader('X-API-Usage-Percent', Math.round(usagePercent * 100) / 100);

      // Add warnings if any exist
      if (warnings.length > 0) {
        res.setHeader('X-API-Usage-Warnings', JSON.stringify(warnings));
      }

      // Check if user has exceeded their limit (for free plans)
      if (limits.plan === 'FREE' && usage.usage.apiCalls >= limits.apiCallLimit) {
        return res.status(429).json({
          error: {
            code: 'API_LIMIT_EXCEEDED',
            message: `You have exceeded your ${limits.plan} plan limit of ${limits.apiCallLimit.toLocaleString()} API calls per month. Please upgrade your plan to continue using the API.`,
            current_usage: usage.usage.apiCalls,
            monthly_limit: limits.apiCallLimit,
            plan: limits.plan,
            upgrade_url: '/pricing',
          },
        });
      }

      // Warn if approaching limit
      if (usagePercent >= 90) {
        logger.warn('API usage approaching limit', {
          organizationId,
          plan: limits.plan,
          usagePercent,
          currentCalls: usage.usage.apiCalls,
          monthlyLimit: limits.apiCallLimit,
        });
      }
    }

    next();
  } catch (error) {
    logger.error('API limit check failed:', error);
    next(); // Don't block requests on limit check errors
  }
};

/**
 * Get API usage statistics for a request (without counting it)
 */
const getApiUsageStats = async organizationId => {
  try {
    const [usage, limits, warnings] = await Promise.all([
      subscriptionLimitService.getCurrentUsage(organizationId),
      subscriptionLimitService.getOrganizationLimits(organizationId),
      subscriptionLimitService.getUsageWarnings(organizationId),
    ]);

    const remainingCalls =
      limits.apiCallLimit === -1
        ? 'unlimited'
        : Math.max(0, limits.apiCallLimit - usage.usage.apiCalls);
    const usagePercent =
      limits.apiCallLimit === -1 ? 0 : (usage.usage.apiCalls / limits.apiCallLimit) * 100;

    return {
      current_usage: usage.usage.apiCalls,
      monthly_limit: limits.apiCallLimit,
      remaining_calls: remainingCalls,
      usage_percentage: Math.round(usagePercent * 100) / 100,
      period: usage.period,
      plan: limits.plan,
      warnings,
      limit_status: {
        approaching_limit: usagePercent >= 80,
        near_limit: usagePercent >= 95,
        at_limit: remainingCalls === 0,
      },
    };
  } catch (error) {
    logger.error('Error getting API usage stats:', error);
    return null;
  }
};

module.exports = {
  trackPublicApiUsage,
  checkApiLimits,
  shouldCountAsBillableApi,
  getApiUsageStats,
  PUBLIC_API_PATTERNS,
  INTERNAL_API_PATTERNS,
};
