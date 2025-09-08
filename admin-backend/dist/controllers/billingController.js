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
                adminId: req.admin.id,
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
}
exports.BillingController = BillingController;
/**
 * Validation rules
 */
BillingController.getSubscriptionsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('status').optional().isIn(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE']),
    (0, express_validator_1.query)('plan').optional().isIn(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'])
];
BillingController.updateSubscriptionValidation = [
    (0, express_validator_1.body)('action').isIn(['cancel', 'pause', 'resume']).withMessage('Invalid action'),
    (0, express_validator_1.body)('reason').optional().isString().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
];
//# sourceMappingURL=billingController.js.map