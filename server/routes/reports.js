const express = require('express');
const router = express.Router();
const ApiUsage = require('../models/ApiUsage');
const Service = require('../models/Service');
const Role = require('../models/Role');
const Application = require('../models/Application');
const WorkflowRun = require('../models/WorkflowRun');
// Auth middleware not needed - handled at app level
const mongoose = require('mongoose');
const { logger } = require('../middleware/logger');

// Apply auth middleware to all routes
// Authentication is already handled at app level in server.js

// Get API usage data
router.get('/api-usage', async (req, res) => {
  try {
    const { startDate, endDate, service, role, application, component, showDetails } = req.query;
    logger.info('API Usage Report Request:', {
      startDate,
      endDate,
      service,
      role,
      application,
      component,
      showDetails,
    });

    // Parse dates and handle EST timezone
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    // Handle Eastern Time (EDT/EST) timezone conversion
    // Always convert dates from "local date" to proper Eastern Time range
    const startDateOnly = startDateTime.toISOString().split('T')[0];
    const endDateOnly = endDateTime.toISOString().split('T')[0];

    // Convert start date to beginning of Eastern Time day (4 AM UTC in July for EDT)
    const startBaseDate = new Date(startDateOnly + 'T00:00:00.000Z');
    startDateTime.setTime(startBaseDate.getTime() + 4 * 60 * 60 * 1000); // 4 AM UTC = midnight EDT

    // Convert end date to end of Eastern Time day (3:59:59 AM UTC next day)
    const endBaseDate = new Date(endDateOnly + 'T00:00:00.000Z');
    endDateTime.setTime(endBaseDate.getTime() + 28 * 60 * 60 * 1000 - 1); // Next day 4 AM - 1ms = 11:59:59 PM EDT

    logger.info('Date range filtering:', {
      originalStartDate: startDate,
      originalEndDate: endDate,
      parsedStartDateTime: startDateTime.toISOString(),
      parsedEndDateTime: endDateTime.toISOString(),
    });

    const match = {
      timestamp: {
        $gte: startDateTime,
        $lte: endDateTime,
      },
    };

    if (service) match.service = new mongoose.Types.ObjectId(service);
    if (role) match.role = new mongoose.Types.ObjectId(role);
    if (application) match.application = new mongoose.Types.ObjectId(application);
    if (component) match.component = component;

    let pipeline = [];

    if (showDetails === 'true') {
      // Detailed view
      pipeline = [
        { $match: match },
        {
          $lookup: {
            from: 'services',
            localField: 'service',
            foreignField: '_id',
            as: 'serviceInfo',
          },
        },
        {
          $lookup: {
            from: 'roles',
            localField: 'role',
            foreignField: '_id',
            as: 'roleInfo',
          },
        },
        {
          $lookup: {
            from: 'applications',
            localField: 'application',
            foreignField: '_id',
            as: 'applicationInfo',
          },
        },
        {
          $project: {
            serviceName: { $arrayElemAt: ['$serviceInfo.name', 0] },
            roleName: { $arrayElemAt: ['$roleInfo.name', 0] },
            applicationName: { $arrayElemAt: ['$applicationInfo.name', 0] },
            component: 1,
            method: 1,
            timestamp: 1,
            requestSize: { $ifNull: ['$requestSize', 0] },
            responseSize: { $ifNull: ['$responseSize', 0] },
          },
        },
        {
          $sort: {
            timestamp: -1,
          },
        },
      ];
    } else {
      // Summary view
      pipeline = [
        { $match: match },
        {
          $lookup: {
            from: 'services',
            localField: 'service',
            foreignField: '_id',
            as: 'serviceInfo',
          },
        },
        {
          $lookup: {
            from: 'roles',
            localField: 'role',
            foreignField: '_id',
            as: 'roleInfo',
          },
        },
        {
          $lookup: {
            from: 'applications',
            localField: 'application',
            foreignField: '_id',
            as: 'applicationInfo',
          },
        },
        {
          $group: {
            _id: {
              service: '$service',
              component: '$component',
              role: '$role',
              application: '$application',
              method: '$method',
            },
            count: { $sum: 1 },
            serviceName: { $first: { $arrayElemAt: ['$serviceInfo.name', 0] } },
            roleName: { $first: { $arrayElemAt: ['$roleInfo.name', 0] } },
            applicationName: { $first: { $arrayElemAt: ['$applicationInfo.name', 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            serviceName: 1,
            component: '$_id.component',
            roleName: 1,
            applicationName: 1,
            method: '$_id.method',
            count: 1,
          },
        },
        {
          $sort: {
            serviceName: 1,
            component: 1,
            count: -1,
          },
        },
      ];
    }

    const usageData = await ApiUsage.aggregate(pipeline);
    logger.info('API Usage Report Response:', {
      recordCount: usageData.length,
      sampleRecord: usageData[0],
    });

    res.json(usageData);
  } catch (error) {
    logger.error('Error fetching API usage:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Get unique components
router.get('/components', async (req, res) => {
  try {
    const { service, role, application } = req.query;

    const match = {};
    if (service) match.service = new mongoose.Types.ObjectId(service);
    if (role) match.role = new mongoose.Types.ObjectId(role);
    if (application) match.application = new mongoose.Types.ObjectId(application);

    const components = await ApiUsage.distinct('component', match);
    res.json(components);
  } catch (error) {
    logger.error('Error fetching components:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

router.get('/workflow-executions', async (req, res) => {
  try {
    const { startDate, endDate, workflowId, status, showDetails } = req.query;

    // Import date utilities for proper EST timezone handling
    const { createEasternDateRange } = require('../utils/dateUtils');

    logger.info('Workflow executions report request:', {
      startDate,
      endDate,
      workflowId,
      status,
      showDetails,
    });

    // Create proper EST timezone date range
    const dateRange = createEasternDateRange(startDate, endDate);

    const match = {
      startedAt: dateRange, // Use startedAt field for workflow execution filtering
    };

    if (workflowId) match.workflowId = new mongoose.Types.ObjectId(workflowId);
    if (status) match.status = status;

    let pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'workflows', // The collection name for the Workflow model
          localField: 'workflowId',
          foreignField: '_id',
          as: 'workflowInfo',
        },
      },
      {
        $unwind: '$workflowInfo',
      },
      {
        $addFields: {
          duration: {
            $subtract: ['$finishedAt', '$startedAt'],
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    if (showDetails === 'true') {
      pipeline.push({
        $project: {
          _id: 1,
          workflowName: '$workflowInfo.name',
          status: 1,
          startedAt: 1,
          finishedAt: 1,
          duration: 1,
          trigger: 1,
          steps: 1,
        },
      });
    } else {
      pipeline.push({
        $project: {
          _id: 1,
          workflowName: '$workflowInfo.name',
          status: 1,
          startedAt: 1,
          finishedAt: 1,
          duration: 1,
        },
      });
    }

    const results = await WorkflowRun.aggregate(pipeline);
    res.json(results);
  } catch (error) {
    logger.error('Error fetching workflow execution report:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

module.exports = router;
