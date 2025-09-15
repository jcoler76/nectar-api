const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { PrismaClient } = require('../../prisma/generated/client');
const { authenticateApiKey, requirePermissions, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Report usage data from customer application
 * POST /api/usage/report
 */
router.post('/report',
  optionalAuth, // Allow both authenticated and license-key based reporting
  [
    body('licenseKey').isString().notEmpty().withMessage('License key is required'),
    body('usage').isObject().notEmpty().withMessage('Usage data is required'),
    body('usage.activeUsers').optional().isInt({ min: 0 }).withMessage('Active users must be a non-negative integer'),
    body('usage.workflowRuns').optional().isInt({ min: 0 }).withMessage('Workflow runs must be a non-negative integer'),
    body('usage.apiCalls').optional().isInt({ min: 0 }).withMessage('API calls must be a non-negative integer'),
    body('usage.storageUsed').optional().isInt({ min: 0 }).withMessage('Storage used must be a non-negative integer'),
    body('usage.integrationsUsed').optional().isInt({ min: 0 }).withMessage('Integrations used must be a non-negative integer'),
    body('usage.dataProcessed').optional().isInt({ min: 0 }).withMessage('Data processed must be a non-negative integer'),
    body('reportDate').optional().isISO8601().withMessage('Report date must be a valid ISO date')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { licenseKey, usage, reportDate } = req.body;

      // Find the license
      const license = await prisma.license.findUnique({
        where: { licenseKey },
        include: { customer: true }
      });

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found'
        });
      }

      if (!license.isActive || license.isSuspended) {
        return res.status(403).json({
          success: false,
          error: 'License is not active'
        });
      }

      const recordDate = reportDate ? new Date(reportDate) : new Date();

      // Create or update usage record for the date
      const usageRecord = await prisma.usageRecord.upsert({
        where: {
          licenseId_recordDate: {
            licenseId: license.id,
            recordDate
          }
        },
        update: {
          activeUsers: usage.activeUsers || 0,
          workflowRuns: usage.workflowRuns || 0,
          apiCalls: usage.apiCalls || 0,
          storageUsed: BigInt(usage.storageUsed || 0),
          integrationsUsed: usage.integrationsUsed || 0,
          dataProcessed: BigInt(usage.dataProcessed || 0)
        },
        create: {
          customerId: license.customerId,
          licenseId: license.id,
          recordDate,
          activeUsers: usage.activeUsers || 0,
          workflowRuns: usage.workflowRuns || 0,
          apiCalls: usage.apiCalls || 0,
          storageUsed: BigInt(usage.storageUsed || 0),
          integrationsUsed: usage.integrationsUsed || 0,
          dataProcessed: BigInt(usage.dataProcessed || 0)
        }
      });

      // Update license heartbeat
      await prisma.license.update({
        where: { id: license.id },
        data: { lastHeartbeat: new Date() }
      });

      // Log the usage report
      await prisma.auditLog.create({
        data: {
          customerId: license.customerId,
          licenseId: license.id,
          event: 'USAGE_RECORDED',
          description: 'Usage data reported from customer application',
          actorType: 'CUSTOMER',
          metadata: {
            reportDate: recordDate.toISOString(),
            usage
          }
        }
      });

      res.json({
        success: true,
        message: 'Usage data recorded successfully',
        recordId: usageRecord.id,
        recordDate: usageRecord.recordDate,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Usage reporting error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record usage data',
        message: error.message
      });
    }
  }
);

/**
 * Get usage statistics for a license
 * GET /api/usage/license/:licenseId
 */
router.get('/license/:licenseId',
  authenticateApiKey,
  requirePermissions(['usage:read']),
  [
    param('licenseId').isString().notEmpty().withMessage('License ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { licenseId } = req.params;
      const {
        startDate,
        endDate,
        granularity = 'daily'
      } = req.query;

      // Set default date range (last 30 days)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get license info
      const license = await prisma.license.findUnique({
        where: { id: licenseId },
        include: { customer: true }
      });

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found'
        });
      }

      // Get usage records
      const usageRecords = await prisma.usageRecord.findMany({
        where: {
          licenseId,
          recordDate: {
            gte: start,
            lte: end
          }
        },
        orderBy: { recordDate: 'asc' }
      });

      // Calculate aggregated statistics
      const totals = await prisma.usageRecord.aggregate({
        where: {
          licenseId,
          recordDate: {
            gte: start,
            lte: end
          }
        },
        _sum: {
          activeUsers: true,
          workflowRuns: true,
          apiCalls: true,
          storageUsed: true,
          integrationsUsed: true,
          dataProcessed: true
        },
        _avg: {
          activeUsers: true,
          workflowRuns: true,
          apiCalls: true,
          storageUsed: true,
          integrationsUsed: true,
          dataProcessed: true
        },
        _max: {
          activeUsers: true,
          workflowRuns: true,
          apiCalls: true,
          storageUsed: true,
          integrationsUsed: true,
          dataProcessed: true
        }
      });

      // Check against license limits
      const limitStatus = {
        users: {
          current: totals._max.activeUsers || 0,
          limit: license.maxUsers,
          unlimited: license.maxUsers === null,
          withinLimit: license.maxUsers === null || (totals._max.activeUsers || 0) <= license.maxUsers
        },
        workflows: {
          current: totals._sum.workflowRuns || 0,
          limit: license.maxWorkflows,
          unlimited: license.maxWorkflows === null,
          withinLimit: license.maxWorkflows === null || (totals._sum.workflowRuns || 0) <= license.maxWorkflows
        },
        integrations: {
          current: totals._max.integrationsUsed || 0,
          limit: license.maxIntegrations,
          unlimited: license.maxIntegrations === null,
          withinLimit: license.maxIntegrations === null || (totals._max.integrationsUsed || 0) <= license.maxIntegrations
        }
      };

      res.json({
        success: true,
        license: {
          id: license.id,
          plan: license.plan,
          licenseType: license.licenseType,
          customer: license.customer
        },
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          granularity
        },
        usage: {
          records: usageRecords.map(record => ({
            ...record,
            storageUsed: record.storageUsed.toString(),
            dataProcessed: record.dataProcessed.toString()
          })),
          totals: {
            ...totals._sum,
            storageUsed: totals._sum.storageUsed?.toString(),
            dataProcessed: totals._sum.dataProcessed?.toString()
          },
          averages: {
            ...totals._avg,
            storageUsed: totals._avg.storageUsed?.toString(),
            dataProcessed: totals._avg.dataProcessed?.toString()
          },
          peaks: {
            ...totals._max,
            storageUsed: totals._max.storageUsed?.toString(),
            dataProcessed: totals._max.dataProcessed?.toString()
          }
        },
        limits: limitStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Usage retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage data',
        message: error.message
      });
    }
  }
);

/**
 * Get usage statistics for a customer (all licenses)
 * GET /api/usage/customer/:customerId
 */
router.get('/customer/:customerId',
  authenticateApiKey,
  requirePermissions(['usage:read']),
  [
    param('customerId').isString().notEmpty().withMessage('Customer ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { customerId } = req.params;
      const { startDate, endDate } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get customer info
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          licenses: {
            include: {
              usageRecords: {
                where: {
                  recordDate: {
                    gte: start,
                    lte: end
                  }
                },
                orderBy: { recordDate: 'desc' }
              }
            }
          }
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      // Aggregate usage across all licenses
      const aggregatedUsage = customer.licenses.reduce((acc, license) => {
        license.usageRecords.forEach(record => {
          const dateKey = record.recordDate.toISOString().split('T')[0];

          if (!acc[dateKey]) {
            acc[dateKey] = {
              date: record.recordDate,
              activeUsers: 0,
              workflowRuns: 0,
              apiCalls: 0,
              storageUsed: BigInt(0),
              integrationsUsed: 0,
              dataProcessed: BigInt(0),
              licenses: []
            };
          }

          acc[dateKey].activeUsers += record.activeUsers;
          acc[dateKey].workflowRuns += record.workflowRuns;
          acc[dateKey].apiCalls += record.apiCalls;
          acc[dateKey].storageUsed += record.storageUsed;
          acc[dateKey].integrationsUsed += record.integrationsUsed;
          acc[dateKey].dataProcessed += record.dataProcessed;
          acc[dateKey].licenses.push(license.id);
        });

        return acc;
      }, {});

      const usageByDate = Object.values(aggregatedUsage).map(record => ({
        ...record,
        storageUsed: record.storageUsed.toString(),
        dataProcessed: record.dataProcessed.toString(),
        licenses: [...new Set(record.licenses)] // Remove duplicates
      }));

      res.json({
        success: true,
        customer: {
          id: customer.id,
          email: customer.email,
          companyName: customer.companyName
        },
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        licenses: customer.licenses.map(license => ({
          id: license.id,
          plan: license.plan,
          licenseType: license.licenseType,
          isActive: license.isActive,
          isSuspended: license.isSuspended
        })),
        usage: usageByDate.sort((a, b) => new Date(a.date) - new Date(b.date)),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Customer usage retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve customer usage data',
        message: error.message
      });
    }
  }
);

module.exports = router;