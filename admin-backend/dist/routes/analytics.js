"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import { AnalyticsController } from '../controllers/analyticsController'
// import { adminAuth } from '../middleware/adminAuth'
const router = (0, express_1.Router)();
// Test endpoint (no auth)
router.get('/test', (req, res) => {
    res.json({ message: 'Analytics routes working!', timestamp: new Date().toISOString() });
});
// Apply authentication middleware to all other routes
// router.use(adminAuth)
// Revenue analytics routes
/*
router.get(
  '/dashboard',
  AnalyticsController.getRevenueDashboardValidation,
  AnalyticsController.getRevenueDashboard
)

router.get(
  '/revenue/metrics',
  AnalyticsController.getRevenueMetricsValidation,
  AnalyticsController.getRevenueMetrics
)

// Churn and customer analytics
router.get('/churn', AnalyticsController.getChurnAnalysis)
router.get('/clv', AnalyticsController.getCustomerLifetimeValue)

// Subscription analytics
router.get(
  '/subscriptions/growth',
  AnalyticsController.getSubscriptionGrowthValidation,
  AnalyticsController.getSubscriptionGrowth
)

router.get('/subscriptions/distribution', AnalyticsController.getPlanDistribution)

// Customer insights
router.get(
  '/customers/top',
  AnalyticsController.getTopCustomersValidation,
  AnalyticsController.getTopCustomers
)

router.get(
  '/activity/recent',
  AnalyticsController.getRecentActivityValidation,
  AnalyticsController.getRecentActivity
)

// Executive reporting
router.get('/executive-summary', AnalyticsController.getExecutiveSummary)
*/
exports.default = router;
//# sourceMappingURL=analytics.js.map