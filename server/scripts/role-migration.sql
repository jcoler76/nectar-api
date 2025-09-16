-- Role Migration Script for Enhanced RBAC System
-- Run this script to migrate jestin@jestincoler.com to the new role system

-- Step 1: Check current user data
SELECT
  u.id,
  u.email,
  u."isSuperAdmin",
  m.role,
  o.name as organization_name
FROM "User" u
LEFT JOIN "Membership" m ON u.id = m."userId"
LEFT JOIN "Organization" o ON m."organizationId" = o.id
WHERE u.email = 'jestin@jestincoler.com';

-- Step 2: Update user to be isSuperAdmin
UPDATE "User"
SET "isSuperAdmin" = true
WHERE email = 'jestin@jestincoler.com';

-- Step 3: Update membership roles from legacy to new
-- Map OWNER -> SUPER_ADMIN (since you're platform super admin)
UPDATE "Membership"
SET role = 'SUPER_ADMIN'
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'jestin@jestincoler.com'
) AND role = 'OWNER';

-- Map ADMIN -> ORGANIZATION_ADMIN
UPDATE "Membership"
SET role = 'ORGANIZATION_ADMIN'
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'jestin@jestincoler.com'
) AND role = 'ADMIN';

-- Step 4: Create AdminUser record
INSERT INTO "AdminUser" (
  id,
  email,
  "passwordHash",
  "firstName",
  "lastName",
  role,
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  u.email,
  u."passwordHash",
  u."firstName",
  u."lastName",
  'SUPER_ADMIN'::text::"AdminRole",
  true,
  NOW(),
  NOW()
FROM "User" u
WHERE u.email = 'jestin@jestincoler.com'
  AND NOT EXISTS (
    SELECT 1 FROM "AdminUser" au WHERE au.email = u.email
  );

-- Step 5: Verify the migration
SELECT
  'User Table' as source,
  u.email,
  u."isSuperAdmin",
  NULL as role,
  NULL as admin_role
FROM "User" u
WHERE u.email = 'jestin@jestincoler.com'

UNION ALL

SELECT
  'Membership' as source,
  u.email,
  u."isSuperAdmin",
  m.role::text,
  NULL as admin_role
FROM "User" u
JOIN "Membership" m ON u.id = m."userId"
JOIN "Organization" o ON m."organizationId" = o.id
WHERE u.email = 'jestin@jestincoler.com'

UNION ALL

SELECT
  'AdminUser' as source,
  au.email,
  NULL as "isSuperAdmin",
  NULL as role,
  au.role::text as admin_role
FROM "AdminUser" au
WHERE au.email = 'jestin@jestincoler.com';

-- Display summary
SELECT
  '=== MIGRATION SUMMARY ===' as message;