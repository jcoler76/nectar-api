#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { encryptApiKey, generateApiKey } = require('../utils/encryption');

const prisma = new PrismaClient();

const TEST_USERS = [
  'test-free@example.com',
  'test-starter@example.com',
  'test-team@example.com',
  'test-business@example.com',
  'test-enterprise@example.com',
];

/**
 * Get a default role for the organization
 */
async function getDefaultRole(organizationId) {
  // Try to find an existing role for this organization
  const role = await prisma.role.findFirst({
    where: {
      organizationId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (role) {
    return role.id;
  }

  // If no role exists, we need to create one or find a service first
  const service = await prisma.service.findFirst({
    where: {
      organizationId,
      isActive: true,
    },
  });

  if (!service) {
    throw new Error(
      `No service found for organization ${organizationId}. Cannot create application without a service.`
    );
  }

  // Create a basic role for testing
  const newRole = await prisma.role.create({
    data: {
      name: 'Test API Role',
      description: 'Default role for API testing',
      permissions: [],
      organizationId,
      serviceId: service.id,
      createdBy: (await prisma.user.findFirst({ where: { email: { contains: 'test-' } } })).id,
      isActive: true,
    },
  });

  return newRole.id;
}

/**
 * Generate simple test API keys for all test users
 */
async function generateTestUserApiKeys() {
  console.log('🔑 Generating simple test API keys for test users...\n');

  const apiKeys = {};

  for (const email of TEST_USERS) {
    try {
      // Find the user
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
        console.log(`❌ User ${email} not found. Run createTestUsers.js first.`);
        continue;
      }

      const membership = user.memberships[0];
      if (!membership) {
        console.log(`❌ No organization membership found for ${email}`);
        continue;
      }

      const organization = membership.organization;
      const planInfo = organization.subscription?.plan || 'FREE';
      const apiCallLimit = organization.subscription?.maxApiCallsPerMonth || 25000;

      // Generate simple test API key based on plan
      const planName = planInfo.toLowerCase();
      const testApiKey = `test-${planName}-key`;

      apiKeys[email] = {
        email,
        plan: planInfo,
        apiKey: testApiKey,
        apiCallLimit,
        organizationId: organization.id,
        organizationName: organization.name,
      };

      console.log(
        `✅ ${email.padEnd(30)} | ${planInfo.padEnd(12)} | ${apiCallLimit.toLocaleString().padStart(10)} calls/month | Key: ${testApiKey}`
      );
    } catch (error) {
      console.error(`❌ Error processing ${email}:`, error.message);
    }
  }

  // Output API keys for testing
  console.log('\n' + '='.repeat(80));
  console.log('📋 API KEYS FOR RATE LIMIT TESTING');
  console.log('='.repeat(80));

  Object.values(apiKeys).forEach(info => {
    console.log(`\n🏢 ${info.organizationName}`);
    console.log(`📧 Email: ${info.email}`);
    console.log(`📊 Plan: ${info.plan}`);
    console.log(`🔑 API Key: ${info.apiKey}`);
    console.log(`📈 Monthly Limit: ${info.apiCallLimit.toLocaleString()} API calls`);
    console.log(`🏗️  Test URL: http://localhost:3001/api/v2/test/_proc/rate-limit-test`);
    console.log(`📋 Headers: { "x-api-key": "${info.apiKey}" }`);
  });

  // Output for test scripts
  console.log('\n' + '='.repeat(80));
  console.log('📄 TEST CONFIGURATION');
  console.log('='.repeat(80));

  const testConfig = Object.values(apiKeys).reduce((config, info) => {
    config[info.plan.toLowerCase()] = {
      email: info.email,
      apiKey: info.apiKey,
      monthlyLimit: info.apiCallLimit,
      organizationId: info.organizationId,
    };
    return config;
  }, {});

  console.log('\nCopy this configuration into your test files:');
  console.log('```javascript');
  console.log('const TEST_CONFIG = ' + JSON.stringify(testConfig, null, 2) + ';');
  console.log('```');

  // Save to file for easy reference
  const outputFile = './test-api-keys.json';
  const fs = require('fs');
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        testUsers: apiKeys,
        testConfig,
      },
      null,
      2
    )
  );

  console.log(`\n💾 API keys saved to: ${outputFile}`);
  console.log('\n⚠️  SECURITY NOTE: These are test API keys. Do not use in production!');

  return apiKeys;
}

if (require.main === module) {
  generateTestUserApiKeys()
    .then(() => {
      console.log('\n✅ API key generation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error generating API keys:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

module.exports = { generateTestUserApiKeys };
