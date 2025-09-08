import { Response } from 'express';
import { AuthRequest } from '@/types/auth';
export declare class AnalyticsController {
    /**
     * Get comprehensive revenue dashboard
     */
    static getRevenueDashboard(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get revenue metrics for specific period
     */
    static getRevenueMetrics(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get churn analysis
     */
    static getChurnAnalysis(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get customer lifetime value analysis
     */
    static getCustomerLifetimeValue(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get executive summary report
     */
    static getExecutiveSummary(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get subscription growth metrics
     */
    static getSubscriptionGrowth(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get plan distribution
     */
    static getPlanDistribution(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get top customers by revenue
     */
    static getTopCustomers(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get recent billing activity
     */
    static getRecentActivity(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Validation rules
     */
    static getRevenueDashboardValidation: import("express-validator").ValidationChain[];
    static getRevenueMetricsValidation: import("express-validator").ValidationChain[];
    static getSubscriptionGrowthValidation: import("express-validator").ValidationChain[];
    static getTopCustomersValidation: import("express-validator").ValidationChain[];
    static getRecentActivityValidation: import("express-validator").ValidationChain[];
}
//# sourceMappingURL=analyticsController.d.ts.map