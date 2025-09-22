const express = require('express');
const router = express.Router();
const AuthFactory = require('../middleware/authFactory');
const authenticateJWT = AuthFactory.createJWTMiddleware();
const { getPrismaClient } = require('../config/prisma');
const logger = require('../utils/logger');

// Create Stripe Customer Portal session for subscription management
router.post('/portal', authenticateJWT, async (req, res) => {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return res.status(501).json({ error: 'Stripe not configured' });
    }

    let Stripe;
    try {
      Stripe = require('stripe');
    } catch (e) {
      return res.status(500).json({ error: 'Stripe SDK not installed on server' });
    }

    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
    const prisma = getPrismaClient({ userId: req.user?.userId });

    // Find user's primary organization and subscription
    const membership = await prisma.membership.findFirst({
      where: {
        userId: req.user.userId,
        role: { in: ['OWNER', 'ADMIN'] }, // Only OWNER and ADMIN can manage billing
      },
      include: {
        organization: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied. Only organization owners and admins can manage billing.',
      });
    }

    const subscription = membership?.organization?.subscription;
    if (!subscription || !subscription.stripeCustomerId) {
      return res.status(404).json({
        error: 'No active subscription found for your organization',
      });
    }

    // Create portal session with Stripe
    const returnUrl =
      process.env.BILLING_PORTAL_RETURN_URL ||
      (process.env.PUBLIC_URL
        ? `${process.env.PUBLIC_URL}/settings/billing`
        : 'http://localhost:3000/settings/billing');

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    logger.info(
      `Billing portal session created for user ${req.user.userId}, org ${membership.organization.id}`
    );

    res.json({ url: portalSession.url });
  } catch (error) {
    logger.error('Create billing portal session error:', error);
    res.status(400).json({
      error: 'Unable to create billing portal session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Get current subscription details
router.get('/subscription', authenticateJWT, async (req, res) => {
  try {
    const prisma = getPrismaClient({ userId: req.user?.userId });

    const membership = await prisma.membership.findFirst({
      where: { userId: req.user.userId },
      include: {
        organization: {
          include: {
            subscription: {
              include: {
                invoices: {
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
            },
            _count: {
              select: { memberships: true },
            },
          },
        },
      },
    });

    if (!membership || !membership.organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const subscription = membership.organization.subscription;

    // Calculate usage metrics
    const usageMetrics = await calculateUsageMetrics(prisma, membership.organization.id);

    res.json({
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        memberCount: membership.organization._count.memberships,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            trialEndsAt: subscription.trialEndsAt,
            monthlyRevenue: subscription.monthlyRevenue,
          }
        : null,
      invoices: subscription?.invoices || [],
      usage: usageMetrics,
      permissions: {
        canManageBilling: ['OWNER', 'ADMIN'].includes(membership.role),
        canViewBilling: true,
      },
    });
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({
      error: 'Unable to fetch subscription details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Get billing history
router.get('/invoices', authenticateJWT, async (req, res) => {
  try {
    const prisma = getPrismaClient({ userId: req.user?.userId });
    const { limit = 20, offset = 0 } = req.query;

    const membership = await prisma.membership.findFirst({
      where: { userId: req.user.userId },
      include: { organization: true },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: membership.organization.id },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
        },
      },
    });

    if (!subscription) {
      return res.json({ invoices: [], total: 0 });
    }

    const totalCount = await prisma.invoice.count({
      where: { subscriptionId: subscription.id },
    });

    res.json({
      invoices: subscription.invoices,
      total: totalCount,
      hasMore: parseInt(offset) + subscription.invoices.length < totalCount,
    });
  } catch (error) {
    logger.error('Get invoices error:', error);
    res.status(500).json({
      error: 'Unable to fetch billing history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Get available plans for upgrade/downgrade
router.get('/plans', authenticateJWT, async (req, res) => {
  try {
    // Define available plans with their features
    const plans = [
      {
        id: 'free',
        name: 'Free',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: {
          users: 1,
          datasources: 1,
          apiCallsPerMonth: 25000,
          storageGB: 0.1,
        },
      },
      {
        id: 'starter',
        name: 'Starter',
        monthlyPrice: 29,
        yearlyPrice: 290,
        stripePriceIdMonthly: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY,
        stripePriceIdYearly: process.env.STRIPE_PRICE_ID_STARTER_YEARLY,
        features: {
          users: 1,
          datasources: 3,
          apiCallsPerMonth: 1000000,
          storageGB: 5,
          additionalUserPrice: 10,
        },
      },
      {
        id: 'team',
        name: 'Team',
        monthlyPrice: 99,
        yearlyPrice: 990,
        stripePriceIdMonthly: process.env.STRIPE_PRICE_ID_TEAM_MONTHLY,
        stripePriceIdYearly: process.env.STRIPE_PRICE_ID_TEAM_YEARLY,
        features: {
          users: 10,
          datasources: -1, // unlimited
          apiCallsPerMonth: 5000000,
          storageGB: 50,
          additionalUserPrice: 10,
        },
      },
      {
        id: 'business',
        name: 'Business',
        monthlyPrice: 199,
        yearlyPrice: 1990,
        stripePriceIdMonthly: process.env.STRIPE_PRICE_ID_BUSINESS_MONTHLY,
        stripePriceIdYearly: process.env.STRIPE_PRICE_ID_BUSINESS_YEARLY,
        features: {
          users: 25,
          datasources: -1, // unlimited
          apiCallsPerMonth: 10000000,
          storageGB: 250,
          additionalUserPrice: 10,
        },
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPrice: null,
        yearlyPrice: null,
        features: {
          users: -1, // unlimited
          datasources: -1, // unlimited
          apiCallsPerMonth: -1, // unlimited
          storageGB: 1000,
          customSupport: true,
        },
      },
    ];

    // Get current subscription to highlight current plan
    const prisma = getPrismaClient({ userId: req.user?.userId });
    const membership = await prisma.membership.findFirst({
      where: { userId: req.user.userId },
      include: {
        organization: {
          include: { subscription: true },
        },
      },
    });

    const currentPlan = membership?.organization?.subscription?.plan || 'FREE';

    res.json({
      plans,
      currentPlan: currentPlan.toLowerCase(),
    });
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({
      error: 'Unable to fetch available plans',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Helper function to calculate usage metrics
async function calculateUsageMetrics(prisma, organizationId) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Initialize metrics with defaults
    let apiCallsThisMonth = 0;
    let storageUsedGB = 0;
    let datasourceCount = 0;

    // Get API usage from billing events as a proxy
    try {
      const billingEvents = await prisma.billingEvent.count({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth },
          eventType: { contains: 'api' },
        },
      });
      apiCallsThisMonth = billingEvents * 100; // Rough estimate
    } catch (e) {
      logger.warn('Could not calculate API usage from billing events:', e.message);
    }

    // Get storage usage from files table
    try {
      const storageUsage = await prisma.file.aggregate({
        where: { organizationId },
        _sum: { size: true },
      });
      storageUsedGB = (storageUsage._sum.size || 0) / (1024 * 1024 * 1024);
    } catch (e) {
      logger.warn('Could not calculate storage usage:', e.message);
    }

    // Get datasource count
    try {
      datasourceCount = await prisma.dataSource.count({
        where: { organizationId },
      });
    } catch (e) {
      // Try alternative table names
      try {
        datasourceCount = await prisma.connection.count({
          where: { organizationId },
        });
      } catch (e2) {
        logger.warn('Could not calculate datasource count:', e2.message);
      }
    }

    return {
      apiCallsThisMonth,
      storageUsedGB,
      datasourceCount,
      calculatedAt: now.toISOString(),
    };
  } catch (error) {
    logger.error('Calculate usage metrics error:', error);
    return {
      apiCallsThisMonth: 0,
      storageUsedGB: 0,
      datasourceCount: 0,
      calculatedAt: new Date().toISOString(),
      error: 'Unable to calculate usage metrics',
    };
  }
}

module.exports = router;
