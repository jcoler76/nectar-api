import { Router } from 'express'
import { WebhookController } from '@/controllers/webhookController'
import { adminAuth } from '@/middleware/adminAuth'

const router = Router()

// Stripe webhook endpoint (no auth required for Stripe webhooks)
router.post('/stripe', WebhookController.handleStripeWebhook)

// Admin-authenticated routes
router.use(adminAuth)

// Test webhook endpoint (development only)
router.post('/test', WebhookController.testWebhook)

// Webhook status
router.get('/status', WebhookController.getWebhookStatus)

export default router