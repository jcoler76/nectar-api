export declare class AnalyticsService {
    /**
     * Get comprehensive revenue analytics dashboard data
     */
    static getRevenueDashboard(period?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'): Promise<{
        overview: {
            totalRevenue: number;
            monthlyRecurringRevenue: number;
            annualRecurringRevenue: number;
            averageRevenuePerUser: number;
            churnRate: number;
            growthRate: number;
            subscriptionHealth: number;
        };
        charts: {
            revenueOverTime: {
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
            }[];
            subscriptionGrowth: any[];
            churnAnalysis: {
                byPlan: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.SubscriptionGroupByOutputType, "plan"[]> & {
                    _count: {
                        _all: number;
                    };
                })[];
                reasons: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.BillingEventGroupByOutputType, "description"[]> & {
                    _count: {
                        _all: number;
                    };
                })[];
                trends: any[];
            };
            planDistribution: {
                plan: any;
                count: any;
                percentage: number;
                revenue: number;
            }[];
        };
        tables: {
            upcomingRenewals: ({
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
            })[];
            recentActivity: ({
                organization: {
                    name: string;
                    slug: string;
                } | null;
                subscription: {
                    plan: import(".prisma/client").$Enums.SubscriptionPlan;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                metadata: import("@prisma/client/runtime/library").JsonValue;
                organizationId: string | null;
                description: string | null;
                eventType: string;
                stripeEventId: string;
                amount: number | null;
                currency: string | null;
                processedAt: Date | null;
                subscriptionId: string | null;
            })[];
            topCustomers: ({
                organization: {
                    name: string;
                    id: string;
                    slug: string;
                    billingEmail: string | null;
                    createdAt: Date;
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
            })[];
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
    static getRevenueMetrics(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY', limit?: number): Promise<{
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
    static getSubscriptionGrowth(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'): Promise<any[]>;
    /**
     * Get detailed churn analysis
     */
    static getChurnAnalysis(): Promise<{
        byPlan: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.SubscriptionGroupByOutputType, "plan"[]> & {
            _count: {
                _all: number;
            };
        })[];
        reasons: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.BillingEventGroupByOutputType, "description"[]> & {
            _count: {
                _all: number;
            };
        })[];
        trends: any[];
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
    static getTopCustomersByRevenue(limit?: number): Promise<({
        organization: {
            name: string;
            id: string;
            slug: string;
            billingEmail: string | null;
            createdAt: Date;
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
     * Get recent billing activity
     */
    static getRecentBillingActivity(limit?: number): Promise<({
        organization: {
            name: string;
            slug: string;
        } | null;
        subscription: {
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        organizationId: string | null;
        description: string | null;
        eventType: string;
        stripeEventId: string;
        amount: number | null;
        currency: string | null;
        processedAt: Date | null;
        subscriptionId: string | null;
    })[]>;
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