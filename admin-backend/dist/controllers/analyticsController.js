"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const express_validator_1 = require("express-validator");
const analyticsService_1 = require("@/services/analyticsService");
const auditService_1 = require("@/services/auditService");
class AnalyticsController {
    /**
     * Get comprehensive revenue dashboard
     */
    static async getRevenueDashboard(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }
            const { period = 'MONTHLY' } = req.query;
            const dashboard = await analyticsService_1.AnalyticsService.getRevenueDashboard(period);
            // Log admin action
            await auditService_1.AdminAuditLogger.log({
                userId: req.admin.id,
                action: 'view_revenue_dashboard',
                resource: 'analytics',
                resourceType: 'dashboard',
                details: { period },
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent')
            });
            res.json({
                success: true,
                data: dashboard
            });
        }
        catch (error) {
            console.error('Get revenue dashboard error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get revenue metrics for specific period
     */
    static async getRevenueMetrics(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }
            const { period = 'MONTHLY', limit = '12' } = req.query;
            const metrics = await analyticsService_1.AnalyticsService.getRevenueMetrics(period, parseInt(limit));
            res.json({
                success: true,
                data: metrics,
                summary: {
                    totalPeriods: metrics.length,
                    latestRevenue: metrics[0]?.totalRevenue || 0,
                    period
                }
            });
        }
        catch (error) {
            console.error('Get revenue metrics error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get churn analysis
     */
    static async getChurnAnalysis(req, res) {
        try {
            const churnAnalysis = await analyticsService_1.AnalyticsService.getChurnAnalysis();
            res.json({
                success: true,
                data: churnAnalysis
            });
        }
        catch (error) {
            console.error('Get churn analysis error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get customer lifetime value analysis
     */
    static async getCustomerLifetimeValue(req, res) {
        try {
            const clv = await analyticsService_1.AnalyticsService.getCustomerLifetimeValue();
            res.json({
                success: true,
                data: clv
            });
        }
        catch (error) {
            console.error('Get CLV analysis error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get executive summary report
     */
    static async getExecutiveSummary(req, res) {
        try {
            const summary = await analyticsService_1.AnalyticsService.generateExecutiveSummary();
            // Log admin action for executive summary access
            await auditService_1.AdminAuditLogger.log({
                userId: req.admin.id,
                action: 'view_executive_summary',
                resource: 'analytics',
                resourceType: 'report',
                details: { reportType: 'executive_summary' },
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent')
            });
            res.json({
                success: true,
                data: summary,
                generated_at: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Get executive summary error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get subscription growth metrics
     */
    static async getSubscriptionGrowth(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }
            const { period = 'MONTHLY' } = req.query;
            const growth = await analyticsService_1.AnalyticsService.getSubscriptionGrowth(period);
            res.json({
                success: true,
                data: growth,
                summary: {
                    totalPeriods: growth.length,
                    latestNetGrowth: growth[growth.length - 1]?.netGrowth || 0
                }
            });
        }
        catch (error) {
            console.error('Get subscription growth error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get plan distribution
     */
    static async getPlanDistribution(req, res) {
        try {
            const distribution = await analyticsService_1.AnalyticsService.getPlanDistribution();
            res.json({
                success: true,
                data: distribution,
                summary: {
                    totalActivePlans: distribution.length,
                    totalActiveSubscriptions: distribution.reduce((sum, plan) => sum + plan.count, 0),
                    totalMonthlyRevenue: distribution.reduce((sum, plan) => sum + plan.revenue, 0)
                }
            });
        }
        catch (error) {
            console.error('Get plan distribution error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get top customers by revenue
     */
    static async getTopCustomers(req, res) {
        try {
            const { limit = '10' } = req.query;
            const topCustomers = await analyticsService_1.AnalyticsService.getTopCustomersByRevenue(parseInt(limit));
            res.json({
                success: true,
                data: topCustomers,
                summary: {
                    totalShown: topCustomers.length,
                    totalRevenue: topCustomers.reduce((sum, customer) => {
                        return sum + (customer.monthlyRevenue ? Number(customer.monthlyRevenue) : 0);
                    }, 0)
                }
            });
        }
        catch (error) {
            console.error('Get top customers error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get recent billing activity
     */
    static async getRecentActivity(req, res) {
        try {
            const { limit = '20' } = req.query;
            const activity = await analyticsService_1.AnalyticsService.getRecentBillingActivity(parseInt(limit));
            res.json({
                success: true,
                data: activity,
                summary: {
                    totalEvents: activity.length,
                    timeRange: activity.length > 0 ? {
                        latest: activity[0]?.createdAt,
                        oldest: activity[activity.length - 1]?.createdAt
                    } : null
                }
            });
        }
        catch (error) {
            console.error('Get recent activity error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.AnalyticsController = AnalyticsController;
/**
 * Validation rules
 */
AnalyticsController.getRevenueDashboardValidation = [
    (0, express_validator_1.query)('period').optional().isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).withMessage('Invalid period')
];
AnalyticsController.getRevenueMetricsValidation = [
    (0, express_validator_1.query)('period').optional().isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).withMessage('Invalid period'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];
AnalyticsController.getSubscriptionGrowthValidation = [
    (0, express_validator_1.query)('period').optional().isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).withMessage('Invalid period')
];
AnalyticsController.getTopCustomersValidation = [
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];
AnalyticsController.getRecentActivityValidation = [
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];
//# sourceMappingURL=analyticsController.js.map