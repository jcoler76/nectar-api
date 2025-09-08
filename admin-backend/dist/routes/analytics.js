"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analyticsController_1 = require("@/controllers/analyticsController");
const adminAuth_1 = require("@/middleware/adminAuth");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(adminAuth_1.adminAuth);
// Revenue analytics routes
router.get('/dashboard', analyticsController_1.AnalyticsController.getRevenueDashboardValidation, analyticsController_1.AnalyticsController.getRevenueDashboard);
router.get('/revenue/metrics', analyticsController_1.AnalyticsController.getRevenueMetricsValidation, analyticsController_1.AnalyticsController.getRevenueMetrics);
// Churn and customer analytics
router.get('/churn', analyticsController_1.AnalyticsController.getChurnAnalysis);
router.get('/clv', analyticsController_1.AnalyticsController.getCustomerLifetimeValue);
// Subscription analytics
router.get('/subscriptions/growth', analyticsController_1.AnalyticsController.getSubscriptionGrowthValidation, analyticsController_1.AnalyticsController.getSubscriptionGrowth);
router.get('/subscriptions/distribution', analyticsController_1.AnalyticsController.getPlanDistribution);
// Customer insights
router.get('/customers/top', analyticsController_1.AnalyticsController.getTopCustomersValidation, analyticsController_1.AnalyticsController.getTopCustomers);
router.get('/activity/recent', analyticsController_1.AnalyticsController.getRecentActivityValidation, analyticsController_1.AnalyticsController.getRecentActivity);
// Executive reporting
router.get('/executive-summary', analyticsController_1.AnalyticsController.getExecutiveSummary);
exports.default = router;
//# sourceMappingURL=analytics.js.map