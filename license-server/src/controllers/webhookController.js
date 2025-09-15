const express = require('express');
const { PrismaClient } = require('../../prisma/generated/client');
const LicenseService = require('../services/licenseService');

const router = express.Router();
const prisma = new PrismaClient();
const licenseService = new LicenseService();

/**
 * Stripe webhook handler
 * POST /api/webhooks/stripe
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // In production, verify the webhook signature here
    // const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    // For now, parse the JSON body
    const event = JSON.parse(req.body.toString());

    console.log('Received Stripe webhook:', event.type);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

async function handleSubscriptionUpdate(subscription) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: subscription.customer }
    });

    if (!customer) {
      console.log('Customer not found for subscription update');
      return;
    }

    // Find or create license for this subscription
    let license = await prisma.license.findFirst({
      where: {
        customerId: customer.id,
        isActive: true
      }
    });

    if (!license) {
      // Create new license
      const licenseData = {
        customerId: customer.id,
        plan: mapStripePlanToPlan(subscription.items.data[0]?.price?.id),
        expiresAt: new Date(subscription.current_period_end * 1000),
        amount: subscription.items.data[0]?.price?.unit_amount / 100,
        currency: subscription.currency
      };

      license = await licenseService.createLicense(licenseData);
    } else {
      // Update existing license
      await prisma.license.update({
        where: { id: license.id },
        data: {
          expiresAt: new Date(subscription.current_period_end * 1000),
          isActive: subscription.status === 'active',
          isSuspended: subscription.status === 'past_due'
        }
      });
    }

    console.log('License updated from subscription:', license.id);

  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

async function handleSubscriptionCancellation(subscription) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: subscription.customer }
    });

    if (customer) {
      await prisma.license.updateMany({
        where: { customerId: customer.id },
        data: { isSuspended: true }
      });

      console.log('Licenses suspended for cancelled subscription');
    }

  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

async function handlePaymentSuccess(invoice) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: invoice.customer }
    });

    if (customer) {
      // Reactivate any suspended licenses
      await prisma.license.updateMany({
        where: {
          customerId: customer.id,
          isSuspended: true
        },
        data: { isSuspended: false }
      });

      console.log('Licenses reactivated after successful payment');
    }

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailure(invoice) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: invoice.customer }
    });

    if (customer) {
      // Suspend licenses for failed payment
      await prisma.license.updateMany({
        where: { customerId: customer.id },
        data: { isSuspended: true }
      });

      console.log('Licenses suspended after payment failure');
    }

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

function mapStripePlanToPlan(priceId) {
  // Map Stripe price IDs to your plan types
  const planMapping = {
    'price_starter_monthly': 'STARTER',
    'price_pro_monthly': 'PROFESSIONAL',
    'price_enterprise_monthly': 'ENTERPRISE'
  };

  return planMapping[priceId] || 'STARTER';
}

module.exports = router;