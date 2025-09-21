const express = require('express');
const router = express.Router();
const dataRetentionService = require('../services/dataRetentionService');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logger } = require('../utils/logger');

/**
 * Get storage statistics and retention policies
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await dataRetentionService.getStorageStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get storage stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve storage statistics',
      error: error.message,
    });
  }
});

/**
 * Run data maintenance routine
 */
router.post('/maintenance', requireAuth, requireAdmin, async (req, res) => {
  try {
    const results = await dataRetentionService.runMaintenanceRoutine();
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Data maintenance routine failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Data maintenance routine failed',
      error: error.message,
    });
  }
});

/**
 * Clean up app usage logs
 */
router.post('/cleanup/app-usage', requireAuth, requireAdmin, async (req, res) => {
  try {
    const results = await dataRetentionService.cleanupAppUsageLogs();
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('App usage cleanup failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'App usage cleanup failed',
      error: error.message,
    });
  }
});

/**
 * Clean up login activity logs
 */
router.post('/cleanup/login-activity', requireAuth, requireAdmin, async (req, res) => {
  try {
    const results = await dataRetentionService.cleanupLoginActivityLogs();
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Login activity cleanup failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Login activity cleanup failed',
      error: error.message,
    });
  }
});

/**
 * Anonymize old data
 */
router.post('/anonymize', requireAuth, requireAdmin, async (req, res) => {
  try {
    const results = await dataRetentionService.anonymizeOldData();
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Data anonymization failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Data anonymization failed',
      error: error.message,
    });
  }
});

/**
 * Update retention policy
 */
router.put('/policy/:category/:subcategory', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { category, subcategory } = req.params;
    const { days } = req.body;

    if (!days || days < 1) {
      return res.status(400).json({
        success: false,
        message: 'Days must be a positive number',
      });
    }

    const results = await dataRetentionService.updateRetentionPolicy(category, subcategory, days);
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Failed to update retention policy', { error: error.message });
    res.status(400).json({
      success: false,
      message: 'Failed to update retention policy',
      error: error.message,
    });
  }
});

/**
 * Export user data (GDPR compliance)
 */
router.get('/export/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = await dataRetentionService.exportUserData(userId);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="user-data-${userId}-${Date.now()}.json"`
    );

    res.json(userData);
  } catch (error) {
    logger.error('Failed to export user data', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      message: 'Failed to export user data',
      error: error.message,
    });
  }
});

/**
 * Delete user data (GDPR compliance)
 */
router.delete('/user/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { confirm } = req.body;

    if (!confirm || confirm !== true) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required for data deletion',
      });
    }

    const results = await dataRetentionService.deleteUserData(userId);
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Failed to delete user data', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      message: 'Failed to delete user data',
      error: error.message,
    });
  }
});

/**
 * Generate aggregated statistics for a specific date
 */
router.post('/aggregate/:date', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    const results = await dataRetentionService.generateAggregatedStats(targetDate);
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Failed to generate aggregated statistics', {
      error: error.message,
      date: req.params.date,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to generate aggregated statistics',
      error: error.message,
    });
  }
});

/**
 * Get retention policies
 */
router.get('/policies', requireAuth, requireAdmin, async (req, res) => {
  try {
    const policies = dataRetentionService.retentionPolicies;
    res.json({
      success: true,
      data: policies,
    });
  } catch (error) {
    logger.error('Failed to get retention policies', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve retention policies',
      error: error.message,
    });
  }
});

/**
 * Preview data for deletion (dry run)
 */
router.get('/preview/cleanup', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.query; // 'app-usage' or 'login-activity'
    const policies = dataRetentionService.retentionPolicies;
    const now = new Date();

    let counts = {};

    if (type === 'app-usage' || !type) {
      const detailedCutoff = new Date(
        now.getTime() - policies.appUsageLog.detailed * 24 * 60 * 60 * 1000
      );
      const defaultCutoff = new Date(
        now.getTime() - policies.appUsageLog.default * 24 * 60 * 60 * 1000
      );
      const anonymousCutoff = new Date(
        now.getTime() - policies.appUsageLog.anonymous * 24 * 60 * 60 * 1000
      );

      const [detailedCount, defaultCount, anonymousCount] = await Promise.all([
        dataRetentionService.prisma.appUsageLog.count({
          where: {
            timestamp: { lt: detailedCutoff },
            eventType: { in: ['click', 'scroll', 'hover', 'focus', 'blur'] },
          },
        }),
        dataRetentionService.prisma.appUsageLog.count({
          where: {
            timestamp: { lt: defaultCutoff },
            eventType: { notIn: ['click', 'scroll', 'hover', 'focus', 'blur'] },
            userId: { not: null },
          },
        }),
        dataRetentionService.prisma.appUsageLog.count({
          where: {
            timestamp: { lt: anonymousCutoff },
            userId: null,
          },
        }),
      ]);

      counts.appUsage = {
        detailed: detailedCount,
        default: defaultCount,
        anonymous: anonymousCount,
        total: detailedCount + defaultCount + anonymousCount,
      };
    }

    if (type === 'login-activity' || !type) {
      const successCutoff = new Date(
        now.getTime() - policies.loginActivityLog.success * 24 * 60 * 60 * 1000
      );
      const failedCutoff = new Date(
        now.getTime() - policies.loginActivityLog.failed * 24 * 60 * 60 * 1000
      );
      const suspiciousCutoff = new Date(
        now.getTime() - policies.loginActivityLog.suspicious * 24 * 60 * 60 * 1000
      );

      const [successCount, failedCount, suspiciousCount] = await Promise.all([
        dataRetentionService.prisma.loginActivityLog.count({
          where: {
            timestamp: { lt: successCutoff },
            loginType: 'success',
          },
        }),
        dataRetentionService.prisma.loginActivityLog.count({
          where: {
            timestamp: { lt: failedCutoff },
            loginType: 'failed',
            failureReason: { notIn: ['suspicious_activity', 'rate_limited', 'brute_force'] },
          },
        }),
        dataRetentionService.prisma.loginActivityLog.count({
          where: {
            timestamp: { lt: suspiciousCutoff },
            OR: [
              {
                loginType: 'failed',
                failureReason: { in: ['suspicious_activity', 'rate_limited', 'brute_force'] },
              },
            ],
          },
        }),
      ]);

      counts.loginActivity = {
        success: successCount,
        failed: failedCount,
        suspicious: suspiciousCount,
        total: successCount + failedCount + suspiciousCount,
      };
    }

    res.json({
      success: true,
      data: {
        preview: true,
        timestamp: now,
        policies,
        counts,
      },
    });
  } catch (error) {
    logger.error('Failed to preview cleanup', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to preview cleanup',
      error: error.message,
    });
  }
});

module.exports = router;
