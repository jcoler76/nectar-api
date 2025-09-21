#!/usr/bin/env node

const authService = require('../services/authService');

const testCredentials = [
  { email: 'test-free@example.com', expectedPlan: 'FREE' },
  { email: 'test-starter@example.com', expectedPlan: 'STARTER' },
  { email: 'test-team@example.com', expectedPlan: 'PROFESSIONAL' },
  { email: 'test-business@example.com', expectedPlan: 'BUSINESS' },
  { email: 'test-enterprise@example.com', expectedPlan: 'ENTERPRISE' },
];

const TEST_PASSWORD = 'TestPass123!';

async function testLogin(email, expectedPlan) {
  console.log(`Testing login for ${email}...`);

  try {
    const result = await authService.login(email, TEST_PASSWORD, '127.0.0.1', 'test-script');

    console.log(`  ✓ Login successful`);
    console.log(`    User: ${result.user.firstName} ${result.user.lastName}`);
    console.log(`    Organization: ${result.organization.name}`);
    console.log(`    Plan: ${result.organization.subscription?.plan || 'No subscription'}`);
    console.log(`    Role: ${result.membership.role}`);
    console.log(`    Token generated: ${result.token ? 'Yes' : 'No'}`);

    // Verify the plan matches expectations
    if (result.organization.subscription?.plan === expectedPlan) {
      console.log(`    ✓ Plan matches expected: ${expectedPlan}`);
    } else {
      console.log(
        `    ✗ Plan mismatch! Expected: ${expectedPlan}, Got: ${result.organization.subscription?.plan}`
      );
    }

    return true;
  } catch (error) {
    console.log(`  ✗ Login failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing login for all test users...\n');

  let successCount = 0;
  let totalCount = testCredentials.length;

  for (const { email, expectedPlan } of testCredentials) {
    const success = await testLogin(email, expectedPlan);
    if (success) successCount++;
    console.log('');
  }

  console.log('=== LOGIN TEST SUMMARY ===');
  console.log(`Successful logins: ${successCount}/${totalCount}`);

  if (successCount === totalCount) {
    console.log('🎉 All test users can login successfully!');
    console.log('\nReady for manual testing:');
    console.log('1. Admin frontend verification');
    console.log('2. Customer app login testing');
    console.log('3. Plan feature verification');
  } else {
    console.log('⚠️  Some login tests failed. Check the output above for details.');
  }
}

main().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});
