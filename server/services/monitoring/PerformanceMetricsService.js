const { logger } = require('../../utils/logger');

/**
 * Performance Metrics Service
 * Collects and analyzes performance metrics for all BaaS services
 */
class PerformanceMetricsService {
  constructor() {
    this.metrics = new Map();
    this.timeSeries = new Map();
    this.alertThresholds = new Map();
    this.isCollecting = false;
    this.collectionInterval = 30000; // 30 seconds
    this.intervalId = null;
    this.retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
    this.aggregationIntervals = [60000, 300000, 900000]; // 1min, 5min, 15min
    this.eventListeners = [];
  }

  /**
   * Initialize metrics collection for a service
   */
  initializeMetrics(serviceName, metricTypes = ['responseTime', 'throughput', 'errorRate']) {
    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, {
        responseTime: {
          current: 0,
          average: 0,
          min: Infinity,
          max: 0,
          p95: 0,
          p99: 0,
          samples: [],
        },
        throughput: {
          current: 0,
          average: 0,
          peak: 0,
          requests: 0,
          lastMinute: [],
        },
        errorRate: {
          current: 0,
          average: 0,
          errors: 0,
          total: 0,
          recentErrors: [],
        },
        customMetrics: new Map(),
        lastUpdated: Date.now(),
      });

      this.timeSeries.set(serviceName, []);

      logger.info('Performance metrics initialized', {
        serviceName,
        metricTypes,
      });
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(serviceName, metricType, value, timestamp = Date.now()) {
    if (!this.metrics.has(serviceName)) {
      this.initializeMetrics(serviceName);
    }

    const serviceMetrics = this.metrics.get(serviceName);
    const timeSeries = this.timeSeries.get(serviceName);

    switch (metricType) {
      case 'responseTime':
        this.recordResponseTime(serviceMetrics, value, timestamp);
        break;
      case 'throughput':
        this.recordThroughput(serviceMetrics, value, timestamp);
        break;
      case 'errorRate':
        this.recordError(serviceMetrics, value, timestamp);
        break;
      default:
        this.recordCustomMetric(serviceMetrics, metricType, value, timestamp);
    }

    // Add to time series
    timeSeries.push({
      timestamp,
      metricType,
      value,
    });

    // Clean old data
    this.cleanOldData(serviceName);

    serviceMetrics.lastUpdated = timestamp;

    // Check thresholds
    this.checkThresholds(serviceName, metricType, value);

    // Emit event
    this.emitMetricEvent(serviceName, metricType, value, timestamp);
  }

  /**
   * Record response time metric
   */
  recordResponseTime(serviceMetrics, responseTime, timestamp) {
    const rt = serviceMetrics.responseTime;

    rt.current = responseTime;
    rt.samples.push({ value: responseTime, timestamp });

    // Update min/max
    rt.min = Math.min(rt.min, responseTime);
    rt.max = Math.max(rt.max, responseTime);

    // Calculate average
    if (rt.samples.length > 0) {
      rt.average = rt.samples.reduce((sum, sample) => sum + sample.value, 0) / rt.samples.length;
    }

    // Calculate percentiles
    if (rt.samples.length >= 10) {
      const sorted = rt.samples.map(s => s.value).sort((a, b) => a - b);
      rt.p95 = sorted[Math.floor(sorted.length * 0.95)];
      rt.p99 = sorted[Math.floor(sorted.length * 0.99)];
    }

    // Keep only recent samples (last hour)
    const oneHourAgo = timestamp - 60 * 60 * 1000;
    rt.samples = rt.samples.filter(sample => sample.timestamp > oneHourAgo);
  }

  /**
   * Record throughput metric
   */
  recordThroughput(serviceMetrics, requestCount, timestamp) {
    const tp = serviceMetrics.throughput;

    tp.requests += requestCount;
    tp.current = requestCount;

    // Track requests per minute
    tp.lastMinute.push({ count: requestCount, timestamp });

    // Calculate current throughput (requests per minute)
    const oneMinuteAgo = timestamp - 60000;
    tp.lastMinute = tp.lastMinute.filter(req => req.timestamp > oneMinuteAgo);

    const currentThroughput = tp.lastMinute.reduce((sum, req) => sum + req.count, 0);
    tp.current = currentThroughput;
    tp.peak = Math.max(tp.peak, currentThroughput);

    // Calculate average throughput
    if (tp.lastMinute.length > 0) {
      tp.average = currentThroughput; // This is already per minute
    }
  }

  /**
   * Record error metric
   */
  recordError(serviceMetrics, isError, timestamp) {
    const er = serviceMetrics.errorRate;

    er.total++;
    if (isError) {
      er.errors++;
      er.recentErrors.push({ timestamp, error: true });
    }

    // Calculate error rate
    er.current = er.total > 0 ? (er.errors / er.total) * 100 : 0;

    // Clean old errors (last hour)
    const oneHourAgo = timestamp - 60 * 60 * 1000;
    er.recentErrors = er.recentErrors.filter(error => error.timestamp > oneHourAgo);

    // Calculate recent error rate
    const recentTotal = Math.max(er.total, 1);
    er.average = (er.recentErrors.length / recentTotal) * 100;
  }

  /**
   * Record custom metric
   */
  recordCustomMetric(serviceMetrics, metricName, value, timestamp) {
    if (!serviceMetrics.customMetrics.has(metricName)) {
      serviceMetrics.customMetrics.set(metricName, {
        current: value,
        history: [],
        average: 0,
        min: value,
        max: value,
      });
    }

    const metric = serviceMetrics.customMetrics.get(metricName);
    metric.current = value;
    metric.history.push({ value, timestamp });
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);

    // Calculate average
    if (metric.history.length > 0) {
      metric.average = metric.history.reduce((sum, h) => sum + h.value, 0) / metric.history.length;
    }

    // Keep only recent history
    const oneHourAgo = timestamp - 60 * 60 * 1000;
    metric.history = metric.history.filter(h => h.timestamp > oneHourAgo);
  }

  /**
   * Clean old data beyond retention period
   */
  cleanOldData(serviceName) {
    const cutoff = Date.now() - this.retentionPeriod;
    const timeSeries = this.timeSeries.get(serviceName);

    if (timeSeries) {
      const cleaned = timeSeries.filter(point => point.timestamp > cutoff);
      this.timeSeries.set(serviceName, cleaned);
    }
  }

  /**
   * Set alert threshold for a metric
   */
  setAlertThreshold(serviceName, metricType, threshold) {
    const key = `${serviceName}_${metricType}`;
    this.alertThresholds.set(key, threshold);

    logger.info('Alert threshold set', {
      serviceName,
      metricType,
      threshold,
    });
  }

  /**
   * Check if metric value exceeds threshold
   */
  checkThresholds(serviceName, metricType, value) {
    const key = `${serviceName}_${metricType}`;
    const threshold = this.alertThresholds.get(key);

    if (threshold && value > threshold) {
      this.triggerAlert(serviceName, metricType, value, threshold);
    }
  }

  /**
   * Trigger performance alert
   */
  triggerAlert(serviceName, metricType, value, threshold) {
    const alert = {
      type: 'performance',
      serviceName,
      metricType,
      value,
      threshold,
      timestamp: new Date(),
      severity: value > threshold * 2 ? 'critical' : 'warning',
    };

    logger.warn('Performance alert triggered', alert);

    // Emit alert event
    this.emitAlertEvent(alert);
  }

  /**
   * Get current metrics for a service
   */
  getMetrics(serviceName) {
    return this.metrics.get(serviceName) || null;
  }

  /**
   * Get aggregated metrics for a time period
   */
  getAggregatedMetrics(serviceName, startTime, endTime, interval = 60000) {
    const timeSeries = this.timeSeries.get(serviceName);
    if (!timeSeries) return null;

    const filtered = timeSeries.filter(
      point => point.timestamp >= startTime && point.timestamp <= endTime
    );

    const buckets = new Map();
    const bucketSize = interval;

    // Group data into time buckets
    filtered.forEach(point => {
      const bucketTime = Math.floor(point.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          timestamp: bucketTime,
          responseTime: [],
          throughput: [],
          errorRate: [],
          customMetrics: new Map(),
        });
      }

      const bucket = buckets.get(bucketTime);
      if (point.metricType === 'responseTime') {
        bucket.responseTime.push(point.value);
      } else if (point.metricType === 'throughput') {
        bucket.throughput.push(point.value);
      } else if (point.metricType === 'errorRate') {
        bucket.errorRate.push(point.value);
      } else {
        if (!bucket.customMetrics.has(point.metricType)) {
          bucket.customMetrics.set(point.metricType, []);
        }
        bucket.customMetrics.get(point.metricType).push(point.value);
      }
    });

    // Calculate aggregations for each bucket
    const result = Array.from(buckets.values()).map(bucket => ({
      timestamp: bucket.timestamp,
      responseTime: {
        avg: this.calculateAverage(bucket.responseTime),
        min: Math.min(...bucket.responseTime),
        max: Math.max(...bucket.responseTime),
        count: bucket.responseTime.length,
      },
      throughput: {
        avg: this.calculateAverage(bucket.throughput),
        sum: bucket.throughput.reduce((sum, val) => sum + val, 0),
        count: bucket.throughput.length,
      },
      errorRate: {
        avg: this.calculateAverage(bucket.errorRate),
        count: bucket.errorRate.length,
      },
      customMetrics: Array.from(bucket.customMetrics.entries()).reduce((acc, [key, values]) => {
        acc[key] = {
          avg: this.calculateAverage(values),
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
        };
        return acc;
      }, {}),
    }));

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculate average of array values
   */
  calculateAverage(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Get performance summary for all services
   */
  getPerformanceSummary() {
    const summary = {};

    for (const [serviceName, metrics] of this.metrics) {
      summary[serviceName] = {
        responseTime: {
          current: metrics.responseTime.current,
          average: Math.round(metrics.responseTime.average * 100) / 100,
          p95: Math.round(metrics.responseTime.p95 * 100) / 100,
          p99: Math.round(metrics.responseTime.p99 * 100) / 100,
        },
        throughput: {
          current: metrics.throughput.current,
          peak: metrics.throughput.peak,
          total: metrics.throughput.requests,
        },
        errorRate: {
          current: Math.round(metrics.errorRate.current * 100) / 100,
          recent: Math.round(metrics.errorRate.average * 100) / 100,
          totalErrors: metrics.errorRate.errors,
          totalRequests: metrics.errorRate.total,
        },
        customMetrics: Array.from(metrics.customMetrics.entries()).reduce((acc, [key, metric]) => {
          acc[key] = {
            current: metric.current,
            average: Math.round(metric.average * 100) / 100,
            min: metric.min,
            max: metric.max,
          };
          return acc;
        }, {}),
        lastUpdated: metrics.lastUpdated,
      };
    }

    return summary;
  }

  /**
   * Start automated metrics collection
   */
  startCollection() {
    if (this.isCollecting) {
      logger.warn('Performance metrics collection is already running');
      return;
    }

    this.isCollecting = true;

    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, this.collectionInterval);

    logger.info('Performance metrics collection started', {
      interval: this.collectionInterval,
    });
  }

  /**
   * Stop automated metrics collection
   */
  stopCollection() {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Performance metrics collection stopped');
  }

  /**
   * Collect system-level metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Record system metrics
    this.recordMetric('system', 'memoryUsage', memUsage.heapUsed);
    this.recordMetric('system', 'cpuUsage', cpuUsage.user + cpuUsage.system);

    // Collect event loop lag
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      this.recordMetric('system', 'eventLoopLag', lag);
    });
  }

  /**
   * Add event listener for metrics events
   */
  addEventListener(listener) {
    if (typeof listener === 'function') {
      this.eventListeners.push(listener);
    }
  }

  /**
   * Emit metric event
   */
  emitMetricEvent(serviceName, metricType, value, timestamp) {
    const event = {
      type: 'metric',
      serviceName,
      metricType,
      value,
      timestamp,
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('Metric event listener failed:', error.message);
      }
    });
  }

  /**
   * Emit alert event
   */
  emitAlertEvent(alert) {
    this.eventListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        logger.error('Alert event listener failed:', error.message);
      }
    });
  }

  /**
   * Get top performing services
   */
  getTopPerformers(metricType = 'responseTime', limit = 5) {
    const services = Array.from(this.metrics.entries());

    const sorted = services
      .filter(([, metrics]) => metrics[metricType])
      .map(([name, metrics]) => ({
        serviceName: name,
        value: metrics[metricType].average || metrics[metricType].current,
      }))
      .sort((a, b) => {
        // For response time and error rate, lower is better
        if (metricType === 'responseTime' || metricType === 'errorRate') {
          return a.value - b.value;
        }
        // For throughput, higher is better
        return b.value - a.value;
      })
      .slice(0, limit);

    return sorted;
  }

  /**
   * Generate performance report
   */
  generateReport(timeRange = '1h') {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };

    const duration = ranges[timeRange] || ranges['1h'];
    const startTime = now - duration;

    const report = {
      timeRange,
      startTime: new Date(startTime),
      endTime: new Date(now),
      summary: this.getPerformanceSummary(),
      topPerformers: {
        fastestResponse: this.getTopPerformers('responseTime', 3),
        highestThroughput: this.getTopPerformers('throughput', 3),
        lowestErrorRate: this.getTopPerformers('errorRate', 3),
      },
      alerts: this.getRecentAlerts(startTime),
      systemHealth: this.getSystemHealth(),
    };

    return report;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(since) {
    // This would typically be stored in a database or cache
    // For now, return empty array as alerts are logged
    return [];
  }

  /**
   * Get system health metrics
   */
  getSystemHealth() {
    const systemMetrics = this.getMetrics('system');
    if (!systemMetrics) return null;

    return {
      memory: systemMetrics.customMetrics.get('memoryUsage'),
      cpu: systemMetrics.customMetrics.get('cpuUsage'),
      eventLoop: systemMetrics.customMetrics.get('eventLoopLag'),
    };
  }
}

module.exports = PerformanceMetricsService;
