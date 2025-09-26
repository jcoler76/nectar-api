const { ForbiddenError } = require('apollo-server-express');
const prismaService = require('../../services/prismaService');
const { toEasternTimeStart } = require('../../utils/dateUtils');
const { logger } = require('../../utils/logger');

const dashboardResolvers = {
  Query: {
    dashboardMetrics: async (_, { days = 30 }, { user: currentUser }) => {
      if (!currentUser?.organizationId) {
        throw new ForbiddenError('Organization access required');
      }

      const daysBack = Math.min(90, Math.max(7, days));

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Get counts with explicit organizationId filter
        const [services, users, roles, applications] = await Promise.all([
          tx.service.count({ where: { isActive: true } }),
          tx.user.count({
            where: {
              memberships: {
                some: { organizationId: currentUser.organizationId },
              },
              isActive: true,
            },
          }),
          tx.role.count(),
          tx.application.count({ where: { isActive: true } }),
        ]);

        // Get today's API calls count (using Eastern Time) - only public customer-facing APIs
        const todayStart = toEasternTimeStart(new Date());

        let apiCallsToday = 0;
        try {
          apiCallsToday = await tx.apiActivityLog.count({
            where: {
              timestamp: { gte: todayStart },
              category: { in: ['api', 'workflow'] },
              endpointType: 'public', // Only public customer-facing API calls
              importance: { in: ['critical', 'high'] },
            },
          });
        } catch (error) {
          logger.error('Error counting API calls:', error);
        }

        // Get API activity data for the last N days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const startUTC = toEasternTimeStart(startDate);

        // Get API activity using Prisma raw query for grouping by date
        let apiActivityRaw = [];
        try {
          apiActivityRaw = await tx.$queryRaw`
            SELECT
              DATE(timestamp AT TIME ZONE 'America/New_York') as date,
              COUNT(*) as calls,
              COUNT(CASE WHEN "statusCode" >= 400 THEN 1 END) as failures,
              COALESCE(SUM(CAST(metadata->>'records' AS INTEGER)), 0) as "totalRecords",
              COALESCE(SUM("responseTime"), 0) as "totalDataSize"
            FROM "ApiActivityLog"
            WHERE
              timestamp >= ${startUTC}::timestamp
              AND category IN ('api', 'workflow')
              AND "endpointType" = 'public'
              AND importance IN ('critical', 'high')
              AND "organizationId" = ${currentUser.organizationId}
            GROUP BY DATE(timestamp AT TIME ZONE 'America/New_York')
            ORDER BY date ASC
          `;
        } catch (error) {
          logger.error('Error fetching API activity:', error);
          apiActivityRaw = [];
        }

        const apiActivity = apiActivityRaw.map(row => ({
          _id: row.date.toISOString().split('T')[0],
          calls: Number(row.calls),
          failures: Number(row.failures),
          totalRecords: Number(row.totalRecords),
          totalDataSize: Number(row.totalDataSize),
        }));

        // Format activity data for the chart
        const activityData = Array.from({ length: daysBack }, (_, i) => {
          const currentDate = new Date();
          currentDate.setDate(currentDate.getDate() - (daysBack - 1 - i));

          const dateString = currentDate.toLocaleDateString('en-CA', {
            timeZone: 'America/New_York',
          });

          const dataPoint = apiActivity.find(d => d._id === dateString);

          return {
            time: currentDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: 'America/New_York',
            }),
            calls: dataPoint ? dataPoint.calls : 0,
            failures: dataPoint ? dataPoint.failures || 0 : 0,
            totalRecords: dataPoint ? dataPoint.totalRecords || 0 : 0,
            totalDataSize: dataPoint ? dataPoint.totalDataSize || 0 : 0,
          };
        });

        // Compute totals
        const totals = activityData.reduce(
          (acc, d) => {
            acc.totalCalls += d.calls || 0;
            acc.totalFailures += d.failures || 0;
            acc.totalRecords += d.totalRecords || 0;
            acc.totalDataSize += d.totalDataSize || 0;
            return acc;
          },
          { totalCalls: 0, totalFailures: 0, totalRecords: 0, totalDataSize: 0 }
        );

        return {
          services,
          activeUsers: users,
          roles,
          applications,
          apiCalls: apiCallsToday,
          activityData,
          totals,
        };
      });
    },

    activityStatistics: async (
      _,
      { timeframe = '24h', onlyImportant = false },
      { user: currentUser }
    ) => {
      if (!currentUser?.organizationId) {
        throw new ForbiddenError('Organization access required');
      }

      const shouldFilterImportant = onlyImportant === true;

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
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
          endpointType: 'public', // Only public customer-facing API calls
          ...(shouldFilterImportant && { importance: { in: ['critical', 'high'] } }),
        };

        // Get activity summary using Prisma aggregations
        const [totalRequests, successfulRequests, avgResponseTime] = await Promise.all([
          tx.apiActivityLog.count({ where: baseWhere }),
          tx.apiActivityLog.count({
            where: { ...baseWhere, statusCode: { lt: 400 } },
          }),
          tx.apiActivityLog.aggregate({
            where: baseWhere,
            _avg: { responseTime: true },
          }),
        ]);

        const summary = {
          totalRequests,
          successfulRequests,
          failedRequests: totalRequests - successfulRequests,
          averageResponseTime: Math.round(avgResponseTime._avg?.responseTime || 0),
          totalDataTransferred: 0, // Not easily calculable with current schema
        };

        // Get error breakdown
        const errorLogs = await tx.apiActivityLog.groupBy({
          by: ['statusCode'],
          where: { ...baseWhere, statusCode: { gte: 400 } },
          _count: { statusCode: true },
        });

        const errorBreakdown = errorLogs.map(error => ({
          statusCode: error.statusCode,
          count: error._count.statusCode,
          percentage: totalRequests > 0 ? (error._count.statusCode / totalRequests) * 100 : 0,
        }));

        // Get top endpoints
        const topEndpointLogs = await tx.apiActivityLog.groupBy({
          by: ['endpoint'],
          where: baseWhere,
          _count: { endpoint: true },
          _avg: { responseTime: true },
          orderBy: { _count: { endpoint: 'desc' } },
          take: 10,
        });

        const topEndpoints = topEndpointLogs.map(endpoint => ({
          endpoint: endpoint.endpoint || 'Unknown',
          count: endpoint._count.endpoint,
          averageResponseTime: Math.round(endpoint._avg.responseTime || 0),
        }));

        // Get user activity
        const userActivityLogs = await tx.apiActivityLog.groupBy({
          by: ['userId'],
          where: { ...baseWhere, userId: { not: null } },
          _count: { userId: true },
        });

        const userActivity = await Promise.all(
          userActivityLogs.slice(0, 10).map(async activity => {
            const user = await tx.user.findUnique({
              where: { id: activity.userId },
              select: { id: true, email: true },
            });

            const successfulCount = await tx.apiActivityLog.count({
              where: {
                ...baseWhere,
                userId: activity.userId,
                statusCode: { lt: 400 },
              },
            });

            return {
              userId: activity.userId,
              userEmail: user?.email || 'Unknown User',
              requestCount: activity._count.userId,
              successRate:
                activity._count.userId > 0 ? (successfulCount / activity._count.userId) * 100 : 0,
            };
          })
        );

        return {
          summary,
          errorBreakdown,
          topEndpoints,
          userActivity,
          timeframe,
        };
      });
    },
  },
};

module.exports = dashboardResolvers;
