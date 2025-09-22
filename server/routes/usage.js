const express = require('express');
const router = express.Router();
const subscriptionLimitService = require('../services/subscriptionLimitService');
const { authMiddleware: authenticateUser } = require('../middleware/auth');
const { getUsageInfo, addUsageWarnings } = require('../middleware/userLimitMiddleware');
const { logger } = require('../middleware/logger');

/**
 * Usage and billing endpoints for Phase 1 pricing implementation
 */

/**
 * @route GET /api/usage/dashboard
 * @desc Get current usage dashboard data for organization
 * @access Private (requires authentication)
 */
router.get('/dashboard', authenticateUser, getUsageInfo, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'User is not associated with an organization',
        },
      });
    }

    // Get comprehensive usage information
    const [userCheck, currentUsage] = await Promise.all([
      subscriptionLimitService.checkUserLimits(organizationId),
      subscriptionLimitService.getCurrentUsage(organizationId),
    ]);

    res.json({
      success: true,
      data: {
        organization: {
          id: organizationId,
          plan: userCheck.plan,
        },
        usage: {
          period: currentUsage.period,
          users: {
            current: userCheck.currentUsers,
            limit: userCheck.userLimit,
            overage: userCheck.overage,
            overageCost: userCheck.overageCost,
            percentage:
              userCheck.userLimit === -1
                ? 0
                : Math.round((userCheck.currentUsers / userCheck.userLimit) * 100),
          },
          apiCalls: {
            current: currentUsage.usage.apiCalls || 0,
            limit: currentUsage.limits.apiCallLimit,
            percentage:
              currentUsage.limits.apiCallLimit === -1
                ? 0
                : Math.round(
                    (currentUsage.usage.apiCalls / currentUsage.limits.apiCallLimit) * 100
                  ),
          },
          datasources: {
            current: currentUsage.usage.datasources || 0,
            limit: currentUsage.limits.datasourceLimit,
            percentage:
              currentUsage.limits.datasourceLimit === -1
                ? 0
                : Math.round(
                    (currentUsage.usage.datasources / currentUsage.limits.datasourceLimit) * 100
                  ),
          },
        },
        limits: currentUsage.limits,
        warnings: req.usageWarnings || [],
      },
    });
  } catch (error) {
    logger.error('Error getting usage dashboard:', error);
    res.status(500).json({
      error: {
        code: 'USAGE_DASHBOARD_ERROR',
        message: 'Failed to retrieve usage information',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
});

/**
 * @route GET /api/usage/limits
 * @desc Get organization limits and plan details
 * @access Private
 */
router.get('/limits', authenticateUser, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'User is not associated with an organization',
        },
      });
    }

    const limits = await subscriptionLimitService.getOrganizationLimits(organizationId);

    res.json({
      success: true,
      data: {
        organizationId,
        ...limits,
      },
    });
  } catch (error) {
    logger.error('Error getting organization limits:', error);
    res.status(500).json({
      error: {
        code: 'LIMITS_ERROR',
        message: 'Failed to retrieve organization limits',
      },
    });
  }
});

/**
 * @route GET /api/usage/warnings
 * @desc Get current usage warnings for organization
 * @access Private
 */
router.get('/warnings', authenticateUser, addUsageWarnings, async (req, res) => {
  try {
    const warnings = req.usageWarnings || [];

    res.json({
      success: true,
      data: {
        warnings,
        hasWarnings: warnings.length > 0,
        criticalWarnings: warnings.filter(w => w.severity === 'error').length,
      },
    });
  } catch (error) {
    logger.error('Error getting usage warnings:', error);
    res.status(500).json({
      error: {
        code: 'WARNINGS_ERROR',
        message: 'Failed to retrieve usage warnings',
      },
    });
  }
});

/**
 * @route POST /api/usage/track
 * @desc Manually track usage (for debugging/admin purposes)
 * @access Private (admin only)
 */
router.post('/track', authenticateUser, async (req, res) => {
  try {
    // Only allow admins to manually track usage
    if (!req.user.isAdmin) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin access required',
        },
      });
    }

    const { organizationId, usage } = req.body;

    if (!organizationId || !usage) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Organization ID and usage data are required',
        },
      });
    }

    const updatedMetrics = await subscriptionLimitService.updateUsageMetrics(organizationId, usage);

    res.json({
      success: true,
      data: {
        message: 'Usage tracked successfully',
        metrics: updatedMetrics,
      },
    });
  } catch (error) {
    logger.error('Error tracking usage:', error);
    res.status(500).json({
      error: {
        code: 'TRACKING_ERROR',
        message: 'Failed to track usage',
      },
    });
  }
});

/**
 * @route GET /api/usage/cost-estimate
 * @desc Get cost estimate for current usage including overages
 * @access Private
 */
router.get('/cost-estimate', authenticateUser, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'User is not associated with an organization',
        },
      });
    }

    const [userCheck, limits] = await Promise.all([
      subscriptionLimitService.checkUserLimits(organizationId),
      subscriptionLimitService.getOrganizationLimits(organizationId),
    ]);

    // Calculate base cost (this would typically come from Stripe subscription)
    const baseCosts = {
      FREE: 0,
      TEAM: 149,
      BUSINESS: 249,
      ENTERPRISE: 0, // Custom pricing
    };

    const baseCost = baseCosts[limits.plan] || 0;
    const overageCost = userCheck.overageCost || 0;
    const totalCost = baseCost + overageCost;

    res.json({
      success: true,
      data: {
        period: 'monthly',
        baseCost,
        overages: {
          users: {
            count: userCheck.overage,
            unitPrice: limits.userOveragePrice,
            totalCost: userCheck.overageCost,
          },
        },
        totalOverageCost: overageCost,
        totalCost,
        currency: 'USD',
        details: {
          plan: limits.plan,
          nextBillingDate: null, // Would come from Stripe subscription
        },
      },
    });
  } catch (error) {
    logger.error('Error calculating cost estimate:', error);
    res.status(500).json({
      error: {
        code: 'COST_ESTIMATE_ERROR',
        message: 'Failed to calculate cost estimate',
      },
    });
  }
});

module.exports = router;
