#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const expectedUsers = [
  'test-free@example.com',
  'test-starter@example.com',
  'test-team@example.com',
  'test-business@example.com',
  'test-enterprise@example.com',
];

async function verifyTestUsers() {
  console.log('Verifying test users in database...\n');

  for (const email of expectedUsers) {
    console.log(`Checking user: ${email}`);

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          memberships: {
            include: {
              organization: {
                include: {
                  subscription: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        console.log(`  ✗ User not found!`);
        continue;
      }

      console.log(`  ✓ User found: ${user.firstName} ${user.lastName}`);
      console.log(`    Email verified: ${user.emailVerified}`);
      console.log(`    Active: ${user.isActive}`);

      if (user.memberships.length > 0) {
        const membership = user.memberships[0];
        const org = membership.organization;
        const sub = org.subscription;

        console.log(`    Organization: ${org.name} (${org.slug})`);
        console.log(`    Role: ${membership.role}`);

        if (sub) {
          console.log(`    Subscription Plan: ${sub.plan}`);
          console.log(`    Subscription Status: ${sub.status}`);
          console.log(`    Max Users: ${sub.maxUsersPerOrg}`);
          console.log(`    Max API Calls: ${sub.maxApiCallsPerMonth}`);
          console.log(`    Max Workflows: ${sub.maxWorkflows}`);
          console.log(`    Max DB Connections: ${sub.maxDatabaseConnections}`);
        } else {
          console.log(`    ✗ No subscription found!`);
        }
      } else {
        console.log(`    ✗ No organization membership found!`);
      }
    } catch (error) {
      console.log(`  ✗ Error checking user: ${error.message}`);
    }

    console.log('');
  }

  // Get summary statistics
  console.log('=== SUMMARY ===');

  const totalUsers = await prisma.user.count({
    where: {
      email: {
        in: expectedUsers,
      },
    },
  });

  const subscriptionCounts = await prisma.subscription.groupBy({
    by: ['plan'],
    _count: {
      plan: true,
    },
    where: {
      organization: {
        memberships: {
          some: {
            user: {
              email: {
                in: expectedUsers,
              },
            },
          },
        },
      },
    },
  });

  console.log(`Total test users created: ${totalUsers}/5`);
  console.log('Subscription plans distribution:');

  subscriptionCounts.forEach(({ plan, _count }) => {
    console.log(`  ${plan}: ${_count.plan} user(s)`);
  });

  console.log('\n=== ADMIN FRONTEND ACCESS ===');
  console.log('To view these users in the admin frontend:');
  console.log('1. Navigate to the admin frontend URL');
  console.log('2. Go to User Management section');
  console.log('3. Search for emails starting with "test-"');
  console.log('4. Go to Subscription Management to see plan details');

  console.log('\n=== MANUAL TESTING CREDENTIALS ===');
  console.log('Password for all test users: TestPass123!');
  console.log('Test user emails:');
  expectedUsers.forEach(email => {
    const planType = email.split('-')[1].split('@')[0].toUpperCase();
    console.log(`  ${planType.padEnd(12)} - ${email}`);
  });
}

async function main() {
  try {
    await verifyTestUsers();
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
