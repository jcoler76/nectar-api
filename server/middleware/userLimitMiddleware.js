const subscriptionLimitService = require('../services/subscriptionLimitService');
const { logger } = require('./logger');

/**
 * Middleware to enforce user limits based on subscription plans
 * Part of Phase 1 pricing implementation
 */

/**
 * Check if organization can add new users
 * Use this middleware on invitation and user creation endpoints
 */
const checkUserLimit = async (req, res, next) => {
  try {
    // Extract organization ID from request
    // This could come from req.user.organizationId, req.params, or req.body
    const organizationId =
      req.user?.organizationId || req.params.organizationId || req.body.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
      });
    }

    // Check if user can be added
    const canAdd = await subscriptionLimitService.canAddUser(organizationId);

    if (!canAdd) {
      const userCheck = await subscriptionLimitService.checkUserLimits(organizationId);

      return res.status(403).json({
        error: {
          code: 'USER_LIMIT_EXCEEDED',
          message:
            userCheck.plan === 'FREE'
              ? `You've reached the ${userCheck.userLimit} user limit for the Free plan. Please upgrade to add more users.`
              : `You've reached the ${userCheck.userLimit} user limit for your plan. Additional users will be charged $${userCheck.userOveragePrice}/month each.`,
          details: {
            currentUsers: userCheck.currentUsers,
            userLimit: userCheck.userLimit,
            plan: userCheck.plan,
            canUpgrade: userCheck.plan === 'FREE',
            overagePrice: userCheck.userOveragePrice,
          },
          upgradeUrl: userCheck.plan === 'FREE' ? '/pricing' : null,
        },
      });
    }

    // Add user check info to request for use in route handlers
    req.userLimitCheck = await subscriptionLimitService.checkUserLimits(organizationId);

    next();
  } catch (error) {
    logger.error('User limit check failed:', error);
    // Don't block the request on middleware errors, just log and continue
    next();
  }
};

/**
 * Add usage warnings to API responses
 * Use this middleware on dashboard/settings endpoints to inform users about their usage
 */
const addUsageWarnings = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || req.params.organizationId;

    if (organizationId) {
      const warnings = await subscriptionLimitService.getUsageWarnings(organizationId);

      // Add warnings to response headers for frontend consumption
      if (warnings.length > 0) {
        res.setHeader('X-Usage-Warnings', JSON.stringify(warnings));
      }

      // Also add to req object for use in route handlers
      req.usageWarnings = warnings;
    }

    next();
  } catch (error) {
    logger.error('Usage warning check failed:', error);
    next();
  }
};

/**
 * Track API call usage for billing
 * Use this middleware on API endpoints that should count towards usage limits
 */
const trackApiUsage = (options = {}) => {
  const { incrementBy = 1, category = 'api' } = options;

  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organizationId || req.params.organizationId;

      if (organizationId) {
        // Track the API call asynchronously to not slow down the request
        setImmediate(async () => {
          try {
            await subscriptionLimitService.updateUsageMetrics(organizationId, {
              apiCalls: incrementBy,
            });
          } catch (error) {
            logger.error('Failed to track API usage:', error);
          }
        });
      }

      next();
    } catch (error) {
      logger.error('API usage tracking failed:', error);
      next();
    }
  };
};

/**
 * Middleware to update user count after user operations
 * Use this after successful user additions/removals
 */
const updateUserCount = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || req.params.organizationId;

    if (organizationId) {
      // Update usage metrics asynchronously
      setImmediate(async () => {
        try {
          await subscriptionLimitService.updateUsageMetrics(organizationId);
        } catch (error) {
          logger.error('Failed to update user count:', error);
        }
      });
    }

    next();
  } catch (error) {
    logger.error('User count update failed:', error);
    next();
  }
};

/**
 * Check if organization can add new datasources
 * Use this middleware on datasource/connection creation endpoints
 */
const checkDatasourceLimit = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || req.params.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required',
        },
      });
    }

    const limits = await subscriptionLimitService.getOrganizationLimits(organizationId);

    // If unlimited datasources, allow
    if (limits.datasourceLimit === -1) {
      return next();
    }

    // Count current datasources
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const currentCount = await prisma.connection.count({
      where: { organizationId },
    });

    if (currentCount >= limits.datasourceLimit) {
      return res.status(403).json({
        error: {
          code: 'DATASOURCE_LIMIT_EXCEEDED',
          message: `You've reached the ${limits.datasourceLimit} datasource limit for your ${limits.plan} plan. Please upgrade to add more datasources.`,
          details: {
            currentDatasources: currentCount,
            datasourceLimit: limits.datasourceLimit,
            plan: limits.plan,
            upgradeUrl: '/pricing',
          },
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Datasource limit check failed:', error);
    // Don't block the request on middleware errors, just log and continue
    next();
  }
};

/**
 * Get organization limits and usage for API responses
 * Use this middleware on billing/usage endpoints
 */
const getUsageInfo = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || req.params.organizationId;

    if (organizationId) {
      const [limits, usage, warnings] = await Promise.all([
        subscriptionLimitService.getOrganizationLimits(organizationId),
        subscriptionLimitService.getCurrentUsage(organizationId),
        subscriptionLimitService.getUsageWarnings(organizationId),
      ]);

      req.usageInfo = {
        limits,
        usage: usage.usage,
        period: usage.period,
        warnings,
      };
    }

    next();
  } catch (error) {
    logger.error('Usage info retrieval failed:', error);
    req.usageInfo = null;
    next();
  }
};

module.exports = {
  checkUserLimit,
  checkDatasourceLimit,
  addUsageWarnings,
  trackApiUsage,
  updateUserCount,
  getUsageInfo,
};
