// MongoDB models replaced with Prisma for PostgreSQL migration
// const ApiActivityLog = require('../models/ApiActivityLog');

const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
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

      // Build Prisma filter object
      const where = {};

      // Date range filter with EST timezone handling
      if (startDate || endDate) {
        const dateRange = createEasternDateRange(startDate, endDate);
        where.timestamp = {};
        if (dateRange.$gte) where.timestamp.gte = dateRange.$gte;
        if (dateRange.$lte) where.timestamp.lte = dateRange.$lte;
      }

      // Boolean filters - map success to statusCode < 400
      if (success !== undefined) {
        const isSuccess = success === 'true';
        where.statusCode = isSuccess ? { lt: 400 } : { gte: 400 };
      }

      // Exact match filters
      if (method) where.method = method;
      if (endpointType) where.endpointType = endpointType;
      if (userId) where.userId = userId;
      if (userEmail) {
        where.user = {
          email: {
            contains: userEmail,
            mode: 'insensitive'
          }
        };
      }
      if (errorType) where.error = { contains: errorType };
      if (responseStatus) where.statusCode = parseInt(responseStatus);

      // Multi-value filters (comma-separated)
      if (category && typeof category === 'string') {
        const categoryValues = category
          .split(',')
          .map(c => c.trim())
          .filter(c => c.length > 0);
        if (categoryValues.length > 0) {
          where.category = categoryValues.length > 1 ? { in: categoryValues } : categoryValues[0];
        }
      }
      if (importance && typeof importance === 'string') {
        const importanceValues = importance
          .split(',')
          .map(i => i.trim())
          .filter(i => i.length > 0);
        if (importanceValues.length > 0) {
          where.importance = importanceValues.length > 1 ? { in: importanceValues } : importanceValues[0];
        }
      }

      // Range filters - map to responseTime
      if (minDuration || maxDuration) {
        where.responseTime = {};
        if (minDuration) where.responseTime.gte = parseInt(minDuration);
        if (maxDuration) where.responseTime.lte = parseInt(maxDuration);
      }

      // Text search across multiple fields using OR conditions
      if (search) {
        where.OR = [
          { url: { contains: search, mode: 'insensitive' } },
          { endpoint: { contains: search, mode: 'insensitive' } },
          { userAgent: { contains: search, mode: 'insensitive' } },
          { error: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Endpoint pattern filter
      if (endpoint) {
        where.endpoint = { contains: endpoint, mode: 'insensitive' };
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Parse sort parameter for Prisma (default: newest first)
      const orderBy = {};
      if (sort.startsWith('-')) {
        orderBy[sort.substring(1)] = 'desc';
      } else {
        orderBy[sort] = 'asc';
      }

      // Execute query with Prisma
      const [logs, total] = await Promise.all([
        prisma.apiActivityLog.findMany({
          where,
          orderBy,
          skip,
          take: parseInt(limit),
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }),
        prisma.apiActivityLog.count({ where }),
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

      const log = await prisma.apiActivityLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

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

      // Calculate time range
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
        startTime = toEasternTimeStart(now);
      } else {
        startTime = new Date(now.getTime() - (timeframeMap[timeframe] || timeframeMap['24h']));
      }

      const baseWhere = {
        timestamp: { gte: startTime },
        category: { in: ['api', 'workflow'] },
        endpointType: { in: ['client', 'public'] },
        ...(onlyImportant && { importance: { in: ['critical', 'high'] } }),
      };

      // Get activity summary using Prisma aggregations
      const [totalRequests, successfulRequests, avgResponseTime] = await Promise.all([
        prisma.apiActivityLog.count({ where: baseWhere }),
        prisma.apiActivityLog.count({ 
          where: { ...baseWhere, statusCode: { lt: 400 } } 
        }),
        prisma.apiActivityLog.aggregate({
          where: baseWhere,
          _avg: { responseTime: true }
        })
      ]);

      const summary = {
        totalRequests,
        successfulRequests,
        failedRequests: totalRequests - successfulRequests,
        averageResponseTime: Math.round(avgResponseTime._avg?.responseTime || 0),
        totalDataTransferred: 0, // Not easily calculable with current schema
      };

      // Get error breakdown, top endpoints, and user activity
      const [errorBreakdown, topEndpoints, userActivity] = await Promise.all([
        ActivityLogController.getErrorBreakdown(timeframe, onlyImportant),
        ActivityLogController.getTopEndpoints(timeframe, onlyImportant),
        ActivityLogController.getUserActivity(timeframe, onlyImportant)
      ]);

      res.json({
        success: true,
        data: {
          summary,
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

      // Build Prisma filter (similar to getLogs but without pagination)
      const filter = {};
      if (startDate || endDate) {
        const dateRange = createEasternDateRange(startDate, endDate);
        filter.timestamp = {};
        if (dateRange.$gte) filter.timestamp.gte = dateRange.$gte;
        if (dateRange.$lte) filter.timestamp.lte = dateRange.$lte;
      }
      if (success !== undefined) {
        const isSuccess = success === 'true';
        filter.statusCode = isSuccess ? { lt: 400 } : { gte: 400 };
      }
      if (method) filter.method = method;
      if (category) filter.category = category;
      if (endpoint) filter.endpoint = { contains: endpoint, mode: 'insensitive' };

      const logs = await prisma.apiActivityLog.findMany({
        where: filter,
        orderBy: { timestamp: 'desc' },
        take: 10000, // Limit export size
        include: {
          user: {
            select: { email: true }
          }
        }
      });

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

      const result = await prisma.apiActivityLog.deleteMany({
        where: {
          timestamp: { lt: cutoffTime }
        }
      });

      res.json({
        success: true,
        message: `Deleted ${result.count} old activity logs`,
        deletedCount: result.count,
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

  static async getErrorBreakdown(timeframe, onlyImportant = false) {
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
      startTime = toEasternTimeStart(now);
    } else {
      startTime = new Date(now.getTime() - (timeframeMap[timeframe] || timeframeMap['24h']));
    }

    // Use raw query for complex aggregation
    let query = `
      SELECT 
        COALESCE(error, 'Unknown Error') as "_id",
        COUNT(*)::int as count,
        ROUND(AVG("responseTime"))::int as "averageResponseTime"
      FROM "ApiActivityLog"
      WHERE 
        timestamp >= $1
        AND "statusCode" >= 400
        AND category IN ('api', 'workflow')
        AND "endpointType" IN ('client', 'public')
    `;
    
    const params = [startTime];
    
    if (onlyImportant) {
      query += ` AND importance IN ('critical', 'high')`;
    }
    
    query += `
      GROUP BY COALESCE(error, 'Unknown Error')
      ORDER BY count DESC
    `;

    return await prisma.$queryRawUnsafe(query, ...params);
  }

  static async getTopEndpoints(timeframe, onlyImportant = false) {
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
      startTime = toEasternTimeStart(now);
    } else {
      startTime = new Date(now.getTime() - (timeframeMap[timeframe] || timeframeMap['24h']));
    }

    let query = `
      SELECT 
        endpoint as "_id",
        COUNT(*)::int as "totalRequests",
        COUNT(CASE WHEN "statusCode" < 400 THEN 1 END)::int as "successfulRequests",
        ROUND(AVG("responseTime"))::int as "averageResponseTime"
      FROM "ApiActivityLog"
      WHERE 
        timestamp >= $1
        AND category IN ('api', 'workflow')
        AND "endpointType" IN ('client', 'public')
    `;
    
    const params = [startTime];
    
    if (onlyImportant) {
      query += ` AND importance IN ('critical', 'high')`;
    }
    
    query += `
      GROUP BY endpoint
      ORDER BY "totalRequests" DESC
      LIMIT 10
    `;

    return await prisma.$queryRawUnsafe(query, ...params);
  }

  static async getUserActivity(timeframe, onlyImportant = false) {
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
      startTime = toEasternTimeStart(now);
    } else {
      startTime = new Date(now.getTime() - (timeframeMap[timeframe] || timeframeMap['24h']));
    }

    let query = `
      SELECT 
        u.email as "_id",
        COUNT(*)::int as "totalRequests",
        COUNT(CASE WHEN "statusCode" < 400 THEN 1 END)::int as "successfulRequests",
        MAX(timestamp) as "lastActivity"
      FROM "ApiActivityLog" a
      LEFT JOIN "User" u ON a."userId" = u.id
      WHERE 
        timestamp >= $1
        AND a."userId" IS NOT NULL
        AND category IN ('api', 'workflow')
        AND "endpointType" IN ('client', 'public')
    `;
    
    const params = [startTime];
    
    if (onlyImportant) {
      query += ` AND importance IN ('critical', 'high')`;
    }
    
    query += `
      GROUP BY u.email
      ORDER BY "totalRequests" DESC
      LIMIT 10
    `;

    return await prisma.$queryRawUnsafe(query, ...params);
  }
}

module.exports = new ActivityLogController();
