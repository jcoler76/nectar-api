const express = require('express');
const router = express.Router();
// MongoDB models replaced with Prisma for PostgreSQL migration
// const Service = require('../models/Service');
// const User = require('../models/User');
// const Role = require('../models/Role');
// const Application = require('../models/Application');
// const ApiActivityLog = require('../models/ApiActivityLog');

const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();
const { logger } = require('../utils/logger');
const { toEasternTimeStart, createEasternTimeGrouping } = require('../utils/dateUtils');
const errorResponses = require('../utils/errorHandler');

router.get('/metrics', async (req, res) => {
  try {
    const safeCount = async (model, args) => {
      try {
        if (!prisma[model] || typeof prisma[model].count !== 'function') return 0;
        return await prisma[model].count(args || {});
      } catch (_) {
        return 0;
      }
    };

    // Get counts using available Prisma models; default to 0 if model doesn't exist
    const [services, users, roles, applications] = await Promise.all([
      safeCount('service', { where: { isActive: true } }),
      safeCount('user', { where: { isActive: true } }),
      safeCount('role'),
      safeCount('application', { where: { isActive: true } }),
    ]);

    // Get today's API calls count (using Eastern Time) - only important ones
    const todayStart = toEasternTimeStart(new Date());

    let apiCallsToday = 0;
    try {
      if (prisma.apiActivityLog?.count) {
        apiCallsToday = await prisma.apiActivityLog.count({
          where: {
            timestamp: { gte: todayStart },
            category: { in: ['api', 'workflow'] },
            endpointType: { in: ['client', 'public'] },
            importance: { in: ['critical', 'high'] },
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
          COUNT(*) as "totalRecords",
          COALESCE(SUM("responseTime"), 0) as "totalDataSize"
        FROM "ApiActivityLog"
        WHERE 
          timestamp >= ${startUTC}::timestamp
          AND category IN ('api', 'workflow')
          AND "endpointType" IN ('client', 'public')
          AND importance IN ('critical', 'high')
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
      totalDataSize: Number(row.totalDataSize)
    }));

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

    res.json({
      services,
      activeUsers: users,
      roles,
      applications,
      apiCalls: apiCallsToday,
      activityData,
      totals,
    });
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

module.exports = router;
