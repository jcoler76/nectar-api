-- Create super admin user for Nectar API
-- Email: <email>
-- Password: <password> (bcrypted with salt rounds 12)

-- Password '<password>' hashed with bcryptjs salt rounds 12:
-- $2a$12$sLYogfeVwMgVIjMs9Bb75ewCcToIJbKdIBQ0.TJS.XptjnoqpP46i

BEGIN;

-- Create the super admin user
INSERT INTO "User" (
  id,
  email,
  "passwordHash",
  "firstName", 
  "lastName",
  "isActive",
  "emailVerified",
  "emailVerifiedAt",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid()::TEXT,
  '<email>',
  '$2a$12$sLYogfeVwMgVIjMs9Bb75ewCcToIJbKdIBQ0.TJS.XptjnoqpP46i',
  'Jestin',
  'Coler',
  true,
  true,
  NOW(),
  NOW(),
  NOW()
);

-- Get the user ID for creating related records
WITH user_data AS (
  SELECT id as user_id FROM "User" WHERE email = '<email>'
),
-- Create the admin organization
org_insert AS (
  INSERT INTO "Organization" (
    id,
    name,
    slug,
    "createdAt",
    "updatedAt"
  ) VALUES (
    gen_random_uuid()::TEXT,
    'Nectar API Admin',
    'nectar-api-admin',
    NOW(),
    NOW()
  ) RETURNING id as org_id
),
-- Create enterprise subscription for the admin org
subscription_insert AS (
  INSERT INTO "Subscription" (
    id,
    plan,
    status,
    "currentPeriodStart",
    "currentPeriodEnd",
    "maxDatabaseConnections",
    "maxApiCallsPerMonth",
    "maxUsersPerOrg",
    "maxWorkflows",
    "organizationId",
    "createdAt",
    "updatedAt"
  )
  SELECT
    gen_random_uuid()::TEXT,
    'ENTERPRISE'::"SubscriptionPlan",
    'ACTIVE'::"SubscriptionStatus",
    NOW(),
    NOW() + INTERVAL '1 year',
    999999,
    999999999,
    999999,
    999999,
    org_id,
    NOW(),
    NOW()
  FROM org_insert
  RETURNING id as subscription_id
)
-- Create membership linking user to organization as OWNER
INSERT INTO "Membership" (
  id,
  role,
  "userId",
  "organizationId",
  "joinedAt"
)
SELECT
  gen_random_uuid()::TEXT,
  'OWNER'::"MemberRole",
  user_data.user_id,
  org_insert.org_id,
  NOW()
FROM user_data, org_insert;

COMMIT;

-- Verify the creation
SELECT 
  u.id as user_id,
  u.email,
  u."firstName",
  u."lastName",
  u."isActive",
  u."emailVerified",
  o.id as org_id,
  o.name as org_name,
  o.slug as org_slug,
  s.plan as subscription_plan,
  s.status as subscription_status,
  m.role as user_role
FROM "User" u
JOIN "Membership" m ON u.id = m."userId"
JOIN "Organization" o ON m."organizationId" = o.id
JOIN "Subscription" s ON o.id = s."organizationId"
WHERE u.email = '<email>';