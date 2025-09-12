"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const marketingBillingController_1 = require("@/controllers/marketingBillingController");
const router = (0, express_1.Router)();
// Public endpoints for marketing site (no auth required)
router.post('/create-checkout-session', marketingBillingController_1.MarketingBillingController.createCheckoutValidation, marketingBillingController_1.MarketingBillingController.createCheckoutSession);
router.post('/create-portal-session', marketingBillingController_1.MarketingBillingController.createPortalValidation, marketingBillingController_1.MarketingBillingController.createPortalSession);
router.get('/config', marketingBillingController_1.MarketingBillingController.getPublicConfig);
router.get('/subscription/:organizationId', marketingBillingController_1.MarketingBillingController.getSubscriptionStatus);
exports.default = router;
//# sourceMappingURL=marketingBilling.js.map