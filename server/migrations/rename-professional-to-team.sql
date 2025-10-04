-- Migration: Rename PROFESSIONAL to TEAM in SubscriptionPlan enum
-- This aligns the database with the marketing site terminology

BEGIN;

-- Rename the enum value
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'PROFESSIONAL' TO 'TEAM';

COMMIT;
