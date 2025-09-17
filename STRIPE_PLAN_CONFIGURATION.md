# Stripe Plan Configuration for 4-Tier Pricing

## Overview

This document outlines the Stripe configuration needed to support the new 4-tier pricing model with clean $10/user overage pricing.

## New 4-Tier Pricing Structure

### Current Plans (Updated)

| Plan | Monthly Price | Annual Price | Users Included | Overage Price |
|------|---------------|--------------|----------------|---------------|
| Free | $0 | $0 | 1 | Not allowed |
| Starter | $29 | $290 | 1 | $10/user/month |
| Team | $99 | $990 | 10 | $10/user/month |
| Business | $199 | $1,990 | 25 | $10/user/month |
| Enterprise | Custom | Custom | Unlimited | Custom |

## Required Stripe Configuration

### 1. Create New 4-Tier Products

#### Starter Plan
```bash
# Create Starter plan product
stripe products create \
  --name "Starter Plan" \
  --description "Full functionality for individuals and small teams - 1 user included"

# Create monthly price
stripe prices create \
  --product prod_STARTER_PLAN_ID \
  --unit_amount 2900 \
  --currency usd \
  --recurring[interval]=month \
  --nickname "starter-monthly"

# Create annual price
stripe prices create \
  --product prod_STARTER_PLAN_ID \
  --unit_amount 29000 \
  --currency usd \
  --recurring[interval]=year \
  --nickname "starter-annual"
```

#### Team Plan
```bash
# Update existing Team plan product
stripe products update prod_TEAM_PLAN_ID \
  --name "Team Plan" \
  --description "Advanced features for growing teams - Up to 10 users included"

# Create new monthly price
stripe prices create \
  --product prod_TEAM_PLAN_ID \
  --unit_amount 9900 \
  --currency usd \
  --recurring[interval]=month \
  --nickname "team-monthly-new"

# Create new annual price
stripe prices create \
  --product prod_TEAM_PLAN_ID \
  --unit_amount 99000 \
  --currency usd \
  --recurring[interval]=year \
  --nickname "team-annual-new"
```

#### Business Plan
```bash
# Update existing Business plan product
stripe products update prod_BUSINESS_PLAN_ID \
  --name "Business Plan" \
  --description "Enterprise security and governance features - Up to 25 users included"

# Create new monthly price
stripe prices create \
  --product prod_BUSINESS_PLAN_ID \
  --unit_amount 19900 \
  --currency usd \
  --recurring[interval]=month \
  --nickname "business-monthly-new"

# Create new annual price
stripe prices create \
  --product prod_BUSINESS_PLAN_ID \
  --unit_amount 199000 \
  --currency usd \
  --recurring[interval]=year \
  --nickname "business-annual-new"
```

### 2. Create User Overage Products (Unified $10/user)

#### Universal User Overage
```bash
# Create universal overage product for all paid plans
stripe products create \
  --name "Additional Users" \
  --description "Additional users for any plan ($10/user/month)" \
  --type service

# Create monthly overage price
stripe prices create \
  --product prod_USER_OVERAGE_ID \
  --unit_amount 1000 \
  --currency usd \
  --recurring[interval]=month \
  --recurring[usage_type]=metered \
  --billing_scheme per_unit \
  --nickname "user-overage-10"
```

This unified approach simplifies billing since all plans now use the same $10/user overage rate.

### 3. Environment Variable Updates

Update the following environment variables:

```bash
# New price IDs for 4-tier structure
STRIPE_PRICE_ID_STARTER_MONTHLY=price_starter_monthly_id
STRIPE_PRICE_ID_STARTER_ANNUAL=price_starter_annual_id
STRIPE_PRICE_ID_TEAM_MONTHLY=price_team_monthly_id
STRIPE_PRICE_ID_TEAM_ANNUAL=price_team_annual_id
STRIPE_PRICE_ID_BUSINESS_MONTHLY=price_business_monthly_id
STRIPE_PRICE_ID_BUSINESS_ANNUAL=price_business_annual_id

# Universal overage price ID
STRIPE_PRICE_ID_USER_OVERAGE=price_user_overage_10_id

# Legacy price IDs (keep for existing customers)
STRIPE_PRICE_ID_PROFESSIONAL_LEGACY=price_old_professional_id
```

## Implementation Strategy

### Phase 1: Update Base Plans (Immediate)
1. Create new Stripe products/prices with updated pricing
2. Update environment variables
3. Update marketing site pricing display
4. Deploy changes

### Phase 2: Implement Overage Billing (2-4 weeks)
1. Create overage products in Stripe
2. Implement usage tracking and reporting
3. Create billing webhook handlers for usage reports
4. Test overage billing flow

### Phase 3: Migrate Existing Customers (4-6 weeks)
1. Create migration script for existing subscriptions
2. Communicate changes to existing customers
3. Offer grandfathering for current customers if desired
4. Execute migration

## Webhook Configuration

### Required Webhooks

Add these webhook endpoints to handle billing events:

```javascript
// server/routes/webhooks/stripe.js
app.post('/webhook/stripe', async (req, res) => {
  const event = req.body;

  switch (event.type) {
    case 'subscription_schedule.created':
    case 'subscription_schedule.updated':
      // Handle subscription changes
      await handleSubscriptionUpdate(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      // Handle successful payments, including overage charges
      await handlePaymentSuccess(event.data.object);
      break;

    case 'usage_record.summary.created':
      // Handle usage reporting for overages
      await handleUsageReport(event.data.object);
      break;
  }

  res.json({received: true});
});
```

## Migration Script

### Existing Customer Migration

```javascript
// server/scripts/migrateStripePlans.js
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();

async function migrateExistingCustomers() {
  // Get all active subscriptions
  const subscriptions = await prisma.subscription.findMany({
    where: { status: 'active' },
    include: { organization: true }
  });

  for (const subscription of subscriptions) {
    try {
      // Check current plan
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

      // Map old prices to new prices
      const priceMapping = {
        'price_old_starter': process.env.STRIPE_PRICE_ID_TEAM_MONTHLY,
        'price_old_professional': process.env.STRIPE_PRICE_ID_BUSINESS_MONTHLY,
      };

      const newPriceId = priceMapping[stripeSub.items.data[0].price.id];

      if (newPriceId) {
        // Update subscription with new pricing
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: [{
            id: stripeSub.items.data[0].id,
            price: newPriceId,
          }],
          proration_behavior: 'none', // No immediate charge
        });

        // Update database with new limits
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            userLimit: newPriceId.includes('team') ? 10 : 25,
            userOveragePrice: newPriceId.includes('team') ? 15.00 : 12.00,
          }
        });

        console.log(`Migrated subscription ${subscription.id} to new pricing`);
      }
    } catch (error) {
      console.error(`Failed to migrate subscription ${subscription.id}:`, error);
    }
  }
}
```

## Testing Checklist

### Pre-deployment Testing
- [ ] Verify new Stripe products are created correctly
- [ ] Test subscription creation with new pricing
- [ ] Verify pricing display on marketing site
- [ ] Test user calculator functionality

### Post-deployment Testing
- [ ] Create test subscription with Team plan
- [ ] Verify user limits are enforced
- [ ] Test overage calculation (when implemented)
- [ ] Verify billing amounts are correct

### Customer Communication
- [ ] Draft announcement for pricing changes
- [ ] Prepare FAQ for customer support
- [ ] Update documentation and help articles
- [ ] Plan grandfathering strategy for existing customers

## Rollback Plan

### If Issues Arise
1. Revert environment variables to old price IDs
2. Disable new user calculator on pricing page
3. Restore old pricing display
4. Communicate delays to customers

### Emergency Contacts
- Stripe Support: support.stripe.com
- Engineering Team: [team contact]
- Customer Success: [cs contact]

## Success Metrics

### Track These KPIs
- Conversion rate on new pricing page
- Customer churn rate during transition
- Average revenue per user (ARPU)
- Support ticket volume related to pricing
- Time to migrate existing customers

## Next Steps

1. **Week 1**: Create new Stripe products and test
2. **Week 2**: Deploy updated pricing page
3. **Week 3**: Implement usage tracking endpoints
4. **Week 4**: Begin customer migration planning
5. **Week 6**: Execute customer migration
6. **Week 8**: Full overage billing implementation

This phased approach minimizes risk while implementing the improved pricing structure that addresses customer feedback about pricing being too high.