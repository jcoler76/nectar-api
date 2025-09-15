const express = require('express');
const { PrismaClient } = require('../../prisma/generated/client');
const { authenticateApiKey, requirePermissions } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Dashboard statistics
 * GET /api/admin/dashboard
 */
router.get('/dashboard',
  authenticateApiKey,
  requirePermissions(['admin:read']),
  async (req, res) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalCustomers,
        activeCustomers,
        totalLicenses,
        activeLicenses,
        suspendedLicenses,
        recentValidations,
        recentUsage
      ] = await Promise.all([
        prisma.customer.count(),
        prisma.customer.count({ where: { isActive: true } }),
        prisma.license.count(),
        prisma.license.count({ where: { isActive: true, isSuspended: false } }),
        prisma.license.count({ where: { isSuspended: true } }),
        prisma.validationLog.count({
          where: { validatedAt: { gte: thirtyDaysAgo } }
        }),
        prisma.usageRecord.aggregate({
          where: { recordDate: { gte: thirtyDaysAgo } },
          _sum: {
            activeUsers: true,
            workflowRuns: true,
            apiCalls: true
          }
        })
      ]);

      res.json({
        success: true,
        dashboard: {
          customers: {
            total: totalCustomers,
            active: activeCustomers,
            inactive: totalCustomers - activeCustomers
          },
          licenses: {
            total: totalLicenses,
            active: activeLicenses,
            suspended: suspendedLicenses,
            inactive: totalLicenses - activeLicenses - suspendedLicenses
          },
          activity: {
            validationsLast30Days: recentValidations,
            totalUsageLast30Days: {
              activeUsers: recentUsage._sum.activeUsers || 0,
              workflowRuns: recentUsage._sum.workflowRuns || 0,
              apiCalls: recentUsage._sum.apiCalls || 0
            }
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard statistics'
      });
    }
  }
);

/**
 * System health check
 * GET /api/admin/health
 */
router.get('/health',
  authenticateApiKey,
  requirePermissions(['admin:read']),
  async (req, res) => {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      // Check for any critical issues
      const criticalIssues = [];

      // Check for expired licenses that should be renewed
      const expiredLicenses = await prisma.license.count({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true
        }
      });

      if (expiredLicenses > 0) {
        criticalIssues.push(`${expiredLicenses} expired licenses still marked as active`);
      }

      // Check for licenses without recent heartbeats
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const staleDeployments = await prisma.license.count({
        where: {
          isActive: true,
          isSuspended: false,
          lastHeartbeat: { lt: sevenDaysAgo }
        }
      });

      if (staleDeployments > 0) {
        criticalIssues.push(`${staleDeployments} deployments haven't reported heartbeat in 7+ days`);
      }

      res.json({
        success: true,
        health: {
          status: criticalIssues.length === 0 ? 'healthy' : 'warning',
          database: 'connected',
          issues: criticalIssues,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        health: {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

module.exports = router;