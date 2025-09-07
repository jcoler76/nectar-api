import Stripe from 'stripe'
import { prisma } from '@/utils/database'

export class StripeService {
  private static stripe: Stripe | null = null

  static async getStripeClient(): Promise<Stripe> {
    if (!this.stripe) {
      const config = await this.getStripeConfig()
      if (!config) {
        throw new Error('Stripe configuration not found')
      }

      const secretKey = process.env.STRIPE_SECRET_KEY
      if (!secretKey) {
        throw new Error('Stripe secret key not configured')
      }

      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-08-27.basil',
        typescript: true,
      })
    }

    return this.stripe
  }

  /**
   * Get Stripe configuration from database
   */
  static async getStripeConfig() {
    return prisma.stripeConfig.findFirst({
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Update Stripe configuration
   */
  static async updateStripeConfig(data: {
    isLive?: boolean
    publishableKey?: string
    webhookSecret?: string
    defaultCurrency?: string
    taxRateId?: string
    updatedBy: string
  }) {
    // Delete existing config and create new one
    await prisma.stripeConfig.deleteMany({})
    
    return prisma.stripeConfig.create({
      data
    })
  }

  /**
   * Create Stripe customer for organization
   */
  static async createCustomer(organizationId: string, data: {
    email: string
    name: string
    metadata?: Record<string, string>
  }) {
    const stripe = await this.getStripeClient()
    
    const customer = await stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        organizationId,
        ...data.metadata
      }
    })

    // Update organization with Stripe customer ID
    await prisma.organization.update({
      where: { id: organizationId },
      data: { 
        stripeCustomerId: customer.id,
        billingEmail: data.email
      }
    })

    return customer
  }

  /**
   * Create subscription for organization
   */
  static async createSubscription(organizationId: string, data: {
    priceId: string
    trialPeriodDays?: number
    metadata?: Record<string, string>
  }) {
    const stripe = await this.getStripeClient()
    
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!organization?.stripeCustomerId) {
      throw new Error('Organization must have a Stripe customer ID')
    }

    const subscription = await stripe.subscriptions.create({
      customer: organization.stripeCustomerId,
      items: [{ price: data.priceId }],
      trial_period_days: data.trialPeriodDays,
      metadata: {
        organizationId,
        ...data.metadata
      }
    })

    // Create subscription record in database
    await this.syncSubscription(subscription)

    return subscription
  }

  /**
   * Sync Stripe subscription with database
   */
  static async syncSubscription(stripeSubscription: Stripe.Subscription) {
    const organizationId = stripeSubscription.metadata.organizationId
    if (!organizationId) {
      throw new Error('Organization ID not found in subscription metadata')
    }

    const subscriptionData = {
      organizationId,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: stripeSubscription.items.data[0]?.price.id,
      plan: this.mapStripePriceToPlan(stripeSubscription.items.data[0]?.price.id || ''),
      status: this.mapStripeStatus(stripeSubscription.status),
      currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
      trialStart: (stripeSubscription as any).trial_start ? new Date((stripeSubscription as any).trial_start * 1000) : null,
      trialEnd: (stripeSubscription as any).trial_end ? new Date((stripeSubscription as any).trial_end * 1000) : null,
      canceledAt: (stripeSubscription as any).canceled_at ? new Date((stripeSubscription as any).canceled_at * 1000) : null,
      cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
    }

    return prisma.subscription.upsert({
      where: { stripeSubscriptionId: stripeSubscription.id },
      update: subscriptionData,
      create: subscriptionData
    })
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.syncSubscription(event.data.object as Stripe.Subscription)
          await this.logBillingEvent(event, 'SUBSCRIPTION_UPDATED')
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
          await this.logBillingEvent(event, 'SUBSCRIPTION_CANCELED')
          break

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice)
          await this.logBillingEvent(event, 'INVOICE_PAYMENT_SUCCEEDED')
          break

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
          await this.logBillingEvent(event, 'INVOICE_PAYMENT_FAILED')
          break

        default:
          console.log(`Unhandled webhook event type: ${event.type}`)
      }
    } catch (error) {
      console.error(`Error handling webhook ${event.type}:`, error)
      throw error
    }
  }

  /**
   * Log billing event
   */
  private static async logBillingEvent(event: Stripe.Event, eventType: string) {
    const organizationId = this.extractOrganizationId(event.data.object)
    if (!organizationId) return

    await prisma.billingEvent.create({
      data: {
        organizationId,
        stripeEventId: event.id,
        eventType: eventType as any,
        amount: this.extractAmount(event.data.object),
        currency: this.extractCurrency(event.data.object),
        description: `Stripe webhook: ${event.type}`,
        metadata: event.data.object as any,
        processedAt: new Date()
      }
    })
  }

  /**
   * Map Stripe price ID to subscription plan
   */
  private static mapStripePriceToPlan(priceId: string): 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM' {
    // This mapping should be configured based on your Stripe price IDs
    const priceMapping: Record<string, any> = {
      'price_starter_monthly': 'STARTER',
      'price_starter_yearly': 'STARTER',
      'price_pro_monthly': 'PROFESSIONAL',
      'price_pro_yearly': 'PROFESSIONAL',
      'price_enterprise_monthly': 'ENTERPRISE',
      'price_enterprise_yearly': 'ENTERPRISE',
    }
    
    return priceMapping[priceId] || 'CUSTOM'
  }

  /**
   * Map Stripe subscription status to our enum
   */
  private static mapStripeStatus(status: Stripe.Subscription.Status): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' {
    const statusMapping: Record<Stripe.Subscription.Status, any> = {
      'trialing': 'TRIALING',
      'active': 'ACTIVE',
      'past_due': 'PAST_DUE',
      'canceled': 'CANCELED',
      'unpaid': 'UNPAID',
      'incomplete': 'INCOMPLETE',
      'incomplete_expired': 'INCOMPLETE_EXPIRED',
      'paused': 'CANCELED'
    }
    
    return statusMapping[status] || 'INCOMPLETE'
  }

  /**
   * Handle subscription cancellation
   */
  private static async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(subscription.canceled_at! * 1000)
      }
    })
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: (invoice as any).subscription }
      })
      
      if (subscription) {
        // Update revenue tracking
        await this.updateRevenueMetrics(subscription.organizationId, invoice.amount_paid / 100)
      }
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    // Handle failed payment logic (send notifications, update subscription status, etc.)
    console.log('Payment failed for invoice:', invoice.id)
  }

  /**
   * Update revenue metrics
   */
  private static async updateRevenueMetrics(organizationId: string, amount: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.revenueMetric.upsert({
      where: {
        date_period: {
          date: today,
          period: 'DAILY'
        }
      },
      update: {
        totalRevenue: { increment: amount },
        newRevenue: { increment: amount }
      },
      create: {
        date: today,
        period: 'DAILY',
        totalRevenue: amount,
        newRevenue: amount,
        churnedRevenue: 0,
        upgradeRevenue: 0,
        downgradeRevenue: 0,
        activeSubscriptions: 0,
        trialSubscriptions: 0,
        churnedSubscriptions: 0,
        newSubscriptions: 1
      }
    })
  }

  /**
   * Extract organization ID from Stripe object
   */
  private static extractOrganizationId(stripeObject: any): string | null {
    return stripeObject.metadata?.organizationId || null
  }

  /**
   * Extract amount from Stripe object
   */
  private static extractAmount(stripeObject: any): number | null {
    if (stripeObject.amount_paid) return stripeObject.amount_paid / 100
    if (stripeObject.amount) return stripeObject.amount / 100
    return null
  }

  /**
   * Extract currency from Stripe object
   */
  private static extractCurrency(stripeObject: any): string | null {
    return stripeObject.currency || null
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' = 'MONTHLY', limit = 12) {
    return prisma.revenueMetric.findMany({
      where: { period },
      orderBy: { date: 'desc' },
      take: limit
    })
  }

  /**
   * Get subscription analytics
   */
  static async getSubscriptionAnalytics() {
    const [total, active, trialing, pastDue, canceled] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'TRIALING' } }),
      prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      prisma.subscription.count({ where: { status: 'CANCELED' } })
    ])

    return {
      total,
      active,
      trialing,
      pastDue,
      canceled,
      healthScore: total > 0 ? (active / total) * 100 : 0
    }
  }

  /**
   * Get upcoming renewals
   */
  static async getUpcomingRenewals(days = 30) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    return prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        currentPeriodEnd: {
          gte: new Date(),
          lte: futureDate
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            billingEmail: true
          }
        }
      },
      orderBy: { currentPeriodEnd: 'asc' }
    })
  }

  /**
   * Calculate churn rate
   */
  static async calculateChurnRate(period = 'MONTHLY') {
    const metrics = await this.getRevenueAnalytics(period as any, 2)
    
    if (metrics.length < 2) return 0

    const current = metrics[0]
    const previous = metrics[1]
    
    if (previous.activeSubscriptions === 0) return 0
    
    const churnRate = (current.churnedSubscriptions / previous.activeSubscriptions) * 100
    return Math.round(churnRate * 100) / 100 // Round to 2 decimal places
  }
}