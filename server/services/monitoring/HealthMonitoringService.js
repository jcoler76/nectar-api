const { logger } = require('../../utils/logger');
const DatabaseDriverFactory = require('../database/DatabaseDriverFactory');
const StorageProviderFactory = require('../storage/StorageProviderFactory');
const CommunicationProviderFactory = require('../communication/CommunicationProviderFactory');
const RemoteServiceFactory = require('../remote/RemoteServiceFactory');

/**
 * Health Monitoring Service
 * Provides comprehensive health checks and monitoring for all BaaS services
 */
class HealthMonitoringService {
  constructor() {
    this.checks = new Map();
    this.healthStatus = new Map();
    this.lastCheckTime = new Map();
    this.checkInterval = 60000; // 1 minute default
    this.timeout = 10000; // 10 seconds default
    this.retryAttempts = 3;
    this.isRunning = false;
    this.intervalId = null;
    this.alertThresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.05, // 5%
      consecutiveFailures: 3,
    };
    this.serviceStats = new Map();
    this.alertCallbacks = [];
  }

  /**
   * Register a health check for a service
   */
  registerHealthCheck(serviceName, checkFunction, options = {}) {
    const checkConfig = {
      name: serviceName,
      check: checkFunction,
      interval: options.interval || this.checkInterval,
      timeout: options.timeout || this.timeout,
      retryAttempts: options.retryAttempts || this.retryAttempts,
      enabled: options.enabled !== false,
      critical: options.critical !== false,
      tags: options.tags || [],
      metadata: options.metadata || {},
    };

    this.checks.set(serviceName, checkConfig);
    this.healthStatus.set(serviceName, {
      status: 'unknown',
      lastCheck: null,
      responseTime: null,
      error: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
    });

    // Initialize stats
    this.serviceStats.set(serviceName, {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      lastError: null,
      uptime: 0,
      downtimeEvents: [],
    });

    logger.info('Health check registered', {
      serviceName,
      interval: checkConfig.interval,
      critical: checkConfig.critical,
    });
  }

  /**
   * Register database health checks
   */
  async registerDatabaseChecks(databaseConfigs = []) {
    for (const config of databaseConfigs) {
      const serviceName = `database_${config.type}_${config.name || 'default'}`;

      this.registerHealthCheck(
        serviceName,
        async () => {
          const driver = DatabaseDriverFactory.createDriver(config.type, config);
          const result = await driver.testConnection();
          await driver.close();
          return result;
        },
        {
          critical: true,
          tags: ['database', config.type],
          metadata: { type: config.type, name: config.name },
        }
      );
    }
  }

  /**
   * Register storage health checks
   */
  async registerStorageChecks(storageConfigs = []) {
    for (const config of storageConfigs) {
      const serviceName = `storage_${config.type}_${config.name || 'default'}`;

      this.registerHealthCheck(
        serviceName,
        async () => {
          const provider = StorageProviderFactory.createProvider(config.type, config);
          const result = await provider.testConnection();
          return result;
        },
        {
          critical: false,
          tags: ['storage', config.type],
          metadata: { type: config.type, name: config.name },
        }
      );
    }
  }

  /**
   * Register communication service health checks
   */
  async registerCommunicationChecks(communicationConfigs = []) {
    for (const config of communicationConfigs) {
      const serviceName = `communication_${config.type}_${config.name || 'default'}`;

      this.registerHealthCheck(
        serviceName,
        async () => {
          const provider = CommunicationProviderFactory.createProvider(config.type, config);
          const result = await provider.testConnection();
          return result;
        },
        {
          critical: false,
          tags: ['communication', config.type],
          metadata: { type: config.type, name: config.name },
        }
      );
    }
  }

  /**
   * Register remote service health checks
   */
  async registerRemoteServiceChecks(remoteConfigs = []) {
    for (const config of remoteConfigs) {
      const serviceName = `remote_${config.type}_${config.name || 'default'}`;

      this.registerHealthCheck(
        serviceName,
        async () => {
          const service = RemoteServiceFactory.createService(config.type, config);
          const result = await service.testConnection();
          return result;
        },
        {
          critical: false,
          tags: ['remote', config.type],
          metadata: { type: config.type, name: config.name },
        }
      );
    }
  }

  /**
   * Register system health checks
   */
  registerSystemChecks() {
    // Memory usage check
    this.registerHealthCheck(
      'system_memory',
      async () => {
        const memUsage = process.memoryUsage();
        const totalMem = require('os').totalmem();
        const freeMem = require('os').freemem();
        const usedMem = totalMem - freeMem;
        const memoryUsagePercent = (usedMem / totalMem) * 100;

        return {
          success: memoryUsagePercent < 90,
          message: memoryUsagePercent < 90 ? 'Memory usage normal' : 'High memory usage',
          details: {
            memoryUsagePercent: Math.round(memoryUsagePercent * 100) / 100,
            processMemory: {
              rss: Math.round(memUsage.rss / 1024 / 1024),
              heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
              heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
              external: Math.round(memUsage.external / 1024 / 1024),
            },
            systemMemory: {
              total: Math.round(totalMem / 1024 / 1024),
              free: Math.round(freeMem / 1024 / 1024),
              used: Math.round(usedMem / 1024 / 1024),
            },
          },
        };
      },
      {
        interval: 30000, // 30 seconds
        critical: true,
        tags: ['system', 'memory'],
      }
    );

    // CPU usage check
    this.registerHealthCheck(
      'system_cpu',
      async () => {
        const cpus = require('os').cpus();
        const loadAvg = require('os').loadavg();
        const cpuCount = cpus.length;
        const avgLoad = loadAvg[0] / cpuCount;

        return {
          success: avgLoad < 0.8,
          message: avgLoad < 0.8 ? 'CPU usage normal' : 'High CPU usage',
          details: {
            loadAverage: {
              '1min': Math.round(loadAvg[0] * 100) / 100,
              '5min': Math.round(loadAvg[1] * 100) / 100,
              '15min': Math.round(loadAvg[2] * 100) / 100,
            },
            cpuCount,
            averageLoad: Math.round(avgLoad * 100) / 100,
          },
        };
      },
      {
        interval: 30000, // 30 seconds
        critical: true,
        tags: ['system', 'cpu'],
      }
    );

    // Disk usage check
    this.registerHealthCheck(
      'system_disk',
      async () => {
        const fs = require('fs').promises;
        try {
          const stats = await fs.statfs(process.cwd());
          const total = stats.blocks * stats.blksize;
          const available = stats.bavail * stats.blksize;
          const used = total - available;
          const usagePercent = (used / total) * 100;

          return {
            success: usagePercent < 85,
            message: usagePercent < 85 ? 'Disk usage normal' : 'High disk usage',
            details: {
              usagePercent: Math.round(usagePercent * 100) / 100,
              total: Math.round((total / 1024 / 1024 / 1024) * 100) / 100, // GB
              used: Math.round((used / 1024 / 1024 / 1024) * 100) / 100, // GB
              available: Math.round((available / 1024 / 1024 / 1024) * 100) / 100, // GB
            },
          };
        } catch (error) {
          return {
            success: false,
            message: 'Could not check disk usage',
            error: error.message,
          };
        }
      },
      {
        interval: 60000, // 1 minute
        critical: false,
        tags: ['system', 'disk'],
      }
    );
  }

  /**
   * Execute a single health check
   */
  async executeHealthCheck(serviceName) {
    const check = this.checks.get(serviceName);
    if (!check || !check.enabled) {
      return null;
    }

    const startTime = Date.now();
    let result = null;
    let error = null;

    try {
      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
      );

      result = await Promise.race([check.check(), timeoutPromise]);

      if (!result || typeof result.success !== 'boolean') {
        throw new Error('Invalid health check result format');
      }
    } catch (err) {
      error = err.message;
      result = {
        success: false,
        error: error,
        message: 'Health check failed',
      };
    }

    const responseTime = Date.now() - startTime;
    const status = result.success ? 'healthy' : 'unhealthy';

    // Update health status
    const currentStatus = this.healthStatus.get(serviceName);
    const newStatus = {
      status,
      lastCheck: new Date(),
      responseTime,
      error,
      result: result.details || result,
      consecutiveFailures: status === 'unhealthy' ? currentStatus.consecutiveFailures + 1 : 0,
      consecutiveSuccesses: status === 'healthy' ? currentStatus.consecutiveSuccesses + 1 : 0,
    };

    this.healthStatus.set(serviceName, newStatus);
    this.lastCheckTime.set(serviceName, Date.now());

    // Update statistics
    this.updateServiceStats(serviceName, status === 'healthy', responseTime, error);

    // Check for alerts
    this.checkAlerts(serviceName, newStatus, check);

    logger.debug('Health check completed', {
      serviceName,
      status,
      responseTime,
      error,
    });

    return newStatus;
  }

  /**
   * Update service statistics
   */
  updateServiceStats(serviceName, success, responseTime, error) {
    const stats = this.serviceStats.get(serviceName);
    if (!stats) return;

    stats.totalChecks++;
    if (success) {
      stats.successfulChecks++;
    } else {
      stats.failedChecks++;
      stats.lastError = error;
    }

    // Update average response time
    stats.averageResponseTime =
      (stats.averageResponseTime * (stats.totalChecks - 1) + responseTime) / stats.totalChecks;

    this.serviceStats.set(serviceName, stats);
  }

  /**
   * Check for alert conditions
   */
  checkAlerts(serviceName, status, check) {
    const shouldAlert =
      // High response time
      status.responseTime > this.alertThresholds.responseTime ||
      // Consecutive failures
      status.consecutiveFailures >= this.alertThresholds.consecutiveFailures ||
      // Critical service failure
      (check.critical && status.status === 'unhealthy');

    if (shouldAlert) {
      this.triggerAlert(serviceName, status, check);
    }
  }

  /**
   * Trigger alert
   */
  triggerAlert(serviceName, status, check) {
    const alert = {
      serviceName,
      status: status.status,
      message: status.error || 'Service health alert',
      timestamp: new Date(),
      critical: check.critical,
      responseTime: status.responseTime,
      consecutiveFailures: status.consecutiveFailures,
      tags: check.tags,
      metadata: check.metadata,
    };

    logger.warn('Health monitoring alert triggered', alert);

    // Execute alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Alert callback failed:', error.message);
      }
    });
  }

  /**
   * Add alert callback
   */
  addAlertCallback(callback) {
    if (typeof callback === 'function') {
      this.alertCallbacks.push(callback);
    }
  }

  /**
   * Execute all health checks
   */
  async executeAllChecks() {
    const results = {};
    const promises = [];

    for (const [serviceName] of this.checks) {
      promises.push(
        this.executeHealthCheck(serviceName).then(result => {
          if (result) {
            results[serviceName] = result;
          }
        })
      );
    }

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Get overall health status
   */
  getOverallHealth() {
    const services = Array.from(this.healthStatus.entries());
    let healthy = 0;
    let unhealthy = 0;
    let unknown = 0;
    let critical = 0;

    for (const [serviceName, status] of services) {
      const check = this.checks.get(serviceName);

      if (status.status === 'healthy') {
        healthy++;
      } else if (status.status === 'unhealthy') {
        unhealthy++;
        if (check && check.critical) {
          critical++;
        }
      } else {
        unknown++;
      }
    }

    const total = services.length;
    const overallStatus = critical > 0 ? 'critical' : unhealthy > 0 ? 'degraded' : 'healthy';

    return {
      status: overallStatus,
      summary: {
        total,
        healthy,
        unhealthy,
        unknown,
        critical,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get detailed health report
   */
  getDetailedHealthReport() {
    const overall = this.getOverallHealth();
    const services = {};
    const statistics = {};

    for (const [serviceName, status] of this.healthStatus) {
      const check = this.checks.get(serviceName);
      const stats = this.serviceStats.get(serviceName);

      services[serviceName] = {
        ...status,
        enabled: check ? check.enabled : false,
        critical: check ? check.critical : false,
        tags: check ? check.tags : [],
        metadata: check ? check.metadata : {},
      };

      if (stats) {
        statistics[serviceName] = {
          ...stats,
          successRate: stats.totalChecks > 0 ? stats.successfulChecks / stats.totalChecks : 0,
          failureRate: stats.totalChecks > 0 ? stats.failedChecks / stats.totalChecks : 0,
        };
      }
    }

    return {
      overall,
      services,
      statistics,
      alertThresholds: this.alertThresholds,
    };
  }

  /**
   * Start continuous monitoring
   */
  start() {
    if (this.isRunning) {
      logger.warn('Health monitoring is already running');
      return;
    }

    this.isRunning = true;

    // Execute initial check
    this.executeAllChecks();

    // Set up interval for continuous monitoring
    this.intervalId = setInterval(() => {
      this.executeAllChecks().catch(error => {
        logger.error('Error during health check execution:', error.message);
      });
    }, this.checkInterval);

    logger.info('Health monitoring started', {
      checkInterval: this.checkInterval,
      registeredChecks: this.checks.size,
    });
  }

  /**
   * Stop continuous monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Health monitoring stopped');
  }

  /**
   * Configure alert thresholds
   */
  setAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    logger.info('Alert thresholds updated', this.alertThresholds);
  }

  /**
   * Enable/disable specific health check
   */
  setCheckEnabled(serviceName, enabled) {
    const check = this.checks.get(serviceName);
    if (check) {
      check.enabled = enabled;
      logger.info(`Health check ${enabled ? 'enabled' : 'disabled'}`, { serviceName });
    }
  }

  /**
   * Remove health check
   */
  removeHealthCheck(serviceName) {
    this.checks.delete(serviceName);
    this.healthStatus.delete(serviceName);
    this.lastCheckTime.delete(serviceName);
    this.serviceStats.delete(serviceName);
    logger.info('Health check removed', { serviceName });
  }

  /**
   * Get service uptime percentage
   */
  getServiceUptime(serviceName, periodHours = 24) {
    const stats = this.serviceStats.get(serviceName);
    if (!stats) return null;

    const uptimePercent =
      stats.totalChecks > 0 ? (stats.successfulChecks / stats.totalChecks) * 100 : 0;

    return {
      serviceName,
      uptimePercent: Math.round(uptimePercent * 100) / 100,
      totalChecks: stats.totalChecks,
      successfulChecks: stats.successfulChecks,
      failedChecks: stats.failedChecks,
      periodHours,
    };
  }
}

module.exports = HealthMonitoringService;
