import Stripe from 'stripe';
export declare class StripeService {
    private static stripe;
    static getStripeClient(): Promise<Stripe>;
    /**
     * Get Stripe configuration from database
     */
    static getStripeConfig(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        updatedBy: string | null;
        isLive: boolean;
        publishableKey: string;
        webhookSecret: string | null;
        defaultCurrency: string;
        taxRateId: string | null;
    } | null>;
    /**
     * Update Stripe configuration
     */
    static updateStripeConfig(data: {
        isLive?: boolean;
        publishableKey: string;
        webhookSecret?: string;
        defaultCurrency?: string;
        taxRateId?: string;
        updatedBy: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        updatedBy: string | null;
        isLive: boolean;
        publishableKey: string;
        webhookSecret: string | null;
        defaultCurrency: string;
        taxRateId: string | null;
    }>;
    /**
     * Create Stripe customer for organization
     */
    static createCustomer(organizationId: string, data: {
        email: string;
        name: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Response<Stripe.Customer>>;
    /**
     * Create subscription for organization
     */
    static createSubscription(organizationId: string, data: {
        priceId: string;
        trialPeriodDays?: number;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Response<Stripe.Subscription>>;
    /**
     * Sync Stripe subscription with database
     */
    static syncSubscription(stripeSubscription: Stripe.Subscription): Promise<{
        id: string;
        stripeCustomerId: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        plan: import(".prisma/client").$Enums.SubscriptionPlan;
        maxWorkflows: number;
        stripeSubscriptionId: string | null;
        trialEndsAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        canceledAt: Date | null;
        cancelAtPeriodEnd: boolean;
        stripePriceId: string | null;
        maxDatabaseConnections: number;
        maxApiCallsPerMonth: number;
        maxUsersPerOrg: number;
        storageIncludedBytes: bigint;
        storageOverageRate: import("@prisma/client/runtime/library").Decimal;
        monthlyRevenue: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    /**
     * Handle Stripe webhook events
     */
    static handleWebhook(event: Stripe.Event): Promise<void>;
    /**
     * Log billing event
     */
    private static logBillingEvent;
    /**
     * Map Stripe price ID to subscription plan
     */
    private static mapStripePriceToPlan;
    /**
     * Map Stripe subscription status to our enum
     */
    private static mapStripeStatus;
    /**
     * Handle subscription cancellation
     */
    private static handleSubscriptionCanceled;
    /**
     * Handle successful payment
     */
    private static handlePaymentSucceeded;
    /**
     * Handle failed payment
     */
    private static handlePaymentFailed;
    /**
     * Update revenue metrics
     */
    private static updateRevenueMetrics;
    /**
     * Extract organization ID from Stripe object
     */
    private static extractOrganizationId;
    /**
     * Extract amount from Stripe object
     */
    private static extractAmount;
    /**
     * Extract currency from Stripe object
     */
    private static extractCurrency;
    /**
     * Get revenue analytics
     */
    static getRevenueAnalytics(period?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY', limit?: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        period: string;
        totalRevenue: number;
        newRevenue: number;
        churnedRevenue: number;
        upgradeRevenue: number;
        downgradeRevenue: number;
        activeSubscriptions: number;
        churnedSubscriptions: number;
        newSubscriptions: number;
        trialSubscriptions: number;
        churnRate: number;
    }[]>;
    /**
     * Get subscription analytics
     */
    static getSubscriptionAnalytics(): Promise<{
        total: number;
        active: number;
        trialing: number;
        pastDue: number;
        canceled: number;
        healthScore: number;
    }>;
    /**
     * Get upcoming renewals
     */
    static getUpcomingRenewals(days?: number): Promise<({
        organization: {
            name: string;
            id: string;
            slug: string;
            billingEmail: string | null;
        };
    } & {
        id: string;
        stripeCustomerId: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        plan: import(".prisma/client").$Enums.SubscriptionPlan;
        maxWorkflows: number;
        stripeSubscriptionId: string | null;
        trialEndsAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        canceledAt: Date | null;
        cancelAtPeriodEnd: boolean;
        stripePriceId: string | null;
        maxDatabaseConnections: number;
        maxApiCallsPerMonth: number;
        maxUsersPerOrg: number;
        storageIncludedBytes: bigint;
        storageOverageRate: import("@prisma/client/runtime/library").Decimal;
        monthlyRevenue: import("@prisma/client/runtime/library").Decimal | null;
    })[]>;
    /**
     * Calculate churn rate
     */
    static calculateChurnRate(period?: string): Promise<number>;
}
//# sourceMappingURL=stripeService.d.ts.map