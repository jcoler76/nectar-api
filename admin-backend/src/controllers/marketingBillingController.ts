import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { StripeService } from '@/services/stripeService'
import { prisma } from '@/utils/database'

export class MarketingBillingController {
  /**
   * Create Stripe checkout session for marketing site
   */
  static async createCheckoutSession(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() })
        return
      }

      const {
        organizationName,
        customerEmail,
        priceId,
        successUrl,
        cancelUrl,
        trialDays = 14
      } = req.body

      // Get or create organization
      let organization = await prisma.organization.findFirst({
        where: { billingEmail: customerEmail }
      })

      if (!organization) {
        // Create organization with unique slug
        const baseSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        let slug = baseSlug
        let counter = 1
        
        while (await prisma.organization.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${counter}`
          counter++
        }

        organization = await prisma.organization.create({
          data: {
            name: organizationName,
            slug,
            billingEmail: customerEmail,
          }
        })
      }

      // Create or get Stripe customer
      let stripeCustomer
      if (organization.stripeCustomerId) {
        const stripe = await StripeService.getStripeClient()
        stripeCustomer = await stripe.customers.retrieve(organization.stripeCustomerId)
      } else {
        stripeCustomer = await StripeService.createCustomer(organization.id, {
          email: customerEmail,
          name: organizationName
        })
      }

      // Create checkout session
      const stripe = await StripeService.getStripeClient()
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomer.id,
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          trial_period_days: trialDays,
          metadata: {
            organizationId: organization.id
          }
        },
        metadata: {
          organizationId: organization.id,
          customerEmail
        }
      })

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          sessionUrl: session.url,
          organizationId: organization.id
        }
      })
    } catch (error: any) {
      console.error('Create checkout session error:', error)
      res.status(500).json({ 
        error: 'Failed to create checkout session',
        message: error.message 
      })
    }
  }

  /**
   * Create Stripe customer portal session
   */
  static async createPortalSession(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() })
        return
      }

      const { organizationId, returnUrl } = req.body

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      })

      if (!organization || !organization.stripeCustomerId) {
        res.status(404).json({ error: 'Organization not found or no billing setup' })
        return
      }

      const stripe = await StripeService.getStripeClient()
      const session = await stripe.billingPortal.sessions.create({
        customer: organization.stripeCustomerId,
        return_url: returnUrl
      })

      res.json({
        success: true,
        data: {
          sessionUrl: session.url
        }
      })
    } catch (error: any) {
      console.error('Create portal session error:', error)
      res.status(500).json({ 
        error: 'Failed to create portal session',
        message: error.message 
      })
    }
  }

  /**
   * Get public Stripe configuration (publishable key, etc.)
   */
  static async getPublicConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await StripeService.getStripeConfig()

      if (!config) {
        res.status(404).json({ error: 'Stripe not configured' })
        return
      }

      res.json({
        success: true,
        data: {
          publishableKey: config.publishableKey,
          isLive: config.isLive,
          defaultCurrency: config.defaultCurrency
        }
      })
    } catch (error) {
      console.error('Get public config error:', error)
      res.status(500).json({ error: 'Failed to get configuration' })
    }
  }

  /**
   * Get organization subscription status (for marketing site)
   */
  static async getSubscriptionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          subscription: true
        }
      })

      if (!organization) {
        res.status(404).json({ error: 'Organization not found' })
        return
      }

      res.json({
        success: true,
        data: {
          organizationId: organization.id,
          organizationName: organization.name,
          hasSubscription: !!organization.subscription,
          subscription: organization.subscription ? {
            plan: organization.subscription.plan,
            status: organization.subscription.status,
            currentPeriodEnd: organization.subscription.currentPeriodEnd,
            trialEnd: organization.subscription.trialEnd,
            cancelAtPeriodEnd: organization.subscription.cancelAtPeriodEnd
          } : null
        }
      })
    } catch (error) {
      console.error('Get subscription status error:', error)
      res.status(500).json({ error: 'Failed to get subscription status' })
    }
  }

  /**
   * Validation rules for checkout session creation
   */
  static createCheckoutValidation = [
    body('organizationName')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Organization name is required and must be less than 100 characters'),
    
    body('customerEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    
    body('priceId')
      .isString()
      .matches(/^price_/)
      .withMessage('Valid Stripe price ID is required'),
    
    body('successUrl')
      .isURL()
      .withMessage('Valid success URL is required'),
    
    body('cancelUrl')
      .isURL()
      .withMessage('Valid cancel URL is required'),
    
    body('trialDays')
      .optional()
      .isInt({ min: 0, max: 365 })
      .withMessage('Trial days must be between 0 and 365')
  ]

  /**
   * Validation rules for portal session creation
   */
  static createPortalValidation = [
    body('organizationId')
      .isUUID()
      .withMessage('Valid organization ID is required'),
    
    body('returnUrl')
      .isURL()
      .withMessage('Valid return URL is required')
  ]
}