const express = require('express');
const router = express.Router();
const prismaService = require('../services/prismaService');
const { adminOnly } = require('../middleware/auth');
// SECURITY: Import rate limit authorization middleware
const { createRateLimitAuthStack } = require('../middleware/rateLimitAuthorization');

// SECURITY: Remove direct Prisma usage - ALL operations must use tenant-aware context
// REMOVED - Use withTenantContext for proper tenant isolation

// Apply admin middleware to all routes (kept for backwards compatibility)
router.use(adminOnly);

/**
 * GET /api/admin/rate-limits/configs
 * Get all rate limit configurations
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.get('/configs', ...createRateLimitAuthStack('read'), async (req, res) => {
  try {
    const { type, enabled } = req.query;
    const currentUser = req.user;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for rate limit access',
      });
    }

    // SECURITY: Input validation - sanitize query parameters
    if (type && !/^[A-Z_]+$/.test(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type parameter format',
      });
    }

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const configs = await prismaService.withTenantContext(currentUser.organizationId, async tx => {
      const where = {};

      if (type) where.type = type.toUpperCase();
      if (enabled !== undefined) where.enabled = enabled === 'true';

      return await tx.rateLimitConfig.findMany({
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
    });

    res.json({
      success: true,
      data: configs,
      count: configs.length,
    });
  } catch (error) {
    console.error('Error fetching rate limit configs:', error);
    // SECURITY: Sanitize error response - don't expose internal details
    res.status(500).json({
      success: false,
      message: 'Error fetching rate limit configurations',
      // Remove: error: error.message - potential information disclosure
    });
  }
});

/**
 * GET /api/admin/rate-limits/configs/:id
 * Get a specific rate limit configuration
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.get('/configs/:id', ...createRateLimitAuthStack('read'), async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for rate limit access',
      });
    }

    // SECURITY: Validate UUID format to prevent injection
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration ID format',
      });
    }

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const config = await prismaService.withTenantContext(currentUser.organizationId, async tx => {
      return await tx.rateLimitConfig.findUnique({
        where: { id },
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
    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error fetching rate limit configuration',
    });
  }
});

/**
 * POST /api/admin/rate-limits/configs
 * Create a new rate limit configuration
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.post('/configs', ...createRateLimitAuthStack('create'), async (req, res) => {
  try {
    const currentUser = req.user;
    const userId = currentUser.userId || currentUser.id;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for rate limit creation',
      });
    }

    // SECURITY: Input validation - sanitize required fields
    const { type, keyStrategy, name } = req.body;
    if (!type || !keyStrategy || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, keyStrategy, name',
      });
    }

    // SECURITY: Validate enum values
    const validTypes = ['API', 'AUTH', 'UPLOAD', 'GRAPHQL', 'WEBSOCKET', 'CUSTOM'];
    const validStrategies = ['IP', 'USER', 'KEY', 'COMPOSITE'];

    if (!validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type value',
      });
    }

    if (!validStrategies.includes(keyStrategy.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid keyStrategy value',
      });
    }

    // SECURITY: Sanitize name to prevent injection
    const sanitizedName = name.replace(/[<>"'`]/g, '').trim();
    if (sanitizedName !== name || sanitizedName.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid characters in configuration name',
      });
    }

    const configData = {
      ...req.body,
      name: sanitizedName,
      type: type.toUpperCase(),
      keyStrategy: keyStrategy.toUpperCase(),
      organizationId: currentUser.organizationId,
      createdBy: userId,
    };

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const config = await prismaService.withTenantContext(currentUser.organizationId, async tx => {
      return await tx.rateLimitConfig.create({
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

    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error creating rate limit configuration',
    });
  }
});

/**
 * PUT /api/admin/rate-limits/configs/:id
 * Update a rate limit configuration
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.put('/configs/:id', ...createRateLimitAuthStack('update'), async (req, res) => {
  try {
    const currentUser = req.user;
    const userId = currentUser.userId || currentUser.id;
    const { id } = req.params;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for rate limit update',
      });
    }

    // SECURITY: Validate UUID format to prevent injection
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration ID format',
      });
    }

    // SECURITY: Build sanitized update data
    const updateData = {
      updatedBy: userId,
    };

    // SECURITY: Validate and sanitize allowed fields only
    const allowedFields = [
      'name',
      'description',
      'type',
      'keyStrategy',
      'maxRequests',
      'windowMs',
      'enabled',
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // SECURITY: Validate enum values if provided
    if (updateData.type) {
      const validTypes = ['API', 'AUTH', 'UPLOAD', 'GRAPHQL', 'WEBSOCKET', 'CUSTOM'];
      if (!validTypes.includes(updateData.type.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid type value',
        });
      }
      updateData.type = updateData.type.toUpperCase();
    }

    if (updateData.keyStrategy) {
      const validStrategies = ['IP', 'USER', 'KEY', 'COMPOSITE'];
      if (!validStrategies.includes(updateData.keyStrategy.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid keyStrategy value',
        });
      }
      updateData.keyStrategy = updateData.keyStrategy.toUpperCase();
    }

    // SECURITY: Sanitize name if provided
    if (updateData.name) {
      const sanitizedName = updateData.name.replace(/[<>"'`]/g, '').trim();
      if (sanitizedName !== updateData.name || sanitizedName.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid characters in configuration name',
        });
      }
      updateData.name = sanitizedName;
    }

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const config = await prismaService.withTenantContext(currentUser.organizationId, async tx => {
      // SECURITY: First verify the config exists and belongs to this tenant
      const existingConfig = await tx.rateLimitConfig.findUnique({ where: { id } });
      if (!existingConfig) {
        throw new Error('RATE_LIMIT_NOT_FOUND');
      }

      return await tx.rateLimitConfig.update({
        where: { id },
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
    });

    res.json({
      success: true,
      data: config,
      message: 'Rate limit configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating rate limit config:', error);

    if (error.message === 'RATE_LIMIT_NOT_FOUND' || error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
      });
    }

    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error updating rate limit configuration',
    });
  }
});

/**
 * DELETE /api/admin/rate-limits/configs/:id
 * Delete a rate limit configuration
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.delete('/configs/:id', ...createRateLimitAuthStack('delete'), async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for rate limit deletion',
      });
    }

    // SECURITY: Validate UUID format to prevent injection
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration ID format',
      });
    }

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    await prismaService.withTenantContext(currentUser.organizationId, async tx => {
      // SECURITY: First verify the config exists and belongs to this tenant
      const existingConfig = await tx.rateLimitConfig.findUnique({ where: { id } });
      if (!existingConfig) {
        throw new Error('RATE_LIMIT_NOT_FOUND');
      }

      return await tx.rateLimitConfig.delete({
        where: { id },
      });
    });

    res.json({
      success: true,
      message: 'Rate limit configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting rate limit config:', error);

    if (error.message === 'RATE_LIMIT_NOT_FOUND' || error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
      });
    }

    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error deleting rate limit configuration',
    });
  }
});

/**
 * POST /api/admin/rate-limits/configs/:id/toggle
 * Toggle enabled/disabled status of a rate limit configuration
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.post('/configs/:id/toggle', ...createRateLimitAuthStack('update'), async (req, res) => {
  try {
    const currentUser = req.user;
    const userId = currentUser.userId || currentUser.id;
    const { id } = req.params;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for rate limit toggle',
      });
    }

    // SECURITY: Validate UUID format to prevent injection
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration ID format',
      });
    }

    // SECURITY: Sanitize reason if provided
    const reason = req.body.reason ? req.body.reason.replace(/[<>\"'`]/g, '').trim() : null;

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const updatedConfig = await prismaService.withTenantContext(
      currentUser.organizationId,
      async tx => {
        // SECURITY: First verify the config exists and belongs to this tenant
        const config = await tx.rateLimitConfig.findUnique({
          where: { id },
        });

        if (!config) {
          throw new Error('RATE_LIMIT_NOT_FOUND');
        }

        // Toggle the enabled status
        return await tx.rateLimitConfig.update({
          where: { id },
          data: {
            enabled: !config.enabled,
            updatedBy: userId,
            changeReason: reason || `${!config.enabled ? 'Enabled' : 'Disabled'} by admin`,
          },
        });
      }
    );

    res.json({
      success: true,
      data: { enabled: updatedConfig.enabled },
      message: `Rate limit configuration ${updatedConfig.enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling rate limit config:', error);

    if (error.message === 'RATE_LIMIT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Rate limit configuration not found',
      });
    }

    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error toggling rate limit configuration',
    });
  }
});

/**
 * GET /api/admin/rate-limits/active
 * Get all active rate limits with current usage
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.get('/active', ...createRateLimitAuthStack('read'), async (req, res) => {
  try {
    const currentUser = req.user;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for active rate limits access',
      });
    }

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const activeLimits = await prismaService.withTenantContext(
      currentUser.organizationId,
      async tx => {
        return await tx.rateLimitUsage.findMany({
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
      }
    );

    res.json({
      success: true,
      data: activeLimits,
      count: activeLimits.length,
    });
  } catch (error) {
    console.error('Error fetching active rate limits:', error);
    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error fetching active rate limits',
    });
  }
});

/**
 * GET /api/admin/rate-limits/applications
 * Get all applications for rate limit configuration
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.get('/applications', ...createRateLimitAuthStack('read'), async (req, res) => {
  try {
    const currentUser = req.user;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for applications access',
      });
    }

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const applications = await prismaService.withTenantContext(
      currentUser.organizationId,
      async tx => {
        return await tx.application.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
          orderBy: { name: 'asc' },
        });
      }
    );

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
    });
  }
});

/**
 * GET /api/admin/rate-limits/roles
 * Get all roles for rate limit configuration
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.get('/roles', ...createRateLimitAuthStack('read'), async (req, res) => {
  try {
    const currentUser = req.user;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for roles access',
      });
    }

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const roles = await prismaService.withTenantContext(currentUser.organizationId, async tx => {
      return await tx.role.findMany({
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
    });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error fetching roles',
    });
  }
});

/**
 * GET /api/admin/rate-limits/services
 * Get all services for rate limit configuration
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.get('/services', ...createRateLimitAuthStack('read'), async (req, res) => {
  try {
    const currentUser = req.user;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for services access',
      });
    }

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const services = await prismaService.withTenantContext(currentUser.organizationId, async tx => {
      return await tx.service.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          objects: true,
        },
        orderBy: { name: 'asc' },
      });
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
    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
    });
  }
});

/**
 * GET /api/admin/rate-limits/analytics
 * Get rate limiting analytics and statistics
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.get('/analytics', ...createRateLimitAuthStack('read'), async (req, res) => {
  try {
    const currentUser = req.user;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for analytics access',
      });
    }

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const { configs, activeLimits, recentChanges } = await prismaService.withTenantContext(
      currentUser.organizationId,
      async tx => {
        const [configsData, activeLimitsData, recentChangesData] = await Promise.all([
          tx.rateLimitConfig.findMany(),
          tx.rateLimitUsage.findMany({
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
          }),
          tx.rateLimitConfig.findMany({
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
          }),
        ]);

        return {
          configs: configsData,
          activeLimits: activeLimitsData,
          recentChanges: recentChangesData,
        };
      }
    );

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
    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error fetching rate limit analytics',
    });
  }
});

/**
 * GET /api/admin/rate-limits/history
 * Get historical rate limiting data for analytics
 * SECURITY: Uses tenant-aware database operations per CLAUDE.md requirements
 */
router.get('/history', ...createRateLimitAuthStack('read'), async (req, res) => {
  try {
    const currentUser = req.user;
    const { timeRange = '7d', granularity = 'day' } = req.query;

    // SECURITY: Validate user has organization context for RLS
    if (!currentUser?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required for history access',
      });
    }

    // SECURITY: Validate timeRange parameter
    const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
    if (!validTimeRanges.includes(timeRange)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeRange parameter',
      });
    }

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

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const recentConfigs = await prismaService.withTenantContext(
      currentUser.organizationId,
      async tx => {
        return await tx.rateLimitConfig.findMany({
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
      }
    );

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
    // SECURITY: Sanitize error response
    res.status(500).json({
      success: false,
      message: 'Error fetching rate limit history',
    });
  }
});

module.exports = router;
