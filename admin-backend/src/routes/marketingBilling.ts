import { Router } from 'express'
import { MarketingBillingController } from '@/controllers/marketingBillingController'

const router = Router()

// Public endpoints for marketing site (no auth required)
router.post('/create-checkout-session', 
  MarketingBillingController.createCheckoutValidation,
  MarketingBillingController.createCheckoutSession
)

router.post('/create-portal-session',
  MarketingBillingController.createPortalValidation,
  MarketingBillingController.createPortalSession
)

router.get('/config', MarketingBillingController.getPublicConfig)
router.get('/subscription/:organizationId', MarketingBillingController.getSubscriptionStatus)

export default router