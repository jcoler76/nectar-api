-- Create Admin and Billing Tables
-- This script adds only the new tables needed for the admin portal
-- without disturbing existing customer data

-- Create ENUM types if they don't exist
DO $$ BEGIN
    CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIEWER', 'SUPPORT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE', 'INCOMPLETE_EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BillingEventType" AS ENUM (
        'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELED',
        'INVOICE_PAYMENT_SUCCEEDED', 'INVOICE_PAYMENT_FAILED',
        'PAYMENT_METHOD_ATTACHED', 'PAYMENT_METHOD_DETACHED',
        'CUSTOMER_CREATED', 'CUSTOMER_UPDATED',
        'TRIAL_STARTED', 'TRIAL_ENDED', 'CHURN_RISK_DETECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MetricPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create platform_admins table
CREATE TABLE IF NOT EXISTS "platform_admins" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS "platform_admins_email_key" ON "platform_admins"("email");

-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resource_type" TEXT,
    "details" JSONB,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for admin_audit_logs
CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_timestamp_idx" ON "admin_audit_logs"("timestamp");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- Create system_config table
CREATE TABLE IF NOT EXISTS "system_config" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- Create unique index on key
CREATE UNIQUE INDEX IF NOT EXISTS "system_config_key_key" ON "system_config"("key");

-- Create admin_sessions table
CREATE TABLE IF NOT EXISTS "admin_sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for admin_sessions
CREATE UNIQUE INDEX IF NOT EXISTS "admin_sessions_token_key" ON "admin_sessions"("token");
CREATE INDEX IF NOT EXISTS "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");
CREATE INDEX IF NOT EXISTS "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");

-- Add Stripe customer ID and billing email to organizations if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='organizations' AND column_name='stripe_customer_id') THEN
        ALTER TABLE "organizations" ADD COLUMN "stripe_customer_id" TEXT;
        CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='organizations' AND column_name='billing_email') THEN
        ALTER TABLE "organizations" ADD COLUMN "billing_email" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='organizations' AND column_name='trial_ends_at') THEN
        ALTER TABLE "organizations" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
    END IF;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "monthly_revenue" DECIMAL(10,2),
    "yearly_revenue" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- Create billing_events table
CREATE TABLE IF NOT EXISTS "billing_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "stripe_event_id" TEXT,
    "eventType" "BillingEventType" NOT NULL,
    "amount" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'usd',
    "description" TEXT,
    "metadata" JSONB,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- Create indexes for billing_events
CREATE UNIQUE INDEX IF NOT EXISTS "billing_events_stripe_event_id_key" ON "billing_events"("stripe_event_id");
CREATE INDEX IF NOT EXISTS "billing_events_organization_id_idx" ON "billing_events"("organization_id");
CREATE INDEX IF NOT EXISTS "billing_events_created_at_idx" ON "billing_events"("created_at");
CREATE INDEX IF NOT EXISTS "billing_events_eventType_idx" ON "billing_events"("eventType");

-- Create revenue_metrics table
CREATE TABLE IF NOT EXISTS "revenue_metrics" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "period" "MetricPeriod" NOT NULL,
    "total_revenue" DECIMAL(12,2) NOT NULL,
    "new_revenue" DECIMAL(12,2) NOT NULL,
    "churned_revenue" DECIMAL(12,2) NOT NULL,
    "upgrade_revenue" DECIMAL(12,2) NOT NULL,
    "downgrade_revenue" DECIMAL(12,2) NOT NULL,
    "active_subscriptions" INTEGER NOT NULL,
    "trial_subscriptions" INTEGER NOT NULL,
    "churned_subscriptions" INTEGER NOT NULL,
    "new_subscriptions" INTEGER NOT NULL,
    "churn_rate" DECIMAL(5,4),
    "growth_rate" DECIMAL(5,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "revenue_metrics_pkey" PRIMARY KEY ("id")
);

-- Create indexes for revenue_metrics
CREATE UNIQUE INDEX IF NOT EXISTS "revenue_metrics_date_period_key" ON "revenue_metrics"("date", "period");
CREATE INDEX IF NOT EXISTS "revenue_metrics_date_idx" ON "revenue_metrics"("date");
CREATE INDEX IF NOT EXISTS "revenue_metrics_period_idx" ON "revenue_metrics"("period");

-- Create stripe_config table
CREATE TABLE IF NOT EXISTS "stripe_config" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "is_live" BOOLEAN NOT NULL DEFAULT false,
    "publishable_key" TEXT,
    "webhook_secret" TEXT,
    "default_currency" TEXT NOT NULL DEFAULT 'usd',
    "tax_rate_id" TEXT,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "stripe_config_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "admin_audit_logs" 
    ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" 
    FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE;

ALTER TABLE "admin_sessions" 
    ADD CONSTRAINT "admin_sessions_admin_id_fkey" 
    FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE;

ALTER TABLE "subscriptions" 
    ADD CONSTRAINT "subscriptions_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

ALTER TABLE "billing_events" 
    ADD CONSTRAINT "billing_events_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

ALTER TABLE "billing_events" 
    ADD CONSTRAINT "billing_events_subscription_id_fkey" 
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Admin and billing tables created successfully!';
END $$;