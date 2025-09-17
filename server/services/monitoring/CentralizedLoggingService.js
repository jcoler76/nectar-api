const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../../utils/logger');

/**
 * Centralized Logging Service
 * Enhanced logging with structured data, metrics, and centralized storage
 */
class CentralizedLoggingService {
  constructor() {
    this.logStorage = new Map();
    this.metrics = new Map();
    this.logBuffer = [];
    this.maxBufferSize = 1000;
    this.flushInterval = 5000; // 5 seconds
    this.retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.logLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    this.isStarted = false;
    this.flushIntervalId = null;
    this.logSubscribers = [];
    this.logFilters = [];
    this.aggregations = new Map();
    this.alertRules = [];

    // Log categories for organization
    this.categories = {
      SYSTEM: 'system',
      DATABASE: 'database',
      STORAGE: 'storage',
      COMMUNICATION: 'communication',
      REMOTE: 'remote',
      MONITORING: 'monitoring',
      SECURITY: 'security',
      PERFORMANCE: 'performance',
      USER: 'user',
      API: 'api',
      WORKFLOW: 'workflow',
    };

    // Initialize metrics
    this.initializeMetrics();
  }

  /**
   * Initialize logging metrics
   */
  initializeMetrics() {
    for (const level of this.logLevels) {
      this.metrics.set(`logs_${level}_count`, 0);
      this.metrics.set(`logs_${level}_rate`, 0);
    }

    for (const category of Object.values(this.categories)) {
      this.metrics.set(`logs_${category}_count`, 0);
    }

    this.metrics.set('logs_total_count', 0);
    this.metrics.set('logs_buffer_size', 0);
    this.metrics.set('logs_errors_count', 0);
    this.metrics.set('logs_performance_issues', 0);
  }

  /**
   * Log structured message
   */
  log(level, message, data = {}, options = {}) {
    const logEntry = {
      timestamp: new Date(),
      level: level.toLowerCase(),
      message,
      data,
      category: options.category || this.categories.SYSTEM,
      service: options.service || 'unknown',
      requestId: options.requestId,
      userId: options.userId,
      sessionId: options.sessionId,
      correlationId: options.correlationId || this.generateCorrelationId(),
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        ...options.metadata,
      },
      tags: options.tags || [],
      source: options.source || this.getCallSource(),
    };

    // Add to buffer
    this.addToBuffer(logEntry);

    // Update metrics
    this.updateMetrics(logEntry);

    // Check alert rules
    this.checkAlertRules(logEntry);

    // Notify subscribers
    this.notifySubscribers(logEntry);

    // Also log to standard logger
    logger[level] ? logger[level](message, data) : logger.info(message, data);

    return logEntry;
  }

  /**
   * Convenience methods for different log levels
   */
  error(message, data = {}, options = {}) {
    return this.log('error', message, data, options);
  }

  warn(message, data = {}, options = {}) {
    return this.log('warn', message, data, options);
  }

  info(message, data = {}, options = {}) {
    return this.log('info', message, data, options);
  }

  debug(message, data = {}, options = {}) {
    return this.log('debug', message, data, options);
  }

  trace(message, data = {}, options = {}) {
    return this.log('trace', message, data, options);
  }

  /**
   * Log performance metrics
   */
  performance(operation, duration, data = {}, options = {}) {
    const perfData = {
      operation,
      duration,
      durationMs: duration,
      performanceIssue: duration > 1000, // Flag if > 1 second
      ...data,
    };

    return this.log('info', `Performance: ${operation}`, perfData, {
      ...options,
      category: this.categories.PERFORMANCE,
      tags: ['performance', ...(options.tags || [])],
    });
  }

  /**
   * Log security events
   */
  security(event, details = {}, options = {}) {
    const securityData = {
      securityEvent: event,
      severity: details.severity || 'medium',
      risk: details.risk || 'low',
      ...details,
    };

    return this.log('warn', `Security: ${event}`, securityData, {
      ...options,
      category: this.categories.SECURITY,
      tags: ['security', ...(options.tags || [])],
    });
  }

  /**
   * Log API requests
   */
  apiRequest(method, url, statusCode, duration, data = {}, options = {}) {
    const apiData = {
      method,
      url,
      statusCode,
      duration,
      success: statusCode < 400,
      error: statusCode >= 400,
      ...data,
    };

    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${url} - ${statusCode} (${duration}ms)`;

    return this.log(level, message, apiData, {
      ...options,
      category: this.categories.API,
      tags: ['api', 'request', ...(options.tags || [])],
    });
  }

  /**
   * Log database operations
   */
  database(operation, duration, data = {}, options = {}) {
    const dbData = {
      operation,
      duration,
      slowQuery: duration > 500, // Flag if > 500ms
      ...data,
    };

    const level = duration > 2000 ? 'warn' : 'info';
    const message = `Database: ${operation} (${duration}ms)`;

    return this.log(level, message, dbData, {
      ...options,
      category: this.categories.DATABASE,
      tags: ['database', ...(options.tags || [])],
    });
  }

  /**
   * Add log entry to buffer
   */
  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);

    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    this.metrics.set('logs_buffer_size', this.logBuffer.length);
  }

  /**
   * Update logging metrics
   */
  updateMetrics(logEntry) {
    // Update level metrics
    const levelKey = `logs_${logEntry.level}_count`;
    this.metrics.set(levelKey, (this.metrics.get(levelKey) || 0) + 1);

    // Update category metrics
    const categoryKey = `logs_${logEntry.category}_count`;
    this.metrics.set(categoryKey, (this.metrics.get(categoryKey) || 0) + 1);

    // Update total count
    this.metrics.set('logs_total_count', (this.metrics.get('logs_total_count') || 0) + 1);

    // Track errors
    if (logEntry.level === 'error') {
      this.metrics.set('logs_errors_count', (this.metrics.get('logs_errors_count') || 0) + 1);
    }

    // Track performance issues
    if (logEntry.category === this.categories.PERFORMANCE && logEntry.data.performanceIssue) {
      this.metrics.set(
        'logs_performance_issues',
        (this.metrics.get('logs_performance_issues') || 0) + 1
      );
    }
  }

  /**
   * Check alert rules against log entry
   */
  checkAlertRules(logEntry) {
    for (const rule of this.alertRules) {
      if (this.matchesRule(logEntry, rule)) {
        this.triggerAlert(rule, logEntry);
      }
    }
  }

  /**
   * Check if log entry matches alert rule
   */
  matchesRule(logEntry, rule) {
    // Check level
    if (rule.level && logEntry.level !== rule.level) {
      return false;
    }

    // Check category
    if (rule.category && logEntry.category !== rule.category) {
      return false;
    }

    // Check message pattern
    if (rule.messagePattern && !logEntry.message.match(rule.messagePattern)) {
      return false;
    }

    // Check data conditions
    if (rule.dataCondition && !rule.dataCondition(logEntry.data)) {
      return false;
    }

    // Check frequency (if specified)
    if (rule.frequency) {
      const recentCount = this.getRecentLogCount(rule);
      if (recentCount < rule.frequency.count) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get recent log count for frequency checking
   */
  getRecentLogCount(rule) {
    const timeWindow = rule.frequency.timeWindow || 60000; // 1 minute default
    const cutoff = Date.now() - timeWindow;

    return this.logBuffer.filter(entry => {
      return (
        entry.timestamp.getTime() > cutoff &&
        this.matchesRule(entry, {
          level: rule.level,
          category: rule.category,
          messagePattern: rule.messagePattern,
        })
      );
    }).length;
  }

  /**
   * Trigger alert for matched rule
   */
  triggerAlert(rule, logEntry) {
    const alert = {
      type: 'logging',
      rule: rule.name || 'unnamed',
      severity: rule.severity || 'medium',
      timestamp: new Date(),
      logEntry,
      message: `Logging alert: ${rule.description || rule.name}`,
    };

    logger.warn('Logging alert triggered', alert);

    // Execute alert callback if provided
    if (rule.callback) {
      try {
        rule.callback(alert);
      } catch (error) {
        logger.error('Alert callback failed:', error.message);
      }
    }
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule) {
    this.alertRules.push({
      name: rule.name,
      description: rule.description,
      level: rule.level,
      category: rule.category,
      messagePattern: rule.messagePattern,
      dataCondition: rule.dataCondition,
      frequency: rule.frequency,
      severity: rule.severity || 'medium',
      callback: rule.callback,
      enabled: rule.enabled !== false,
    });

    logger.info('Logging alert rule added', { name: rule.name });
  }

  /**
   * Subscribe to log events
   */
  subscribe(callback, filter = null) {
    const subscription = {
      callback,
      filter,
      id: Date.now() + Math.random(),
    };

    this.logSubscribers.push(subscription);
    return subscription.id;
  }

  /**
   * Unsubscribe from log events
   */
  unsubscribe(subscriptionId) {
    const index = this.logSubscribers.findIndex(sub => sub.id === subscriptionId);
    if (index !== -1) {
      this.logSubscribers.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Notify subscribers of new log entry
   */
  notifySubscribers(logEntry) {
    for (const subscriber of this.logSubscribers) {
      try {
        // Apply filter if specified
        if (subscriber.filter && !this.applyFilter(logEntry, subscriber.filter)) {
          continue;
        }

        subscriber.callback(logEntry);
      } catch (error) {
        logger.error('Log subscriber callback failed:', error.message);
      }
    }
  }

  /**
   * Apply filter to log entry
   */
  applyFilter(logEntry, filter) {
    if (filter.level && logEntry.level !== filter.level) {
      return false;
    }

    if (filter.category && logEntry.category !== filter.category) {
      return false;
    }

    if (filter.service && logEntry.service !== filter.service) {
      return false;
    }

    if (filter.tags && !filter.tags.some(tag => logEntry.tags.includes(tag))) {
      return false;
    }

    return true;
  }

  /**
   * Query logs with filters and pagination
   */
  queryLogs(query = {}) {
    let results = [...this.logBuffer];

    // Apply filters
    if (query.level) {
      results = results.filter(entry => entry.level === query.level);
    }

    if (query.category) {
      results = results.filter(entry => entry.category === query.category);
    }

    if (query.service) {
      results = results.filter(entry => entry.service === query.service);
    }

    if (query.startTime) {
      const startTime = new Date(query.startTime);
      results = results.filter(entry => entry.timestamp >= startTime);
    }

    if (query.endTime) {
      const endTime = new Date(query.endTime);
      results = results.filter(entry => entry.timestamp <= endTime);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(
        entry =>
          entry.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(entry.data).toLowerCase().includes(searchLower)
      );
    }

    if (query.tags) {
      results = results.filter(entry => query.tags.some(tag => entry.tags.includes(tag)));
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      logs: paginatedResults,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get aggregated log statistics
   */
  getLogStatistics(timeRange = '1h') {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };

    const duration = ranges[timeRange] || ranges['1h'];
    const cutoff = Date.now() - duration;

    const recentLogs = this.logBuffer.filter(entry => entry.timestamp.getTime() > cutoff);

    const stats = {
      timeRange,
      totalLogs: recentLogs.length,
      byLevel: {},
      byCategory: {},
      byService: {},
      topErrors: [],
      performanceIssues: 0,
      securityEvents: 0,
    };

    // Count by level
    for (const level of this.logLevels) {
      stats.byLevel[level] = recentLogs.filter(entry => entry.level === level).length;
    }

    // Count by category
    for (const category of Object.values(this.categories)) {
      stats.byCategory[category] = recentLogs.filter(entry => entry.category === category).length;
    }

    // Count by service
    const services = [...new Set(recentLogs.map(entry => entry.service))];
    for (const service of services) {
      stats.byService[service] = recentLogs.filter(entry => entry.service === service).length;
    }

    // Get top errors
    const errors = recentLogs.filter(entry => entry.level === 'error');
    const errorGroups = new Map();

    for (const error of errors) {
      const key = error.message;
      if (!errorGroups.has(key)) {
        errorGroups.set(key, { message: key, count: 0, lastSeen: error.timestamp });
      }
      errorGroups.get(key).count++;
      if (error.timestamp > errorGroups.get(key).lastSeen) {
        errorGroups.get(key).lastSeen = error.timestamp;
      }
    }

    stats.topErrors = Array.from(errorGroups.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count performance issues
    stats.performanceIssues = recentLogs.filter(
      entry => entry.category === this.categories.PERFORMANCE && entry.data.performanceIssue
    ).length;

    // Count security events
    stats.securityEvents = recentLogs.filter(
      entry => entry.category === this.categories.SECURITY
    ).length;

    return stats;
  }

  /**
   * Export logs to file
   */
  async exportLogs(format = 'json', query = {}) {
    const queryResult = this.queryLogs(query);
    const exportData = {
      exportTime: new Date(),
      query,
      totalLogs: queryResult.pagination.total,
      logs: queryResult.logs,
    };

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(exportData, null, 2);

      case 'csv':
        return this.convertToCSV(exportData.logs);

      case 'txt':
        return this.convertToText(exportData.logs);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    const headers = ['timestamp', 'level', 'category', 'service', 'message', 'data'];
    let csv = headers.join(',') + '\\n';

    for (const log of logs) {
      const row = [
        log.timestamp.toISOString(),
        log.level,
        log.category,
        log.service,
        `"${log.message.replace(/"/g, '""')}"`,
        `"${JSON.stringify(log.data).replace(/"/g, '""')}"`,
      ];
      csv += row.join(',') + '\\n';
    }

    return csv;
  }

  /**
   * Convert logs to text format
   */
  convertToText(logs) {
    let text = '';

    for (const log of logs) {
      text += `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()} [${log.category}/${log.service}] ${log.message}\\n`;
      if (Object.keys(log.data).length > 0) {
        text += `  Data: ${JSON.stringify(log.data, null, 2)}\\n`;
      }
      text += '\\n';
    }

    return text;
  }

  /**
   * Start the logging service
   */
  start() {
    if (this.isStarted) {
      logger.warn('Centralized logging service is already started');
      return;
    }

    this.isStarted = true;

    // Set up periodic flush
    this.flushIntervalId = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);

    // Set up cleanup
    setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute

    logger.info('Centralized logging service started', {
      maxBufferSize: this.maxBufferSize,
      flushInterval: this.flushInterval,
      retentionPeriod: this.retentionPeriod,
    });
  }

  /**
   * Stop the logging service
   */
  stop() {
    if (!this.isStarted) {
      return;
    }

    this.isStarted = false;

    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }

    // Final flush
    this.flushBuffer();

    logger.info('Centralized logging service stopped');
  }

  /**
   * Flush buffer (could be enhanced to write to file/database)
   */
  flushBuffer() {
    if (this.logBuffer.length === 0) {
      return;
    }

    // For now, just log the flush operation
    logger.debug('Flushed log buffer', {
      entriesCount: this.logBuffer.length,
    });

    // In a real implementation, you might write to a file or database here
    // For example:
    // await this.writeToFile(this.logBuffer);
    // await this.writeToDB(this.logBuffer);
  }

  /**
   * Cleanup old data
   */
  cleanup() {
    const cutoff = Date.now() - this.retentionPeriod;

    // Remove old log entries
    const originalSize = this.logBuffer.length;
    this.logBuffer = this.logBuffer.filter(entry => entry.timestamp.getTime() > cutoff);

    const removed = originalSize - this.logBuffer.length;
    if (removed > 0) {
      logger.debug('Cleaned up old log entries', { removed, remaining: this.logBuffer.length });
    }

    this.metrics.set('logs_buffer_size', this.logBuffer.length);
  }

  /**
   * Generate correlation ID
   */
  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get call source information
   */
  getCallSource() {
    const stack = new Error().stack;
    const lines = stack.split('\\n');

    // Find the first line that's not from this file
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (line && !line.includes('CentralizedLoggingService')) {
        const match = line.match(/at\\s+(.+?)\\s+\\((.+):(\\d+):(\\d+)\\)/);
        if (match) {
          return {
            function: match[1],
            file: path.basename(match[2]),
            line: parseInt(match[3]),
            column: parseInt(match[4]),
          };
        }
      }
    }

    return { function: 'unknown', file: 'unknown', line: 0, column: 0 };
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const metricsObj = {};
    for (const [key, value] of this.metrics) {
      metricsObj[key] = value;
    }
    return metricsObj;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isStarted: this.isStarted,
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.maxBufferSize,
      subscribersCount: this.logSubscribers.length,
      alertRulesCount: this.alertRules.length,
      metrics: this.getMetrics(),
      categories: this.categories,
      logLevels: this.logLevels,
    };
  }
}

module.exports = CentralizedLoggingService;
