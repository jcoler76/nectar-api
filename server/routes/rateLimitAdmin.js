const express = require('express');
const router = express.Router();
const RateLimitConfig = require('../models/RateLimitConfig');
const rateLimitService = require('../services/rateLimitService');
const { adminOnly } = require('../middleware/auth');

// Apply admin middleware to all routes (auth already handled by persistentAuth in server.js)
router.use(adminOnly);

// Temporary debug endpoint to test data retrieval (remove after debugging)
router.get('/debug/applications', async (req, res) => {
  try {
    const Application = require('../models/Application');
    const applications = await Application.find({ isActive: true })
      .select('name description createdAt')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: applications,
      debug: true,
    });
  } catch (error) {
    console.error('Debug applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug error fetching applications',
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/rate-limits/configs
 * Get all rate limit configurations
 */
router.get('/configs', async (req, res) => {
  try {
    const { type, enabled } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (enabled !== undefined) filter.enabled = enabled === 'true';

    const configs = await RateLimitConfig.find(filter)
      .populate('applicationLimits.applicationId', 'name description')
      .populate('roleLimits.roleId', 'name serviceId')
      .populate('componentLimits.serviceId', 'name description')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .sort({ type: 1, name: 1 });

    res.json({
      success: true,
      data: configs,
      count: configs.length,
    });
  } catch (error) {
    console.error('Error fetching rate limit configs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rate limit configurations',
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/rate-limits/configs/:id
 * Get a specific rate limit configuration
 */
router.get('/configs/:id', async (req, res) => {
  try {
    const config = await RateLimitConfig.findById(req.params.id)
      .populate('applicationLimits.applicationId', 'name description')
      .populate('roleLimits.roleId', 'name serviceId')
      .populate('componentLimits.serviceId', 'name description')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('changeHistory.changedBy', 'firstName lastName email');

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching rate limit config:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rate limit configuration',
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/rate-limits/configs
 * Create a new rate limit configuration
 */
router.post('/configs', async (req, res) => {
  try {
    const configData = {
      ...req.body,
      createdBy: req.user.userId || req.user._id,
    };

    const config = new RateLimitConfig(configData);
    await config.save();

    // Populate the response
    await config.populate([
      { path: 'applicationLimits.applicationId', select: 'name description' },
      { path: 'roleLimits.roleId', select: 'name serviceId' },
      { path: 'componentLimits.serviceId', select: 'name description' },
      { path: 'createdBy', select: 'firstName lastName email' },
    ]);

    // Clear cache to force reload
    rateLimitService.clearCache();

    res.status(201).json({
      success: true,
      data: config,
      message: 'Rate limit configuration created successfully',
    });
  } catch (error) {
    console.error('Error creating rate limit config:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
        })),
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Rate limit configuration with this name already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating rate limit configuration',
      error: error.message,
    });
  }
});

/**
 * PUT /api/admin/rate-limits/configs/:id
 * Update a rate limit configuration
 */
router.put('/configs/:id', async (req, res) => {
  try {
    const config = await RateLimitConfig.findById(req.params.id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
      });
    }

    // Store original for change tracking
    config._original = config.toObject();

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'createdBy' && key !== 'changeHistory') {
        config[key] = req.body[key];
      }
    });

    config.updatedBy = req.user._id;

    // Add change reason if provided
    if (req.body.changeReason) {
      config.changeReason = req.body.changeReason;
    }

    await config.save();

    // Populate the response
    await config.populate([
      { path: 'applicationLimits.applicationId', select: 'name description' },
      { path: 'roleLimits.roleId', select: 'name serviceId' },
      { path: 'componentLimits.serviceId', select: 'name description' },
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'updatedBy', select: 'firstName lastName email' },
    ]);

    // Clear cache to force reload
    rateLimitService.clearCache();

    res.json({
      success: true,
      data: config,
      message: 'Rate limit configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating rate limit config:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
        })),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating rate limit configuration',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/admin/rate-limits/configs/:id
 * Delete a rate limit configuration
 */
router.delete('/configs/:id', async (req, res) => {
  try {
    const config = await RateLimitConfig.findById(req.params.id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
      });
    }

    await RateLimitConfig.findByIdAndDelete(req.params.id);

    // Clear cache to force reload
    rateLimitService.clearCache();

    res.json({
      success: true,
      message: 'Rate limit configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting rate limit config:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting rate limit configuration',
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/rate-limits/configs/:id/toggle
 * Toggle enabled/disabled status of a rate limit configuration
 */
router.post('/configs/:id/toggle', async (req, res) => {
  try {
    const config = await RateLimitConfig.findById(req.params.id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
      });
    }

    config.enabled = !config.enabled;
    config.updatedBy = req.user._id;

    // Add change to history
    config.changeHistory.push({
      changedBy: req.user._id,
      changes: {
        enabled: {
          from: !config.enabled,
          to: config.enabled,
        },
      },
      reason: req.body.reason || `${config.enabled ? 'Enabled' : 'Disabled'} by admin`,
    });

    await config.save();

    // Clear cache to force reload
    rateLimitService.clearCache();

    res.json({
      success: true,
      data: { enabled: config.enabled },
      message: `Rate limit configuration ${config.enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling rate limit config:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling rate limit configuration',
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/rate-limits/active
 * Get all active rate limits with current usage
 */
router.get('/active', async (req, res) => {
  try {
    const activeLimits = await rateLimitService.getActiveRateLimits();

    res.json({
      success: true,
      data: activeLimits,
      count: activeLimits.length,
    });
  } catch (error) {
    console.error('Error fetching active rate limits:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active rate limits',
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/rate-limits/status/:configName/:key
 * Get rate limit status for a specific key
 */
router.get('/status/:configName/:key', async (req, res) => {
  try {
    const { configName, key } = req.params;
    const status = await rateLimitService.getRateLimitStatus(configName, key);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Rate limit status not found',
      });
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error fetching rate limit status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rate limit status',
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/rate-limits/reset/:configName/:key
 * Reset rate limit for a specific key
 */
router.post('/reset/:configName/:key', async (req, res) => {
  try {
    const { configName, key } = req.params;
    const success = await rateLimitService.resetRateLimit(configName, key);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
      });
    }

    res.json({
      success: true,
      message: 'Rate limit reset successfully',
    });
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting rate limit',
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/rate-limits/applications
 * Get all applications for rate limit configuration
 */
router.get('/applications', async (req, res) => {
  try {
    const Application = require('../models/Application');
    const applications = await Application.find({ isActive: true })
      .select('name description createdAt')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/rate-limits/roles
 * Get all roles for rate limit configuration
 */
router.get('/roles', async (req, res) => {
  try {
    const Role = require('../models/Role');
    const roles = await Role.find({})
      .populate('serviceId', 'name description')
      .select('name serviceId createdAt')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching roles',
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/rate-limits/services
 * Get all services with their procedures for rate limit configuration
 */
router.get('/services', async (req, res) => {
  try {
    const Service = require('../models/Service');
    const services = await Service.find({}).select('name description objects').sort({ name: 1 });

    // Extract procedure names from objects
    const servicesWithProcedures = services.map(service => ({
      _id: service._id,
      name: service.name,
      description: service.description,
      procedures: service.objects ? service.objects.map(obj => obj.name) : [],
    }));

    res.json({
      success: true,
      data: servicesWithProcedures,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/rate-limits/analytics
 * Get rate limiting analytics and statistics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    // This would integrate with your existing analytics
    // For now, return basic statistics
    const configs = await RateLimitConfig.find({});
    const activeLimits = await rateLimitService.getActiveRateLimits();

    const analytics = {
      totalConfigs: configs.length,
      enabledConfigs: configs.filter(c => c.enabled).length,
      configsByType: configs.reduce((acc, config) => {
        acc[config.type] = (acc[config.type] || 0) + 1;
        return acc;
      }, {}),
      activeLimits: activeLimits.length,
      topLimitedKeys: activeLimits.sort((a, b) => b.currentCount - a.currentCount).slice(0, 10),
      recentChanges: await RateLimitConfig.find({})
        .populate('updatedBy', 'firstName lastName')
        .sort({ updatedAt: -1 })
        .limit(10)
        .select('name type enabled updatedAt updatedBy'),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching rate limit analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rate limit analytics',
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/rate-limits/history
 * Get historical rate limiting data for analytics
 */
router.get('/history', async (req, res) => {
  try {
    const { timeRange = '7d', granularity = 'day' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get configuration change history
    const configHistory = await RateLimitConfig.find({
      'changeHistory.changedAt': { $gte: startDate },
    })
      .populate('changeHistory.changedBy', 'firstName lastName')
      .select('name type displayName changeHistory')
      .lean();

    // Flatten change history with metadata
    const changes = [];
    configHistory.forEach(config => {
      config.changeHistory
        .filter(change => change.changedAt >= startDate)
        .forEach(change => {
          changes.push({
            configName: config.name,
            configDisplayName: config.displayName,
            configType: config.type,
            changedBy: change.changedBy,
            changedAt: change.changedAt,
            changes: change.changes,
            reason: change.reason,
          });
        });
    });

    // Sort changes by date
    changes.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

    // Get API usage data if available
    let usageData = [];
    try {
      const ApiUsage = require('../models/ApiUsage');

      // Aggregate usage data by time periods
      const aggregationPipeline = [
        {
          $match: {
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: granularity === 'hour' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d',
                date: '$timestamp',
              },
            },
            requestCount: { $sum: 1 },
            successCount: { $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] } },
            errorCount: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
            avgRequestSize: { $avg: '$requestSize' },
            avgResponseSize: { $avg: '$responseSize' },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ];

      usageData = await ApiUsage.aggregate(aggregationPipeline);
    } catch (error) {
      console.warn('ApiUsage collection not available, skipping usage data:', error.message);
    }

    // Get configuration statistics over time
    const allConfigs = await RateLimitConfig.find({}).lean();
    const configStats = [];

    // Create time series for configuration counts
    const timePoints = [];
    const intervalMs = granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    for (let time = startDate.getTime(); time <= now.getTime(); time += intervalMs) {
      const pointDate = new Date(time);
      timePoints.push({
        date: pointDate.toISOString().split('T')[0],
        timestamp: pointDate,
        totalConfigs: 0,
        enabledConfigs: 0,
        configsByType: {},
      });
    }

    // Calculate configuration counts at each time point
    timePoints.forEach(point => {
      allConfigs.forEach(config => {
        const configCreated = new Date(config.createdAt) <= point.timestamp;

        if (configCreated) {
          point.totalConfigs++;

          // Check if config was enabled at this time point
          let wasEnabled = config.enabled;

          // Check change history to see if it was enabled/disabled by this point
          const relevantChanges = config.changeHistory
            .filter(change => new Date(change.changedAt) <= point.timestamp)
            .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

          for (const change of relevantChanges) {
            if (change.changes.enabled) {
              wasEnabled = change.changes.enabled.to;
              break;
            }
          }

          if (wasEnabled) {
            point.enabledConfigs++;
          }

          // Count by type
          point.configsByType[config.type] = (point.configsByType[config.type] || 0) + 1;
        }
      });
    });

    // Calculate trends
    const firstPoint = timePoints[0];
    const lastPoint = timePoints[timePoints.length - 1];

    const trends = {
      configsChange: lastPoint && firstPoint ? lastPoint.totalConfigs - firstPoint.totalConfigs : 0,
      enabledChange:
        lastPoint && firstPoint ? lastPoint.enabledConfigs - firstPoint.enabledConfigs : 0,
      totalRequests: usageData.reduce((sum, point) => sum + point.requestCount, 0),
      avgSuccessRate:
        usageData.length > 0
          ? (
              (usageData.reduce((sum, point) => sum + point.successCount / point.requestCount, 0) /
                usageData.length) *
              100
            ).toFixed(1)
          : 0,
    };

    const historyData = {
      timeRange,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      changes: changes.slice(0, 50), // Limit to most recent 50 changes
      usageData,
      configStats: timePoints,
      trends,
      summary: {
        totalChanges: changes.length,
        changesInPeriod: changes.length,
        mostActiveConfig:
          changes.length > 0
            ? changes.reduce((acc, change) => {
                acc[change.configName] = (acc[change.configName] || 0) + 1;
                return acc;
              }, {})
            : {},
        mostActiveUser:
          changes.length > 0
            ? changes.reduce((acc, change) => {
                if (change.changedBy) {
                  const userKey = `${change.changedBy.firstName} ${change.changedBy.lastName}`;
                  acc[userKey] = (acc[userKey] || 0) + 1;
                }
                return acc;
              }, {})
            : {},
      },
    };

    res.json({
      success: true,
      data: historyData,
    });
  } catch (error) {
    console.error('Error fetching rate limit history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rate limit history',
      error: error.message,
    });
  }
});

module.exports = router;
