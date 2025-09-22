import { Router } from 'express'
import { BillingController } from '@/controllers/billingController'
import { adminAuth } from '@/middleware/adminAuth'

const router = Router()

// Apply authentication middleware to all routes
router.use(adminAuth)

// Subscription management routes
router.get(
  '/subscriptions',
  BillingController.getSubscriptionsValidation,
  BillingController.getSubscriptions
)

router.get('/subscriptions/:id', BillingController.getSubscriptionById)

router.put(
  '/subscriptions/:id',
  BillingController.updateSubscriptionValidation,
  BillingController.updateSubscription
)

// Billing events
router.get('/events/:organizationId', BillingController.getBillingEvents)

// Analytics and reporting
router.get('/renewals', BillingController.getUpcomingRenewals)
router.get('/metrics', BillingController.getBillingMetrics)

export default router