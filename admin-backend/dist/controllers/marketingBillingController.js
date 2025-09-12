"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingBillingController = void 0;
const express_validator_1 = require("express-validator");
const stripeService_1 = require("@/services/stripeService");
const database_1 = require("@/utils/database");
class MarketingBillingController {
    /**
     * Create Stripe checkout session for marketing site
     */
    static async createCheckoutSession(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }
            const { organizationName, customerEmail, priceId, successUrl, cancelUrl, trialDays = 14 } = req.body;
            // Get or create organization
            let organization = await database_1.prisma.organization.findFirst({
                where: { billingEmail: customerEmail }
            });
            if (!organization) {
                // Create organization with unique slug
                const baseSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                let slug = baseSlug;
                let counter = 1;
                while (await database_1.prisma.organization.findUnique({ where: { slug } })) {
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }
                organization = await database_1.prisma.organization.create({
                    data: {
                        name: organizationName,
                        slug,
                        billingEmail: customerEmail,
                    }
                });
            }
            // Create or get Stripe customer
            let stripeCustomer;
            if (organization.stripeCustomerId) {
                const stripe = await stripeService_1.StripeService.getStripeClient();
                stripeCustomer = await stripe.customers.retrieve(organization.stripeCustomerId);
            }
            else {
                stripeCustomer = await stripeService_1.StripeService.createCustomer(organization.id, {
                    email: customerEmail,
                    name: organizationName
                });
            }
            // Create checkout session
            const stripe = await stripeService_1.StripeService.getStripeClient();
            const session = await stripe.checkout.sessions.create({
                customer: stripeCustomer.id,
                line_items: [{
                        price: priceId,
                        quantity: 1
                    }],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                subscription_data: {
                    trial_period_days: trialDays,
                    metadata: {
                        organizationId: organization.id
                    }
                },
                metadata: {
                    organizationId: organization.id,
                    customerEmail
                }
            });
            res.json({
                success: true,
                data: {
                    sessionId: session.id,
                    sessionUrl: session.url,
                    organizationId: organization.id
                }
            });
        }
        catch (error) {
            console.error('Create checkout session error:', error);
            res.status(500).json({
                error: 'Failed to create checkout session',
                message: error.message
            });
        }
    }
    /**
     * Create Stripe customer portal session
     */
    static async createPortalSession(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }
            const { organizationId, returnUrl } = req.body;
            const organization = await database_1.prisma.organization.findUnique({
                where: { id: organizationId }
            });
            if (!organization || !organization.stripeCustomerId) {
                res.status(404).json({ error: 'Organization not found or no billing setup' });
                return;
            }
            const stripe = await stripeService_1.StripeService.getStripeClient();
            const session = await stripe.billingPortal.sessions.create({
                customer: organization.stripeCustomerId,
                return_url: returnUrl
            });
            res.json({
                success: true,
                data: {
                    sessionUrl: session.url
                }
            });
        }
        catch (error) {
            console.error('Create portal session error:', error);
            res.status(500).json({
                error: 'Failed to create portal session',
                message: error.message
            });
        }
    }
    /**
     * Get public Stripe configuration (publishable key, etc.)
     */
    static async getPublicConfig(req, res) {
        try {
            const config = await stripeService_1.StripeService.getStripeConfig();
            if (!config) {
                res.status(404).json({ error: 'Stripe not configured' });
                return;
            }
            res.json({
                success: true,
                data: {
                    publishableKey: config.publishableKey,
                    isLive: config.isLive,
                    defaultCurrency: config.defaultCurrency
                }
            });
        }
        catch (error) {
            console.error('Get public config error:', error);
            res.status(500).json({ error: 'Failed to get configuration' });
        }
    }
    /**
     * Get organization subscription status (for marketing site)
     */
    static async getSubscriptionStatus(req, res) {
        try {
            const { organizationId } = req.params;
            const organization = await database_1.prisma.organization.findUnique({
                where: { id: organizationId },
                include: {
                    subscription: true
                }
            });
            if (!organization) {
                res.status(404).json({ error: 'Organization not found' });
                return;
            }
            res.json({
                success: true,
                data: {
                    organizationId: organization.id,
                    organizationName: organization.name,
                    hasSubscription: !!organization.subscription,
                    subscription: organization.subscription ? {
                        plan: organization.subscription.plan,
                        status: organization.subscription.status,
                        currentPeriodEnd: organization.subscription.currentPeriodEnd,
                        trialEnd: organization.subscription.trialEnd,
                        cancelAtPeriodEnd: organization.subscription.cancelAtPeriodEnd
                    } : null
                }
            });
        }
        catch (error) {
            console.error('Get subscription status error:', error);
            res.status(500).json({ error: 'Failed to get subscription status' });
        }
    }
}
exports.MarketingBillingController = MarketingBillingController;
/**
 * Validation rules for checkout session creation
 */
MarketingBillingController.createCheckoutValidation = [
    (0, express_validator_1.body)('organizationName')
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Organization name is required and must be less than 100 characters'),
    (0, express_validator_1.body)('customerEmail')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    (0, express_validator_1.body)('priceId')
        .isString()
        .matches(/^price_/)
        .withMessage('Valid Stripe price ID is required'),
    (0, express_validator_1.body)('successUrl')
        .isURL()
        .withMessage('Valid success URL is required'),
    (0, express_validator_1.body)('cancelUrl')
        .isURL()
        .withMessage('Valid cancel URL is required'),
    (0, express_validator_1.body)('trialDays')
        .optional()
        .isInt({ min: 0, max: 365 })
        .withMessage('Trial days must be between 0 and 365')
];
/**
 * Validation rules for portal session creation
 */
MarketingBillingController.createPortalValidation = [
    (0, express_validator_1.body)('organizationId')
        .isUUID()
        .withMessage('Valid organization ID is required'),
    (0, express_validator_1.body)('returnUrl')
        .isURL()
        .withMessage('Valid return URL is required')
];
//# sourceMappingURL=marketingBillingController.js.map