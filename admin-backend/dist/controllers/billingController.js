"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const express_validator_1 = require("express-validator");
const stripeService_1 = require("@/services/stripeService");
const database_1 = require("@/utils/database");
const auditService_1 = require("@/services/auditService");
class BillingController {
    /**
     * Get all subscriptions with pagination and filtering
     */
    static async getSubscriptions(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }
            const { page = '1', limit = '20', status, plan, search } = req.query;
            const where = {};
            if (status)
                where.status = status;
            if (plan)
                where.plan = plan;
            if (search) {
                where.organization = {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { slug: { contains: search, mode: 'insensitive' } },
                        { billingEmail: { contains: search, mode: 'insensitive' } }
                    ]
                };
            }
            const [subscriptions, total] = await Promise.all([
                database_1.prisma.subscription.findMany({
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
                database_1.prisma.subscription.count({ where })
            ]);
            res.json({
                success: true,
                data: subscriptions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        }
        catch (error) {
            console.error('Get subscriptions error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get subscription details by ID
     */
    static async getSubscriptionById(req, res) {
        try {
            const { id } = req.params;
            const subscription = await database_1.prisma.subscription.findUnique({
                where: { id },
                include: {
                    organization: true,
                    billingEvents: {
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    }
                }
            });
            if (!subscription) {
                res.status(404).json({ error: 'Subscription not found' });
                return;
            }
            res.json({
                success: true,
                data: subscription
            });
        }
        catch (error) {
            console.error('Get subscription error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Update subscription (cancel, pause, etc.)
     */
    static async updateSubscription(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }
            const { id } = req.params;
            const { action, reason } = req.body;
            const subscription = await database_1.prisma.subscription.findUnique({
                where: { id },
                include: { organization: true }
            });
            if (!subscription) {
                res.status(404).json({ error: 'Subscription not found' });
                return;
            }
            let result;
            switch (action) {
                case 'cancel':
                    result = await this.cancelSubscription(subscription, reason);
                    break;
                case 'pause':
                    result = await this.pauseSubscription(subscription);
                    break;
                case 'resume':
                    result = await this.resumeSubscription(subscription);
                    break;
                default:
                    res.status(400).json({ error: 'Invalid action' });
                    return;
            }
            // Log admin action
            await auditService_1.AdminAuditLogger.log({
                userId: req.admin.id,
                action: `subscription_${action}`,
                resource: subscription.id,
                resourceType: 'subscription',
                details: {
                    organizationId: subscription.organizationId,
                    organizationName: subscription.organization.name,
                    reason
                },
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent')
            });
            res.json({
                success: true,
                message: `Subscription ${action}ed successfully`,
                data: result
            });
        }
        catch (error) {
            console.error('Update subscription error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get billing events for an organization
     */
    static async getBillingEvents(req, res) {
        try {
            const { organizationId } = req.params;
            const { page = '1', limit = '50' } = req.query;
            const [events, total] = await Promise.all([
                database_1.prisma.billingEvent.findMany({
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
                database_1.prisma.billingEvent.count({ where: { organizationId } })
            ]);
            res.json({
                success: true,
                data: events,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        }
        catch (error) {
            console.error('Get billing events error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get upcoming renewals
     */
    static async getUpcomingRenewals(req, res) {
        try {
            const { days = '30' } = req.query;
            const renewals = await stripeService_1.StripeService.getUpcomingRenewals(parseInt(days));
            res.json({
                success: true,
                data: renewals,
                summary: {
                    total: renewals.length,
                    totalRevenue: renewals.reduce((sum, sub) => {
                        return sum + (sub.monthlyRevenue ? Number(sub.monthlyRevenue) : 0);
                    }, 0)
                }
            });
        }
        catch (error) {
            console.error('Get upcoming renewals error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Cancel subscription
     */
    static async cancelSubscription(subscription, reason) {
        const stripe = await stripeService_1.StripeService.getStripeClient();
        if (subscription.stripeSubscriptionId) {
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                cancel_at_period_end: true,
                metadata: { cancellation_reason: reason || 'Admin cancellation' }
            });
        }
        return database_1.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                cancelAtPeriodEnd: true,
                updatedAt: new Date()
            }
        });
    }
    /**
     * Pause subscription
     */
    static async pauseSubscription(subscription) {
        const stripe = await stripeService_1.StripeService.getStripeClient();
        if (subscription.stripeSubscriptionId) {
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                pause_collection: { behavior: 'mark_uncollectible' }
            });
        }
        return database_1.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: 'UNPAID',
                updatedAt: new Date()
            }
        });
    }
    /**
     * Resume subscription
     */
    static async resumeSubscription(subscription) {
        const stripe = await stripeService_1.StripeService.getStripeClient();
        if (subscription.stripeSubscriptionId) {
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                pause_collection: ''
            });
        }
        return database_1.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: 'ACTIVE',
                updatedAt: new Date()
            }
        });
    }

    /**
     * Get user overage analytics for Phase 1 pricing
     */
    static async getUserOverageAnalytics(req, res) {
        try {
            const { period = 'monthly' } = req.query;

            // Get organizations with user overages
            const overageAnalytics = await database_1.prisma.subscription.findMany({
                where: {
                    status: { in: ['ACTIVE', 'TRIALING'] },
                    plan: { in: ['STARTER', 'TEAM', 'BUSINESS'] }
                },
                include: {
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            members: {
                                where: { status: 'ACTIVE' },
                                select: { id: true }
                            }
                        }
                    },
                    usageMetrics: {
                        where: {
                            period: period.toUpperCase(),
                            date: {
                                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                            }
                        },
                        orderBy: { date: 'desc' },
                        take: 1
                    }
                }
            });

            const overageData = overageAnalytics.map(sub => {
                const currentUsers = sub.organization.members.length;
                const userLimit = sub.userLimit || 0;
                const isOverage = currentUsers > userLimit;
                const overageUsers = isOverage ? currentUsers - userLimit : 0;
                const overageCost = overageUsers * (sub.userOveragePrice ? Number(sub.userOveragePrice) : 0);

                return {
                    organizationId: sub.organizationId,
                    organizationName: sub.organization.name,
                    plan: sub.plan,
                    currentUsers,
                    userLimit,
                    overageUsers,
                    overageCost,
                    hasOverage: isOverage,
                    usageMetrics: sub.usageMetrics[0] || null
                };
            });

            const summary = {
                totalOrganizations: overageData.length,
                organizationsWithOverage: overageData.filter(d => d.hasOverage).length,
                totalOverageUsers: overageData.reduce((sum, d) => sum + d.overageUsers, 0),
                totalOverageRevenue: overageData.reduce((sum, d) => sum + d.overageCost, 0),
                averageOveragePerOrg: overageData.filter(d => d.hasOverage).length > 0
                    ? overageData.reduce((sum, d) => sum + d.overageCost, 0) / overageData.filter(d => d.hasOverage).length
                    : 0
            };

            res.json({
                success: true,
                data: {
                    summary,
                    details: overageData.filter(d => d.hasOverage), // Only return organizations with overages
                    all: overageData // All organizations for comparison
                }
            });
        }
        catch (error) {
            console.error('Get user overage analytics error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Process user overage billing for all organizations
     */
    static async processUserOverageBilling(req, res) {
        try {
            const { dryRun = 'true', organizationIds } = req.body;
            const isDryRun = dryRun === 'true' || dryRun === true;

            // Get organizations with user overages
            const whereClause = {
                status: { in: ['ACTIVE', 'TRIALING'] },
                plan: { in: ['TEAM', 'BUSINESS'] }
            };

            if (organizationIds && organizationIds.length > 0) {
                whereClause.organizationId = { in: organizationIds };
            }

            const subscriptionsWithOverage = await database_1.prisma.subscription.findMany({
                where: whereClause,
                include: {
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            stripeCustomerId: true,
                            members: {
                                where: { status: 'ACTIVE' },
                                select: { id: true }
                            }
                        }
                    }
                }
            });

            const results = [];
            let totalOverageRevenue = 0;

            for (const subscription of subscriptionsWithOverage) {
                const currentUsers = subscription.organization.members.length;
                const userLimit = subscription.userLimit || 0;
                const overageUsers = Math.max(0, currentUsers - userLimit);

                if (overageUsers > 0 && subscription.userOveragePrice) {
                    const overagePrice = Number(subscription.userOveragePrice);
                    const overageAmount = overageUsers * overagePrice;

                    const result = {
                        organizationId: subscription.organizationId,
                        organizationName: subscription.organization.name,
                        plan: subscription.plan,
                        overageUsers,
                        overagePrice,
                        overageAmount,
                        processed: false,
                        error: null
                    };

                    if (!isDryRun) {
                        try {
                            await stripeService_1.StripeService.handleUserOverageBilling(
                                subscription.organizationId,
                                overageUsers,
                                overagePrice
                            );
                            result.processed = true;
                            totalOverageRevenue += overageAmount;
                        } catch (error) {
                            result.error = error.message;
                        }
                    } else {
                        totalOverageRevenue += overageAmount;
                    }

                    results.push(result);
                }
            }

            // Log admin action
            await auditService_1.AdminAuditLogger.log({
                userId: req.admin.id,
                action: isDryRun ? 'overage_billing_preview' : 'overage_billing_processed',
                resource: 'billing',
                resourceType: 'overage_billing',
                details: {
                    organizationsProcessed: results.length,
                    totalOverageRevenue,
                    dryRun: isDryRun,
                    organizationIds: organizationIds || 'all'
                },
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent')
            });

            res.json({
                success: true,
                data: {
                    dryRun: isDryRun,
                    summary: {
                        totalOrganizations: results.length,
                        totalOverageRevenue,
                        successfullyProcessed: results.filter(r => r.processed).length,
                        errors: results.filter(r => r.error).length
                    },
                    results
                }
            });
        }
        catch (error) {
            console.error('Process user overage billing error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get plan migration opportunities (upgrade suggestions)
     */
    static async getPlanMigrationOpportunities(req, res) {
        try {
            // Find organizations that might benefit from plan upgrades
            const organizations = await database_1.prisma.subscription.findMany({
                where: {
                    status: { in: ['ACTIVE', 'TRIALING'] },
                    plan: { in: ['FREE', 'STARTER', 'TEAM'] }
                },
                include: {
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            members: {
                                where: { status: 'ACTIVE' },
                                select: { id: true }
                            },
                            datasources: {
                                select: { id: true }
                            }
                        }
                    },
                    usageMetrics: {
                        where: {
                            period: 'MONTHLY',
                            date: {
                                gte: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1)
                            }
                        },
                        orderBy: { date: 'desc' },
                        take: 3
                    }
                }
            });

            const opportunities = organizations.map(sub => {
                const currentUsers = sub.organization.members.length;
                const datasources = sub.organization.datasources.length;
                const userLimit = sub.userLimit || 0;
                const datasourceLimit = sub.datasourceLimit || 0;

                // Calculate upgrade benefits
                const planLimits = stripeService_1.StripeService.getPlanLimits(sub.plan);
                const nextPlan = sub.plan === 'FREE' ? 'STARTER' :
                                sub.plan === 'STARTER' ? 'TEAM' : 'BUSINESS';
                const nextPlanLimits = stripeService_1.StripeService.getPlanLimits(nextPlan);

                const shouldUpgrade =
                    currentUsers > userLimit * 0.8 || // Using 80% of user limit
                    datasources > datasourceLimit * 0.8 || // Using 80% of datasource limit
                    currentUsers > userLimit; // Already over limit

                const avgApiCalls = sub.usageMetrics.length > 0
                    ? sub.usageMetrics.reduce((sum, m) => sum + (Number(m.apiCalls) || 0), 0) / sub.usageMetrics.length
                    : 0;

                return {
                    organizationId: sub.organizationId,
                    organizationName: sub.organization.name,
                    currentPlan: sub.plan,
                    suggestedPlan: nextPlan,
                    metrics: {
                        currentUsers,
                        userLimit,
                        userUtilization: Math.round((currentUsers / Math.max(userLimit, 1)) * 100),
                        datasources,
                        datasourceLimit,
                        datasourceUtilization: Math.round((datasources / Math.max(datasourceLimit, 1)) * 100),
                        avgApiCalls: Math.round(avgApiCalls),
                        apiCallLimit: planLimits.apiCallLimit
                    },
                    benefits: {
                        additionalUsers: nextPlanLimits.userLimit - userLimit,
                        additionalDatasources: nextPlanLimits.datasourceLimit - datasourceLimit,
                        additionalApiCalls: nextPlanLimits.apiCallLimit - planLimits.apiCallLimit
                    },
                    shouldUpgrade,
                    urgency: currentUsers > userLimit ? 'high' :
                            currentUsers > userLimit * 0.9 ? 'medium' : 'low'
                };
            }).filter(opp => opp.shouldUpgrade);

            const summary = {
                totalOpportunities: opportunities.length,
                highUrgency: opportunities.filter(o => o.urgency === 'high').length,
                mediumUrgency: opportunities.filter(o => o.urgency === 'medium').length,
                potentialRevenue: opportunities.reduce((sum, opp) => {
                    const currentPrice = stripeService_1.StripeService.getPlanLimits(opp.currentPlan).monthlyPrice;
                    const suggestedPrice = stripeService_1.StripeService.getPlanLimits(opp.suggestedPlan).monthlyPrice;
                    return sum + (suggestedPrice - currentPrice);
                }, 0)
            };

            res.json({
                success: true,
                data: {
                    summary,
                    opportunities: opportunities.sort((a, b) => {
                        const urgencyOrder = { high: 3, medium: 2, low: 1 };
                        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
                    })
                }
            });
        }
        catch (error) {
            console.error('Get plan migration opportunities error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.BillingController = BillingController;
/**
 * Validation rules
 */
BillingController.getSubscriptionsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('status').optional().isIn(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE']),
    (0, express_validator_1.query)('plan').optional().isIn(['FREE', 'TEAM', 'BUSINESS', 'ENTERPRISE', 'STARTER', 'PROFESSIONAL', 'CUSTOM'])
];
BillingController.updateSubscriptionValidation = [
    (0, express_validator_1.body)('action').isIn(['cancel', 'pause', 'resume']).withMessage('Invalid action'),
    (0, express_validator_1.body)('reason').optional().isString().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
];
//# sourceMappingURL=billingController.js.map