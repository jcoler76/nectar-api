import { Request, Response } from 'express';
export declare class MarketingBillingController {
    /**
     * Create Stripe checkout session for marketing site
     */
    static createCheckoutSession(req: Request, res: Response): Promise<void>;
    /**
     * Create Stripe customer portal session
     */
    static createPortalSession(req: Request, res: Response): Promise<void>;
    /**
     * Get public Stripe configuration (publishable key, etc.)
     */
    static getPublicConfig(req: Request, res: Response): Promise<void>;
    /**
     * Get organization subscription status (for marketing site)
     */
    static getSubscriptionStatus(req: Request, res: Response): Promise<void>;
    /**
     * Validation rules for checkout session creation
     */
    static createCheckoutValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for portal session creation
     */
    static createPortalValidation: import("express-validator").ValidationChain[];
}
//# sourceMappingURL=marketingBillingController.d.ts.map