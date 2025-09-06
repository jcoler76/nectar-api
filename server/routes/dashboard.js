const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const Role = require('../models/Role');
const Application = require('../models/Application');
const ApiActivityLog = require('../models/ApiActivityLog');
const { logger } = require('../utils/logger');
const { toEasternTimeStart, createEasternTimeGrouping } = require('../utils/dateUtils');
const errorResponses = require('../utils/errorHandler');

router.get('/metrics', async (req, res) => {
  try {
    // Get counts
    const [services, users, roles, applications] = await Promise.all([
      Service.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      Role.countDocuments(),
      Application.countDocuments({ isActive: true }),
    ]);

    // Get today's API calls count (using Eastern Time) - only important ones
    const todayStart = toEasternTimeStart(new Date());

    const apiCallsToday = await ApiActivityLog.countDocuments({
      timestamp: { $gte: todayStart },
      category: { $in: ['api', 'workflow'] },
      endpointType: { $in: ['client', 'public'] },
      importance: { $in: ['critical', 'high'] },
    });

    // Get API activity data for the last N days (using Eastern Time) and totals
    const requestedDays = parseInt(req.query.days, 10);
    const daysBack = Number.isFinite(requestedDays) ? Math.min(90, Math.max(7, requestedDays)) : 30;

    // Calculate start date using proper EST handling
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startUTC = toEasternTimeStart(startDate);

    const apiActivity = await ApiActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startUTC },
          category: { $in: ['api', 'workflow'] },
          endpointType: { $in: ['client', 'public'] },
          importance: { $in: ['critical', 'high'] },
        },
      },
      {
        $group: {
          _id: createEasternTimeGrouping('timestamp'),
          calls: { $sum: 1 },
          failures: { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } },
          totalRecords: { $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] } },
          totalDataSize: {
            $sum: { $add: [{ $ifNull: ['$requestSize', 0] }, { $ifNull: ['$responseSize', 0] }] },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

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
