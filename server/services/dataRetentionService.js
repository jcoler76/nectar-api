const prismaService = require('./prismaService');
const { logger } = require('../utils/logger');

class DataRetentionService {
  constructor() {
    this.prisma = prismaService.getClient();

    // Default retention policies (in days)
    this.retentionPolicies = {
      appUsageLog: {
        default: 365, // 1 year
        detailed: 90, // 3 months for detailed events
        anonymous: 730, // 2 years for anonymous data
      },
      loginActivityLog: {
        success: 180, // 6 months for successful logins
        failed: 365, // 1 year for failed attempts (security)
        suspicious: 1095, // 3 years for suspicious activity
      },
      sessionData: {
        active: 30, // 30 days for active sessions
        expired: 7, // 7 days for expired sessions
      },
      errorLogs: {
        critical: 365, // 1 year for critical errors
        warning: 90, // 3 months for warnings
        info: 30, // 30 days for info logs
      },
    };
  }

  /**
   * Clean up old app usage logs based on retention policies
   */
  async cleanupAppUsageLogs() {
    try {
      const policies = this.retentionPolicies.appUsageLog;
      const now = new Date();

      // Clean detailed events (high-frequency data)
      const detailedCutoff = new Date(now.getTime() - policies.detailed * 24 * 60 * 60 * 1000);
      const detailedDeleted = await this.prisma.appUsageLog.deleteMany({
        where: {
          timestamp: {
            lt: detailedCutoff,
          },
          eventType: {
            in: ['click', 'scroll', 'hover', 'focus', 'blur'],
          },
        },
      });

      // Clean default events
      const defaultCutoff = new Date(now.getTime() - policies.default * 24 * 60 * 60 * 1000);
      const defaultDeleted = await this.prisma.appUsageLog.deleteMany({
        where: {
          timestamp: {
            lt: defaultCutoff,
          },
          eventType: {
            notIn: ['click', 'scroll', 'hover', 'focus', 'blur'],
          },
          userId: {
            not: null, // Don't delete anonymous data yet
          },
        },
      });

      // Clean very old anonymous data
      const anonymousCutoff = new Date(now.getTime() - policies.anonymous * 24 * 60 * 60 * 1000);
      const anonymousDeleted = await this.prisma.appUsageLog.deleteMany({
        where: {
          timestamp: {
            lt: anonymousCutoff,
          },
          userId: null,
        },
      });

      logger.info('App usage log cleanup completed', {
        detailedDeleted: detailedDeleted.count,
        defaultDeleted: defaultDeleted.count,
        anonymousDeleted: anonymousDeleted.count,
        totalDeleted: detailedDeleted.count + defaultDeleted.count + anonymousDeleted.count,
      });

      return {
        success: true,
        deleted: {
          detailed: detailedDeleted.count,
          default: defaultDeleted.count,
          anonymous: anonymousDeleted.count,
          total: detailedDeleted.count + defaultDeleted.count + anonymousDeleted.count,
        },
      };
    } catch (error) {
      logger.error('Failed to cleanup app usage logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up old login activity logs
   */
  async cleanupLoginActivityLogs() {
    try {
      const policies = this.retentionPolicies.loginActivityLog;
      const now = new Date();

      // Clean successful logins
      const successCutoff = new Date(now.getTime() - policies.success * 24 * 60 * 60 * 1000);
      const successDeleted = await this.prisma.loginActivityLog.deleteMany({
        where: {
          timestamp: {
            lt: successCutoff,
          },
          loginType: 'success',
        },
      });

      // Clean failed logins (but not suspicious ones)
      const failedCutoff = new Date(now.getTime() - policies.failed * 24 * 60 * 60 * 1000);
      const failedDeleted = await this.prisma.loginActivityLog.deleteMany({
        where: {
          timestamp: {
            lt: failedCutoff,
          },
          loginType: 'failed',
          failureReason: {
            notIn: ['suspicious_activity', 'rate_limited', 'brute_force'],
          },
        },
      });

      // Clean very old suspicious activity
      const suspiciousCutoff = new Date(now.getTime() - policies.suspicious * 24 * 60 * 60 * 1000);
      const suspiciousDeleted = await this.prisma.loginActivityLog.deleteMany({
        where: {
          timestamp: {
            lt: suspiciousCutoff,
          },
          OR: [
            {
              loginType: 'failed',
              failureReason: {
                in: ['suspicious_activity', 'rate_limited', 'brute_force'],
              },
            },
          ],
        },
      });

      logger.info('Login activity log cleanup completed', {
        successDeleted: successDeleted.count,
        failedDeleted: failedDeleted.count,
        suspiciousDeleted: suspiciousDeleted.count,
        totalDeleted: successDeleted.count + failedDeleted.count + suspiciousDeleted.count,
      });

      return {
        success: true,
        deleted: {
          success: successDeleted.count,
          failed: failedDeleted.count,
          suspicious: suspiciousDeleted.count,
          total: successDeleted.count + failedDeleted.count + suspiciousDeleted.count,
        },
      };
    } catch (error) {
      logger.error('Failed to cleanup login activity logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Anonymize old user data for privacy compliance
   */
  async anonymizeOldData() {
    try {
      const anonymizationCutoff = new Date();
      anonymizationCutoff.setDate(anonymizationCutoff.getDate() - 365); // 1 year

      // Anonymize app usage logs
      const appUsageAnonymized = await this.prisma.appUsageLog.updateMany({
        where: {
          timestamp: {
            lt: anonymizationCutoff,
          },
          userId: {
            not: null,
          },
        },
        data: {
          userId: null,
          metadata: null, // Remove potentially sensitive metadata
          elementId: 'anonymized',
        },
      });

      // Anonymize login activity logs (keep some data for security analysis)
      const loginAnonymized = await this.prisma.loginActivityLog.updateMany({
        where: {
          timestamp: {
            lt: anonymizationCutoff,
          },
          userId: {
            not: null,
          },
          loginType: 'success', // Only anonymize successful logins
        },
        data: {
          userId: null,
          email: 'anonymized@domain.com',
          userAgent: 'anonymized',
          metadata: null,
        },
      });

      logger.info('Data anonymization completed', {
        appUsageAnonymized: appUsageAnonymized.count,
        loginAnonymized: loginAnonymized.count,
        totalAnonymized: appUsageAnonymized.count + loginAnonymized.count,
      });

      return {
        success: true,
        anonymized: {
          appUsage: appUsageAnonymized.count,
          login: loginAnonymized.count,
          total: appUsageAnonymized.count + loginAnonymized.count,
        },
      };
    } catch (error) {
      logger.error('Failed to anonymize old data', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate aggregated statistics before deleting detailed data
   */
  async generateAggregatedStats(date) {
    try {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      // Aggregate app usage by hour
      const appUsageStats = await this.prisma.$queryRaw`
        SELECT
          DATE_TRUNC('hour', timestamp) as hour,
          event_type,
          page,
          COUNT(*) as event_count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM app_usage_log
        WHERE timestamp >= ${startDate} AND timestamp < ${endDate}
        GROUP BY DATE_TRUNC('hour', timestamp), event_type, page
      `;

      // Aggregate login activity by hour
      const loginStats = await this.prisma.$queryRaw`
        SELECT
          DATE_TRUNC('hour', timestamp) as hour,
          login_type,
          failure_reason,
          COUNT(*) as login_count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM login_activity_log
        WHERE timestamp >= ${startDate} AND timestamp < ${endDate}
        GROUP BY DATE_TRUNC('hour', timestamp), login_type, failure_reason
      `;

      // Store aggregated data (you might want to create a separate table for this)
      logger.info('Generated aggregated statistics', {
        date: date,
        appUsageRecords: appUsageStats.length,
        loginRecords: loginStats.length,
      });

      return {
        success: true,
        date,
        appUsageStats,
        loginStats,
      };
    } catch (error) {
      logger.error('Failed to generate aggregated statistics', {
        error: error.message,
        date,
      });
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    try {
      const stats = await this.prisma.$transaction([
        this.prisma.appUsageLog.count(),
        this.prisma.loginActivityLog.count(),
        this.prisma.$queryRaw`
          SELECT
            pg_size_pretty(pg_total_relation_size('app_usage_log')) as app_usage_size,
            pg_size_pretty(pg_total_relation_size('login_activity_log')) as login_activity_size
        `,
        this.prisma.appUsageLog.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
        this.prisma.loginActivityLog.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]);

      const [totalAppUsage, totalLoginActivity, tableSizes, recentAppUsage, recentLoginActivity] =
        stats;

      return {
        totalRecords: {
          appUsage: totalAppUsage,
          loginActivity: totalLoginActivity,
          total: totalAppUsage + totalLoginActivity,
        },
        recentRecords: {
          appUsage: recentAppUsage,
          loginActivity: recentLoginActivity,
          total: recentAppUsage + recentLoginActivity,
        },
        tableSizes: tableSizes[0] || {},
        retentionPolicies: this.retentionPolicies,
      };
    } catch (error) {
      logger.error('Failed to get storage statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Run complete data maintenance routine
   */
  async runMaintenanceRoutine() {
    try {
      logger.info('Starting data maintenance routine');

      const results = {
        timestamp: new Date(),
        operations: [],
      };

      // 1. Generate aggregated stats for old data before cleanup
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91); // 91 days ago

      try {
        const aggregatedStats = await this.generateAggregatedStats(oldDate);
        results.operations.push({
          operation: 'aggregate_stats',
          success: true,
          ...aggregatedStats,
        });
      } catch (error) {
        results.operations.push({
          operation: 'aggregate_stats',
          success: false,
          error: error.message,
        });
      }

      // 2. Anonymize old data
      try {
        const anonymizeResult = await this.anonymizeOldData();
        results.operations.push({
          operation: 'anonymize_data',
          success: true,
          ...anonymizeResult,
        });
      } catch (error) {
        results.operations.push({
          operation: 'anonymize_data',
          success: false,
          error: error.message,
        });
      }

      // 3. Clean up app usage logs
      try {
        const appUsageCleanup = await this.cleanupAppUsageLogs();
        results.operations.push({
          operation: 'cleanup_app_usage',
          success: true,
          ...appUsageCleanup,
        });
      } catch (error) {
        results.operations.push({
          operation: 'cleanup_app_usage',
          success: false,
          error: error.message,
        });
      }

      // 4. Clean up login activity logs
      try {
        const loginCleanup = await this.cleanupLoginActivityLogs();
        results.operations.push({
          operation: 'cleanup_login_activity',
          success: true,
          ...loginCleanup,
        });
      } catch (error) {
        results.operations.push({
          operation: 'cleanup_login_activity',
          success: false,
          error: error.message,
        });
      }

      // 5. Get final storage stats
      try {
        const storageStats = await this.getStorageStats();
        results.storageStats = storageStats;
      } catch (error) {
        logger.warn('Failed to get final storage stats', { error: error.message });
      }

      const successfulOps = results.operations.filter(op => op.success).length;
      const totalOps = results.operations.length;

      logger.info('Data maintenance routine completed', {
        successfulOperations: successfulOps,
        totalOperations: totalOps,
        success: successfulOps === totalOps,
      });

      return results;
    } catch (error) {
      logger.error('Data maintenance routine failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Update retention policies
   */
  async updateRetentionPolicy(category, subcategory, days) {
    try {
      if (!this.retentionPolicies[category]) {
        throw new Error(`Invalid category: ${category}`);
      }

      if (!this.retentionPolicies[category][subcategory]) {
        throw new Error(`Invalid subcategory: ${subcategory} for category: ${category}`);
      }

      const oldValue = this.retentionPolicies[category][subcategory];
      this.retentionPolicies[category][subcategory] = days;

      logger.info('Retention policy updated', {
        category,
        subcategory,
        oldValue,
        newValue: days,
      });

      return {
        success: true,
        category,
        subcategory,
        oldValue,
        newValue: days,
      };
    } catch (error) {
      logger.error('Failed to update retention policy', {
        error: error.message,
        category,
        subcategory,
        days,
      });
      throw error;
    }
  }

  /**
   * Export user data for GDPR compliance
   */
  async exportUserData(userId) {
    try {
      const [appUsageData, loginActivityData] = await Promise.all([
        this.prisma.appUsageLog.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
        }),
        this.prisma.loginActivityLog.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
        }),
      ]);

      const exportData = {
        userId,
        exportDate: new Date(),
        appUsage: appUsageData,
        loginActivity: loginActivityData,
        summary: {
          totalAppUsageEvents: appUsageData.length,
          totalLoginEvents: loginActivityData.length,
          firstActivity:
            appUsageData.length > 0 ? appUsageData[appUsageData.length - 1].timestamp : null,
          lastActivity: appUsageData.length > 0 ? appUsageData[0].timestamp : null,
        },
      };

      logger.info('User data exported', {
        userId,
        appUsageEvents: appUsageData.length,
        loginEvents: loginActivityData.length,
      });

      return exportData;
    } catch (error) {
      logger.error('Failed to export user data', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete all user data for GDPR compliance
   */
  async deleteUserData(userId) {
    try {
      const [appUsageDeleted, loginActivityDeleted] = await Promise.all([
        this.prisma.appUsageLog.deleteMany({
          where: { userId },
        }),
        this.prisma.loginActivityLog.deleteMany({
          where: { userId },
        }),
      ]);

      logger.info('User data deleted', {
        userId,
        appUsageDeleted: appUsageDeleted.count,
        loginActivityDeleted: loginActivityDeleted.count,
        totalDeleted: appUsageDeleted.count + loginActivityDeleted.count,
      });

      return {
        success: true,
        userId,
        deleted: {
          appUsage: appUsageDeleted.count,
          loginActivity: loginActivityDeleted.count,
          total: appUsageDeleted.count + loginActivityDeleted.count,
        },
      };
    } catch (error) {
      logger.error('Failed to delete user data', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }
}

module.exports = new DataRetentionService();
