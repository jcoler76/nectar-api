export declare class AnalyticsService {
    /**
     * Get comprehensive revenue analytics dashboard data
     */
    static getRevenueDashboard(period?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'): Promise<{
        overview: {
            totalRevenue: any;
            monthlyRecurringRevenue: number;
            annualRecurringRevenue: number;
            averageRevenuePerUser: number;
            churnRate: any;
            growthRate: number;
            subscriptionHealth: any;
        };
        charts: {
            revenueOverTime: any;
            subscriptionGrowth: any;
            churnAnalysis: {
                byPlan: any;
                reasons: any;
                trends: any;
            };
            planDistribution: {
                plan: any;
                count: any;
                percentage: number;
                revenue: number;
            }[];
        };
        tables: {
            upcomingRenewals: any;
            recentActivity: any;
            topCustomers: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                organizationId: string;
                stripeCustomerId: string | null;
                stripeSubscriptionId: string | null;
                plan: import("../../../server/prisma/generated/client").$Enums.SubscriptionPlan;
                status: import("../../../server/prisma/generated/client").$Enums.SubscriptionStatus;
                trialEndsAt: Date | null;
                currentPeriodStart: Date;
                currentPeriodEnd: Date;
                canceledAt: Date | null;
                stripePriceId: string | null;
                maxDatabaseConnections: number;
                maxApiCallsPerMonth: number;
                maxUsersPerOrg: number;
                maxWorkflows: number;
            }[];
        };
        projections: {
            nextMonth: number;
            nextQuarter: number;
            nextYear: number;
            confidence: string;
        };
    }>;
    /**
     * Get revenue metrics for a specific period
     */
    static getRevenueMetrics(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY', limit?: number): Promise<any>;
    /**
     * Calculate Monthly Recurring Revenue (MRR)
     */
    static calculateMRR(): Promise<number>;
    /**
     * Calculate Annual Recurring Revenue (ARR)
     */
    static calculateARR(): Promise<number>;
    /**
     * Calculate Average Revenue Per User (ARPU)
     */
    static calculateARPU(): Promise<number>;
    /**
     * Get subscription growth metrics over time
     */
    static getSubscriptionGrowth(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'): Promise<any>;
    /**
     * Get detailed churn analysis
     */
    static getChurnAnalysis(): Promise<{
        byPlan: any;
        reasons: any;
        trends: any;
    }>;
    /**
     * Get subscription plan distribution
     */
    static getPlanDistribution(): Promise<{
        plan: any;
        count: any;
        percentage: number;
        revenue: number;
    }[]>;
    /**
     * Get top customers by revenue
     */
    static getTopCustomersByRevenue(limit?: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        plan: import("../../../server/prisma/generated/client").$Enums.SubscriptionPlan;
        status: import("../../../server/prisma/generated/client").$Enums.SubscriptionStatus;
        trialEndsAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        canceledAt: Date | null;
        stripePriceId: string | null;
        maxDatabaseConnections: number;
        maxApiCallsPerMonth: number;
        maxUsersPerOrg: number;
        maxWorkflows: number;
    }[]>;
    /**
     * Get recent billing activity
     */
    static getRecentBillingActivity(limit?: number): Promise<any>;
    /**
     * Calculate growth metrics from revenue data
     */
    static calculateGrowthMetrics(revenueMetrics: any[]): {
        growthRate: number;
        trend: string;
    };
    /**
     * Calculate revenue projections based on current trends
     */
    static calculateRevenueProjections(revenueMetrics: any[]): Promise<{
        nextMonth: number;
        nextQuarter: number;
        nextYear: number;
        confidence: string;
    }>;
    /**
     * Calculate average growth rate from revenue array
     */
    static calculateAverageGrowthRate(revenues: number[]): number;
    /**
     * Get customer lifetime value analysis
     */
    static getCustomerLifetimeValue(): Promise<{
        averageMonthlyRevenue: number;
        averageChurnRate: number;
        averageLifespan: number;
        customerLifetimeValue: number;
    }>;
    /**
     * Calculate average customer lifespan in months
     */
    static calculateAverageCustomerLifespan(): Promise<number>;
    /**
     * Generate executive summary report
     */
    static generateExecutiveSummary(): Promise<{
        keyMetrics: {
            monthlyRecurringRevenue: number;
            annualRecurringRevenue: number;
            totalActiveSubscriptions: number;
            monthlyChurnRate: number;
            customerLifetimeValue: number;
            subscriptionHealthScore: number;
        };
        insights: {
            totalUpcomingRenewalRevenue: number;
            upcomingRenewalsCount: number;
            averageRevenuePerCustomer: number;
            trialConversionOpportunity: number;
        };
        recommendations: {
            priority: string;
            category: string;
            title: string;
            description: string;
            action: string;
        }[];
    }>;
    /**
     * Generate actionable recommendations based on metrics
     */
    static generateRecommendations(metrics: {
        churnRate: number;
        healthScore: number;
        trialingCount: number;
        pastDueCount: number;
    }): {
        priority: string;
        category: string;
        title: string;
        description: string;
        action: string;
    }[];
}
//# sourceMappingURL=analyticsService.d.ts.map