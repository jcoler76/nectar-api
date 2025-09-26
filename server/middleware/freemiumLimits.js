const prismaService = require('../services/prismaService');

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
        const userOrganizationId = user.organizationId;

        if (!userOrganizationId) {
          console.warn('User has no organization context for freemium limits check:', user.id);
          return next(); // Skip limits for users without organization
        }

        switch (resource) {
          case 'connections':
            // SECURITY FIX: Use withTenantContext for RLS enforcement
            currentCount = await prismaService.withTenantContext(userOrganizationId, async tx => {
              return await tx.connection.count({
                where: {
                  userId: user.id,
                  // organizationId handled by RLS
                },
              });
            });
            limit = FREEMIUM_LIMITS.maxConnections;
            break;

          case 'services':
            // SECURITY FIX: Use withTenantContext for RLS enforcement
            currentCount = await prismaService.withTenantContext(userOrganizationId, async tx => {
              return await tx.service.count({
                where: {
                  userId: user.id,
                  // organizationId handled by RLS
                },
              });
            });
            limit = FREEMIUM_LIMITS.maxServices;
            break;

          case 'roles':
            // SECURITY FIX: Use withTenantContext for RLS enforcement
            currentCount = await prismaService.withTenantContext(userOrganizationId, async tx => {
              return await tx.role.count({
                where: {
                  userId: user.id,
                  // organizationId handled by RLS
                },
              });
            });
            limit = FREEMIUM_LIMITS.maxRoles;
            break;

          case 'workflows':
            // SECURITY FIX: Check workflow components count with RLS enforcement
            const workflows = await prismaService.withTenantContext(
              userOrganizationId,
              async tx => {
                return await tx.workflow.findMany({
                  where: {
                    userId: user.id,
                    // organizationId handled by RLS
                  },
                  select: { components: true },
                });
              }
            );

            currentCount = workflows.reduce((total, workflow) => {
              return total + (workflow.components ? workflow.components.length : 0);
            }, 0);
            limit = FREEMIUM_LIMITS.maxWorkflowComponents;
            break;

          case 'team-members':
            // SECURITY FIX: Use system client for organization member count (infrastructure data)
            const systemPrisma = prismaService.getSystemClient();
            currentCount = await systemPrisma.user.count({
              where: {
                memberships: {
                  some: {
                    organizationId: userOrganizationId,
                    isActive: true,
                  },
                },
              },
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

    const userOrganizationId = user.organizationId;

    if (!userOrganizationId) {
      console.warn('User has no organization context for API usage limits:', user.id);
      return next(); // Skip limits for users without organization
    }

    // SECURITY FIX: Count API calls for current month with RLS enforcement
    const apiCallCount = await prismaService.withTenantContext(userOrganizationId, async tx => {
      return await tx.apiUsage.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: currentMonth,
          },
          // organizationId handled by RLS
        },
      });
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
const getFreemiumUsageStats = async (userId, organizationId) => {
  try {
    if (!organizationId) {
      console.warn('Organization ID required for freemium usage stats:', userId);
      return null;
    }

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // SECURITY FIX: Use withTenantContext for RLS enforcement on all queries
    const [connectionsCount, servicesCount, rolesCount, apiCallsCount, workflows] =
      await Promise.all([
        prismaService.withTenantContext(organizationId, async tx => {
          return await tx.connection.count({
            where: {
              userId,
              // organizationId handled by RLS
            },
          });
        }),
        prismaService.withTenantContext(organizationId, async tx => {
          return await tx.service.count({
            where: {
              userId,
              // organizationId handled by RLS
            },
          });
        }),
        prismaService.withTenantContext(organizationId, async tx => {
          return await tx.role.count({
            where: {
              userId,
              // organizationId handled by RLS
            },
          });
        }),
        prismaService.withTenantContext(organizationId, async tx => {
          return await tx.apiUsage.count({
            where: {
              userId,
              createdAt: { gte: currentMonth },
              // organizationId handled by RLS
            },
          });
        }),
        prismaService.withTenantContext(organizationId, async tx => {
          return await tx.workflow.findMany({
            where: {
              userId,
              // organizationId handled by RLS
            },
            select: { components: true },
          });
        }),
      ]);

    const workflowComponentsCount = workflows.reduce((total, workflow) => {
      return total + (workflow.components ? workflow.components.length : 0);
    }, 0);

    return {
      userId,
      organizationId,
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
