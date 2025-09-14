const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

// In-memory processed event cache (best-effort idempotency)
const processedEvents = new Set();

// Helper function to create user account from payment
async function createUserAccountFromPayment({
  email,
  stripeCustomerId,
  stripeSubscriptionId,
  stripePriceId,
  subscription,
  statusEnum,
  prisma,
}) {
  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    console.log(`User already exists for email: ${email}`);
    return user;
  }

  // Extract name from email (fallback)
  const emailParts = email.split('@')[0];
  const firstName = emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
  const lastName = 'User';

  // Create organization name from email domain
  const domain = email.split('@')[1];
  const orgName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  const orgSlug = `${orgName.toLowerCase()}-${Date.now()}`;

  try {
    // Create user, organization, and subscription in a transaction
    const result = await prisma.$transaction(async tx => {
      // Create user (unverified initially)
      const newUser = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          emailVerified: false, // Will be verified via email
          passwordHash: null, // Will be set when user verifies email
        },
      });

      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
        },
      });

      // Create membership (owner role)
      await tx.membership.create({
        data: {
          userId: newUser.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
      });

      // Create subscription
      const subscriptionData = {
        organizationId: organization.id,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      };

      if (statusEnum) {
        subscriptionData.status = statusEnum;
      }

      await tx.subscription.create({
        data: subscriptionData,
      });

      // Create email verification token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await tx.emailVerificationToken.create({
        data: {
          token,
          email,
          expiresAt,
        },
      });

      // Send welcome email with verification (we'll implement this next)
      try {
        await sendWelcomeEmail(email, token, firstName);
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
        // Don't fail the transaction if email fails
      }

      return { user: newUser, organization };
    });

    console.log(`Created account for ${email} with organization ${orgName}`);
    return result.user;
  } catch (error) {
    console.error('Account creation failed:', error);
    throw error;
  }
}

// Send welcome email with verification token using existing mailer
async function sendWelcomeEmail(email, token, firstName) {
  try {
    const { sendEmail } = require('../utils/mailer');

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e1e1e1; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e1e1; font-size: 14px; color: #666; }
          .success-badge { display: inline-block; padding: 4px 12px; background: #10b981; color: white; border-radius: 12px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to NectarStudio.ai!</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Thank you for subscribing to NectarStudio.ai! Your payment has been processed successfully.</p>

            <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
              <p style="margin: 0;"><strong>✅ Subscription Active</strong><br>
              <span class="success-badge">Your account is ready to use!</span></p>
            </div>

            <p>To complete your account setup and start using your new features, please verify your email address:</p>

            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email & Set Password</a>
            </div>

            <p><strong>What happens next?</strong></p>
            <ol>
              <li>Click the verification button above</li>
              <li>Set your secure password</li>
              <li>Start building amazing workflows and integrations!</li>
            </ol>

            <p style="color: #666; font-size: 14px;">This verification link will expire in 24 hours for security.</p>

            <div class="footer">
              <p><strong>Need help?</strong><br>
              Our team is here to help you get started. Reply to this email or contact us at <a href="mailto:support@nectar.com">support@nectar.com</a>.</p>

              <p style="color: #999; font-size: 12px;">
                If you didn't create this account, please ignore this email or contact support.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: '🎉 Welcome to NectarStudio.ai - Verify your email to get started!',
      html: emailHtml,
    });

    console.log(`Welcome email sent successfully to ${email}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

// Optionally verify CAPTCHA token (reCAPTCHA or hCaptcha)
async function verifyCaptcha(token) {
  try {
    const provider = process.env.CAPTCHA_PROVIDER; // 'recaptcha' | 'hcaptcha'
    if (!provider || !token) return true; // Skip if not configured

    if (provider === 'recaptcha') {
      const secret = process.env.RECAPTCHA_SECRET;
      if (!secret) return true;
      const fetch = require('node-fetch');
      const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
      });
      const data = await resp.json();
      return !!data.success;
    }

    if (provider === 'hcaptcha') {
      const secret = process.env.HCAPTCHA_SECRET;
      if (!secret) return true;
      const fetch = require('node-fetch');
      const resp = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
      });
      const data = await resp.json();
      return !!data.success;
    }

    return true;
  } catch (e) {
    console.error('CAPTCHA verification error:', e);
    return false;
  }
}

// Create a Stripe Checkout Session
router.post('/session', express.json(), async (req, res) => {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return res.status(501).json({ error: 'Stripe not configured' });

    let Stripe;
    try {
      Stripe = require('stripe');
    } catch (e) {
      return res.status(500).json({ error: 'Stripe SDK not installed on server' });
    }

    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
    const { priceId, email, trialDays, captchaToken } = req.body || {};
    if (!priceId) return res.status(400).json({ error: 'Missing priceId' });

    // Optional CAPTCHA verification
    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) return res.status(400).json({ error: 'Captcha verification failed' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: true,
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: trialDays
        ? { trial_period_days: Math.min(Math.max(trialDays, 0), 30) }
        : undefined,
      automatic_tax: { enabled: true },
      success_url:
        process.env.CHECKOUT_SUCCESS_URL ||
        'http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.CHECKOUT_CANCEL_URL || 'http://localhost:3000/pricing',
      metadata: { source: 'marketing_site' },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Create checkout session error:', err);
    return res.status(400).json({ error: 'Unable to start checkout' });
  }
});

// Stripe webhook receiver
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return res.status(501).json({ error: 'Stripe not configured' });

  let Stripe;
  try {
    Stripe = require('stripe');
  } catch (e) {
    return res.status(500).json({ error: 'Stripe SDK not installed on server' });
  }

  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing signature' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    // Best-effort idempotency guard (process lifetime)
    if (processedEvents.has(event.id)) return res.json({ received: true });

    // Attempt to persist a unique record for idempotency when possible
    // If DB is available and model exists, save a BillingEvent with unique stripeEventId
    try {
      const { getPrismaClient } = require('../config/prisma');
      const prisma = getPrismaClient();
      // Try to attach to a subscription/org if present, else store minimal data
      let subscriptionId = null;
      let organizationId = null;

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        // Try to look up by customer
        if (session.customer) {
          const sub = await prisma.subscription.findFirst({
            where: { stripeCustomerId: String(session.customer) },
          });
          if (sub) {
            subscriptionId = sub.id;
            organizationId = sub.organizationId;
          }
        }
      }

      if (organizationId) {
        await prisma.billingEvent.create({
          data: {
            organizationId,
            subscriptionId,
            eventType: event.type,
            stripeEventId: event.id,
            metadata: event,
          },
        });
      }
    } catch (e) {
      // If DB unavailable or schema mismatch, fall back to in-memory idempotency only
      // console.warn('BillingEvent persistence skipped:', e)
    }

    // Persist subscription/invoice where possible
    try {
      const { getPrismaClient } = require('../config/prisma');
      const prisma = getPrismaClient();

      // Helpers
      const mapSubStatus = s => {
        const m = {
          trialing: 'TRIALING',
          active: 'ACTIVE',
          past_due: 'PAST_DUE',
          canceled: 'CANCELED',
          unpaid: 'UNPAID',
          incomplete: 'INCOMPLETE',
          incomplete_expired: 'INCOMPLETE_EXPIRED',
        };
        return m[s] || null;
      };

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const subId = session.subscription ? String(session.subscription) : null;
        const customerId = session.customer ? String(session.customer) : null;
        const customerEmail = session.customer_details?.email || session.customer_email;

        if (subId && customerEmail) {
          // Fetch live subscription details from Stripe for accurate periods/status
          const stripeSub = await stripe.subscriptions.retrieve(subId);
          const priceId = stripeSub.items?.data?.[0]?.price?.id || null;
          const statusEnum = mapSubStatus(stripeSub.status);

          // CREATE USER ACCOUNT AND ORGANIZATION
          try {
            await createUserAccountFromPayment({
              email: customerEmail,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subId,
              stripePriceId: priceId,
              subscription: stripeSub,
              statusEnum,
              prisma,
            });
          } catch (accountErr) {
            console.error('Account creation error:', accountErr);
            // Continue with subscription update even if account creation fails
          }

          // Try to find Subscription by stripeSubscriptionId or stripeCustomerId
          let sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
          if (!sub && customerId) {
            sub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
          }

          if (sub) {
            const data = {
              stripeSubscriptionId: subId,
              stripeCustomerId: customerId || sub.stripeCustomerId,
              stripePriceId: priceId,
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
              cancelAtPeriodEnd: !!stripeSub.cancel_at_period_end,
              trialEndsAt: stripeSub.trial_end
                ? new Date(stripeSub.trial_end * 1000)
                : sub.trialEndsAt,
            };
            if (statusEnum) data.status = statusEnum;
            await prisma.subscription.update({ where: { id: sub.id }, data });
          }
        }
      }

      if (
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.deleted'
      ) {
        const stripeSub = event.data.object;
        const subId = String(stripeSub.id);
        const customerId = stripeSub.customer ? String(stripeSub.customer) : null;
        const priceId = stripeSub.items?.data?.[0]?.price?.id || null;
        const statusEnum = mapSubStatus(stripeSub.status);

        const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
        if (sub) {
          const data = {
            stripeCustomerId: customerId || sub.stripeCustomerId,
            stripePriceId: priceId,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            cancelAtPeriodEnd: !!stripeSub.cancel_at_period_end,
            trialEndsAt: stripeSub.trial_end
              ? new Date(stripeSub.trial_end * 1000)
              : sub.trialEndsAt,
          };
          if (statusEnum) data.status = statusEnum;
          await prisma.subscription.update({ where: { id: sub.id }, data });
        }
      }

      if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
        const inv = event.data.object;
        const stripeSubId = inv.subscription ? String(inv.subscription) : null;
        if (stripeSubId) {
          const sub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: stripeSubId },
          });
          if (sub) {
            const stripeInvoiceId = inv.id;
            const amountCents =
              typeof inv.amount_paid === 'number' && inv.amount_paid > 0
                ? inv.amount_paid
                : inv.amount_due;
            const amount = amountCents != null ? amountCents / 100 : null;
            const data = {
              invoiceNumber: inv.number || `${stripeInvoiceId}`,
              amount: amount || 0,
              currency: (inv.currency || 'USD').toUpperCase(),
              hostedInvoiceUrl: inv.hosted_invoice_url || null,
              stripeInvoiceId,
              stripePaymentIntentId: inv.payment_intent ? String(inv.payment_intent) : null,
              paidAt:
                event.type === 'invoice.paid'
                  ? new Date(inv.status_transitions?.paid_at * 1000 || Date.now())
                  : null,
            };

            // Upsert on unique stripeInvoiceId when possible
            if (stripeInvoiceId) {
              await prisma.invoice.upsert({
                where: { stripeInvoiceId },
                update: data,
                create: { ...data, subscriptionId: sub.id },
              });
            } else {
              // Fallback: create by subscription relation
              await prisma.invoice.create({ data: { ...data, subscriptionId: sub.id } });
            }
          }
        }
      }
    } catch (persistErr) {
      console.error('Billing persistence error:', persistErr);
      // continue, we still ack the event
    }

    switch (event.type) {
      default:
        break;
    }
    processedEvents.add(event.id);
    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook error' });
  }
});

module.exports = router;

// Retrieve checkout session details (server-side, secure)
router.get('/session/:id', async (req, res) => {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return res.status(501).json({ error: 'Stripe not configured' });
    let Stripe;
    try {
      Stripe = require('stripe');
    } catch {
      return res.status(500).json({ error: 'Stripe SDK not installed on server' });
    }
    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
    const id = req.params.id;
    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ['subscription', 'payment_intent', 'invoice'],
    });
    res.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email || session.customer_email || null,
      subscription_id: session.subscription
        ? String(session.subscription.id || session.subscription)
        : null,
      amount_total: session.amount_total,
      currency: session.currency,
    });
  } catch (e) {
    console.error('Get session error:', e);
    res.status(400).json({ error: 'Unable to retrieve session' });
  }
});

// Create a Stripe Customer Portal session for authenticated users
router.post('/portal', authMiddleware, express.json(), async (req, res) => {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return res.status(501).json({ error: 'Stripe not configured' });
    let Stripe;
    try {
      Stripe = require('stripe');
    } catch {
      return res.status(500).json({ error: 'Stripe SDK not installed on server' });
    }
    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    const returnUrl =
      process.env.BILLING_PORTAL_RETURN_URL ||
      (process.env.PUBLIC_URL
        ? `${process.env.PUBLIC_URL}/billing`
        : 'http://localhost:3000/billing');

    const { getPrismaClient } = require('../config/prisma');
    const prisma = getPrismaClient({ userId: req.user?.userId });

    // Find user's primary organization and subscription
    const membership = await prisma.membership.findFirst({
      where: { userId: req.user.userId },
      include: { organization: { include: { subscription: true } } },
    });

    const sub = membership?.organization?.subscription;
    if (!sub || !sub.stripeCustomerId) {
      return res.status(404).json({ error: 'No subscription found for current user' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    res.json({ url: portalSession.url });
  } catch (e) {
    console.error('Create billing portal session error:', e);
    res.status(400).json({ error: 'Unable to create billing portal session' });
  }
});
