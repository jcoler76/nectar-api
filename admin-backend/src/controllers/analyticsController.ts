import { Response } from 'express'
import { query, validationResult } from 'express-validator'
import { AnalyticsService } from '@/services/analyticsService'
import { AdminAuditLogger } from '@/services/auditService'
import { AuthRequest } from '@/types/auth'

export class AnalyticsController {
  /**
   * Get comprehensive revenue dashboard
   */
  static async getRevenueDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() })
        return
      }

      const { period = 'MONTHLY' } = req.query as any

      const dashboard = await AnalyticsService.getRevenueDashboard(period)

      // Log admin action
      await AdminAuditLogger.log({
        adminId: req.admin!.id,
        action: 'view_revenue_dashboard',
        resource: 'analytics',
        resourceType: 'dashboard',
        details: { period },
        ipAddress: (req as any).ip || 'unknown',
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        data: dashboard
      })
    } catch (error) {
      console.error('Get revenue dashboard error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get revenue metrics for specific period
   */
  static async getRevenueMetrics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() })
        return
      }

      const { period = 'MONTHLY', limit = '12' } = req.query as any

      const metrics = await AnalyticsService.getRevenueMetrics(period, parseInt(limit))

      res.json({
        success: true,
        data: metrics,
        summary: {
          totalPeriods: metrics.length,
          latestRevenue: metrics[0]?.totalRevenue || 0,
          period
        }
      })
    } catch (error) {
      console.error('Get revenue metrics error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get churn analysis
   */
  static async getChurnAnalysis(req: AuthRequest, res: Response): Promise<void> {
    try {
      const churnAnalysis = await AnalyticsService.getChurnAnalysis()

      res.json({
        success: true,
        data: churnAnalysis
      })
    } catch (error) {
      console.error('Get churn analysis error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get customer lifetime value analysis
   */
  static async getCustomerLifetimeValue(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clv = await AnalyticsService.getCustomerLifetimeValue()

      res.json({
        success: true,
        data: clv
      })
    } catch (error) {
      console.error('Get CLV analysis error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get executive summary report
   */
  static async getExecutiveSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const summary = await AnalyticsService.generateExecutiveSummary()

      // Log admin action for executive summary access
      await AdminAuditLogger.log({
        adminId: req.admin!.id,
        action: 'view_executive_summary',
        resource: 'analytics',
        resourceType: 'report',
        details: { reportType: 'executive_summary' },
        ipAddress: (req as any).ip || 'unknown',
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        data: summary,
        generated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Get executive summary error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get subscription growth metrics
   */
  static async getSubscriptionGrowth(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() })
        return
      }

      const { period = 'MONTHLY' } = req.query as any

      const growth = await AnalyticsService.getSubscriptionGrowth(period)

      res.json({
        success: true,
        data: growth,
        summary: {
          totalPeriods: growth.length,
          latestNetGrowth: growth[growth.length - 1]?.netGrowth || 0
        }
      })
    } catch (error) {
      console.error('Get subscription growth error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get plan distribution
   */
  static async getPlanDistribution(req: AuthRequest, res: Response): Promise<void> {
    try {
      const distribution = await AnalyticsService.getPlanDistribution()

      res.json({
        success: true,
        data: distribution,
        summary: {
          totalActivePlans: distribution.length,
          totalActiveSubscriptions: distribution.reduce((sum: number, plan: any) => sum + plan.count, 0),
          totalMonthlyRevenue: distribution.reduce((sum: number, plan: any) => sum + plan.revenue, 0)
        }
      })
    } catch (error) {
      console.error('Get plan distribution error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get top customers by revenue
   */
  static async getTopCustomers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit = '10' } = req.query as any

      const topCustomers = await AnalyticsService.getTopCustomersByRevenue(parseInt(limit))

      res.json({
        success: true,
        data: topCustomers,
        summary: {
          totalShown: topCustomers.length,
          totalRevenue: topCustomers.reduce((sum: number, customer: any) => {
            return sum + (customer.monthlyRevenue ? Number(customer.monthlyRevenue) : 0)
          }, 0)
        }
      })
    } catch (error) {
      console.error('Get top customers error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get recent billing activity
   */
  static async getRecentActivity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit = '20' } = req.query as any

      const activity = await AnalyticsService.getRecentBillingActivity(parseInt(limit))

      res.json({
        success: true,
        data: activity,
        summary: {
          totalEvents: activity.length,
          timeRange: activity.length > 0 ? {
            latest: activity[0]?.createdAt,
            oldest: activity[activity.length - 1]?.createdAt
          } : null
        }
      })
    } catch (error) {
      console.error('Get recent activity error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Validation rules
   */
  static getRevenueDashboardValidation = [
    query('period').optional().isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).withMessage('Invalid period')
  ]

  static getRevenueMetricsValidation = [
    query('period').optional().isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).withMessage('Invalid period'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]

  static getSubscriptionGrowthValidation = [
    query('period').optional().isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).withMessage('Invalid period')
  ]

  static getTopCustomersValidation = [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]

  static getRecentActivityValidation = [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]
}