# Stripe Integration Guide - Admin Backend

This guide demonstrates how the admin backend provides Stripe integration for the marketing site.

## Overview

The admin backend provides several endpoints to handle Stripe integration:

1. **Admin Configuration** - `/api/stripe/*` (Protected)
2. **Marketing Site Integration** - `/api/marketing/*` (Public)
3. **Webhook Handling** - `/api/webhooks/stripe` (Public)

## Environment Setup

Add the following environment variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key (sandbox/live)
STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key (sandbox/live)
STRIPE_WEBHOOK_SECRET=whsec_...  # Your webhook secret from Stripe dashboard

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

## Admin Portal Setup (First Time)

### 1. Configure Stripe in Admin Portal

**POST** `/api/stripe/config`
```json
{
  "isLive": false,
  "publishableKey": "pk_test_...",
  "webhookSecret": "whsec_...",
  "defaultCurrency": "USD",
  "taxRateId": "txr_..." // Optional
}
```

### 2. Test Stripe Connection

**POST** `/api/stripe/test-connection`

This will verify your Stripe credentials and return account information.

## Marketing Site Integration

### 1. Get Public Configuration

**GET** `/api/marketing/config`

Returns:
```json
{
  "success": true,
  "data": {
    "publishableKey": "pk_test_...",
    "isLive": false,
    "defaultCurrency": "USD"
  }
}
```

### 2. Create Checkout Session

**POST** `/api/marketing/create-checkout-session`

Request:
```json
{
  "organizationName": "Acme Corp",
  "customerEmail": "john@acme.com",
  "priceId": "price_1234567890",
  "successUrl": "https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://yoursite.com/pricing",
  "trialDays": 14
}
```

Response:
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_...",
    "sessionUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
    "organizationId": "uuid-here"
  }
}
```

### 3. Create Customer Portal Session

**POST** `/api/marketing/create-portal-session`

Request:
```json
{
  "organizationId": "uuid-here",
  "returnUrl": "https://yoursite.com/account"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "sessionUrl": "https://billing.stripe.com/p/session/..."
  }
}
```

### 4. Check Subscription Status

**GET** `/api/marketing/subscription/{organizationId}`

Response:
```json
{
  "success": true,
  "data": {
    "organizationId": "uuid-here",
    "organizationName": "Acme Corp",
    "hasSubscription": true,
    "subscription": {
      "plan": "PROFESSIONAL",
      "status": "ACTIVE",
      "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
      "trialEnd": null,
      "cancelAtPeriodEnd": false
    }
  }
}
```

## Frontend Integration Example

### React/JavaScript Example

```javascript
// 1. Get Stripe config
const getStripeConfig = async () => {
  const response = await fetch('/api/marketing/config');
  const data = await response.json();
  return data.data;
};

// 2. Create checkout session
const createCheckoutSession = async (checkoutData) => {
  const response = await fetch('/api/marketing/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutData)
  });
  const data = await response.json();
  return data.data;
};

// 3. Redirect to Stripe Checkout
const handleSubscribe = async (priceId) => {
  try {
    const session = await createCheckoutSession({
      organizationName: 'Customer Company',
      customerEmail: 'user@email.com',
      priceId: priceId,
      successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/pricing`,
      trialDays: 14
    });
    
    // Redirect to Stripe Checkout
    window.location.href = session.sessionUrl;
  } catch (error) {
    console.error('Checkout error:', error);
  }
};
```

## Webhook Configuration

### Stripe Dashboard Setup

1. Go to your Stripe Dashboard → Webhooks
2. Add endpoint: `https://youradminbackend.com/api/webhooks/stripe`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### Webhook Events Handled

The webhook endpoint automatically handles:
- Subscription creation/updates
- Payment success/failure
- Revenue tracking
- Customer lifecycle events

## Admin Portal Features

### Subscription Management

- **GET** `/api/billing/subscriptions` - List all subscriptions
- **GET** `/api/billing/subscriptions/{id}` - Get subscription details
- **PUT** `/api/billing/subscriptions/{id}` - Cancel/pause/resume subscription

### Revenue Analytics

- **GET** `/api/billing/upcoming-renewals` - Get upcoming renewals
- Analytics are automatically tracked via webhook events

### Audit Logging

All admin actions are logged for compliance and tracking.

## Sandbox Testing

### Test Cards

Use Stripe test cards for sandbox testing:
- **4242424242424242** - Successful payment
- **4000000000000002** - Card declined
- **4000000000000341** - Requires authentication (3D Secure)

### Testing Webhooks

Use the test endpoint for webhook development:

**POST** `/api/webhooks/test` (Development only)

```json
{
  "eventType": "customer.subscription.created",
  "data": {
    "id": "sub_test_123",
    "customer": "cus_test_123",
    "status": "active"
  }
}
```

## Security Considerations

1. **Environment Variables**: Never commit Stripe keys to version control
2. **Webhook Signatures**: All webhooks are signature-verified
3. **CORS**: Marketing endpoints allow specific origins only
4. **Rate Limiting**: Implement rate limiting for public endpoints
5. **Input Validation**: All inputs are validated using express-validator

## Troubleshooting

### Common Issues

1. **Invalid Webhook Signature**: Verify webhook secret matches Stripe dashboard
2. **CORS Errors**: Check allowed origins in admin backend configuration
3. **Database Errors**: Ensure PostgreSQL is running and schema is up to date
4. **Stripe API Errors**: Check API keys and account status in Stripe dashboard

### Debug Logging

Enable debug logging by setting:
```env
NODE_ENV=development
```

This provides detailed error messages and request/response logging.