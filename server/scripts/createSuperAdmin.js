const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Create Super Admin User Script
 * 
 * This script creates a super admin user for the Nectar API application.
 * It handles the Docker networking issue by using direct SQL execution.
 */

const ADMIN_CREDENTIALS = {
  email: '<email>',
  password: '<password>',
  firstName: 'Jestin',
  lastName: 'Coler'
};

/**
 * Generate bcrypt hash for password
 */
async function generatePasswordHash(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Create super admin using direct SQL execution (Docker container workaround)
 */
async function createSuperAdminSQL() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    console.log('🚀 Creating super admin user via Docker container...');
    
    const passwordHash = await generatePasswordHash(ADMIN_CREDENTIALS.password);
    console.log('🔐 Password hash generated successfully');

    // Check if user already exists
    const checkUserSQL = `SELECT id FROM "User" WHERE email = '${ADMIN_CREDENTIALS.email}';`;
    const checkResult = await execAsync(`docker exec nectar-postgres psql -U nectar_admin -d nectar_core -t -c "${checkUserSQL}"`);
    
    if (checkResult.stdout.trim()) {
      console.log('❌ Super admin user already exists!');
      console.log('📧 Email:', ADMIN_CREDENTIALS.email);
      console.log('🔑 Password:', ADMIN_CREDENTIALS.password);
      return;
    }

    // Generate UUIDs
    const userId = crypto.randomUUID();
    const orgId = crypto.randomUUID();
    const subscriptionId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    // Create the SQL for inserting all records
    const insertSQL = `
    BEGIN;
    
    -- Create user
    INSERT INTO "User" (
      id, email, "passwordHash", "firstName", "lastName", 
      "isActive", "emailVerified", "emailVerifiedAt", 
      "createdAt", "updatedAt"
    ) VALUES (
      '${userId}',
      '${ADMIN_CREDENTIALS.email}',
      '${passwordHash}',
      '${ADMIN_CREDENTIALS.firstName}',
      '${ADMIN_CREDENTIALS.lastName}',
      true,
      true,
      NOW(),
      NOW(),
      NOW()
    );
    
    -- Create organization
    INSERT INTO "Organization" (
      id, name, slug, "createdAt", "updatedAt"
    ) VALUES (
      '${orgId}',
      'Nectar API Admin',
      'nectar-api-admin',
      NOW(),
      NOW()
    );
    
    -- Create subscription
    INSERT INTO "Subscription" (
      id, plan, status, "currentPeriodStart", "currentPeriodEnd",
      "maxDatabaseConnections", "maxApiCallsPerMonth", "maxUsersPerOrg", "maxWorkflows",
      "organizationId", "createdAt", "updatedAt"
    ) VALUES (
      '${subscriptionId}',
      'ENTERPRISE',
      'ACTIVE',
      NOW(),
      NOW() + INTERVAL '1 year',
      999999,
      999999999,
      999999,
      999999,
      '${orgId}',
      NOW(),
      NOW()
    );
    
    -- Create membership
    INSERT INTO "Membership" (
      id, role, "userId", "organizationId", "joinedAt"
    ) VALUES (
      '${membershipId}',
      'OWNER',
      '${userId}',
      '${orgId}',
      NOW()
    );
    
    COMMIT;
    
    -- Verify creation
    SELECT 
      u.id as user_id,
      u.email,
      u."firstName",
      u."lastName",
      o.id as org_id,
      o.name as org_name,
      s.plan as subscription_plan,
      m.role as user_role
    FROM "User" u
    JOIN "Membership" m ON u.id = m."userId"
    JOIN "Organization" o ON m."organizationId" = o.id
    JOIN "Subscription" s ON o.id = s."organizationId"
    WHERE u.email = '${ADMIN_CREDENTIALS.email}';
    `;

    // Execute the SQL
    console.log('📝 Executing user creation SQL...');
    const result = await execAsync(`docker exec -i nectar-postgres psql -U nectar_admin -d nectar_core -c "${insertSQL.replace(/\n/g, ' ').replace(/\s+/g, ' ')}"`);
    
    console.log('✅ Super admin user created successfully!');
    console.log('📧 Email:', ADMIN_CREDENTIALS.email);
    console.log('🔑 Password:', ADMIN_CREDENTIALS.password);
    console.log('👤 User ID:', userId);
    console.log('🏢 Organization ID:', orgId);
    console.log('💰 Subscription Plan: ENTERPRISE');
    console.log('');
    console.log('🔐 You can now login to the application with these credentials.');
    
    return {
      userId,
      email: ADMIN_CREDENTIALS.email,
      organizationId: orgId,
      subscriptionPlan: 'ENTERPRISE'
    };

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    throw error;
  }
}

/**
 * Create super admin using Prisma (fallback method)
 */
async function createSuperAdminPrisma() {
  const { PrismaClient } = require('../prisma/generated/client');
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Creating super admin user via Prisma...');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_CREDENTIALS.email }
    });

    if (existingUser) {
      console.log('❌ Super admin user already exists!');
      return existingUser;
    }

    // Hash the password
    const passwordHash = await generatePasswordHash(ADMIN_CREDENTIALS.password);

    // Create the super admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          email: ADMIN_CREDENTIALS.email,
          passwordHash,
          firstName: ADMIN_CREDENTIALS.firstName,
          lastName: ADMIN_CREDENTIALS.lastName,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create organization
      const organization = await tx.organization.create({
        data: {
          id: crypto.randomUUID(),
          name: 'Nectar API Admin',
          slug: 'nectar-api-admin',
          updatedAt: new Date(),
        },
      });

      // Create subscription
      const subscription = await tx.subscription.create({
        data: {
          id: crypto.randomUUID(),
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          maxDatabaseConnections: 999999,
          maxApiCallsPerMonth: 999999999,
          maxUsersPerOrg: 999999,
          maxWorkflows: 999999,
          organizationId: organization.id,
          updatedAt: new Date(),
        },
      });

      // Create membership
      const membership = await tx.membership.create({
        data: {
          id: crypto.randomUUID(),
          role: 'OWNER',
          userId: user.id,
          organizationId: organization.id,
        },
      });

      return { user, organization, subscription, membership };
    });

    console.log('✅ Super admin user created successfully!');
    console.log('📧 Email:', ADMIN_CREDENTIALS.email);
    console.log('🔑 Password:', ADMIN_CREDENTIALS.password);
    console.log('👤 User ID:', result.user.id);
    console.log('🏢 Organization ID:', result.organization.id);
    console.log('💰 Subscription Plan:', result.subscription.plan);

    return result;

  } catch (error) {
    console.error('❌ Error creating super admin via Prisma:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Main function - tries Prisma first, falls back to SQL method
 */
async function createSuperAdmin() {
  try {
    // Try Prisma method first
    console.log('🔄 Attempting to create super admin via Prisma...');
    return await createSuperAdminPrisma();
  } catch (prismaError) {
    console.log('⚠️  Prisma method failed, using Docker SQL workaround...');
    console.log('🐳 This is normal if you have Windows Docker networking issues');
    
    try {
      return await createSuperAdminSQL();
    } catch (sqlError) {
      console.error('❌ Both methods failed:');
      console.error('Prisma error:', prismaError.message);
      console.error('SQL error:', sqlError.message);
      throw new Error('Failed to create super admin user with both methods');
    }
  }
}

/**
 * Verify super admin exists and can be used for authentication
 */
async function verifySuperAdmin() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    console.log('🔍 Verifying super admin user...');
    
    const verifySQL = `
      SELECT 
        u.id, u.email, u."firstName", u."lastName", u."isActive", u."emailVerified",
        o.name as org_name, s.plan as subscription_plan, m.role
      FROM "User" u
      JOIN "Membership" m ON u.id = m."userId"
      JOIN "Organization" o ON m."organizationId" = o.id
      JOIN "Subscription" s ON o.id = s."organizationId"
      WHERE u.email = '${ADMIN_CREDENTIALS.email}';
    `;

    const result = await execAsync(`docker exec nectar-postgres psql -U nectar_admin -d nectar_core -c "${verifySQL}"`);
    
    if (result.stdout.includes(ADMIN_CREDENTIALS.email)) {
      console.log('✅ Super admin user verified successfully!');
      console.log(result.stdout);
      return true;
    } else {
      console.log('❌ Super admin user not found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verifying super admin:', error.message);
    return false;
  }
}

// Run the script if called directly
if (require.main === module) {
  createSuperAdmin()
    .then(() => verifySuperAdmin())
    .catch(console.error);
}

module.exports = { createSuperAdmin, verifySuperAdmin, ADMIN_CREDENTIALS };