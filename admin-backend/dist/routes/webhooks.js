"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhookController_1 = require("@/controllers/webhookController");
const adminAuth_1 = require("@/middleware/adminAuth");
const router = (0, express_1.Router)();
// Stripe webhook endpoint (no auth required for Stripe webhooks)
router.post('/stripe', webhookController_1.WebhookController.handleStripeWebhook);
// Admin-authenticated routes
router.use(adminAuth_1.adminAuth);
// Test webhook endpoint (development only)
router.post('/test', webhookController_1.WebhookController.testWebhook);
// Webhook status
router.get('/status', webhookController_1.WebhookController.getWebhookStatus);
exports.default = router;
//# sourceMappingURL=webhooks.js.map