"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billingController_1 = require("@/controllers/billingController");
const adminAuth_1 = require("@/middleware/adminAuth");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(adminAuth_1.adminAuth);
// Subscription management routes
router.get('/subscriptions', billingController_1.BillingController.getSubscriptionsValidation, billingController_1.BillingController.getSubscriptions);
router.get('/subscriptions/:id', billingController_1.BillingController.getSubscriptionById);
router.put('/subscriptions/:id', billingController_1.BillingController.updateSubscriptionValidation, billingController_1.BillingController.updateSubscription);
// Billing events
router.get('/events/:organizationId', billingController_1.BillingController.getBillingEvents);
// Analytics and reporting
router.get('/renewals', billingController_1.BillingController.getUpcomingRenewals);
router.get('/metrics', billingController_1.BillingController.getBillingMetrics);
exports.default = router;
//# sourceMappingURL=billing.js.map