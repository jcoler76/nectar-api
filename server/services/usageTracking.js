const axios = require('axios');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/usage.log' }),
  ],
});

class UsageTracker {
  constructor() {
    this.licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://licenses.nectar.com';
    this.licenseKey = process.env.LICENSE_KEY;
    this.reportingInterval = parseInt(process.env.USAGE_REPORTING_INTERVAL_HOURS) || 24;

    // Usage metrics cache
    this.currentUsage = {
      activeUsers: 0,
      workflowRuns: 0,
      apiCalls: 0,
      storageUsed: 0,
      integrationsUsed: 0,
      dataProcessed: 0,
    };

    this.dailyUsage = {
      date: new Date().toISOString().split('T')[0],
      ...this.currentUsage,
    };

    // Start periodic reporting
    this.startPeriodicReporting();

    // Track API calls automatically
    this.setupApiCallTracking();
  }

  /**
   * Record user activity
   * @param {string} userId - User ID
   */
  recordUserActivity(userId) {
    // In a real implementation, you'd track unique active users
    // For now, we'll use a simple increment
    this.currentUsage.activeUsers = Math.max(this.currentUsage.activeUsers, 1);

    // Update daily usage
    this.updateDailyUsage();
  }

  /**
   * Record workflow execution
   * @param {string} workflowId - Workflow ID
   * @param {Object} executionData - Execution metadata
   */
  recordWorkflowExecution(workflowId, executionData = {}) {
    this.currentUsage.workflowRuns += 1;

    // Track data processed if provided
    if (executionData.dataProcessed) {
      this.currentUsage.dataProcessed += executionData.dataProcessed;
    }

    this.updateDailyUsage();

    logger.debug('Workflow execution recorded', {
      workflowId,
      totalRuns: this.currentUsage.workflowRuns,
    });
  }

  /**
   * Record API call
   * @param {string} endpoint - API endpoint
   * @param {Object} metadata - Additional metadata
   */
  recordApiCall(endpoint, metadata = {}) {
    this.currentUsage.apiCalls += 1;
    this.updateDailyUsage();

    logger.debug('API call recorded', {
      endpoint,
      totalCalls: this.currentUsage.apiCalls,
    });
  }

  /**
   * Record integration usage
   * @param {string} integrationType - Type of integration
   * @param {Object} usageData - Usage data
   */
  recordIntegrationUsage(integrationType, usageData = {}) {
    // Track unique integrations used
    if (!this.usedIntegrations) {
      this.usedIntegrations = new Set();
    }

    this.usedIntegrations.add(integrationType);
    this.currentUsage.integrationsUsed = this.usedIntegrations.size;

    // Track data processed through integrations
    if (usageData.dataProcessed) {
      this.currentUsage.dataProcessed += usageData.dataProcessed;
    }

    this.updateDailyUsage();

    logger.debug('Integration usage recorded', {
      integrationType,
      totalIntegrations: this.currentUsage.integrationsUsed,
    });
  }

  /**
   * Record storage usage
   * @param {number} bytesUsed - Storage in bytes
   */
  recordStorageUsage(bytesUsed) {
    this.currentUsage.storageUsed = bytesUsed;
    this.updateDailyUsage();

    logger.debug('Storage usage recorded', {
      bytesUsed,
      megabytesUsed: Math.round(bytesUsed / 1024 / 1024),
    });
  }

  /**
   * Update daily usage tracking
   */
  updateDailyUsage() {
    const today = new Date().toISOString().split('T')[0];

    if (this.dailyUsage.date !== today) {
      // New day - report previous day and reset
      this.reportUsage().catch(error => {
        logger.error('Failed to report daily usage', { error: error.message });
      });

      // Reset for new day
      this.dailyUsage = {
        date: today,
        ...this.currentUsage,
      };

      // Reset daily counters
      this.currentUsage.workflowRuns = 0;
      this.currentUsage.apiCalls = 0;
      this.usedIntegrations = new Set();
      this.currentUsage.integrationsUsed = 0;
    } else {
      // Update daily usage
      this.dailyUsage = {
        ...this.dailyUsage,
        ...this.currentUsage,
      };
    }
  }

  /**
   * Get current usage statistics
   * @returns {Object} Current usage stats
   */
  getCurrentUsage() {
    this.updateDailyUsage();
    return {
      current: { ...this.currentUsage },
      daily: { ...this.dailyUsage },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Report usage to license server
   * @param {Object} usageData - Usage data to report (optional)
   */
  async reportUsage(usageData = null) {
    try {
      if (!this.licenseKey) {
        logger.warn('No license key configured - skipping usage reporting');
        return;
      }

      const reportData = usageData || this.dailyUsage;

      const response = await axios.post(
        `${this.licenseServerUrl}/api/usage/report`,
        {
          licenseKey: this.licenseKey,
          usage: {
            activeUsers: reportData.activeUsers || 0,
            workflowRuns: reportData.workflowRuns || 0,
            apiCalls: reportData.apiCalls || 0,
            storageUsed: reportData.storageUsed || 0,
            integrationsUsed: reportData.integrationsUsed || 0,
            dataProcessed: reportData.dataProcessed || 0,
          },
          reportDate: reportData.date || new Date().toISOString(),
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `Nectar-Customer-App/${process.env.npm_package_version || '1.0.0'}`,
          },
        }
      );

      if (response.data.success) {
        logger.info('Usage data reported successfully', {
          reportDate: reportData.date,
          recordId: response.data.recordId,
        });
      } else {
        logger.error('Usage reporting failed', {
          error: response.data.error,
          message: response.data.message,
        });
      }
    } catch (error) {
      logger.error('Failed to report usage data', {
        error: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Start periodic usage reporting
   */
  startPeriodicReporting() {
    const intervalMs = this.reportingInterval * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        await this.reportUsage();
      } catch (error) {
        logger.error('Periodic usage reporting failed', { error: error.message });
      }
    }, intervalMs);

    logger.info('Periodic usage reporting started', {
      intervalHours: this.reportingInterval,
    });
  }

  /**
   * Setup automatic API call tracking for Express apps
   */
  setupApiCallTracking() {
    // This would be called from your Express app setup
    // app.use(usageTracker.getApiTrackingMiddleware());
  }

  /**
   * Express middleware for automatic API call tracking
   * @returns {Function} Express middleware
   */
  getApiTrackingMiddleware() {
    return (req, res, next) => {
      // Skip tracking for certain endpoints
      const skipPaths = ['/health', '/metrics', '/favicon.ico'];
      const shouldSkip = skipPaths.some(path => req.path.includes(path));

      if (!shouldSkip && req.method !== 'OPTIONS') {
        this.recordApiCall(`${req.method} ${req.path}`, {
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });
      }

      next();
    };
  }

  /**
   * Get usage tracking middleware for specific features
   * @param {string} feature - Feature name
   * @returns {Function} Express middleware
   */
  getFeatureTrackingMiddleware(feature) {
    return (req, res, next) => {
      // Record feature usage
      switch (feature) {
        case 'workflow':
          // This would be called on workflow endpoints
          break;
        case 'integration':
          // This would be called on integration endpoints
          break;
        default:
          break;
      }

      next();
    };
  }

  /**
   * Manual usage reporting trigger (for admin use)
   */
  async forceUsageReport() {
    logger.info('Forcing usage report');
    await this.reportUsage();
  }

  /**
   * Get usage summary for dashboard display
   * @returns {Object} Usage summary
   */
  getUsageSummary() {
    return {
      today: {
        ...this.currentUsage,
      },
      period: {
        ...this.dailyUsage,
      },
      lastReported: this.lastReportTime,
      nextReport: new Date(Date.now() + this.reportingInterval * 60 * 60 * 1000).toISOString(),
    };
  }
}

// Create global usage tracker instance
const usageTracker = new UsageTracker();

// Export both the class and instance
module.exports = {
  UsageTracker,
  usageTracker,
};
