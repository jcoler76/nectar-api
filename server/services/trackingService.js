const { PrismaClient } = require('@prisma/client'); // MANDATORY: Standard import from CLAUDE.md
const { logger } = require('../utils/logger');
const geoip = require('geoip-lite');

const prisma = new PrismaClient();

class TrackingService {
  /**
   * Track application usage events (clicks, page views, feature usage)
   */
  async trackAppUsage({
    sessionId,
    userId = null,
    organizationId = null,
    eventType,
    elementId = null,
    elementText = null,
    elementPath = null,
    page,
    referrerPage = null,
    userAgent = null,
    ipAddress = null,
    metadata = null,
    pageLoadTime = null,
    timeOnPage = null,
  }) {
    try {
      // Validate required fields
      if (!sessionId || !eventType || !page) {
        throw new Error('SessionId, eventType, and page are required for app usage tracking');
      }

      // Sanitize and limit text fields
      const sanitizedData = {
        sessionId: sessionId.substring(0, 255),
        userId,
        organizationId,
        eventType: eventType.substring(0, 50),
        elementId: elementId?.substring(0, 255) || null,
        elementText: elementText?.substring(0, 500) || null,
        elementPath: elementPath?.substring(0, 1000) || null,
        page: page.substring(0, 255),
        referrerPage: referrerPage?.substring(0, 255) || null,
        userAgent: userAgent?.substring(0, 500) || null,
        ipAddress: ipAddress?.substring(0, 45) || null, // IPv6 max length
        metadata,
        pageLoadTime,
        timeOnPage,
      };

      const appUsageLog = await prisma.appUsageLog.create({
        data: sanitizedData,
      });

      logger.info('App usage tracked', {
        id: appUsageLog.id,
        sessionId,
        eventType,
        page,
        userId,
      });

      return { success: true, id: appUsageLog.id };
    } catch (error) {
      logger.error('Failed to track app usage', {
        error: error.message,
        sessionId,
        eventType,
        page,
        userId,
      });
      throw error;
    }
  }

  /**
   * Track login activity (success, failure, logout, etc.)
   */
  async trackLoginActivity({
    userId = null,
    organizationId = null,
    email = null,
    loginType,
    ipAddress = null,
    userAgent = null,
    deviceInfo = null,
    failureReason = null,
    sessionId = null,
    duration = null,
    metadata = null,
  }) {
    try {
      // Validate required fields
      if (!loginType) {
        throw new Error('LoginType is required for login activity tracking');
      }

      // Get geographic location from IP if available
      let location = null;
      if (ipAddress) {
        const geo = geoip.lookup(ipAddress);
        if (geo) {
          location = {
            country: geo.country,
            region: geo.region,
            city: geo.city,
            timezone: geo.timezone,
            coordinates: [geo.ll[1], geo.ll[0]], // [longitude, latitude]
          };
        }
      }

      // Sanitize and limit data
      const sanitizedData = {
        userId,
        organizationId,
        email: email?.substring(0, 255) || null,
        loginType: loginType.substring(0, 50),
        ipAddress: ipAddress?.substring(0, 45) || null,
        userAgent: userAgent?.substring(0, 500) || null,
        deviceInfo,
        location,
        failureReason: failureReason?.substring(0, 255) || null,
        sessionId: sessionId?.substring(0, 255) || null,
        duration,
        metadata,
      };

      const loginLog = await prisma.loginActivityLog.create({
        data: sanitizedData,
      });

      logger.info('Login activity tracked', {
        id: loginLog.id,
        loginType,
        email: email || 'N/A',
        ipAddress,
        userId,
      });

      return { success: true, id: loginLog.id };
    } catch (error) {
      logger.error('Failed to track login activity', {
        error: error.message,
        loginType,
        email,
        ipAddress,
        userId,
      });
      throw error;
    }
  }

  /**
   * Track multiple app usage events in batch for performance
   */
  async trackAppUsageBatch(events) {
    try {
      if (!Array.isArray(events) || events.length === 0) {
        throw new Error('Events array is required for batch tracking');
      }

      // Limit batch size to prevent performance issues
      const maxBatchSize = 100;
      if (events.length > maxBatchSize) {
        throw new Error(`Batch size limited to ${maxBatchSize} events`);
      }

      // Sanitize each event
      const sanitizedEvents = events.map(event => ({
        sessionId: event.sessionId?.substring(0, 255) || '',
        userId: event.userId || null,
        organizationId: event.organizationId || null,
        eventType: event.eventType?.substring(0, 50) || '',
        elementId: event.elementId?.substring(0, 255) || null,
        elementText: event.elementText?.substring(0, 500) || null,
        elementPath: event.elementPath?.substring(0, 1000) || null,
        page: event.page?.substring(0, 255) || '',
        referrerPage: event.referrerPage?.substring(0, 255) || null,
        userAgent: event.userAgent?.substring(0, 500) || null,
        ipAddress: event.ipAddress?.substring(0, 45) || null,
        metadata: event.metadata || null,
        pageLoadTime: event.pageLoadTime || null,
        timeOnPage: event.timeOnPage || null,
        timestamp: event.timestamp ? new Date(event.timestamp) : undefined,
      }));

      const result = await prisma.appUsageLog.createMany({
        data: sanitizedEvents,
        skipDuplicates: true,
      });

      logger.info('Batch app usage tracked', {
        eventCount: result.count,
        totalSubmitted: events.length,
      });

      return { success: true, count: result.count };
    } catch (error) {
      logger.error('Failed to track app usage batch', {
        error: error.message,
        eventCount: events?.length || 0,
      });
      throw error;
    }
  }

  /**
   * Get app usage analytics for admin dashboard
   */
  async getAppUsageAnalytics(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        organizationId = null,
        userId = null,
        eventType = null,
        page = null,
      } = filters;

      const whereClause = {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (organizationId) whereClause.organizationId = organizationId;
      if (userId) whereClause.userId = userId;
      if (eventType) whereClause.eventType = eventType;
      if (page) whereClause.page = { contains: page };

      // Get total events
      const totalEvents = await prisma.appUsageLog.count({
        where: whereClause,
      });

      // Get events by type
      const eventsByType = await prisma.appUsageLog.groupBy({
        by: ['eventType'],
        where: whereClause,
        _count: { eventType: true },
        orderBy: { _count: { eventType: 'desc' } },
      });

      // Get top pages
      const topPages = await prisma.appUsageLog.groupBy({
        by: ['page'],
        where: whereClause,
        _count: { page: true },
        orderBy: { _count: { page: 'desc' } },
        take: 10,
      });

      // Get unique sessions and users
      const uniqueSessions = await prisma.appUsageLog.findMany({
        where: whereClause,
        select: { sessionId: true },
        distinct: ['sessionId'],
      });

      const uniqueUsers = await prisma.appUsageLog.findMany({
        where: { ...whereClause, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      });

      return {
        totalEvents,
        uniqueSessions: uniqueSessions.length,
        uniqueUsers: uniqueUsers.length,
        eventsByType: eventsByType.map(item => ({
          eventType: item.eventType,
          count: item._count.eventType,
        })),
        topPages: topPages.map(item => ({
          page: item.page,
          count: item._count.page,
        })),
      };
    } catch (error) {
      logger.error('Failed to get app usage analytics', {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get login analytics for admin dashboard
   */
  async getLoginAnalytics(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        organizationId = null,
        loginType = null,
      } = filters;

      const whereClause = {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (organizationId) whereClause.organizationId = organizationId;
      if (loginType) whereClause.loginType = loginType;

      // Get total login attempts
      const totalAttempts = await prisma.loginActivityLog.count({
        where: whereClause,
      });

      // Get login attempts by type
      const attemptsByType = await prisma.loginActivityLog.groupBy({
        by: ['loginType'],
        where: whereClause,
        _count: { loginType: true },
        orderBy: { _count: { loginType: 'desc' } },
      });

      // Get failed login attempts by reason
      const failuresByReason = await prisma.loginActivityLog.groupBy({
        by: ['failureReason'],
        where: { ...whereClause, loginType: 'failed', failureReason: { not: null } },
        _count: { failureReason: true },
        orderBy: { _count: { failureReason: 'desc' } },
      });

      // Get recent suspicious activity (multiple failures from same IP)
      const suspiciousIPs = await prisma.loginActivityLog.groupBy({
        by: ['ipAddress'],
        where: {
          ...whereClause,
          loginType: 'failed',
          ipAddress: { not: null },
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        },
        _count: { ipAddress: true },
        having: { ipAddress: { _count: { gte: 5 } } }, // 5+ failures
        orderBy: { _count: { ipAddress: 'desc' } },
      });

      return {
        totalAttempts,
        attemptsByType: attemptsByType.map(item => ({
          loginType: item.loginType,
          count: item._count.loginType,
        })),
        failuresByReason: failuresByReason.map(item => ({
          reason: item.failureReason,
          count: item._count.failureReason,
        })),
        suspiciousIPs: suspiciousIPs.map(item => ({
          ipAddress: item.ipAddress,
          failureCount: item._count.ipAddress,
        })),
      };
    } catch (error) {
      logger.error('Failed to get login analytics', {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Clean up old tracking data based on retention policy
   */
  async cleanupOldData(retentionDays = 90) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      // Delete old app usage logs
      const deletedAppUsage = await prisma.appUsageLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
        },
      });

      // Delete old login activity logs
      const deletedLoginActivity = await prisma.loginActivityLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
        },
      });

      logger.info('Tracking data cleanup completed', {
        retentionDays,
        deletedAppUsage: deletedAppUsage.count,
        deletedLoginActivity: deletedLoginActivity.count,
        cutoffDate,
      });

      return {
        success: true,
        deletedAppUsage: deletedAppUsage.count,
        deletedLoginActivity: deletedLoginActivity.count,
      };
    } catch (error) {
      logger.error('Failed to cleanup tracking data', {
        error: error.message,
        retentionDays,
      });
      throw error;
    }
  }
}

module.exports = new TrackingService();
