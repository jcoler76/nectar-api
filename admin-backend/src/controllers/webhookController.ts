import { Request, Response } from 'express'
import Stripe from 'stripe'
import { StripeService } from '@/services/stripeService'

export class WebhookController {
  /**
   * Handle Stripe webhook events
   */
  static async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.get('stripe-signature')
    
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' })
      return
    }

    try {
      const stripe = await StripeService.getStripeClient()
      const config = await StripeService.getStripeConfig()
      
      if (!config?.webhookSecret) {
        console.error('Webhook secret not configured')
        res.status(400).json({ error: 'Webhook not configured' })
        return
      }

      // Verify webhook signature and construct event
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        config.webhookSecret
      )

      console.log(`Processing webhook event: ${event.type}`)

      // Handle the event
      await StripeService.handleWebhook(event)

      // Log successful processing
      console.log(`Successfully processed webhook event: ${event.id} (${event.type})`)

      res.json({ received: true, eventId: event.id })
    } catch (error: any) {
      console.error('Webhook processing error:', error)
      
      if (error.type === 'StripeSignatureVerificationError') {
        res.status(400).json({ 
          error: 'Invalid webhook signature',
          code: 'SIGNATURE_VERIFICATION_FAILED' 
        })
        return
      }

      res.status(500).json({ 
        error: 'Webhook processing failed',
        code: 'WEBHOOK_PROCESSING_ERROR' 
      })
    }
  }

  /**
   * Test webhook endpoint for development
   */
  static async testWebhook(req: Request, res: Response): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      res.status(404).json({ error: 'Test endpoint not available in production' })
      return
    }

    try {
      const { eventType = 'test.event', data = {} } = req.body

      console.log(`Processing test webhook event: ${eventType}`)

      // Create a mock Stripe event for testing
      const mockEvent = {
        id: `evt_test_${Date.now()}`,
        type: eventType,
        data: {
          object: data
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: `req_test_${Date.now()}`,
          idempotency_key: null
        }
      } as Stripe.Event

      await StripeService.handleWebhook(mockEvent)

      res.json({ 
        success: true, 
        message: `Test webhook ${eventType} processed successfully`,
        eventId: mockEvent.id
      })
    } catch (error: any) {
      console.error('Test webhook error:', error)
      res.status(500).json({ 
        error: 'Test webhook processing failed',
        message: error.message 
      })
    }
  }

  /**
   * Get webhook processing status
   */
  static async getWebhookStatus(req: Request, res: Response): Promise<void> {
    try {
      const config = await StripeService.getStripeConfig()
      
      const status = {
        configured: !!config?.webhookSecret,
        isLive: config?.isLive || false,
        lastUpdated: config?.updatedAt,
        endpoints: {
          webhook: '/api/webhooks/stripe',
          test: process.env.NODE_ENV !== 'production' ? '/api/webhooks/test' : null
        }
      }

      res.json({
        success: true,
        data: status
      })
    } catch (error) {
      console.error('Get webhook status error:', error)
      res.status(500).json({ error: 'Failed to get webhook status' })
    }
  }
}