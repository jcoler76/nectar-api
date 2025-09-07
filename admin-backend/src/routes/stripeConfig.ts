import { Router } from 'express'
import { StripeConfigController } from '@/controllers/stripeConfigController'
import { adminAuth } from '@/middleware/adminAuth'

const router = Router()

// Apply authentication middleware to all routes
router.use(adminAuth)

// Configuration routes
router.get('/config', StripeConfigController.getConfig)

router.put(
  '/config',
  StripeConfigController.updateConfigValidation,
  StripeConfigController.updateConfig
)

// Testing and management routes
router.post('/test-connection', StripeConfigController.testConnection)
router.get('/webhook-endpoints', StripeConfigController.getWebhookEndpoints)

export default router