import Stripe from 'stripe';
export declare class StripeService {
    private static stripe;
    static getStripeClient(): Promise<Stripe>;
    /**
     * Get Stripe configuration from database
     */
    static getStripeConfig(): Promise<any>;
    /**
     * Update Stripe configuration
     */
    static updateStripeConfig(data: {
        isLive?: boolean;
        publishableKey?: string;
        webhookSecret?: string;
        defaultCurrency?: string;
        taxRateId?: string;
        updatedBy: string;
    }): Promise<any>;
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
    static syncSubscription(stripeSubscription: Stripe.Subscription): Promise<any>;
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
    static getRevenueAnalytics(period?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY', limit?: number): Promise<any>;
    /**
     * Get subscription analytics
     */
    static getSubscriptionAnalytics(): Promise<{
        total: any;
        active: any;
        trialing: any;
        pastDue: any;
        canceled: any;
        healthScore: number;
    }>;
    /**
     * Get upcoming renewals
     */
    static getUpcomingRenewals(days?: number): Promise<any>;
    /**
     * Calculate churn rate
     */
    static calculateChurnRate(period?: string): Promise<number>;
}
//# sourceMappingURL=stripeService.d.ts.map