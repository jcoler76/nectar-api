#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

const TEST_PASSWORD = 'TestPass123!';

const testUsers = [
  {
    email: 'test-free@example.com',
    firstName: 'Free',
    lastName: 'User',
    organizationName: 'Free Tier Organization',
    plan: 'FREE',
    maxDatabaseConnections: 1,
    maxApiCallsPerMonth: 25000,
    maxUsersPerOrg: 1,
    maxWorkflows: 5,
  },
  {
    email: 'test-starter@example.com',
    firstName: 'Starter',
    lastName: 'User',
    organizationName: 'Starter Plan Organization',
    plan: 'STARTER',
    maxDatabaseConnections: 5,
    maxApiCallsPerMonth: 1000000,
    maxUsersPerOrg: 5,
    maxWorkflows: 50,
  },
  {
    email: 'test-team@example.com',
    firstName: 'Team',
    lastName: 'User',
    organizationName: 'Team Plan Organization',
    plan: 'PROFESSIONAL',
    maxDatabaseConnections: 10,
    maxApiCallsPerMonth: 5000000,
    maxUsersPerOrg: 10,
    maxWorkflows: 100,
  },
  {
    email: 'test-business@example.com',
    firstName: 'Business',
    lastName: 'User',
    organizationName: 'Business Plan Organization',
    plan: 'BUSINESS',
    maxDatabaseConnections: 25,
    maxApiCallsPerMonth: 10000000,
    maxUsersPerOrg: 25,
    maxWorkflows: 500,
  },
  {
    email: 'test-enterprise@example.com',
    firstName: 'Enterprise',
    lastName: 'User',
    organizationName: 'Enterprise Plan Organization',
    plan: 'ENTERPRISE',
    maxDatabaseConnections: 999,
    maxApiCallsPerMonth: 999999999,
    maxUsersPerOrg: 999,
    maxWorkflows: 9999,
  },
];

async function createTestUser(userData) {
  const { email, firstName, lastName, organizationName, plan, ...limits } = userData;

  console.log(`Creating test user: ${email} with ${plan} plan...`);

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`  User ${email} already exists, updating subscription...`);

      // Update the subscription for existing user
      const membership = await prisma.membership.findFirst({
        where: { userId: existingUser.id },
        include: { organization: { include: { subscription: true } } },
      });

      if (membership?.organization?.subscription) {
        await prisma.subscription.update({
          where: { id: membership.organization.subscription.id },
          data: {
            plan,
            status: 'ACTIVE',
            ...limits,
          },
        });
        console.log(`  Updated subscription for ${email} to ${plan}`);
      }
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

    // Generate organization slug
    const orgSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    // Create user, organization, subscription, and membership in a transaction
    const result = await prisma.$transaction(async tx => {
      // Create user
      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          email,
          passwordHash,
          firstName,
          lastName,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      // Create organization
      const organization = await tx.organization.create({
        data: {
          id: crypto.randomUUID(),
          name: organizationName,
          slug: orgSlug,
        },
      });

      // Create subscription with plan-specific limits
      const subscription = await tx.subscription.create({
        data: {
          id: crypto.randomUUID(),
          plan,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          organizationId: organization.id,
          ...limits,
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

    console.log(`  ✓ Created user ${email} with ${plan} plan`);
    console.log(`    Organization: ${result.organization.name} (${result.organization.slug})`);
    console.log(`    Subscription: ${result.subscription.plan} (${result.subscription.status})`);
    console.log(
      `    Limits: ${result.subscription.maxUsersPerOrg} users, ${result.subscription.maxApiCallsPerMonth} API calls/month`
    );
  } catch (error) {
    console.error(`  ✗ Failed to create user ${email}:`, error.message);
  }
}

async function main() {
  console.log('Creating test users for billing plan verification...\n');
  console.log(`Test password for all users: ${TEST_PASSWORD}\n`);

  for (const userData of testUsers) {
    await createTestUser(userData);
    console.log('');
  }

  console.log('Test user creation completed!\n');

  console.log('=== TEST USER CREDENTIALS ===');
  console.log(`Password for all users: ${TEST_PASSWORD}`);
  console.log('\nUser logins:');
  testUsers.forEach(user => {
    console.log(`  ${user.plan.padEnd(12)} - ${user.email}`);
  });

  console.log('\n=== ADMIN FRONTEND VERIFICATION ===');
  console.log('1. Login to admin frontend');
  console.log('2. Navigate to User Management to see all test users');
  console.log('3. Navigate to Subscription Management to see plan details');
  console.log('4. Verify each user has the correct plan and limits');

  console.log('\n=== MAIN APP VERIFICATION ===');
  console.log('Login to the main customer app with each test user to verify:');
  console.log('- User can access the platform with their plan limits');
  console.log('- Features are enabled/disabled based on plan level');
  console.log('- Dashboard shows correct plan information');
}

main()
  .catch(e => {
    console.error('Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
