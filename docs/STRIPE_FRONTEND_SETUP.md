# Stripe Frontend Configuration Setup

This guide walks you through configuring the Stripe integration using the admin frontend interface.

## 🚀 Quick Start

1. **Start the admin backend**:
   ```bash
   cd admin-backend
   npm run dev
   ```

2. **Start the admin frontend**:
   ```bash
   cd admin-frontend  
   npm run dev
   ```

3. **Access the admin portal**:
   - Go to `http://localhost:3002`
   - Login with your admin credentials
   - Navigate to **Billing → Stripe Configuration**

## 📋 Prerequisites

### Backend Setup
1. Ensure your admin backend `.env` file contains:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_key_here
   DATABASE_URL="postgresql://user:pass@localhost:5432/db"
   ```

2. Make sure the database is running and migrated:
   ```bash
   cd admin-backend
   npm run db:generate
   npm run db:migrate
   ```

### Get Stripe Keys
1. Go to [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. Your Secret Key should already be in your backend `.env` file

## 🔧 Configuration Steps

### Step 1: Configure Stripe Settings

1. **Navigate to Stripe Configuration**:
   - Admin Portal → Billing → Stripe Configuration

2. **Environment Selection**:
   - Choose **Test/Sandbox** for development
   - Choose **Live/Production** for production

3. **Enter Publishable Key**:
   - Paste your Stripe publishable key
   - Use `pk_test_...` for sandbox
   - Use `pk_live_...` for production

4. **Set Default Currency**:
   - Choose your primary currency (USD, EUR, etc.)

5. **Save Configuration**:
   - Click "Save Configuration"
   - The system will automatically test the connection

### Step 2: Set Up Webhooks

1. **Get Webhook URL**:
   - Your webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - For local testing: `http://localhost:4001/api/webhooks/stripe`

2. **Configure in Stripe Dashboard**:
   - Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add Endpoint"
   - Enter your webhook URL
   - Select these events:
     ```
     customer.subscription.created
     customer.subscription.updated
     customer.subscription.deleted
     invoice.payment_succeeded
     invoice.payment_failed
     ```

3. **Add Webhook Secret**:
   - Copy the webhook signing secret (starts with `whsec_`)
   - Paste it in the admin interface under "Webhook Secret"
   - Save the configuration

### Step 3: Verify Setup

1. **Connection Status**:
   - Green status indicates successful connection
   - Shows account details (ID, country, currency)
   - Displays charge/payout capabilities

2. **Webhook Verification**:
   - Configured webhooks appear in the interface
   - Shows enabled events and status

## 🧪 Testing

### Test Webhook (Development Only)
```bash
curl -X POST http://localhost:4001/api/webhooks/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "eventType": "customer.subscription.created",
    "data": {
      "id": "sub_test_123",
      "customer": "cus_test_123",
      "status": "active"
    }
  }'
```

### Test Marketing Integration
Once configured, your marketing site can use:

```javascript
// Get public config
const config = await fetch('http://localhost:4001/api/marketing/config')

// Create checkout session  
const session = await fetch('http://localhost:4001/api/marketing/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationName: 'Test Company',
    customerEmail: 'test@example.com', 
    priceId: 'price_your_stripe_price_id',
    successUrl: 'https://yoursite.com/success',
    cancelUrl: 'https://yoursite.com/pricing'
  })
})
```

## 🔍 Interface Features

### ✅ Configuration Form
- **Environment Toggle**: Switch between test/live modes
- **Publishable Key**: Secure input with show/hide toggle  
- **Webhook Secret**: Protected field for signature verification
- **Currency Selection**: Dropdown with major currencies
- **Tax Rate ID**: Optional field for automatic tax calculation

### ✅ Connection Status  
- **Account Verification**: Shows Stripe account details
- **Capability Check**: Displays charges/payouts status
- **Real-time Testing**: "Test Connection" button

### ✅ Webhook Management
- **Endpoint Discovery**: Lists configured webhooks from Stripe
- **Event Monitoring**: Shows enabled events per endpoint
- **Status Tracking**: Displays webhook health and creation dates

### ✅ Setup Guidance
- **Step-by-step Instructions**: Built-in setup guide
- **Link Integration**: Direct links to Stripe dashboard
- **Best Practices**: Security and configuration recommendations

## 🛠️ Troubleshooting

### Common Issues

**Connection Test Fails**
- Verify STRIPE_SECRET_KEY in backend .env
- Ensure backend server is running on port 4001
- Check admin token is valid (re-login if needed)

**Webhook Signature Errors**
- Verify webhook secret matches Stripe dashboard
- Ensure webhook URL is accessible from Stripe
- Check webhook endpoint is configured correctly

**CORS Errors**
- Add frontend URL to ALLOWED_ORIGINS in backend .env
- Verify admin backend accepts requests from frontend

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify backend logs for API errors
3. Test Stripe API keys in Stripe dashboard
4. Confirm database connectivity and schema

## 🚀 Production Checklist

- [ ] Switch to Live mode in admin interface
- [ ] Update to live Stripe keys (pk_live_ and sk_live_)
- [ ] Configure production webhook endpoints
- [ ] Test live payment flow
- [ ] Monitor webhook delivery in Stripe dashboard
- [ ] Set up proper SSL/TLS for webhook endpoints
- [ ] Configure production database with backups

## 🔗 Related Documentation

- [Stripe Integration Guide](./admin-backend/STRIPE_INTEGRATION_GUIDE.md) - Backend API documentation
- [Admin Backend Setup](./admin-backend/README.md) - Backend configuration
- [Marketing Site Integration](./docs/marketing-integration.md) - Frontend checkout flow

The Stripe configuration interface provides a complete, secure, and user-friendly way to manage your Stripe integration without touching code or environment files!