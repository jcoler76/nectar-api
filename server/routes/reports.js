const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../prisma/generated/client');
const { logger } = require('../middleware/logger');

const prisma = new PrismaClient();

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

    // Build Prisma where clause
    const where = {
      timestamp: {
        gte: startDateTime,
        lte: endDateTime,
      },
    };

    // Add filters based on relationships
    if (service) {
      where.endpointUsage = {
        service: {
          id: service,
        },
      };
    }

    if (component) {
      where.endpoint = {
        contains: component,
        mode: 'insensitive',
      };
    }

    // Get API usage data
    const apiLogs = await prisma.apiActivityLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    let usageData = [];

    if (showDetails === 'true') {
      // Detailed view - return individual records

      usageData = apiLogs.map(log => {
        // Extract service name from URL pattern
        let serviceName = 'Internal API';

        // Check if this is a public API procedure call
        const procMatch = log.url?.match(/\/api\/v[0-9]+\/([^\/]+)\/_proc\/([^\/\?]+)/);
        if (procMatch) {
          serviceName = procMatch[1]; // Service name from URL
        } else if (log.url?.includes('/api/')) {
          // For other API calls, classify as Internal API
          serviceName = 'Internal API';
        }

        return {
          serviceName,
          roleName: 'N/A', // Role info not directly available in current schema
          applicationName: 'N/A', // Application info not directly available
          component: log.endpoint || 'Unknown Component',
          method: log.method,
          timestamp: log.timestamp,
          requestSize: 0, // Not tracked in current schema
          responseSize: 0, // Not tracked in current schema
          url: log.url,
          statusCode: log.statusCode,
          responseTime: log.responseTime,
          userEmail: log.user?.email || 'Unknown User',
        };
      });
    } else {
      // Summary view - group and count

      const groupedData = {};

      apiLogs.forEach(log => {
        // Extract service name from URL pattern
        let serviceName = 'Internal API';

        // Check if this is a public API procedure call
        const procMatch = log.url?.match(/\/api\/v[0-9]+\/([^\/]+)\/_proc\/([^\/\?]+)/);
        if (procMatch) {
          serviceName = procMatch[1]; // Service name from URL
        } else if (log.url?.includes('/api/')) {
          // For other API calls, classify as Internal API
          serviceName = 'Internal API';
        }
        const component = log.endpoint || 'Unknown Component';
        const method = log.method;
        const key = `${serviceName}|${component}|${method}`;

        if (!groupedData[key]) {
          groupedData[key] = {
            serviceName,
            component,
            roleName: 'N/A',
            applicationName: 'N/A',
            method,
            count: 0,
          };
        }
        groupedData[key].count++;
      });

      usageData = Object.values(groupedData).sort((a, b) => {
        if (a.serviceName !== b.serviceName) return a.serviceName.localeCompare(b.serviceName);
        if (a.component !== b.component) return a.component.localeCompare(b.component);
        return b.count - a.count;
      });
    }

    logger.info('API Usage Report Response:', {
      recordCount: usageData.length,
      sampleRecord: usageData[0],
    });

    res.json(usageData);
  } catch (error) {
    logger.error('Error fetching API usage:', { error: error.message });
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch API usage data',
      },
    });
  }
});

// Get unique components
router.get('/components', async (req, res) => {
  try {
    const { service, role, application } = req.query;

    // Since the component field doesn't exist in the current Prisma schema,
    // we'll return distinct endpoints instead as a reasonable substitute
    const where = {};

    // Add filters based on relationships if provided
    if (service || role || application) {
      // For now, return empty array until proper component tracking is implemented
      // TODO: Implement component field in ApiActivityLog schema if needed
      res.json([]);
      return;
    }

    // Get distinct endpoints from ApiActivityLog as a substitute for components
    const components = await prisma.apiActivityLog.findMany({
      select: {
        endpoint: true,
      },
      distinct: ['endpoint'],
      where: {
        endpoint: {
          not: null,
        },
      },
      orderBy: {
        endpoint: 'asc',
      },
    });

    // Extract just the endpoint values
    const componentList = components.map(item => item.endpoint).filter(Boolean);
    res.json(componentList);
  } catch (error) {
    logger.error('Error fetching components:', { error: error.message });
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch components',
      },
    });
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

    // Build Prisma where clause
    const where = {
      startedAt: {
        gte: dateRange.$gte,
        lte: dateRange.$lte,
      },
    };

    if (workflowId && workflowId !== 'all') {
      where.workflowId = workflowId;
    }
    if (status && status !== 'all') {
      // Map status values to Prisma enum if needed
      const statusMap = {
        succeeded: 'COMPLETED',
        failed: 'FAILED',
        running: 'RUNNING',
      };
      where.status = statusMap[status] || status.toUpperCase();
    }

    // Query workflow executions with workflow information
    const executions = await prisma.workflowExecution.findMany({
      where,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 1000, // Limit results for performance
    });

    // Transform data to match expected format
    const results = executions.map(execution => {
      const duration =
        execution.completedAt && execution.startedAt
          ? execution.completedAt.getTime() - execution.startedAt.getTime()
          : null;

      const baseResult = {
        _id: execution.id, // Keep _id for frontend compatibility
        id: execution.id,
        workflowName: execution.workflow?.name || 'Unknown Workflow',
        status: execution.status.toLowerCase(), // Convert back to lowercase for frontend
        startedAt: execution.startedAt,
        finishedAt: execution.completedAt,
        duration,
      };

      // Include details if requested
      if (showDetails === 'true') {
        baseResult.trigger = execution.logs?.trigger || null;
        baseResult.steps = execution.logs?.results || null;
      }

      return baseResult;
    });

    res.json(results);
  } catch (error) {
    logger.error('Error fetching workflow execution report:', { error: error.message });
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch workflow execution data',
      },
    });
  }
});

module.exports = router;
