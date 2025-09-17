const HealthMonitoringService = require('./HealthMonitoringService');
const PerformanceMetricsService = require('./PerformanceMetricsService');
const CentralizedLoggingService = require('./CentralizedLoggingService');
const { logger } = require('../../utils/logger');

/**
 * Monitoring Factory
 * Centralized factory for creating and managing monitoring services
 */
class MonitoringFactory {
  constructor() {
    this.healthMonitoring = null;
    this.performanceMetrics = null;
    this.centralizedLogging = null;
    this.isInitialized = false;
    this.monitoringConfig = {
      healthCheck: {
        interval: 60000, // 1 minute
        timeout: 10000, // 10 seconds
        retryAttempts: 3,
        alertThresholds: {
          responseTime: 5000, // 5 seconds
          errorRate: 0.05, // 5%
          consecutiveFailures: 3,
        },
      },
      performance: {
        collectionInterval: 30000, // 30 seconds
        retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
        alertThresholds: {
          responseTime: 2000, // 2 seconds
          throughput: 1000, // requests per minute
          errorRate: 5, // 5%
          memoryUsage: 500 * 1024 * 1024, // 500MB
          cpuUsage: 80, // 80%
        },
      },
      enabled: true,
      autoStart: true,
    };
  }

  /**
   * Initialize monitoring services
   */
  async initialize(config = {}) {
    if (this.isInitialized) {
      logger.warn('Monitoring services already initialized');
      return;
    }

    // Merge configuration
    this.monitoringConfig = { ...this.monitoringConfig, ...config };

    if (!this.monitoringConfig.enabled) {
      logger.info('Monitoring services disabled by configuration');
      return;
    }

    try {
      // Initialize health monitoring
      this.healthMonitoring = new HealthMonitoringService();
      this.configureHealthMonitoring();

      // Initialize performance metrics
      this.performanceMetrics = new PerformanceMetricsService();
      this.configurePerformanceMetrics();

      // Initialize centralized logging
      this.centralizedLogging = new CentralizedLoggingService();
      this.configureCentralizedLogging();

      // Set up cross-service integration
      this.setupIntegration();

      this.isInitialized = true;

      logger.info('Monitoring services initialized successfully', {
        healthMonitoring: !!this.healthMonitoring,
        performanceMetrics: !!this.performanceMetrics,
        centralizedLogging: !!this.centralizedLogging,
        autoStart: this.monitoringConfig.autoStart,
      });

      // Auto-start if configured
      if (this.monitoringConfig.autoStart) {
        await this.start();
      }
    } catch (error) {
      logger.error('Failed to initialize monitoring services:', error.message);
      throw error;
    }
  }

  /**
   * Configure health monitoring service
   */
  configureHealthMonitoring() {
    const hm = this.healthMonitoring;
    const config = this.monitoringConfig.healthCheck;

    // Set intervals and timeouts
    hm.checkInterval = config.interval;
    hm.timeout = config.timeout;
    hm.retryAttempts = config.retryAttempts;

    // Set alert thresholds
    hm.setAlertThresholds(config.alertThresholds);

    // Register system health checks
    hm.registerSystemChecks();

    // Add alert callback for integration
    hm.addAlertCallback(alert => {
      this.handleHealthAlert(alert);
    });

    logger.debug('Health monitoring configured', config);
  }

  /**
   * Configure performance metrics service
   */
  configurePerformanceMetrics() {
    const pm = this.performanceMetrics;
    const config = this.monitoringConfig.performance;

    // Set collection parameters
    pm.collectionInterval = config.collectionInterval;
    pm.retentionPeriod = config.retentionPeriod;

    // Set alert thresholds
    for (const [metric, threshold] of Object.entries(config.alertThresholds)) {
      pm.setAlertThreshold('system', metric, threshold);
    }

    // Add event listener for integration
    pm.addEventListener(event => {
      this.handlePerformanceEvent(event);
    });

    logger.debug('Performance metrics configured', config);
  }

  /**
   * Configure centralized logging service
   */
  configureCentralizedLogging() {
    const cl = this.centralizedLogging;
    const config = this.monitoringConfig.logging || {};

    // Set logging parameters
    cl.maxBufferSize = config.maxBufferSize || 1000;
    cl.flushInterval = config.flushInterval || 5000;
    cl.retentionPeriod = config.retentionPeriod || 7 * 24 * 60 * 60 * 1000;

    // Add default alert rules
    cl.addAlertRule({
      name: 'high_error_rate',
      description: 'High error rate detected',
      level: 'error',
      frequency: { count: 5, timeWindow: 60000 }, // 5 errors in 1 minute
      severity: 'critical',
      callback: alert => this.handleLoggingAlert(alert),
    });

    cl.addAlertRule({
      name: 'performance_degradation',
      description: 'Performance degradation detected',
      category: cl.categories.PERFORMANCE,
      dataCondition: data => data.performanceIssue === true,
      frequency: { count: 3, timeWindow: 300000 }, // 3 performance issues in 5 minutes
      severity: 'warning',
      callback: alert => this.handleLoggingAlert(alert),
    });

    cl.addAlertRule({
      name: 'security_event',
      description: 'Security event detected',
      category: cl.categories.SECURITY,
      severity: 'critical',
      callback: alert => this.handleLoggingAlert(alert),
    });

    logger.debug('Centralized logging configured', config);
  }

  /**
   * Set up integration between monitoring services
   */
  setupIntegration() {
    // Performance metrics can inform health checks
    this.performanceMetrics.addEventListener(event => {
      if (event.type === 'performance' && event.severity === 'critical') {
        // Trigger additional health checks for critical performance issues
        this.healthMonitoring.executeHealthCheck(event.serviceName);
      }
    });

    // Health alerts can trigger performance deep-dive
    this.healthMonitoring.addAlertCallback(alert => {
      if (alert.critical) {
        // Record performance metrics for unhealthy services
        this.performanceMetrics.recordMetric(
          alert.serviceName,
          'healthStatus',
          alert.status === 'healthy' ? 1 : 0
        );
      }
    });
  }

  /**
   * Start all monitoring services
   */
  async start() {
    if (!this.isInitialized) {
      throw new Error('Monitoring services not initialized');
    }

    try {
      // Start health monitoring
      if (this.healthMonitoring) {
        this.healthMonitoring.start();
      }

      // Start performance metrics collection
      if (this.performanceMetrics) {
        this.performanceMetrics.startCollection();
      }

      // Start centralized logging
      if (this.centralizedLogging) {
        this.centralizedLogging.start();
      }

      logger.info('All monitoring services started');
    } catch (error) {
      logger.error('Failed to start monitoring services:', error.message);
      throw error;
    }
  }

  /**
   * Stop all monitoring services
   */
  async stop() {
    try {
      // Stop health monitoring
      if (this.healthMonitoring) {
        this.healthMonitoring.stop();
      }

      // Stop performance metrics collection
      if (this.performanceMetrics) {
        this.performanceMetrics.stopCollection();
      }

      // Stop centralized logging
      if (this.centralizedLogging) {
        this.centralizedLogging.stop();
      }

      logger.info('All monitoring services stopped');
    } catch (error) {
      logger.error('Failed to stop monitoring services:', error.message);
      throw error;
    }
  }

  /**
   * Register monitoring for a database service
   */
  async registerDatabaseMonitoring(databaseConfigs) {
    if (!this.healthMonitoring || !this.performanceMetrics) {
      throw new Error('Monitoring services not initialized');
    }

    // Register health checks
    await this.healthMonitoring.registerDatabaseChecks(databaseConfigs);

    // Initialize performance metrics
    for (const config of databaseConfigs) {
      const serviceName = `database_${config.type}_${config.name || 'default'}`;
      this.performanceMetrics.initializeMetrics(serviceName, [
        'responseTime',
        'throughput',
        'errorRate',
        'connectionCount',
        'queryExecutionTime',
      ]);

      // Set database-specific thresholds
      this.performanceMetrics.setAlertThreshold(serviceName, 'responseTime', 2000);
      this.performanceMetrics.setAlertThreshold(serviceName, 'errorRate', 5);
    }

    logger.info('Database monitoring registered', {
      count: databaseConfigs.length,
    });
  }

  /**
   * Register monitoring for storage services
   */
  async registerStorageMonitoring(storageConfigs) {
    if (!this.healthMonitoring || !this.performanceMetrics) {
      throw new Error('Monitoring services not initialized');
    }

    // Register health checks
    await this.healthMonitoring.registerStorageChecks(storageConfigs);

    // Initialize performance metrics
    for (const config of storageConfigs) {
      const serviceName = `storage_${config.type}_${config.name || 'default'}`;
      this.performanceMetrics.initializeMetrics(serviceName, [
        'responseTime',
        'throughput',
        'errorRate',
        'uploadSpeed',
        'downloadSpeed',
      ]);

      // Set storage-specific thresholds
      this.performanceMetrics.setAlertThreshold(serviceName, 'responseTime', 3000);
      this.performanceMetrics.setAlertThreshold(serviceName, 'errorRate', 2);
    }

    logger.info('Storage monitoring registered', {
      count: storageConfigs.length,
    });
  }

  /**
   * Register monitoring for communication services
   */
  async registerCommunicationMonitoring(communicationConfigs) {
    if (!this.healthMonitoring || !this.performanceMetrics) {
      throw new Error('Monitoring services not initialized');
    }

    // Register health checks
    await this.healthMonitoring.registerCommunicationChecks(communicationConfigs);

    // Initialize performance metrics
    for (const config of communicationConfigs) {
      const serviceName = `communication_${config.type}_${config.name || 'default'}`;
      this.performanceMetrics.initializeMetrics(serviceName, [
        'responseTime',
        'throughput',
        'errorRate',
        'deliveryRate',
        'queueSize',
      ]);

      // Set communication-specific thresholds
      this.performanceMetrics.setAlertThreshold(serviceName, 'responseTime', 1500);
      this.performanceMetrics.setAlertThreshold(serviceName, 'errorRate', 3);
    }

    logger.info('Communication monitoring registered', {
      count: communicationConfigs.length,
    });
  }

  /**
   * Register monitoring for remote services
   */
  async registerRemoteServiceMonitoring(remoteConfigs) {
    if (!this.healthMonitoring || !this.performanceMetrics) {
      throw new Error('Monitoring services not initialized');
    }

    // Register health checks
    await this.healthMonitoring.registerRemoteServiceChecks(remoteConfigs);

    // Initialize performance metrics
    for (const config of remoteConfigs) {
      const serviceName = `remote_${config.type}_${config.name || 'default'}`;
      this.performanceMetrics.initializeMetrics(serviceName, [
        'responseTime',
        'throughput',
        'errorRate',
        'retryCount',
        'circuitBreakerState',
      ]);

      // Set remote service-specific thresholds
      this.performanceMetrics.setAlertThreshold(serviceName, 'responseTime', 5000);
      this.performanceMetrics.setAlertThreshold(serviceName, 'errorRate', 10);
    }

    logger.info('Remote service monitoring registered', {
      count: remoteConfigs.length,
    });
  }

  /**
   * Get comprehensive monitoring dashboard data
   */
  getDashboardData() {
    if (!this.isInitialized) {
      return { error: 'Monitoring services not initialized' };
    }

    const dashboard = {
      timestamp: new Date(),
      overall: {
        status: 'unknown',
        servicesMonitored: 0,
        healthyServices: 0,
        unhealthyServices: 0,
        criticalAlerts: 0,
      },
      health: null,
      performance: null,
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    try {
      // Get health monitoring data
      if (this.healthMonitoring) {
        const healthReport = this.healthMonitoring.getDetailedHealthReport();
        dashboard.health = healthReport;
        dashboard.overall.status = healthReport.overall.status;
        dashboard.overall.servicesMonitored = healthReport.overall.summary.total;
        dashboard.overall.healthyServices = healthReport.overall.summary.healthy;
        dashboard.overall.unhealthyServices = healthReport.overall.summary.unhealthy;
        dashboard.overall.criticalAlerts = healthReport.overall.summary.critical;
      }

      // Get performance metrics data
      if (this.performanceMetrics) {
        const performanceReport = this.performanceMetrics.generateReport('1h');
        dashboard.performance = performanceReport;
      }
    } catch (error) {
      logger.error('Error generating dashboard data:', error.message);
      dashboard.error = error.message;
    }

    return dashboard;
  }

  /**
   * Handle health alerts
   */
  handleHealthAlert(alert) {
    logger.warn('Health alert received in monitoring factory', {
      serviceName: alert.serviceName,
      status: alert.status,
      critical: alert.critical,
    });

    // Record health alert as performance metric
    if (this.performanceMetrics) {
      this.performanceMetrics.recordMetric(
        alert.serviceName,
        'alertTriggered',
        alert.critical ? 2 : 1
      );
    }

    // Additional alert handling can be added here
    // e.g., send to external alerting systems, trigger workflows, etc.
  }

  /**
   * Handle logging alerts
   */
  handleLoggingAlert(alert) {
    logger.warn('Logging alert received in monitoring factory', {
      rule: alert.rule,
      severity: alert.severity,
      logEntry: alert.logEntry?.message,
    });

    // Record logging alert as performance metric
    if (this.performanceMetrics) {
      this.performanceMetrics.recordMetric(
        'logging',
        'alertTriggered',
        alert.severity === 'critical' ? 2 : 1
      );
    }

    // Trigger health check for critical logging issues
    if (this.healthMonitoring && alert.severity === 'critical') {
      this.healthMonitoring.executeHealthCheck('system_logging');
    }
  }

  /**
   * Handle performance events
   */
  handlePerformanceEvent(event) {
    if (event.type === 'performance') {
      logger.warn('Performance alert received in monitoring factory', {
        serviceName: event.serviceName,
        metricType: event.metricType,
        value: event.value,
        threshold: event.threshold,
      });

      // Trigger health check for performance issues
      if (this.healthMonitoring && event.severity === 'critical') {
        this.healthMonitoring.executeHealthCheck(event.serviceName);
      }
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      running: {
        healthMonitoring: this.healthMonitoring?.isRunning || false,
        performanceMetrics: this.performanceMetrics?.isCollecting || false,
        centralizedLogging: this.centralizedLogging?.isStarted || false,
      },
      config: this.monitoringConfig,
      services: {
        healthChecks: this.healthMonitoring?.checks.size || 0,
        performanceMetrics: this.performanceMetrics?.metrics.size || 0,
        loggingSubscribers: this.centralizedLogging?.logSubscribers.length || 0,
      },
    };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig) {
    this.monitoringConfig = { ...this.monitoringConfig, ...newConfig };

    // Reconfigure services if initialized
    if (this.isInitialized) {
      this.configureHealthMonitoring();
      this.configurePerformanceMetrics();
    }

    logger.info('Monitoring configuration updated', newConfig);
  }

  /**
   * Export monitoring data
   */
  exportData(format = 'json', timeRange = '24h') {
    if (!this.isInitialized) {
      throw new Error('Monitoring services not initialized');
    }

    const data = {
      exportTime: new Date(),
      timeRange,
      health: this.healthMonitoring?.getDetailedHealthReport() || null,
      performance: this.performanceMetrics?.generateReport(timeRange) || null,
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        // Basic CSV export (could be enhanced)
        return this.convertToCSV(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Basic CSV conversion - could be enhanced based on needs
    let csv = 'timestamp,service,metric,value\\n';

    if (data.performance && data.performance.summary) {
      for (const [serviceName, metrics] of Object.entries(data.performance.summary)) {
        csv += `${data.exportTime},${serviceName},responseTime,${metrics.responseTime.average}\\n`;
        csv += `${data.exportTime},${serviceName},throughput,${metrics.throughput.current}\\n`;
        csv += `${data.exportTime},${serviceName},errorRate,${metrics.errorRate.current}\\n`;
      }
    }

    return csv;
  }

  /**
   * Get health monitoring service
   */
  getHealthMonitoring() {
    return this.healthMonitoring;
  }

  /**
   * Get performance metrics service
   */
  getPerformanceMetrics() {
    return this.performanceMetrics;
  }

  /**
   * Get centralized logging service
   */
  getCentralizedLogging() {
    return this.centralizedLogging;
  }
}

// Create singleton instance
const monitoringFactory = new MonitoringFactory();

module.exports = monitoringFactory;
