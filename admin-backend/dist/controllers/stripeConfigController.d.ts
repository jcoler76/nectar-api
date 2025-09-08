import { Response } from 'express';
import { AuthRequest } from '@/types/auth';
export declare class StripeConfigController {
    /**
     * Get current Stripe configuration
     */
    static getConfig(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Update Stripe configuration
     */
    static updateConfig(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Test Stripe connection
     */
    static testConnection(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get Stripe webhook endpoints
     */
    static getWebhookEndpoints(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Validation rules
     */
    static updateConfigValidation: import("express-validator").ValidationChain[];
}
//# sourceMappingURL=stripeConfigController.d.ts.map