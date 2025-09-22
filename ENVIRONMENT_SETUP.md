# Environment Configuration Guide

## 🏗️ Architecture Overview

The Stripe integration uses a **hybrid configuration approach**:

1. **Environment Variables** - For sensitive keys and server-side settings
2. **Admin UI Configuration** - For manageable settings via the admin dashboard
3. **Database Storage** - For configuration that needs to be updated via UI

## 📁 Environment Files Needed

### 1. Main Server (`/server/.env`)
```bash
# Core Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... # OR sk_test_... for testing
STRIPE_WEBHOOK_SECRET=whsec_... # From Stripe webhook endpoint

# Billing Portal URLs
BILLING_PORTAL_RETURN_URL=https://yourdomain.com/settings/billing
FRONTEND_URL=https://yourdomain.com

# Price IDs (can also be managed via admin UI)
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_TEAM=price_...
STRIPE_PRICE_ID_BUSINESS=price_...
```

### 2. Marketing Site Backend (`/marketing-site/backend/.env`)
```bash
# Same Stripe keys for checkout processing
STRIPE_SECRET_KEY=sk_live_... # Same as main server
STRIPE_WEBHOOK_SECRET=whsec_... # Different webhook secret for marketing site

# Marketing-specific URLs
CHECKOUT_SUCCESS_URL=https://yourdomain.com/checkout/success?session_id={CHECKOUT_SESSION_ID}
CHECKOUT_CANCEL_URL=https://yourdomain.com/pricing
FRONTEND_URL=https://yourdomain.com

# Price IDs for checkout
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_TEAM=price_...
STRIPE_PRICE_ID_BUSINESS=price_...
```

### 3. Admin Backend (`/admin-backend/.env`)
```bash
# Secret key for Stripe API calls
STRIPE_SECRET_KEY=sk_live_... # Same as other services

# Database and other admin configs
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

### 4. Root Directory (`/.env`)
```bash
# Optional: For development and testing scripts
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🎛️ Admin UI Configuration

The following settings can be managed via the admin dashboard at `/admin/stripe-config`:

- **Environment Mode** (Test/Live)
- **Publishable Key** (safe to store in database)
- **Default Currency**
- **Tax Rate ID**
- **Webhook Secret** (for admin webhook endpoint)

## 🔧 Setup Process

### Step 1: Install Dependencies ✅
```bash
# Already completed
npm install stripe # in root, server, admin-backend, marketing-site/backend
```

### Step 2: Create Environment Files
```bash
# Copy the template
cp .env.stripe.example server/.env
cp .env.stripe.example marketing-site/backend/.env
cp .env.stripe.example admin-backend/.env

# Edit each file with appropriate values
```

### Step 3: Stripe Dashboard Setup
1. **Create Products & Prices** in Stripe Dashboard
2. **Copy Price IDs** to environment files
3. **Create Webhook Endpoints**:
   - Marketing: `https://yourdomain.com/api/checkout/webhook`
   - Main App: `https://yourdomain.com/api/webhooks/stripe`
   - Admin: `https://yourdomain.com/api/webhooks/stripe` (same as main)

### Step 4: Admin Configuration
1. **Start admin-backend**: `cd admin-backend && npm run dev`
2. **Navigate to**: `http://localhost:4000/admin/stripe-config`
3. **Configure**:
   - Toggle Live/Test mode
   - Enter publishable key
   - Set default currency
   - Configure webhook secret

## 🔐 Security Notes

### Environment Variables (Server-Side Only)
- `STRIPE_SECRET_KEY` - Never expose to frontend
- `STRIPE_WEBHOOK_SECRET` - Used for signature verification

### Database/Admin UI (Safe for UI)
- `publishableKey` - Safe to expose to frontend
- `defaultCurrency` - UI configuration
- `taxRateId` - Stripe tax configuration

### Split Configuration Strategy
```
Environment Variables (Sensitive):
├── STRIPE_SECRET_KEY (all services)
├── STRIPE_WEBHOOK_SECRET (per endpoint)
└── Price IDs (can be in env OR admin UI)

Database/Admin UI (Manageable):
├── publishableKey (frontend safe)
├── isLive (environment toggle)
├── defaultCurrency (business logic)
└── taxRateId (tax configuration)
```

## 🧪 Testing Configuration

Run the test script to validate setup:
```bash
# Test all configurations
node scripts/test-stripe-integration.js

# Should show:
# ✅ Environment configuration looks good!
# ✅ Connected to Stripe account
# ✅ Webhook signature validation working
# ✅ Database models accessible
```

## 🚀 Production Deployment

### Environment Priority:
1. **Marketing Site Backend** - Needs env vars for checkout
2. **Main Server** - Needs env vars for billing portal
3. **Admin Backend** - Needs env vars + UI config for management

### Webhook Configuration:
1. **Marketing Webhook** - Handles checkout completion
2. **Main App Webhook** - Handles subscription lifecycle
3. **Admin Monitoring** - Views all billing events

This hybrid approach gives you the best of both worlds: secure environment variable storage for sensitive data and flexible admin UI configuration for business settings! 🎯