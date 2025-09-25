const express = require('express');
const router = express.Router();
const prismaService = require('../services/prismaService');
const { adminOnly } = require('../middleware/auth');

const prisma = prismaService.getRLSClient();

// Apply admin middleware to all routes
router.use(adminOnly);

/**
 * GET /api/admin/rate-limits/configs
 * Get all rate limit configurations
 */
router.get('/configs', async (req, res) => {
  try {
    const { type, enabled } = req.query;
    const where = {};

    if (type) where.type = type.toUpperCase();
    if (enabled !== undefined) where.enabled = enabled === 'true';

    const configs = await prisma.rateLimitConfig.findMany({
      where,
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updater: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

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
    const config = await prisma.rateLimitConfig.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updater: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

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
    const userId = req.user.userId || req.user.id;

    const configData = {
      ...req.body,
      type: req.body.type.toUpperCase(),
      keyStrategy: req.body.keyStrategy.toUpperCase(),
      organizationId: req.user.organizationId,
      createdBy: userId,
    };

    const config = await prisma.rateLimitConfig.create({
      data: configData,
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: config,
      message: 'Rate limit configuration created successfully',
    });
  } catch (error) {
    console.error('Error creating rate limit config:', error);

    if (error.code === 'P2002') {
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
    const userId = req.user.userId || req.user.id;

    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    if (updateData.type) {
      updateData.type = updateData.type.toUpperCase();
    }
    if (updateData.keyStrategy) {
      updateData.keyStrategy = updateData.keyStrategy.toUpperCase();
    }

    // Remove fields that shouldn't be updated
    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData.organizationId;

    const config = await prisma.rateLimitConfig.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updater: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: config,
      message: 'Rate limit configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating rate limit config:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
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
    await prisma.rateLimitConfig.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Rate limit configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting rate limit config:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
      });
    }

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
    const userId = req.user.userId || req.user.id;

    const config = await prisma.rateLimitConfig.findUnique({
      where: { id: req.params.id },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
      });
    }

    const updatedConfig = await prisma.rateLimitConfig.update({
      where: { id: req.params.id },
      data: {
        enabled: !config.enabled,
        updatedBy: userId,
        changeReason: req.body.reason || `${!config.enabled ? 'Enabled' : 'Disabled'} by admin`,
      },
    });

    res.json({
      success: true,
      data: { enabled: updatedConfig.enabled },
      message: `Rate limit configuration ${updatedConfig.enabled ? 'enabled' : 'disabled'} successfully`,
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
    const activeLimits = await prisma.rateLimitUsage.findMany({
      where: {
        blocked: false,
        resetAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        currentCount: 'desc',
      },
    });

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
 * GET /api/admin/rate-limits/applications
 * Get all applications for rate limit configuration
 */
router.get('/applications', async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

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
    const roles = await prisma.role.findMany({
      include: {
        service: {
          select: {
            name: true,
            description: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

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
 * Get all services for rate limit configuration
 */
router.get('/services', async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        objects: true,
      },
      orderBy: { name: 'asc' },
    });

    // Extract procedure names from objects
    const servicesWithProcedures = services.map(service => ({
      id: service.id,
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
    const configs = await prisma.rateLimitConfig.findMany();
    const activeLimits = await prisma.rateLimitUsage.findMany({
      where: {
        blocked: false,
        resetAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        currentCount: 'desc',
      },
      take: 10,
    });

    const recentChanges = await prisma.rateLimitConfig.findMany({
      include: {
        updater: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    const analytics = {
      totalConfigs: configs.length,
      enabledConfigs: configs.filter(c => c.enabled).length,
      configsByType: configs.reduce((acc, config) => {
        acc[config.type] = (acc[config.type] || 0) + 1;
        return acc;
      }, {}),
      activeLimits: activeLimits.length,
      topLimitedKeys: activeLimits,
      recentChanges: recentChanges.map(config => ({
        name: config.name,
        type: config.type,
        enabled: config.enabled,
        updatedAt: config.updatedAt,
        updatedBy: config.updater,
      })),
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

    // Get configuration changes in time range
    const recentConfigs = await prisma.rateLimitConfig.findMany({
      where: {
        updatedAt: {
          gte: startDate,
        },
      },
      include: {
        updater: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const historyData = {
      timeRange,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      changes: recentConfigs.map(config => ({
        configName: config.name,
        configDisplayName: config.displayName,
        configType: config.type,
        updatedAt: config.updatedAt,
        updatedBy: config.updater,
        reason: config.changeReason,
      })),
      summary: {
        totalChanges: recentConfigs.length,
        changesInPeriod: recentConfigs.length,
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
