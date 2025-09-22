import { Request, Response } from 'express'
import { body, query, validationResult } from 'express-validator'
import { StripeService } from '@/services/stripeService'
import { prisma } from '@/utils/database'
import { AdminAuditLogger } from '@/services/auditService'
import { AuthRequest } from '@/types/auth'

export class BillingController {
  /**
   * Get all subscriptions with pagination and filtering
   */
  static async getSubscriptions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() })
        return
      }

      const { 
        page = '1', 
        limit = '20', 
        status, 
        plan,
        search 
      } = req.query as any

      const where: any = {}
      
      if (status) where.status = status
      if (plan) where.plan = plan
      if (search) {
        where.organization = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            { billingEmail: { contains: search, mode: 'insensitive' } }
          ]
        }
      }

      const [subscriptions, total] = await Promise.all([
        prisma.subscription.findMany({
          where,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                billingEmail: true,
                stripeCustomerId: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit)
        }),
        prisma.subscription.count({ where })
      ])

      res.json({
        success: true,
        data: subscriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      })
    } catch (error) {
      console.error('Get subscriptions error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get subscription details by ID
   */
  static async getSubscriptionById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          organization: true,
          billingEvents: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })

      if (!subscription) {
        res.status(404).json({ error: 'Subscription not found' })
        return
      }

      res.json({
        success: true,
        data: subscription
      })
    } catch (error) {
      console.error('Get subscription error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Update subscription (cancel, pause, etc.)
   */
  static async updateSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() })
        return
      }

      const { id } = req.params
      const { action, reason } = req.body as any

      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: { organization: true }
      })

      if (!subscription) {
        res.status(404).json({ error: 'Subscription not found' })
        return
      }

      let result
      switch (action) {
        case 'cancel':
          result = await this.cancelSubscription(subscription, reason)
          break
        case 'pause':
          result = await this.pauseSubscription(subscription)
          break
        case 'resume':
          result = await this.resumeSubscription(subscription)
          break
        default:
          res.status(400).json({ error: 'Invalid action' })
          return
      }

      // Log admin action
      await AdminAuditLogger.log({
        userId: req.admin!.id,
        action: `subscription_${action}`,
        resource: subscription.id,
        resourceType: 'subscription',
        details: { 
          organizationId: subscription.organizationId,
          organizationName: subscription.organization.name,
          reason 
        },
        ipAddress: (req as any).ip || 'unknown',
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        message: `Subscription ${action}ed successfully`,
        data: result
      })
    } catch (error) {
      console.error('Update subscription error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get billing events for an organization
   */
  static async getBillingEvents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params
      const { page = '1', limit = '50' } = req.query as any

      const [events, total] = await Promise.all([
        prisma.billingEvent.findMany({
          where: { organizationId },
          include: {
            subscription: {
              select: { id: true, plan: true, status: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit)
        }),
        prisma.billingEvent.count({ where: { organizationId } })
      ])

      res.json({
        success: true,
        data: events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      })
    } catch (error) {
      console.error('Get billing events error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get upcoming renewals
   */
  static async getUpcomingRenewals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { days = '30' } = req.query as any

      const renewals = await StripeService.getUpcomingRenewals(parseInt(days))

      res.json({
        success: true,
        data: renewals,
        summary: {
          total: renewals.length,
          totalRevenue: renewals.reduce((sum: number, sub: any) => {
            return sum + (sub.monthlyRevenue ? Number(sub.monthlyRevenue) : 0)
          }, 0)
        }
      })
    } catch (error) {
      console.error('Get upcoming renewals error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Get billing analytics/metrics
   */
  static async getBillingMetrics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Get all billing events and categorize them properly
      const [
        successfulPayments,
        failedPayments,
        refunds,
        last7DaysEvents,
        pendingInvoices,
        allPaymentEvents
      ] = await Promise.all([
        // Successful payments (daily, monthly, yearly)
        prisma.billingEvent.findMany({
          where: {
            eventType: { in: ['invoice_paid', 'payment_succeeded', 'subscription_created'] },
            amount: { gt: 0 }
          },
          select: {
            createdAt: true,
            amount: true,
            eventType: true,
            metadata: true
          }
        }),
        // Failed payments
        prisma.billingEvent.findMany({
          where: {
            eventType: { in: ['payment_failed', 'invoice_payment_failed'] }
          },
          include: {
            organization: {
              select: {
                name: true,
                billingEmail: true
              }
            }
          }
        }),
        // Refunds
        prisma.billingEvent.findMany({
          where: {
            eventType: { in: ['charge_refunded', 'refund_created'] }
          },
          select: {
            amount: true,
            createdAt: true
          }
        }),
        // Last 7 days events for chart
        prisma.billingEvent.findMany({
          where: {
            createdAt: { gte: last7Days },
            eventType: { in: ['invoice_paid', 'payment_succeeded', 'subscription_created'] },
            amount: { gt: 0 }
          },
          select: {
            createdAt: true,
            amount: true,
            eventType: true
          },
          orderBy: { createdAt: 'asc' }
        }),
        // Pending/unpaid invoices
        prisma.invoice.findMany({
          where: {
            status: { in: ['OPEN', 'PENDING'] }
          },
          select: {
            amount: true,
            dueDate: true
          }
        }),
        // All payment events for calculations
        prisma.billingEvent.findMany({
          where: {
            eventType: { in: ['invoice_paid', 'payment_succeeded', 'payment_failed', 'invoice_payment_failed'] }
          },
          select: {
            eventType: true,
            amount: true,
            createdAt: true
          }
        })
      ])

      // Calculate revenue by time period
      const dailyRevenue = successfulPayments
        .filter(event => event.createdAt >= startOfDay)
        .reduce((sum, event) => sum + Number(event.amount || 0), 0)

      const monthlyRevenue = successfulPayments
        .filter(event => event.createdAt >= startOfMonth)
        .reduce((sum, event) => sum + Number(event.amount || 0), 0)

      const yearlyRevenue = successfulPayments
        .filter(event => event.createdAt >= startOfYear)
        .reduce((sum, event) => sum + Number(event.amount || 0), 0)

      // Calculate payment success rate
      const totalPaymentAttempts = allPaymentEvents.length
      const successfulPaymentAttempts = allPaymentEvents.filter(event =>
        ['invoice_paid', 'payment_succeeded'].includes(event.eventType)
      ).length
      const paymentSuccessRate = totalPaymentAttempts > 0
        ? Math.round((successfulPaymentAttempts / totalPaymentAttempts) * 100)
        : 0

      // Calculate total refunds
      const totalRefunds = refunds.reduce((sum, refund) => sum + Number(refund.amount || 0), 0)

      // Calculate average transaction value
      const averageTransactionValue = successfulPayments.length > 0
        ? successfulPayments.reduce((sum, event) => sum + Number(event.amount || 0), 0) / successfulPayments.length
        : 0

      // Calculate pending payments
      const pendingPayments = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)

      // Build metrics object
      const metrics = {
        dailyRevenue,
        monthlyRevenue,
        yearlyRevenue,
        paymentSuccessRate,
        failedPayments: failedPayments.length,
        totalRefunds,
        averageTransactionValue,
        pendingPayments
      }

      // Group last 7 days events by date for chart data
      const eventsByDate: Record<string, { revenue: number; transactions: number }> = {}
      last7DaysEvents.forEach(event => {
        const dateKey = event.createdAt.toISOString().slice(0, 10)
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = { revenue: 0, transactions: 0 }
        }
        eventsByDate[dateKey].revenue += Number(event.amount || 0)
        eventsByDate[dateKey].transactions += 1
      })

      // Create array for last 7 days
      const revenueData = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().slice(0, 10)
        revenueData.push({
          date: dateKey,
          revenue: eventsByDate[dateKey]?.revenue || 0,
          transactions: eventsByDate[dateKey]?.transactions || 0
        })
      }

      // Build failed payments list with proper structure
      const failedPaymentsList = failedPayments.map(payment => ({
        id: payment.id,
        customerName: payment.organization?.name || 'Unknown',
        customerEmail: payment.organization?.billingEmail || 'Unknown',
        amount: Number(payment.amount || 0),
        reason: (payment.metadata as any)?.failure_reason || 'Unknown reason',
        attemptDate: payment.createdAt.toISOString(),
        nextRetry: new Date(payment.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Failed' as const
      }))

      // Get payment method distribution from metadata
      const paymentMethods: Record<string, { count: number; revenue: number }> = {}
      successfulPayments.forEach(payment => {
        const method = (payment.metadata as any)?.payment_method_type || 'card'
        if (!paymentMethods[method]) {
          paymentMethods[method] = { count: 0, revenue: 0 }
        }
        paymentMethods[method].count += 1
        paymentMethods[method].revenue += Number(payment.amount || 0)
      })

      const paymentMethodsList = Object.entries(paymentMethods).map(([method, data]) => ({
        method: method.charAt(0).toUpperCase() + method.slice(1),
        count: data.count,
        revenue: data.revenue
      }))

      // Get geographic revenue from organization data (simplified)
      const geoRevenue = await prisma.organization.groupBy({
        by: ['country'],
        where: {
          country: { not: null },
          subscription: {
            status: 'ACTIVE'
          }
        },
        _count: {
          id: true
        }
      })

      const geoRevenueList = geoRevenue.map(geo => ({
        country: geo.country || 'Unknown',
        revenue: 0, // TODO: Calculate revenue from subscription data
        transactions: geo._count?.id || 0
      }))

      res.json({
        success: true,
        data: {
          metrics,
          revenueData,
          paymentMethods: paymentMethodsList,
          failedPayments: failedPaymentsList,
          geoRevenue: geoRevenueList
        }
      })
    } catch (error) {
      console.error('Get billing metrics error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Cancel subscription
   */
  private static async cancelSubscription(subscription: any, reason?: string) {
    const stripe = await StripeService.getStripeClient()
    
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
        metadata: { cancellation_reason: reason || 'Admin cancellation' }
      })
    }

    return prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        cancelAtPeriodEnd: true,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Pause subscription
   */
  private static async pauseSubscription(subscription: any) {
    const stripe = await StripeService.getStripeClient()
    
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        pause_collection: { behavior: 'mark_uncollectible' }
      })
    }

    return prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        status: 'UNPAID',
        updatedAt: new Date()
      }
    })
  }

  /**
   * Resume subscription
   */
  private static async resumeSubscription(subscription: any) {
    const stripe = await StripeService.getStripeClient()
    
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        pause_collection: ''
      })
    }

    return prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    })
  }

  /**
   * Validation rules
   */
  static getSubscriptionsValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE']),
    query('plan').optional().isIn(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'])
  ]

  static updateSubscriptionValidation = [
    body('action').isIn(['cancel', 'pause', 'resume']).withMessage('Invalid action'),
    body('reason').optional().isString().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
  ]
}