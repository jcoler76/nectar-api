import Stripe from 'stripe'
import { mainApiClient } from '@/services/apiClient'

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

  static async getStripeConfig() {
    try {
      const response = await mainApiClient.get<{ success: boolean; data: any }>('/api/admin-backend/billing/stripe-config')
      return response.data
    } catch (error) {
      console.error('Failed to get Stripe config:', error)
      return null
    }
  }

  static async updateStripeConfig(data: {
    isLive?: boolean
    publishableKey: string
    webhookSecret?: string
    defaultCurrency?: string
    taxRateId?: string
    updatedBy: string
  }) {
    const response = await mainApiClient.put('/api/admin-backend/billing/stripe-config', data)
    return response.data
  }

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

    await mainApiClient.post('/api/admin-backend/billing/create-customer', {
      organizationId,
      stripeCustomerId: customer.id,
      billingEmail: data.email
    })

    return customer
  }

  static async createSubscription(organizationId: string, data: {
    priceId: string
    trialPeriodDays?: number
    metadata?: Record<string, string>
  }) {
    const stripe = await this.getStripeClient()

    const orgResponse = await mainApiClient.get<{ success: boolean; data: any }>(`/api/admin-backend/billing/organization/${organizationId}`)
    const organization = orgResponse.data

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

    await this.syncSubscription(subscription)

    return subscription
  }

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

    const response = await mainApiClient.post('/api/admin-backend/billing/sync-subscription', {
      stripeSubscriptionId: stripeSubscription.id,
      subscriptionData
    })

    return response.data
  }

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

  private static async logBillingEvent(event: Stripe.Event, eventType: string) {
    const organizationId = this.extractOrganizationId(event.data.object)
    if (!organizationId) return

    await mainApiClient.post('/api/admin-backend/billing/billing-event', {
      organizationId,
      stripeEventId: event.id,
      eventType,
      amount: this.extractAmount(event.data.object),
      currency: this.extractCurrency(event.data.object),
      description: `Stripe webhook: ${event.type}`,
      metadata: event.data.object
    })
  }

  private static mapStripePriceToPlan(priceId: string): 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM' {
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

  private static async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    await mainApiClient.put(`/api/admin-backend/billing/subscription/${subscription.id}/cancel`, {
      canceledAt: subscription.canceled_at
    })
  }

  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
      const response = await mainApiClient.get<{ success: boolean; data: any }>(`/api/admin-backend/billing/subscription/${(invoice as any).subscription}`)

      if (response.data) {
        await this.updateRevenueMetrics(response.data.organizationId, invoice.amount_paid / 100)
      }
    }
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log('Payment failed for invoice:', invoice.id)
  }

  private static async updateRevenueMetrics(organizationId: string, amount: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await mainApiClient.post('/api/admin-backend/billing/revenue-metric', {
      date: today,
      period: 'DAILY',
      totalRevenue: amount,
      newRevenue: amount
    })
  }

  private static extractOrganizationId(stripeObject: any): string | null {
    return stripeObject.metadata?.organizationId || null
  }

  private static extractAmount(stripeObject: any): number | null {
    if (stripeObject.amount_paid) return stripeObject.amount_paid / 100
    if (stripeObject.amount) return stripeObject.amount / 100
    return null
  }

  private static extractCurrency(stripeObject: any): string | null {
    return stripeObject.currency || null
  }

  static async getRevenueAnalytics(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' = 'MONTHLY', limit = 12) {
    const response = await mainApiClient.get<{ success: boolean; data: any[] }>(`/api/admin-backend/billing/revenue-analytics?period=${period}&limit=${limit}`)
    return response.data
  }

  static async getSubscriptionAnalytics() {
    const response = await mainApiClient.get<{ success: boolean; data: any }>('/api/admin-backend/billing/subscription-analytics')
    return response.data
  }

  static async getUpcomingRenewals(days = 30) {
    const response = await mainApiClient.get<{ success: boolean; data: any[] }>(`/api/admin-backend/billing/upcoming-renewals?days=${days}`)
    return response.data
  }

  static async calculateChurnRate(period = 'MONTHLY') {
    const metrics = await this.getRevenueAnalytics(period as any, 2)

    if (metrics.length < 2) return 0

    const current = metrics[0]
    const previous = metrics[1]

    if (previous.activeSubscriptions === 0) return 0

    const churnRate = (current.churnedSubscriptions / previous.activeSubscriptions) * 100
    return Math.round(churnRate * 100) / 100
  }
}