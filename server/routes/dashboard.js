const express = require('express');
const router = express.Router();
// MongoDB models replaced with Prisma for PostgreSQL migration
// const Service = require('../models/Service');
// const User = require('../models/User');
// const Role = require('../models/Role');
// const Application = require('../models/Application');
// const ApiActivityLog = require('../models/ApiActivityLog');

const prismaService = require('../services/prismaService');
const { logger } = require('../utils/logger');
const { toEasternTimeStart, createEasternTimeGrouping } = require('../utils/dateUtils');
const errorResponses = require('../utils/errorHandler');

// DEPRECATED: Use GraphQL dashboardMetrics query instead
// This endpoint is kept for backward compatibility but should be migrated to GraphQL
router.get('/metrics', async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;

    const fs = require('fs');
    const debugInfo = {
      timestamp: new Date().toISOString(),
      user: req.user,
      organizationId,
      hasUser: !!req.user,
      hasOrgId: !!organizationId,
    };
    fs.appendFileSync(
      'C:\\Users\\jcoler\\nectar-api\\debug-dashboard.log',
      JSON.stringify(debugInfo, null, 2) + '\n---\n'
    );

    console.log('===== DASHBOARD METRICS DEBUG =====');
    console.log('req.user:', JSON.stringify(req.user, null, 2));
    console.log('organizationId:', organizationId);
    console.log('===================================');

    logger.info('Dashboard metrics request', {
      userId: req.user?.userId,
      email: req.user?.email,
      organizationId,
      organizationIdType: typeof organizationId,
      sessionAuth: req.user?.sessionAuth,
      fullUser: JSON.stringify(req.user),
    });

    if (!organizationId) {
      logger.error('No organizationId found in request', {
        user: req.user,
        session: req.session?.user,
      });
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Get counts with explicit organizationId filter
    const prisma = prismaService.getClient();

    logger.info('Querying counts with organizationId:', organizationId);

    const [services, users, roles, applications] = await Promise.all([
      prisma.service.count({ where: { organizationId, isActive: true } }).catch(e => {
        logger.error('Service count error:', e);
        return 0;
      }),
      prisma.user
        .count({
          where: {
            memberships: {
              some: { organizationId },
            },
            isActive: true,
          },
        })
        .catch(e => {
          logger.error('User count error:', e);
          return 0;
        }),
      prisma.role.count({ where: { organizationId } }).catch(e => {
        logger.error('Role count error:', e);
        return 0;
      }),
      prisma.application.count({ where: { organizationId, isActive: true } }).catch(e => {
        logger.error('Application count error:', e);
        return 0;
      }),
    ]);

    logger.info('Counts retrieved', { services, users, roles, applications });

    // Get today's API calls count (using Eastern Time) - only important ones
    const todayStart = toEasternTimeStart(new Date());

    let apiCallsToday = 0;
    try {
      if (prisma.apiActivityLog?.count) {
        apiCallsToday = await prisma.apiActivityLog.count({
          where: {
            timestamp: { gte: todayStart },
            category: { in: ['api', 'workflow'] },
            endpointType: 'public', // Only public customer-facing API calls
            importance: { in: ['critical', 'high'] },
            organizationId,
          },
        });
      }
    } catch (_) {
      apiCallsToday = 0;
    }

    // Get API activity data for the last N days (using Eastern Time) and totals
    const requestedDays = parseInt(req.query.days, 10);
    const daysBack = Number.isFinite(requestedDays) ? Math.min(90, Math.max(7, requestedDays)) : 30;

    // Calculate start date using proper EST handling
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startUTC = toEasternTimeStart(startDate);

    // Get API activity using Prisma raw query for grouping by date
    let apiActivityRaw = [];
    try {
      apiActivityRaw = await prisma.$queryRaw`
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
          AND "organizationId" = ${organizationId}
        GROUP BY DATE(timestamp AT TIME ZONE 'America/New_York')
        ORDER BY date ASC
      `;
    } catch (_) {
      apiActivityRaw = [];
    }

    const apiActivity = apiActivityRaw.map(row => ({
      _id: row.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      calls: Number(row.calls),
      failures: Number(row.failures),
      totalRecords: Number(row.totalRecords),
      totalDataSize: Number(row.totalDataSize),
    }));

    console.log('🔍 DEBUG: Raw API Activity Data:', apiActivityRaw);
    console.log('🔍 DEBUG: Processed API Activity Data:', apiActivity);

    // Format activity data for the chart (using Eastern Time)
    const activityData = Array.from({ length: daysBack }, (_, i) => {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - (daysBack - 1 - i));

      // Use Eastern Time date string to match aggregation results
      const dateString = currentDate.toLocaleDateString('en-CA', {
        timeZone: 'America/New_York',
      }); // YYYY-MM-DD format in Eastern Time

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

    // Compute high-level totals across the window
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

    const responseData = {
      services,
      activeUsers: users,
      roles,
      applications,
      apiCalls: apiCallsToday,
      activityData,
      totals,
    };

    console.log(
      '🔍 DEBUG: Dashboard Response (Activity Data):',
      JSON.stringify(activityData, null, 2)
    );
    console.log('🔍 DEBUG: Dashboard Response (Totals):', totals);

    res.json(responseData);
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

module.exports = router;
