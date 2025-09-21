// Simple cron-like scheduler using setTimeout/setInterval
// Alternative to node-cron to avoid additional dependencies
const dataRetentionService = require('./dataRetentionService');
const { logger } = require('../utils/logger');

class CronService {
  constructor() {
    this.jobs = new Map();
    this.isStarted = false;
  }

  /**
   * Initialize and start all cron jobs
   */
  start() {
    if (this.isStarted) {
      logger.warn('Cron service is already started');
      return;
    }

    try {
      // Daily data retention maintenance at 2 AM
      this.scheduleDataMaintenanceDaily();

      // Weekly comprehensive cleanup on Sundays at 3 AM
      this.scheduleWeeklyCleanup();

      // Monthly storage stats report on 1st of month at 4 AM
      this.scheduleMonthlyStorageReport();

      this.isStarted = true;
      logger.info('Cron service started successfully', {
        jobCount: this.jobs.size,
        jobs: Array.from(this.jobs.keys()),
      });
    } catch (error) {
      logger.error('Failed to start cron service', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    try {
      this.jobs.forEach((job, name) => {
        job.stop();
        logger.info('Stopped cron job', { jobName: name });
      });

      this.jobs.clear();
      this.isStarted = false;
      logger.info('Cron service stopped');
    } catch (error) {
      logger.error('Error stopping cron service', { error: error.message });
    }
  }

  /**
   * Schedule daily data maintenance (runs at 2 AM every day)
   */
  scheduleDataMaintenanceDaily() {
    const jobName = 'dailyDataMaintenance';

    const runTask = async () => {
      logger.info('Starting daily data maintenance routine');

      try {
        const results = await dataRetentionService.runMaintenanceRoutine();

        logger.info('Daily data maintenance completed successfully', {
          timestamp: results.timestamp,
          operations: results.operations.length,
          successfulOperations: results.operations.filter(op => op.success).length,
        });

        // Log any failed operations
        const failedOps = results.operations.filter(op => !op.success);
        if (failedOps.length > 0) {
          logger.warn('Some data maintenance operations failed', {
            failedOperations: failedOps.map(op => ({
              operation: op.operation,
              error: op.error,
            })),
          });
        }
      } catch (error) {
        logger.error('Daily data maintenance routine failed', {
          error: error.message,
          stack: error.stack,
        });
      }
    };

    // Calculate time until next 2 AM UTC
    const getNextRunTime = () => {
      const now = new Date();
      const next = new Date();
      next.setUTCHours(2, 0, 0, 0);

      // If it's already past 2 AM today, schedule for tomorrow
      if (now.getTime() >= next.getTime()) {
        next.setUTCDate(next.getUTCDate() + 1);
      }

      return next.getTime() - now.getTime();
    };

    const scheduleNext = () => {
      const timeToNext = getNextRunTime();
      const timeout = setTimeout(() => {
        runTask();
        // Schedule next run (24 hours later)
        const interval = setInterval(runTask, 24 * 60 * 60 * 1000);
        this.jobs.set(jobName + '_interval', {
          stop: () => clearInterval(interval),
          running: true,
          type: 'interval',
        });
      }, timeToNext);

      this.jobs.set(jobName, {
        stop: () => clearTimeout(timeout),
        running: true,
        type: 'timeout',
        nextDate: new Date(Date.now() + timeToNext),
      });
    };

    scheduleNext();
    logger.info('Scheduled daily data maintenance job', {
      jobName,
      schedule: '2:00 AM UTC daily',
      nextRun: new Date(Date.now() + getNextRunTime()),
    });
  }

  /**
   * Schedule weekly comprehensive cleanup (runs every 7 days)
   */
  scheduleWeeklyCleanup() {
    const jobName = 'weeklyCleanup';
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    const runWeeklyTask = async () => {
      logger.info('Starting weekly comprehensive cleanup');

      try {
        // Run more aggressive cleanup operations weekly
        const operations = [];

        // 1. Anonymize old data
        try {
          const anonymizeResult = await dataRetentionService.anonymizeOldData();
          operations.push({
            operation: 'weekly_anonymize_data',
            success: true,
            ...anonymizeResult,
          });
        } catch (error) {
          operations.push({
            operation: 'weekly_anonymize_data',
            success: false,
            error: error.message,
          });
        }

        // 2. Clean up app usage logs
        try {
          const appUsageResult = await dataRetentionService.cleanupAppUsageLogs();
          operations.push({
            operation: 'weekly_cleanup_app_usage',
            success: true,
            ...appUsageResult,
          });
        } catch (error) {
          operations.push({
            operation: 'weekly_cleanup_app_usage',
            success: false,
            error: error.message,
          });
        }

        // 3. Clean up login activity logs
        try {
          const loginResult = await dataRetentionService.cleanupLoginActivityLogs();
          operations.push({
            operation: 'weekly_cleanup_login_activity',
            success: true,
            ...loginResult,
          });
        } catch (error) {
          operations.push({
            operation: 'weekly_cleanup_login_activity',
            success: false,
            error: error.message,
          });
        }

        const successfulOps = operations.filter(op => op.success).length;

        logger.info('Weekly comprehensive cleanup completed', {
          operations: operations.length,
          successfulOperations: successfulOps,
          timestamp: new Date(),
        });

        // Log any failures
        const failedOps = operations.filter(op => !op.success);
        if (failedOps.length > 0) {
          logger.warn('Some weekly cleanup operations failed', {
            failedOperations: failedOps.map(op => ({
              operation: op.operation,
              error: op.error,
            })),
          });
        }
      } catch (error) {
        logger.error('Weekly comprehensive cleanup failed', {
          error: error.message,
          stack: error.stack,
        });
      }
    };

    // Run initially after 1 hour, then every 7 days
    setTimeout(
      () => {
        runWeeklyTask();
        const interval = setInterval(runWeeklyTask, WEEK_MS);

        this.jobs.set(jobName + '_interval', {
          stop: () => clearInterval(interval),
          running: true,
          type: 'interval',
        });
      },
      60 * 60 * 1000
    ); // 1 hour delay

    logger.info('Scheduled weekly cleanup job', {
      jobName,
      schedule: 'Every 7 days',
      firstRun: new Date(Date.now() + 60 * 60 * 1000),
    });
  }

  /**
   * Schedule monthly storage report (runs every 30 days)
   */
  scheduleMonthlyStorageReport() {
    const jobName = 'monthlyStorageReport';
    const MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    const runMonthlyTask = async () => {
      logger.info('Generating monthly storage report');

      try {
        const storageStats = await dataRetentionService.getStorageStats();

        logger.info('Monthly storage report generated', {
          timestamp: new Date(),
          totalRecords: storageStats.totalRecords,
          recentRecords: storageStats.recentRecords,
          retentionPolicies: storageStats.retentionPolicies,
        });

        // You could extend this to send the report via email or store it in the database
        // For now, we're just logging the comprehensive stats
      } catch (error) {
        logger.error('Monthly storage report generation failed', {
          error: error.message,
          stack: error.stack,
        });
      }
    };

    // Run initially after 2 hours, then every 30 days
    setTimeout(
      () => {
        runMonthlyTask();
        const interval = setInterval(runMonthlyTask, MONTH_MS);

        this.jobs.set(jobName + '_interval', {
          stop: () => clearInterval(interval),
          running: true,
          type: 'interval',
        });
      },
      2 * 60 * 60 * 1000
    ); // 2 hour delay

    logger.info('Scheduled monthly storage report job', {
      jobName,
      schedule: 'Every 30 days',
      firstRun: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
  }

  /**
   * Get status of all cron jobs
   */
  getJobsStatus() {
    const status = {
      isStarted: this.isStarted,
      jobCount: this.jobs.size,
      jobs: [],
    };

    this.jobs.forEach((job, name) => {
      status.jobs.push({
        name,
        running: job.running || false,
        type: job.type || 'unknown',
        nextDate: job.nextDate || null,
      });
    });

    return status;
  }

  /**
   * Manually trigger a specific job (for testing or admin purposes)
   */
  async triggerJob(jobName) {
    try {
      logger.info('Manually triggering cron job', { jobName });

      switch (jobName) {
        case 'dailyDataMaintenance':
          return await dataRetentionService.runMaintenanceRoutine();

        case 'weeklyCleanup':
          // Run the same operations as weekly cleanup
          const operations = [];

          try {
            const anonymizeResult = await dataRetentionService.anonymizeOldData();
            operations.push({ operation: 'anonymize_data', success: true, ...anonymizeResult });
          } catch (error) {
            operations.push({ operation: 'anonymize_data', success: false, error: error.message });
          }

          try {
            const appUsageResult = await dataRetentionService.cleanupAppUsageLogs();
            operations.push({ operation: 'cleanup_app_usage', success: true, ...appUsageResult });
          } catch (error) {
            operations.push({
              operation: 'cleanup_app_usage',
              success: false,
              error: error.message,
            });
          }

          try {
            const loginResult = await dataRetentionService.cleanupLoginActivityLogs();
            operations.push({ operation: 'cleanup_login_activity', success: true, ...loginResult });
          } catch (error) {
            operations.push({
              operation: 'cleanup_login_activity',
              success: false,
              error: error.message,
            });
          }

          return { operations, timestamp: new Date() };

        case 'monthlyStorageReport':
          return await dataRetentionService.getStorageStats();

        default:
          throw new Error(`Unknown job name: ${jobName}`);
      }
    } catch (error) {
      logger.error('Failed to trigger cron job manually', {
        jobName,
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new CronService();
