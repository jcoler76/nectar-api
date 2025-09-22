import { Request, Response } from 'express';
export declare class WebhookController {
    /**
     * Handle Stripe webhook events
     */
    static handleStripeWebhook(req: Request, res: Response): Promise<void>;
    /**
     * Test webhook endpoint for development
     */
    static testWebhook(req: Request, res: Response): Promise<void>;
    /**
     * Get webhook processing status
     */
    static getWebhookStatus(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=webhookController.d.ts.map