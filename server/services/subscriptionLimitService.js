const prismaService = require('../services/prismaService');
const prisma = prismaService.getRLSClient();
const { logger } = require('../middleware/logger');

/**
 * Service to handle subscription-based limits and usage tracking
 * Implements Phase 1 pricing model with user limits and overages
 */
class SubscriptionLimitService {
  constructor() {
    this.planLimits = {
      FREE: {
        userLimit: 1,
        datasourceLimit: 1,
        apiCallLimit: 25000,
        userOveragePrice: 0, // No overage allowed on free plan
      },
      STARTER: {
        userLimit: 1,
        datasourceLimit: 3,
        apiCallLimit: 1000000,
        userOveragePrice: 10.0,
      },
      TEAM: {
        userLimit: 10,
        datasourceLimit: -1, // Unlimited
        apiCallLimit: 5000000,
        userOveragePrice: 10.0,
      },
      BUSINESS: {
        userLimit: 25,
        datasourceLimit: -1, // Unlimited
        apiCallLimit: 10000000,
        userOveragePrice: 10.0,
      },
      ENTERPRISE: {
        userLimit: -1, // Unlimited
        datasourceLimit: -1,
        apiCallLimit: -1,
        userOveragePrice: 0, // Custom pricing
      },
    };
  }

  /**
   * Get the subscription and limits for an organization
   * @param {string} organizationId
   * @returns {Promise<Object>} Subscription with limits
   */
  async getOrganizationLimits(organizationId) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { organizationId },
        include: { organization: true },
      });

      if (!subscription) {
        // Default to FREE plan if no subscription found
        return {
          plan: 'FREE',
          ...this.planLimits.FREE,
        };
      }

      // Use dynamic limits from database if available, otherwise fall back to defaults
      const defaultLimits = this.planLimits[subscription.plan] || this.planLimits.FREE;

      return {
        plan: subscription.plan,
        userLimit: subscription.userLimit || defaultLimits.userLimit,
        datasourceLimit: subscription.datasourceLimit || defaultLimits.datasourceLimit,
        apiCallLimit: subscription.apiCallLimit || defaultLimits.apiCallLimit,
        userOveragePrice: subscription.userOveragePrice || defaultLimits.userOveragePrice,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      logger.error('Error getting organization limits:', error);
      // Return free plan limits as fallback
      return {
        plan: 'FREE',
        ...this.planLimits.FREE,
      };
    }
  }

  /**
   * Check if organization is within user limits
   * @param {string} organizationId
   * @returns {Promise<Object>} Usage status
   */
  async checkUserLimits(organizationId) {
    try {
      const limits = await this.getOrganizationLimits(organizationId);

      // Count current active users in organization
      const userCount = await prisma.membership.count({
        where: {
          organizationId,
          user: { isActive: true },
        },
      });

      const isWithinLimit = limits.userLimit === -1 || userCount <= limits.userLimit;
      const overage = isWithinLimit ? 0 : userCount - limits.userLimit;
      const overageCost = overage * (limits.userOveragePrice || 0);

      return {
        currentUsers: userCount,
        userLimit: limits.userLimit,
        isWithinLimit,
        overage,
        overageCost,
        canAddUsers: limits.userLimit === -1 || limits.plan !== 'FREE' || isWithinLimit,
        plan: limits.plan,
      };
    } catch (error) {
      logger.error('Error checking user limits:', error);
      return {
        currentUsers: 0,
        userLimit: 2,
        isWithinLimit: true,
        overage: 0,
        overageCost: 0,
        canAddUsers: false,
        plan: 'FREE',
        error: error.message,
      };
    }
  }

  /**
   * Track and update monthly usage metrics
   * @param {string} organizationId
   * @param {Object} usage - Usage data to track
   */
  async updateUsageMetrics(organizationId, usage = {}) {
    try {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const limits = await this.getOrganizationLimits(organizationId);

      // Get current user count
      const currentUsers = await prisma.membership.count({
        where: {
          organizationId,
          user: { isActive: true },
        },
      });

      // Calculate user overage
      const userOverage = Math.max(
        0,
        limits.userLimit === -1 ? 0 : currentUsers - limits.userLimit
      );
      const userOverageCost = userOverage * (limits.userOveragePrice || 0);

      // Upsert usage metrics
      const usageMetric = await prisma.usageMetric.upsert({
        where: {
          organizationId_period: {
            organizationId,
            period,
          },
        },
        update: {
          activeUsers: currentUsers,
          apiCalls: usage.apiCalls ? { increment: usage.apiCalls } : undefined,
          datasources: usage.datasources || undefined,
          userOverage,
          userOverageCost,
          lastUpdated: now,
        },
        create: {
          organizationId,
          period,
          activeUsers: currentUsers,
          apiCalls: usage.apiCalls || 0,
          datasources: usage.datasources || 0,
          userOverage,
          userOverageCost,
          lastUpdated: now,
        },
      });

      return usageMetric;
    } catch (error) {
      logger.error('Error updating usage metrics:', error);
      throw error;
    }
  }

  /**
   * Get current month usage for organization
   * @param {string} organizationId
   * @returns {Promise<Object>} Current usage metrics
   */
  async getCurrentUsage(organizationId) {
    try {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const usageMetric = await prisma.usageMetric.findUnique({
        where: {
          organizationId_period: {
            organizationId,
            period,
          },
        },
      });

      const limits = await this.getOrganizationLimits(organizationId);

      return {
        period,
        usage: usageMetric || {
          activeUsers: 0,
          apiCalls: 0,
          datasources: 0,
          userOverage: 0,
          userOverageCost: 0,
        },
        limits,
      };
    } catch (error) {
      logger.error('Error getting current usage:', error);
      throw error;
    }
  }

  /**
   * Middleware to enforce user limits on invitation/user creation
   * @param {string} organizationId
   * @returns {Promise<boolean>} Whether user can be added
   */
  async canAddUser(organizationId) {
    const userCheck = await this.checkUserLimits(organizationId);

    if (userCheck.plan === 'FREE' && !userCheck.isWithinLimit) {
      return false; // Free plans cannot exceed limits
    }

    return userCheck.canAddUsers;
  }

  /**
   * Get usage warning messages for display to users
   * @param {string} organizationId
   * @returns {Promise<Array>} Warning messages
   */
  async getUsageWarnings(organizationId) {
    try {
      const userCheck = await this.checkUserLimits(organizationId);
      const usage = await this.getCurrentUsage(organizationId);
      const warnings = [];

      // User limit warnings
      if (userCheck.overage > 0) {
        warnings.push({
          type: 'USER_OVERAGE',
          severity: userCheck.plan === 'FREE' ? 'error' : 'warning',
          message:
            userCheck.plan === 'FREE'
              ? `You have ${userCheck.overage} users over your free plan limit. Please upgrade or remove users.`
              : `You have ${userCheck.overage} users over your plan limit. Additional cost: $${userCheck.overageCost.toFixed(2)}/month`,
          details: {
            currentUsers: userCheck.currentUsers,
            limit: userCheck.userLimit,
            overage: userCheck.overage,
            cost: userCheck.overageCost,
          },
        });
      } else if (
        userCheck.currentUsers >= userCheck.userLimit * 0.8 &&
        userCheck.userLimit !== -1
      ) {
        warnings.push({
          type: 'USER_LIMIT_APPROACHING',
          severity: 'info',
          message: `You're using ${userCheck.currentUsers} of ${userCheck.userLimit} users (${Math.round((userCheck.currentUsers / userCheck.userLimit) * 100)}%)`,
          details: {
            currentUsers: userCheck.currentUsers,
            limit: userCheck.userLimit,
            percentage: Math.round((userCheck.currentUsers / userCheck.userLimit) * 100),
          },
        });
      }

      // API call warnings (if close to limit)
      const apiUsagePercent =
        usage.limits.apiCallLimit !== -1
          ? (usage.usage.apiCalls / usage.limits.apiCallLimit) * 100
          : 0;

      if (apiUsagePercent >= 80) {
        warnings.push({
          type: 'API_LIMIT_APPROACHING',
          severity: apiUsagePercent >= 95 ? 'warning' : 'info',
          message: `You've used ${apiUsagePercent.toFixed(1)}% of your monthly API calls`,
          details: {
            current: usage.usage.apiCalls,
            limit: usage.limits.apiCallLimit,
            percentage: apiUsagePercent,
          },
        });
      }

      return warnings;
    } catch (error) {
      logger.error('Error getting usage warnings:', error);
      return [];
    }
  }
}

module.exports = new SubscriptionLimitService();
