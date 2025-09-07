import { prisma } from '@/utils/database'
import { StripeService } from './stripeService'

export class AnalyticsService {
  /**
   * Get comprehensive revenue analytics dashboard data
   */
  static async getRevenueDashboard(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' = 'MONTHLY') {
    const [
      revenueMetrics,
      subscriptionAnalytics,
      churnRate,
      upcomingRenewals,
      recentBillingEvents
    ] = await Promise.all([
      this.getRevenueMetrics(period),
      StripeService.getSubscriptionAnalytics(),
      StripeService.calculateChurnRate(period),
      StripeService.getUpcomingRenewals(30),
      this.getRecentBillingActivity()
    ])

    const growth = this.calculateGrowthMetrics(revenueMetrics)
    const projections = await this.calculateRevenueProjections(revenueMetrics)

    return {
      overview: {
        totalRevenue: revenueMetrics[0]?.totalRevenue || 0,
        monthlyRecurringRevenue: await this.calculateMRR(),
        annualRecurringRevenue: await this.calculateARR(),
        averageRevenuePerUser: await this.calculateARPU(),
        churnRate,
        growthRate: growth.growthRate,
        subscriptionHealth: subscriptionAnalytics.healthScore
      },
      charts: {
        revenueOverTime: revenueMetrics.reverse(),
        subscriptionGrowth: await this.getSubscriptionGrowth(period),
        churnAnalysis: await this.getChurnAnalysis(),
        planDistribution: await this.getPlanDistribution()
      },
      tables: {
        upcomingRenewals: upcomingRenewals.slice(0, 10),
        recentActivity: recentBillingEvents,
        topCustomers: await this.getTopCustomersByRevenue()
      },
      projections
    }
  }

  /**
   * Get revenue metrics for a specific period
   */
  static async getRevenueMetrics(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY', limit = 12) {
    return prisma.revenueMetric.findMany({
      where: { period },
      orderBy: { date: 'desc' },
      take: limit
    })
  }

  /**
   * Calculate Monthly Recurring Revenue (MRR)
   */
  static async calculateMRR(): Promise<number> {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { 
        status: { in: ['ACTIVE', 'TRIALING'] },
        cancelAtPeriodEnd: false
      },
      select: { monthlyRevenue: true }
    })

    return activeSubscriptions.reduce((sum, sub) => {
      return sum + (sub.monthlyRevenue ? Number(sub.monthlyRevenue) : 0)
    }, 0)
  }

  /**
   * Calculate Annual Recurring Revenue (ARR)
   */
  static async calculateARR(): Promise<number> {
    const mrr = await this.calculateMRR()
    return mrr * 12
  }

  /**
   * Calculate Average Revenue Per User (ARPU)
   */
  static async calculateARPU(): Promise<number> {
    const [totalRevenue, activeUsers] = await Promise.all([
      this.calculateMRR(),
      prisma.subscription.count({
        where: { 
          status: { in: ['ACTIVE', 'TRIALING'] },
          cancelAtPeriodEnd: false
        }
      })
    ])

    return activeUsers > 0 ? totalRevenue / activeUsers : 0
  }

  /**
   * Get subscription growth metrics over time
   */
  static async getSubscriptionGrowth(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY') {
    const metrics = await prisma.revenueMetric.findMany({
      where: { period },
      orderBy: { date: 'asc' },
      take: 12,
      select: {
        date: true,
        activeSubscriptions: true,
        newSubscriptions: true,
        churnedSubscriptions: true,
        trialSubscriptions: true
      }
    })

    return metrics.map(metric => ({
      ...metric,
      netGrowth: metric.newSubscriptions - metric.churnedSubscriptions,
      date: metric.date.toISOString().split('T')[0]
    }))
  }

  /**
   * Get detailed churn analysis
   */
  static async getChurnAnalysis() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [churnedByPlan, churnReasons, churnTrends] = await Promise.all([
      // Churn by subscription plan
      prisma.subscription.groupBy({
        by: ['plan'],
        where: {
          status: 'CANCELED',
          canceledAt: { gte: thirtyDaysAgo }
        },
        _count: { _all: true }
      }),
      
      // Churn reasons from billing events
      prisma.billingEvent.groupBy({
        by: ['description'],
        where: {
          eventType: 'SUBSCRIPTION_CANCELED',
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: { _all: true }
      }),

      // Churn trend over last 6 months
      prisma.revenueMetric.findMany({
        where: {
          period: 'MONTHLY',
          date: { gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
        },
        select: {
          date: true,
          churnedSubscriptions: true,
          activeSubscriptions: true,
          churnRate: true
        },
        orderBy: { date: 'asc' }
      })
    ])

    return {
      byPlan: churnedByPlan,
      reasons: churnReasons,
      trends: churnTrends.map(trend => ({
        ...trend,
        date: trend.date.toISOString().split('T')[0],
        churnRate: Number(trend.churnRate) || 0
      }))
    }
  }

  /**
   * Get subscription plan distribution
   */
  static async getPlanDistribution() {
    const planCounts = await prisma.subscription.groupBy({
      by: ['plan'],
      where: { 
        status: { in: ['ACTIVE', 'TRIALING'] }
      },
      _count: { _all: true },
      _sum: { monthlyRevenue: true }
    })

    const total = planCounts.reduce((sum, plan) => sum + plan._count._all, 0)

    return planCounts.map(plan => ({
      plan: plan.plan,
      count: plan._count._all,
      percentage: total > 0 ? Math.round((plan._count._all / total) * 100) : 0,
      revenue: Number(plan._sum.monthlyRevenue) || 0
    }))
  }

  /**
   * Get top customers by revenue
   */
  static async getTopCustomersByRevenue(limit = 10) {
    return prisma.subscription.findMany({
      where: { 
        status: { in: ['ACTIVE', 'TRIALING'] },
        monthlyRevenue: { not: null }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            billingEmail: true,
            createdAt: true
          }
        }
      },
      orderBy: { monthlyRevenue: 'desc' },
      take: limit
    })
  }

  /**
   * Get recent billing activity
   */
  static async getRecentBillingActivity(limit = 20) {
    return prisma.billingEvent.findMany({
      include: {
        organization: {
          select: { name: true, slug: true }
        },
        subscription: {
          select: { plan: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Calculate growth metrics from revenue data
   */
  static calculateGrowthMetrics(revenueMetrics: any[]) {
    if (revenueMetrics.length < 2) {
      return { growthRate: 0, trend: 'stable' }
    }

    const current = revenueMetrics[0]
    const previous = revenueMetrics[1]
    
    if (!previous.totalRevenue || Number(previous.totalRevenue) === 0) {
      return { growthRate: 0, trend: 'stable' }
    }

    const growthRate = ((Number(current.totalRevenue) - Number(previous.totalRevenue)) / Number(previous.totalRevenue)) * 100
    const trend = growthRate > 0 ? 'growing' : growthRate < 0 ? 'declining' : 'stable'

    return {
      growthRate: Math.round(growthRate * 100) / 100,
      trend
    }
  }

  /**
   * Calculate revenue projections based on current trends
   */
  static async calculateRevenueProjections(revenueMetrics: any[]) {
    if (revenueMetrics.length < 3) {
      return {
        nextMonth: 0,
        nextQuarter: 0,
        nextYear: 0,
        confidence: 'low'
      }
    }

    // Simple linear regression for trend analysis
    const revenues = revenueMetrics.slice(0, 6).map(m => Number(m.totalRevenue))
    const avgGrowth = this.calculateAverageGrowthRate(revenues)
    const currentMRR = await this.calculateMRR()

    return {
      nextMonth: Math.round(currentMRR * (1 + avgGrowth)),
      nextQuarter: Math.round(currentMRR * Math.pow(1 + avgGrowth, 3)),
      nextYear: Math.round(currentMRR * Math.pow(1 + avgGrowth, 12)),
      confidence: revenues.length >= 6 ? 'high' : 'medium'
    }
  }

  /**
   * Calculate average growth rate from revenue array
   */
  static calculateAverageGrowthRate(revenues: number[]): number {
    if (revenues.length < 2) return 0

    const growthRates = []
    for (let i = 0; i < revenues.length - 1; i++) {
      if (revenues[i + 1] > 0) {
        growthRates.push((revenues[i] - revenues[i + 1]) / revenues[i + 1])
      }
    }

    return growthRates.length > 0 
      ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length 
      : 0
  }

  /**
   * Get customer lifetime value analysis
   */
  static async getCustomerLifetimeValue() {
    const [avgMonthlyRevenue, avgChurnRate, avgCustomerLifespan] = await Promise.all([
      this.calculateARPU(),
      StripeService.calculateChurnRate('MONTHLY'),
      this.calculateAverageCustomerLifespan()
    ])

    const clv = avgChurnRate > 0 ? avgMonthlyRevenue / (avgChurnRate / 100) : 0

    return {
      averageMonthlyRevenue: Math.round(avgMonthlyRevenue * 100) / 100,
      averageChurnRate: avgChurnRate,
      averageLifespan: avgCustomerLifespan,
      customerLifetimeValue: Math.round(clv * 100) / 100
    }
  }

  /**
   * Calculate average customer lifespan in months
   */
  static async calculateAverageCustomerLifespan(): Promise<number> {
    const canceledSubscriptions = await prisma.subscription.findMany({
      where: { 
        status: 'CANCELED',
        canceledAt: { not: null }
      },
      select: {
        createdAt: true,
        canceledAt: true
      }
    })

    if (canceledSubscriptions.length === 0) return 0

    const lifespans = canceledSubscriptions.map(sub => {
      const start = new Date(sub.createdAt)
      const end = new Date(sub.canceledAt!)
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30) // Convert to months
    })

    return lifespans.reduce((sum, span) => sum + span, 0) / lifespans.length
  }

  /**
   * Generate executive summary report
   */
  static async generateExecutiveSummary() {
    const [
      mrr,
      arr,
      churnRate,
      subscriptionAnalytics,
      clv,
      upcomingRenewals
    ] = await Promise.all([
      this.calculateMRR(),
      this.calculateARR(),
      StripeService.calculateChurnRate('MONTHLY'),
      StripeService.getSubscriptionAnalytics(),
      this.getCustomerLifetimeValue(),
      StripeService.getUpcomingRenewals(30)
    ])

    const totalUpcomingRevenue = upcomingRenewals.reduce((sum, renewal) => {
      return sum + (renewal.monthlyRevenue ? Number(renewal.monthlyRevenue) : 0)
    }, 0)

    return {
      keyMetrics: {
        monthlyRecurringRevenue: Math.round(mrr),
        annualRecurringRevenue: Math.round(arr),
        totalActiveSubscriptions: subscriptionAnalytics.active,
        monthlyChurnRate: churnRate,
        customerLifetimeValue: clv.customerLifetimeValue,
        subscriptionHealthScore: Math.round(subscriptionAnalytics.healthScore)
      },
      insights: {
        totalUpcomingRenewalRevenue: Math.round(totalUpcomingRevenue),
        upcomingRenewalsCount: upcomingRenewals.length,
        averageRevenuePerCustomer: Math.round(mrr / Math.max(subscriptionAnalytics.active, 1)),
        trialConversionOpportunity: subscriptionAnalytics.trialing
      },
      recommendations: this.generateRecommendations({
        churnRate,
        healthScore: subscriptionAnalytics.healthScore,
        trialingCount: subscriptionAnalytics.trialing,
        pastDueCount: subscriptionAnalytics.pastDue
      })
    }
  }

  /**
   * Generate actionable recommendations based on metrics
   */
  static generateRecommendations(metrics: {
    churnRate: number
    healthScore: number
    trialingCount: number
    pastDueCount: number
  }) {
    const recommendations = []

    if (metrics.churnRate > 5) {
      recommendations.push({
        priority: 'high',
        category: 'retention',
        title: 'High Churn Rate Detected',
        description: `Current churn rate of ${metrics.churnRate}% is above the 5% threshold`,
        action: 'Review customer feedback and implement retention strategies'
      })
    }

    if (metrics.healthScore < 80) {
      recommendations.push({
        priority: 'medium',
        category: 'health',
        title: 'Subscription Health Score Below Target',
        description: `Health score of ${Math.round(metrics.healthScore)}% is below the 80% target`,
        action: 'Focus on converting trials and addressing payment issues'
      })
    }

    if (metrics.trialingCount > 10) {
      recommendations.push({
        priority: 'medium',
        category: 'conversion',
        title: 'High Number of Trial Users',
        description: `${metrics.trialingCount} users are in trial period`,
        action: 'Implement targeted conversion campaigns and onboarding improvements'
      })
    }

    if (metrics.pastDueCount > 0) {
      recommendations.push({
        priority: 'high',
        category: 'billing',
        title: 'Past Due Subscriptions Need Attention',
        description: `${metrics.pastDueCount} subscriptions have payment issues`,
        action: 'Reach out to customers to update payment methods'
      })
    }

    return recommendations
  }
}