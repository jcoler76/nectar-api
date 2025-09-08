"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeConfigController = void 0;
const express_validator_1 = require("express-validator");
const stripeService_1 = require("@/services/stripeService");
const auditService_1 = require("@/services/auditService");
class StripeConfigController {
    /**
     * Get current Stripe configuration
     */
    static async getConfig(req, res) {
        try {
            const config = await stripeService_1.StripeService.getStripeConfig();
            // Don't return sensitive data
            const sanitizedConfig = config ? {
                id: config.id,
                isLive: config.isLive,
                publishableKey: config.publishableKey,
                defaultCurrency: config.defaultCurrency,
                taxRateId: config.taxRateId,
                updatedBy: config.updatedBy,
                updatedAt: config.updatedAt,
                createdAt: config.createdAt,
                // Indicate if webhook secret is configured without exposing it
                webhookSecretConfigured: !!config.webhookSecret
            } : null;
            res.json({
                success: true,
                data: sanitizedConfig
            });
        }
        catch (error) {
            console.error('Get Stripe config error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Update Stripe configuration
     */
    static async updateConfig(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }
            const { isLive, publishableKey, webhookSecret, defaultCurrency, taxRateId } = req.body;
            const config = await stripeService_1.StripeService.updateStripeConfig({
                isLive,
                publishableKey,
                webhookSecret,
                defaultCurrency,
                taxRateId,
                updatedBy: req.admin.id
            });
            // Log admin action
            await auditService_1.AdminAuditLogger.log({
                adminId: req.admin.id,
                action: 'update_stripe_config',
                resource: config.id,
                resourceType: 'stripe_config',
                details: {
                    isLive,
                    defaultCurrency,
                    hasWebhookSecret: !!webhookSecret,
                    hasPublishableKey: !!publishableKey
                },
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent')
            });
            // Return sanitized config
            const sanitizedConfig = {
                id: config.id,
                isLive: config.isLive,
                publishableKey: config.publishableKey,
                defaultCurrency: config.defaultCurrency,
                taxRateId: config.taxRateId,
                updatedBy: config.updatedBy,
                updatedAt: config.updatedAt,
                createdAt: config.createdAt,
                webhookSecretConfigured: !!config.webhookSecret
            };
            res.json({
                success: true,
                message: 'Stripe configuration updated successfully',
                data: sanitizedConfig
            });
        }
        catch (error) {
            console.error('Update Stripe config error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Test Stripe connection
     */
    static async testConnection(req, res) {
        try {
            const stripe = await stripeService_1.StripeService.getStripeClient();
            // Test the connection by fetching account info
            const account = await stripe.accounts.retrieve();
            // Log test action
            await auditService_1.AdminAuditLogger.log({
                adminId: req.admin.id,
                action: 'test_stripe_connection',
                resource: 'stripe_api',
                resourceType: 'external_service',
                details: {
                    accountId: account.id,
                    country: account.country,
                    currency: account.default_currency,
                    testMode: !account.details_submitted
                },
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent')
            });
            res.json({
                success: true,
                message: 'Stripe connection successful',
                data: {
                    accountId: account.id,
                    country: account.country,
                    defaultCurrency: account.default_currency,
                    chargesEnabled: account.charges_enabled,
                    payoutsEnabled: account.payouts_enabled,
                    detailsSubmitted: account.details_submitted
                }
            });
        }
        catch (error) {
            console.error('Test Stripe connection error:', error);
            res.status(400).json({
                error: 'Stripe connection failed',
                message: error.message,
                code: error.code || 'STRIPE_CONNECTION_ERROR'
            });
        }
    }
    /**
     * Get Stripe webhook endpoints
     */
    static async getWebhookEndpoints(req, res) {
        try {
            const stripe = await stripeService_1.StripeService.getStripeClient();
            // List webhook endpoints
            const webhooks = await stripe.webhookEndpoints.list({
                limit: 100
            });
            res.json({
                success: true,
                data: webhooks.data.map((webhook) => ({
                    id: webhook.id,
                    url: webhook.url,
                    status: webhook.status,
                    enabledEvents: webhook.enabled_events,
                    created: new Date(webhook.created * 1000).toISOString()
                }))
            });
        }
        catch (error) {
            console.error('Get webhook endpoints error:', error);
            res.status(500).json({ error: 'Failed to fetch webhook endpoints' });
        }
    }
}
exports.StripeConfigController = StripeConfigController;
/**
 * Validation rules
 */
StripeConfigController.updateConfigValidation = [
    (0, express_validator_1.body)('isLive')
        .optional()
        .isBoolean()
        .withMessage('isLive must be a boolean'),
    (0, express_validator_1.body)('publishableKey')
        .optional()
        .isString()
        .isLength({ min: 1 })
        .withMessage('Publishable key must be a non-empty string')
        .matches(/^pk_(test|live)_/)
        .withMessage('Invalid Stripe publishable key format'),
    (0, express_validator_1.body)('webhookSecret')
        .optional()
        .isString()
        .isLength({ min: 1 })
        .withMessage('Webhook secret must be a non-empty string')
        .matches(/^whsec_/)
        .withMessage('Invalid Stripe webhook secret format'),
    (0, express_validator_1.body)('defaultCurrency')
        .optional()
        .isString()
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency must be a 3-letter ISO code')
        .toLowerCase(),
    (0, express_validator_1.body)('taxRateId')
        .optional()
        .isString()
        .matches(/^txr_/)
        .withMessage('Invalid Stripe tax rate ID format')
];
//# sourceMappingURL=stripeConfigController.js.map