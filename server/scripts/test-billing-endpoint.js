require('dotenv').config();
const authService = require('../services/authService');
const express = require('express');
const billingRouter = require('../routes/billing');

async function test() {
  try {
    // Simulate login to get token
    const loginResult = await authService.login(
      'jestin@jestincoler.com',
      'Fr33d0M!!@!NC',
      '127.0.0.1',
      'test-script'
    );

    console.log('✅ Login successful');
    console.log('Token:', loginResult.token);
    console.log('User:', loginResult.user.email);
    console.log('Organization:', loginResult.organization.name);
    console.log('Subscription from login:', loginResult.organization.subscription?.plan);
    console.log('');

    // Now simulate the billing API call
    const prismaService = require('../services/prismaService');
    const prisma = prismaService.getSystemClient();

    const membership = await prisma.membership.findFirst({
      where: { userId: loginResult.user.id },
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

    const subscription = membership?.organization?.subscription;

    const response = {
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
      plan: subscription?.plan || 'FREE',
      invoices: subscription?.invoices || [],
      usage: {
        apiCallsThisMonth: 0,
        storageUsedGB: 0,
        datasourceCount: 0,
      },
      permissions: {
        canManageBilling: ['OWNER', 'ADMIN'].includes(membership.role),
        canViewBilling: true,
      },
    };

    console.log('📋 /api/billing/subscription response:');
    console.log(JSON.stringify(response, null, 2));
    console.log('');
    console.log('Frontend checks:');
    console.log('  data.subscription.plan:', response.subscription?.plan);
    console.log('  data.plan:', response.plan);
    console.log(
      '  Should enable MCP:',
      ['TEAM', 'BUSINESS', 'ENTERPRISE', 'CUSTOM'].includes(response.plan)
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

test();
