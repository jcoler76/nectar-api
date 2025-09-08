import { Response } from 'express';
import { AuthRequest } from '@/types/auth';
export declare class BillingController {
    /**
     * Get all subscriptions with pagination and filtering
     */
    static getSubscriptions(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get subscription details by ID
     */
    static getSubscriptionById(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Update subscription (cancel, pause, etc.)
     */
    static updateSubscription(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get billing events for an organization
     */
    static getBillingEvents(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get upcoming renewals
     */
    static getUpcomingRenewals(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Cancel subscription
     */
    private static cancelSubscription;
    /**
     * Pause subscription
     */
    private static pauseSubscription;
    /**
     * Resume subscription
     */
    private static resumeSubscription;
    /**
     * Validation rules
     */
    static getSubscriptionsValidation: import("express-validator").ValidationChain[];
    static updateSubscriptionValidation: import("express-validator").ValidationChain[];
}
//# sourceMappingURL=billingController.d.ts.map