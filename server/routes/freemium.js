const express = require('express');
const router = express.Router();
const { getFreemiumUsageStats, FREEMIUM_LIMITS } = require('../middleware/freemiumLimits');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/freemium/usage
 * Get current freemium usage statistics for the authenticated user
 */
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user.id;
    const userPlan = req.user.plan || 'free';

    // Only return usage stats for freemium users
    if (userPlan !== 'free') {
      return res.json({
        plan: userPlan,
        message: 'Usage limits do not apply to paid plans',
      });
    }

    const usageStats = await getFreemiumUsageStats(userId);

    if (!usageStats) {
      return res.status(500).json({
        error: 'Unable to fetch usage statistics',
      });
    }

    res.json({
      plan: 'free',
      usage: usageStats,
      limits: FREEMIUM_LIMITS,
      upgradeUrl: '/pricing',
    });
  } catch (error) {
    console.error('Error fetching freemium usage:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to fetch usage statistics',
    });
  }
});

/**
 * GET /api/freemium/limits
 * Get freemium plan limits (public endpoint for marketing)
 */
router.get('/limits', (req, res) => {
  res.json({
    plan: 'free',
    limits: FREEMIUM_LIMITS,
    features: [
      'Single database connection',
      'One AI-powered service endpoint',
      'Basic user role',
      'Up to 5 workflow components',
      '500 API calls per month',
      'Community support at NectarStudio.ai',
      'Basic AI templates',
    ],
    upgradeUrl: '/pricing',
  });
});

module.exports = router;
