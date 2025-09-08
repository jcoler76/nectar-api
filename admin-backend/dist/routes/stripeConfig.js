"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripeConfigController_1 = require("@/controllers/stripeConfigController");
const adminAuth_1 = require("@/middleware/adminAuth");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(adminAuth_1.adminAuth);
// Configuration routes
router.get('/config', stripeConfigController_1.StripeConfigController.getConfig);
router.put('/config', stripeConfigController_1.StripeConfigController.updateConfigValidation, stripeConfigController_1.StripeConfigController.updateConfig);
// Testing and management routes
router.post('/test-connection', stripeConfigController_1.StripeConfigController.testConnection);
router.get('/webhook-endpoints', stripeConfigController_1.StripeConfigController.getWebhookEndpoints);
exports.default = router;
//# sourceMappingURL=stripeConfig.js.map