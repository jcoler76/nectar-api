const prismaService = require('../services/prismaService');
const prisma = prismaService.getRLSClient();

// Define freemium limits
const FREEMIUM_LIMITS = {
  maxConnections: 1,
  maxServices: 1,
  maxRoles: 1,
  maxWorkflowComponents: 5,
  maxApiCallsPerMonth: 500,
  maxTeamMembers: 1,
};

/**
 * Middleware to check freemium plan limits
 * @param {string} resource - The resource type being accessed (connections, services, roles, etc.)
 * @param {string} operation - The operation type (create, update, delete)
 */
const checkFreemiumLimits = (resource, operation = 'create') => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // Skip if user is not on freemium plan
      if (!user || user.plan !== 'free') {
        return next();
      }

      // Check specific resource limits for creation operations
      if (operation === 'create') {
        let currentCount = 0;
        let limit = 0;

        switch (resource) {
          case 'connections':
            currentCount = await prisma.connection.count({
              where: { userId: user.id },
            });
            limit = FREEMIUM_LIMITS.maxConnections;
            break;

          case 'services':
            currentCount = await prisma.service.count({
              where: { userId: user.id },
            });
            limit = FREEMIUM_LIMITS.maxServices;
            break;

          case 'roles':
            currentCount = await prisma.role.count({
              where: { userId: user.id },
            });
            limit = FREEMIUM_LIMITS.maxRoles;
            break;

          case 'workflows':
            // Check workflow components count
            const workflows = await prisma.workflow.findMany({
              where: { userId: user.id },
              select: { components: true },
            });

            currentCount = workflows.reduce((total, workflow) => {
              return total + (workflow.components ? workflow.components.length : 0);
            }, 0);
            limit = FREEMIUM_LIMITS.maxWorkflowComponents;
            break;

          case 'team-members':
            currentCount = await prisma.user.count({
              where: { organizationId: user.organizationId },
            });
            limit = FREEMIUM_LIMITS.maxTeamMembers;
            break;

          default:
            return next();
        }

        if (currentCount >= limit) {
          return res.status(403).json({
            error: 'Freemium Limit Reached',
            message: `You've reached the limit of ${limit} ${resource} on the free plan. Upgrade to continue.`,
            currentCount,
            limit,
            resource,
            upgradeRequired: true,
            upgradeUrl: '/pricing',
          });
        }
      }

      next();
    } catch (error) {
      console.error('Freemium limits check error:', error);
      next(); // Don't block on errors, just log
    }
  };
};

/**
 * Middleware to check API usage limits for freemium users
 */
const checkApiUsageLimits = async (req, res, next) => {
  try {
    const user = req.user;

    // Skip if user is not on freemium plan
    if (!user || user.plan !== 'free') {
      return next();
    }

    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    currentMonth.setHours(0, 0, 0, 0);

    // Count API calls for current month
    const apiCallCount = await prisma.apiUsage.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: currentMonth,
        },
      },
    });

    if (apiCallCount >= FREEMIUM_LIMITS.maxApiCallsPerMonth) {
      return res.status(429).json({
        error: 'API Limit Exceeded',
        message: `You've exceeded the ${FREEMIUM_LIMITS.maxApiCallsPerMonth} API calls per month limit on the free plan.`,
        currentUsage: apiCallCount,
        limit: FREEMIUM_LIMITS.maxApiCallsPerMonth,
        upgradeRequired: true,
        upgradeUrl: '/pricing',
        resetDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
      });
    }

    // Add usage info to request for tracking
    req.apiUsageInfo = {
      currentUsage: apiCallCount,
      limit: FREEMIUM_LIMITS.maxApiCallsPerMonth,
      remaining: FREEMIUM_LIMITS.maxApiCallsPerMonth - apiCallCount,
    };

    next();
  } catch (error) {
    console.error('API usage limits check error:', error);
    next(); // Don't block on errors, just log
  }
};

/**
 * Get current usage stats for freemium user
 */
const getFreemiumUsageStats = async userId => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [connectionsCount, servicesCount, rolesCount, apiCallsCount, workflows] =
      await Promise.all([
        prisma.connection.count({ where: { userId } }),
        prisma.service.count({ where: { userId } }),
        prisma.role.count({ where: { userId } }),
        prisma.apiUsage.count({
          where: {
            userId,
            createdAt: { gte: currentMonth },
          },
        }),
        prisma.workflow.findMany({
          where: { userId },
          select: { components: true },
        }),
      ]);

    const workflowComponentsCount = workflows.reduce((total, workflow) => {
      return total + (workflow.components ? workflow.components.length : 0);
    }, 0);

    return {
      connections: {
        current: connectionsCount,
        limit: FREEMIUM_LIMITS.maxConnections,
        remaining: Math.max(0, FREEMIUM_LIMITS.maxConnections - connectionsCount),
      },
      services: {
        current: servicesCount,
        limit: FREEMIUM_LIMITS.maxServices,
        remaining: Math.max(0, FREEMIUM_LIMITS.maxServices - servicesCount),
      },
      roles: {
        current: rolesCount,
        limit: FREEMIUM_LIMITS.maxRoles,
        remaining: Math.max(0, FREEMIUM_LIMITS.maxRoles - rolesCount),
      },
      workflowComponents: {
        current: workflowComponentsCount,
        limit: FREEMIUM_LIMITS.maxWorkflowComponents,
        remaining: Math.max(0, FREEMIUM_LIMITS.maxWorkflowComponents - workflowComponentsCount),
      },
      apiCalls: {
        current: apiCallsCount,
        limit: FREEMIUM_LIMITS.maxApiCallsPerMonth,
        remaining: Math.max(0, FREEMIUM_LIMITS.maxApiCallsPerMonth - apiCallsCount),
        resetDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
      },
    };
  } catch (error) {
    console.error('Error getting freemium usage stats:', error);
    return null;
  }
};

module.exports = {
  checkFreemiumLimits,
  checkApiUsageLimits,
  getFreemiumUsageStats,
  FREEMIUM_LIMITS,
};
