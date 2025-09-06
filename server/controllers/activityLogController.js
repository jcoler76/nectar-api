const ApiActivityLog = require('../models/ApiActivityLog');
const { logger } = require('../middleware/logger');
const {
  createEasternDateRange,
  formatEasternTime,
  toEasternTimeStart,
} = require('../utils/dateUtils');

/**
 * Controller for API Activity Log operations
 */
class ActivityLogController {
  /**
   * Get activity logs with filtering and pagination
   */
  async getLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        success,
        method,
        endpoint,
        category,
        endpointType,
        importance,
        userId,
        userEmail,
        errorType,
        responseStatus,
        minDuration,
        maxDuration,
        search,
        sort = '-timestamp',
      } = req.query;

      // Build filter object
      const filter = {};

      // Date range filter with EST timezone handling
      if (startDate || endDate) {
        filter.timestamp = createEasternDateRange(startDate, endDate);
      }

      // Boolean filters
      if (success !== undefined) filter.success = success === 'true';

      // Exact match filters
      if (method) filter.method = method;
      if (endpointType) filter.endpointType = endpointType;
      if (userId) filter.userId = userId;
      if (userEmail) filter.userEmail = new RegExp(userEmail, 'i');
      if (errorType) filter.errorType = errorType;
      if (responseStatus) filter.responseStatus = parseInt(responseStatus);

      // Multi-value filters (comma-separated)
      if (category && typeof category === 'string') {
        const categoryValues = category
          .split(',')
          .map(c => c.trim())
          .filter(c => c.length > 0);
        if (categoryValues.length > 0) {
          filter.category = categoryValues.length > 1 ? { $in: categoryValues } : categoryValues[0];
        }
      }
      if (importance && typeof importance === 'string') {
        const importanceValues = importance
          .split(',')
          .map(i => i.trim())
          .filter(i => i.length > 0);
        if (importanceValues.length > 0) {
          filter.importance =
            importanceValues.length > 1 ? { $in: importanceValues } : importanceValues[0];
        }
      }

      // Range filters
      if (minDuration || maxDuration) {
        filter.duration = {};
        if (minDuration) filter.duration.$gte = parseInt(minDuration);
        if (maxDuration) filter.duration.$lte = parseInt(maxDuration);
      }

      // Text search across multiple fields
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { url: searchRegex },
          { endpoint: searchRegex },
          { userAgent: searchRegex },
          { errorMessage: searchRegex },
          { 'metadata.query': searchRegex },
        ];
      }

      // Endpoint pattern filter
      if (endpoint) {
        filter.endpoint = new RegExp(endpoint, 'i');
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query with population
      const [logs, total] = await Promise.all([
        ApiActivityLog.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('userId', 'email name role')
          .populate('workflowId', 'name')
          .populate('workflowRunId', 'status')
          .lean(),
        ApiActivityLog.countDocuments(filter),
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(total / parseInt(limit));
      const hasNext = parseInt(page) < totalPages;
      const hasPrev = parseInt(page) > 1;

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNext,
            hasPrev,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to fetch activity logs', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity logs',
        error: error.message,
      });
    }
  }

  /**
   * Get a specific activity log by ID
   */
  async getLogById(req, res) {
    try {
      const { id } = req.params;

      const log = await ApiActivityLog.findById(id)
        .populate('userId', 'email name role')
        .populate('workflowId', 'name description')
        .populate('workflowRunId', 'status startedAt finishedAt');

      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Activity log not found',
        });
      }

      res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      logger.error('Failed to fetch activity log by ID', {
        logId: req.params.id,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity log',
        error: error.message,
      });
    }
  }

  /**
   * Get activity log statistics and summary
   */
  async getStatistics(req, res) {
    try {
      const { timeframe = '24h', onlyImportant = false } = req.query;

      // Get activity summary
      const summary = await ApiActivityLog.getActivitySummary(timeframe, onlyImportant);

      // Get error breakdown
      const errorBreakdown = await module.exports.getErrorBreakdown(timeframe, onlyImportant);

      // Get top endpoints
      const topEndpoints = await module.exports.getTopEndpoints(timeframe, onlyImportant);

      // Get user activity
      const userActivity = await module.exports.getUserActivity(timeframe, onlyImportant);

      res.json({
        success: true,
        data: {
          summary: summary[0] || {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            totalDataTransferred: 0,
          },
          errorBreakdown,
          topEndpoints,
          userActivity,
          timeframe,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch activity statistics', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity statistics',
        error: error.message,
      });
    }
  }

  /**
   * Export activity logs as CSV
   */
  async exportLogs(req, res) {
    try {
      const { startDate, endDate, success, method, endpoint, category, format = 'csv' } = req.query;

      // Build filter (similar to getLogs but without pagination)
      const filter = {};
      if (startDate || endDate) {
        filter.timestamp = createEasternDateRange(startDate, endDate);
      }
      if (success !== undefined) filter.success = success === 'true';
      if (method) filter.method = method;
      if (category) filter.category = category;
      if (endpoint) filter.endpoint = new RegExp(endpoint, 'i');

      const logs = await ApiActivityLog.find(filter)
        .sort('-timestamp')
        .limit(10000) // Limit export size
        .populate('userId', 'email')
        .lean();

      if (format === 'csv') {
        // Generate CSV
        const csvHeaders = [
          'Timestamp',
          'Method',
          'Endpoint',
          'Status',
          'Duration',
          'Success',
          'User Email',
          'IP Address',
          'Error Type',
          'Error Message',
        ];

        const csvRows = logs.map(log => [
          formatEasternTime(log.timestamp),
          log.method,
          log.endpoint,
          log.responseStatus,
          log.duration,
          log.success,
          log.userId?.email || '',
          log.ipAddress,
          log.errorType || '',
          log.errorMessage || '',
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=activity-logs.csv');
        res.send(csvContent);
      } else {
        res.json({
          success: true,
          data: logs,
        });
      }
    } catch (error) {
      logger.error('Failed to export activity logs', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to export activity logs',
        error: error.message,
      });
    }
  }

  /**
   * Delete old activity logs (cleanup)
   */
  async cleanupLogs(req, res) {
    try {
      const { olderThan = '90d' } = req.body;

      // Calculate cutoff date
      const timeframeMap = {
        '30d': 30 * 24 * 60 * 60 * 1000,
        '60d': 60 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        '180d': 180 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000,
      };

      const cutoffTime = new Date(Date.now() - (timeframeMap[olderThan] || timeframeMap['90d']));

      const result = await ApiActivityLog.deleteMany({
        timestamp: { $lt: cutoffTime },
      });

      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} old activity logs`,
        deletedCount: result.deletedCount,
        cutoffDate: cutoffTime,
      });
    } catch (error) {
      logger.error('Failed to cleanup activity logs', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup activity logs',
        error: error.message,
      });
    }
  }

  // Helper methods for statistics

  async getErrorBreakdown(timeframe, onlyImportant = false) {
    const now = new Date();
    const timeframeMap = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };

    let startTime;
    if (timeframe === '24h') {
      // For 24h timeframe, use Eastern Time start of today
      startTime = toEasternTimeStart(now);
    } else {
      // For other timeframes, use standard UTC-based calculation from now
      startTime = new Date(now.getTime() - (timeframeMap[timeframe] || timeframeMap['24h']));
    }

    return await ApiActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime },
          success: false,
          category: { $in: ['api', 'workflow'] },
          endpointType: { $in: ['client', 'public'] },
          ...(onlyImportant && { importance: { $in: ['critical', 'high'] } }),
        },
      },
      {
        $group: {
          _id: '$errorType',
          count: { $sum: 1 },
          averageResponseTime: { $avg: '$duration' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
  }

  async getTopEndpoints(timeframe, onlyImportant = false) {
    const now = new Date();
    const timeframeMap = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };

    let startTime;
    if (timeframe === '24h') {
      // For 24h timeframe, use Eastern Time start of today
      startTime = toEasternTimeStart(now);
    } else {
      // For other timeframes, use standard UTC-based calculation from now
      startTime = new Date(now.getTime() - (timeframeMap[timeframe] || timeframeMap['24h']));
    }

    return await ApiActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime },
          category: { $in: ['api', 'workflow'] },
          endpointType: { $in: ['client', 'public'] },
          ...(onlyImportant && { importance: { $in: ['critical', 'high'] } }),
        },
      },
      {
        $group: {
          _id: '$endpoint',
          totalRequests: { $sum: 1 },
          successfulRequests: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] },
          },
          averageResponseTime: { $avg: '$duration' },
        },
      },
      {
        $sort: { totalRequests: -1 },
      },
      {
        $limit: 10,
      },
    ]);
  }

  async getUserActivity(timeframe, onlyImportant = false) {
    const now = new Date();
    const timeframeMap = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };

    let startTime;
    if (timeframe === '24h') {
      // For 24h timeframe, use Eastern Time start of today
      startTime = toEasternTimeStart(now);
    } else {
      // For other timeframes, use standard UTC-based calculation from now
      startTime = new Date(now.getTime() - (timeframeMap[timeframe] || timeframeMap['24h']));
    }

    return await ApiActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime },
          userId: { $ne: null },
          category: { $in: ['api', 'workflow'] },
          endpointType: { $in: ['client', 'public'] },
          ...(onlyImportant && { importance: { $in: ['critical', 'high'] } }),
        },
      },
      {
        $group: {
          _id: '$userEmail',
          totalRequests: { $sum: 1 },
          successfulRequests: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] },
          },
          lastActivity: { $max: '$timestamp' },
        },
      },
      {
        $sort: { totalRequests: -1 },
      },
      {
        $limit: 10,
      },
    ]);
  }
}

module.exports = new ActivityLogController();
