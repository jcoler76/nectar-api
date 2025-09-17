"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("@/utils/database");
class StripeService {
    static async getStripeClient() {
        if (!this.stripe) {
            const config = await this.getStripeConfig();
            if (!config) {
                throw new Error('Stripe configuration not found');
            }
            const secretKey = process.env.STRIPE_SECRET_KEY;
            if (!secretKey) {
                throw new Error('Stripe secret key not configured');
            }
            this.stripe = new stripe_1.default(secretKey, {
                apiVersion: '2025-08-27.basil',
                typescript: true,
            });
        }
        return this.stripe;
    }
    /**
     * Get Stripe configuration from database
     */
    static async getStripeConfig() {
        return database_1.prisma.stripeConfig.findFirst({
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * Update Stripe configuration
     */
    static async updateStripeConfig(data) {
        // Delete existing config and create new one
        await database_1.prisma.stripeConfig.deleteMany({});
        return database_1.prisma.stripeConfig.create({
            data: {
                isLive: data.isLive ?? false,
                publishableKey: data.publishableKey,
                webhookSecret: data.webhookSecret,
                defaultCurrency: data.defaultCurrency ?? 'USD',
                taxRateId: data.taxRateId,
                updatedBy: data.updatedBy
            }
        });
    }
    /**
     * Create Stripe customer for organization
     */
    static async createCustomer(organizationId, data) {
        const stripe = await this.getStripeClient();
        const customer = await stripe.customers.create({
            email: data.email,
            name: data.name,
            metadata: {
                organizationId,
                ...data.metadata
            }
        });
        // Update organization with Stripe customer ID
        await database_1.prisma.organization.update({
            where: { id: organizationId },
            data: {
                stripeCustomerId: customer.id,
                billingEmail: data.email
            }
        });
        return customer;
    }
    /**
     * Create subscription for organization
     */
    static async createSubscription(organizationId, data) {
        const stripe = await this.getStripeClient();
        const organization = await database_1.prisma.organization.findUnique({
            where: { id: organizationId }
        });
        if (!organization?.stripeCustomerId) {
            throw new Error('Organization must have a Stripe customer ID');
        }
        const subscription = await stripe.subscriptions.create({
            customer: organization.stripeCustomerId,
            items: [{ price: data.priceId }],
            trial_period_days: data.trialPeriodDays,
            metadata: {
                organizationId,
                ...data.metadata
            }
        });
        // Create subscription record in database
        await this.syncSubscription(subscription);
        return subscription;
    }
    /**
     * Sync Stripe subscription with database
     */
    static async syncSubscription(stripeSubscription) {
        const organizationId = stripeSubscription.metadata.organizationId;
        if (!organizationId) {
            throw new Error('Organization ID not found in subscription metadata');
        }
        const subscriptionData = {
            organizationId,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: stripeSubscription.items.data[0]?.price.id,
            plan: this.mapStripePriceToPlan(stripeSubscription.items.data[0]?.price.id || ''),
            status: this.mapStripeStatus(stripeSubscription.status),
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
            trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
            canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        };
        return database_1.prisma.subscription.upsert({
            where: { stripeSubscriptionId: stripeSubscription.id },
            update: subscriptionData,
            create: subscriptionData
        });
    }
    /**
     * Handle Stripe webhook events
     */
    static async handleWebhook(event) {
        try {
            switch (event.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await this.syncSubscription(event.data.object);
                    await this.logBillingEvent(event, 'SUBSCRIPTION_UPDATED');
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionCanceled(event.data.object);
                    await this.logBillingEvent(event, 'SUBSCRIPTION_CANCELED');
                    break;
                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    await this.logBillingEvent(event, 'INVOICE_PAYMENT_SUCCEEDED');
                    break;
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    await this.logBillingEvent(event, 'INVOICE_PAYMENT_FAILED');
                    break;
                default:
                    console.log(`Unhandled webhook event type: ${event.type}`);
            }
        }
        catch (error) {
            console.error(`Error handling webhook ${event.type}:`, error);
            throw error;
        }
    }
    /**
     * Log billing event
     */
    static async logBillingEvent(event, eventType) {
        const organizationId = this.extractOrganizationId(event.data.object);
        if (!organizationId)
            return;
        await database_1.prisma.billingEvent.create({
            data: {
                organizationId,
                stripeEventId: event.id,
                eventType: eventType,
                amount: this.extractAmount(event.data.object),
                currency: this.extractCurrency(event.data.object),
                description: `Stripe webhook: ${event.type}`,
                metadata: event.data.object,
                processedAt: new Date()
            }
        });
    }
    /**
     * Map Stripe price ID to subscription plan
     */
    static mapStripePriceToPlan(priceId) {
        // Updated mapping for 4-tier pricing structure
        const priceMapping = {
            // Free plan (no Stripe price ID needed)
            'price_free': 'FREE',

            // Starter plan - $29/month, 1 user
            'price_starter_monthly': 'STARTER',
            'price_starter_annual': 'STARTER',

            // Team plan - $99/month, 10 users
            'price_team_monthly': 'TEAM',
            'price_team_annual': 'TEAM',

            // Business plan - $199/month, 25 users
            'price_business_monthly': 'BUSINESS',
            'price_business_annual': 'BUSINESS',

            // Enterprise - custom pricing
            'price_enterprise_monthly': 'ENTERPRISE',
            'price_enterprise_annual': 'ENTERPRISE',

            // Legacy pricing (for existing customers)
            'price_pro_monthly': 'BUSINESS',
            'price_pro_yearly': 'BUSINESS',
            'price_professional_monthly': 'BUSINESS',
            'price_professional_yearly': 'BUSINESS',
        };
        return priceMapping[priceId] || 'CUSTOM';
    }
    /**
     * Map Stripe subscription status to our enum
     */
    static mapStripeStatus(status) {
        const statusMapping = {
            'trialing': 'TRIALING',
            'active': 'ACTIVE',
            'past_due': 'PAST_DUE',
            'canceled': 'CANCELED',
            'unpaid': 'UNPAID',
            'incomplete': 'INCOMPLETE',
            'incomplete_expired': 'INCOMPLETE_EXPIRED',
            'paused': 'CANCELED'
        };
        return statusMapping[status] || 'INCOMPLETE';
    }
    /**
     * Handle subscription cancellation
     */
    static async handleSubscriptionCanceled(subscription) {
        await database_1.prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                status: 'CANCELED',
                canceledAt: new Date(subscription.canceled_at * 1000)
            }
        });
    }
    /**
     * Handle successful payment
     */
    static async handlePaymentSucceeded(invoice) {
        if (invoice.subscription && typeof invoice.subscription === 'string') {
            const subscription = await database_1.prisma.subscription.findFirst({
                where: { stripeSubscriptionId: invoice.subscription }
            });
            if (subscription) {
                // Update revenue tracking
                await this.updateRevenueMetrics(subscription.organizationId, invoice.amount_paid / 100);
            }
        }
    }
    /**
     * Handle failed payment
     */
    static async handlePaymentFailed(invoice) {
        // Handle failed payment logic (send notifications, update subscription status, etc.)
        console.log('Payment failed for invoice:', invoice.id);
    }
    /**
     * Update revenue metrics
     */
    static async updateRevenueMetrics(organizationId, amount) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await database_1.prisma.revenueMetric.upsert({
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
        });
    }
    /**
     * Extract organization ID from Stripe object
     */
    static extractOrganizationId(stripeObject) {
        return stripeObject.metadata?.organizationId || null;
    }
    /**
     * Extract amount from Stripe object
     */
    static extractAmount(stripeObject) {
        if (stripeObject.amount_paid)
            return stripeObject.amount_paid / 100;
        if (stripeObject.amount)
            return stripeObject.amount / 100;
        return null;
    }
    /**
     * Extract currency from Stripe object
     */
    static extractCurrency(stripeObject) {
        return stripeObject.currency || null;
    }
    /**
     * Get revenue analytics
     */
    static async getRevenueAnalytics(period = 'MONTHLY', limit = 12) {
        return database_1.prisma.revenueMetric.findMany({
            where: { period },
            orderBy: { date: 'desc' },
            take: limit
        });
    }
    /**
     * Get subscription analytics
     */
    static async getSubscriptionAnalytics() {
        const [total, active, trialing, pastDue, canceled] = await Promise.all([
            database_1.prisma.subscription.count(),
            database_1.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
            database_1.prisma.subscription.count({ where: { status: 'TRIALING' } }),
            database_1.prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
            database_1.prisma.subscription.count({ where: { status: 'CANCELED' } })
        ]);
        return {
            total,
            active,
            trialing,
            pastDue,
            canceled,
            healthScore: total > 0 ? (active / total) * 100 : 0
        };
    }
    /**
     * Get upcoming renewals
     */
    static async getUpcomingRenewals(days = 30) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        return database_1.prisma.subscription.findMany({
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
        });
    }
    /**
     * Calculate churn rate
     */
    static async calculateChurnRate(period = 'MONTHLY') {
        const metrics = await this.getRevenueAnalytics(period, 2);
        if (metrics.length < 2)
            return 0;
        const current = metrics[0];
        const previous = metrics[1];
        if (previous.activeSubscriptions === 0)
            return 0;
        const churnRate = (current.churnedSubscriptions / previous.activeSubscriptions) * 100;
        return Math.round(churnRate * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Handle user overage billing for Phase 1 pricing
     */
    static async handleUserOverageBilling(organizationId, overageUsers, overagePrice) {
        const stripe = await this.getStripeClient();
        const organization = await database_1.prisma.organization.findUnique({
            where: { id: organizationId },
            include: { subscription: true }
        });

        if (!organization?.stripeCustomerId || !organization.subscription) {
            throw new Error('Organization must have active Stripe subscription');
        }

        // Create usage record for overage users
        const overageAmount = overageUsers * overagePrice;

        // Create one-time invoice item for user overage
        await stripe.invoiceItems.create({
            customer: organization.stripeCustomerId,
            amount: Math.round(overageAmount * 100), // Convert to cents
            currency: 'usd',
            description: `Additional users overage: ${overageUsers} users at $${overagePrice}/user`,
            metadata: {
                organizationId,
                overageType: 'users',
                overageCount: overageUsers.toString(),
                unitPrice: overagePrice.toString()
            }
        });

        // Log billing event
        await database_1.prisma.billingEvent.create({
            data: {
                organizationId,
                subscriptionId: organization.subscription.id,
                eventType: 'USER_OVERAGE_CHARGE',
                amount: overageAmount,
                currency: 'USD',
                description: `User overage charge: ${overageUsers} additional users`,
                metadata: {
                    overageUsers,
                    unitPrice: overagePrice,
                    totalAmount: overageAmount
                }
            }
        });

        return { success: true, amount: overageAmount, users: overageUsers };
    }

    /**
     * Get plan limits for updated 4-tier pricing structure
     */
    static getPlanLimits(plan) {
        const limits = {
            FREE: {
                userLimit: 1,
                datasourceLimit: 1,
                apiCallLimit: 25000,
                userOveragePrice: 0, // No overages allowed on free plan
                monthlyPrice: 0
            },
            STARTER: {
                userLimit: 1,
                datasourceLimit: -1, // Unlimited
                apiCallLimit: 1000000,
                userOveragePrice: 10,
                monthlyPrice: 29
            },
            TEAM: {
                userLimit: 10,
                datasourceLimit: -1, // Unlimited
                apiCallLimit: 5000000,
                userOveragePrice: 10,
                monthlyPrice: 99
            },
            BUSINESS: {
                userLimit: 25,
                datasourceLimit: -1, // Unlimited
                apiCallLimit: 10000000,
                userOveragePrice: 10,
                monthlyPrice: 199
            },
            ENTERPRISE: {
                userLimit: -1, // Unlimited
                datasourceLimit: -1, // Unlimited
                apiCallLimit: -1, // Unlimited
                userOveragePrice: 0, // Custom pricing
                monthlyPrice: 0 // Custom pricing
            }
        };
        return limits[plan] || limits.FREE;
    }
}
exports.StripeService = StripeService;
StripeService.stripe = null;
//# sourceMappingURL=stripeService.js.map