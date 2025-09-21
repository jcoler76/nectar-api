const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../server'); // Adjust path to your main server file
const { shouldCountAsBillableApi } = require('../middleware/publicApiTracker');

const prisma = new PrismaClient();

/**
 * Comprehensive Test Suite for Subscription Plan Rate Limits
 * Tests API rate limiting based on subscription tiers
 */

// Test configuration - update these with actual API keys from generateTestUserApiKeys.js
const TEST_CONFIG = {
  free: {
    email: 'test-free@example.com',
    apiKey: '', // Set this after running generateTestUserApiKeys.js
    monthlyLimit: 25000,
    organizationId: '',
  },
  starter: {
    email: 'test-starter@example.com',
    apiKey: '', // Set this after running generateTestUserApiKeys.js
    monthlyLimit: 1000000,
    organizationId: '',
  },
  team: {
    email: 'test-team@example.com',
    apiKey: '', // Set this after running generateTestUserApiKeys.js
    monthlyLimit: 5000000,
    organizationId: '',
  },
  business: {
    email: 'test-business@example.com',
    apiKey: '', // Set this after running generateTestUserApiKeys.js
    monthlyLimit: 10000000,
    organizationId: '',
  },
  enterprise: {
    email: 'test-enterprise@example.com',
    apiKey: '', // Set this after running generateTestUserApiKeys.js
    monthlyLimit: 999999999,
    organizationId: '',
  },
};

describe('Plan-Based Rate Limiting Tests', () => {
  let testApiKeys = {};

  beforeAll(async () => {
    console.log('🚀 Starting Plan Rate Limit Tests');
    console.log('📋 Ensure you have run: node scripts/generateTestUserApiKeys.js');

    // Load API keys from generated file if available
    try {
      const fs = require('fs');
      const keyData = JSON.parse(fs.readFileSync('./test-api-keys.json', 'utf8'));
      testApiKeys = keyData.testConfig;

      // Update TEST_CONFIG with loaded keys
      Object.keys(testApiKeys).forEach(plan => {
        if (TEST_CONFIG[plan]) {
          TEST_CONFIG[plan].apiKey = testApiKeys[plan].apiKey;
          TEST_CONFIG[plan].organizationId = testApiKeys[plan].organizationId;
        }
      });

      console.log('✅ Loaded API keys from test-api-keys.json');
    } catch (error) {
      console.warn(
        '⚠️  Could not load test-api-keys.json. Please run generateTestUserApiKeys.js first.'
      );
      console.warn('   Some tests may fail without valid API keys.');
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('API Route Classification', () => {
    test('should correctly identify billable public API routes', () => {
      const billableRoutes = [
        '/api/v1/myservice/_proc/getUsers',
        '/api/v2/analytics/_proc/generateReport',
        '/api/v1/crm/_proc/createLead',
      ];

      billableRoutes.forEach(route => {
        expect(shouldCountAsBillableApi(route, 'GET')).toBe(true);
      });
    });

    test('should correctly identify non-billable internal API routes', () => {
      const internalRoutes = [
        '/api/auth/login',
        '/api/auth/logout',
        '/api/users/profile',
        '/api/organizations/members',
        '/api/tracking/app-usage',
        '/api/reports/dashboard',
        '/api/files/upload',
        '/health',
      ];

      internalRoutes.forEach(route => {
        expect(shouldCountAsBillableApi(route, 'GET')).toBe(false);
      });
    });

    test('should exclude usage info calls from billing', () => {
      const nonBillableTestRoutes = [
        '/api/v2/test/_proc/usage-info',
        '/api/v2/test/_proc/reset-usage',
      ];

      nonBillableTestRoutes.forEach(route => {
        expect(shouldCountAsBillableApi(route, 'GET')).toBe(false);
      });
    });
  });

  describe('Test API Endpoints', () => {
    test('should access test API endpoints without API key and get 400', async () => {
      const response = await request(app).get('/api/v2/test/_proc/rate-limit-test').expect(400);

      expect(response.body.error.code).toBe('INVALID_API_KEY');
    });

    test('should access usage info endpoint and get current stats', async () => {
      if (!TEST_CONFIG.free.apiKey) {
        console.warn('⚠️  Skipping test - no API key for free tier');
        return;
      }

      const response = await request(app)
        .get('/api/v2/test/_proc/usage-info')
        .set('x-api-key', TEST_CONFIG.free.apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.usage_details).toBeDefined();
      expect(response.body.usage_details.monthly_limit).toBe(TEST_CONFIG.free.monthlyLimit);
      expect(response.body.message).toContain('does NOT count');
    });
  });

  describe('Plan Limit Enforcement', () => {
    beforeEach(async () => {
      // Reset usage for all test users before each test
      for (const [plan, config] of Object.entries(TEST_CONFIG)) {
        if (config.apiKey && config.organizationId) {
          try {
            await request(app)
              .delete('/api/v2/test/_proc/reset-usage')
              .set('x-api-key', config.apiKey);
          } catch (error) {
            console.warn(`Could not reset usage for ${plan}: ${error.message}`);
          }
        }
      }
    });

    test('should track API usage correctly for each plan', async () => {
      for (const [plan, config] of Object.entries(TEST_CONFIG)) {
        if (!config.apiKey) {
          console.warn(`⚠️  Skipping ${plan} - no API key`);
          continue;
        }

        console.log(`🧪 Testing ${plan.toUpperCase()} plan usage tracking...`);

        // Make a billable API call
        const response = await request(app)
          .get('/api/v2/test/_proc/rate-limit-test')
          .set('x-api-key', config.apiKey)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.usage.current_api_calls).toBe(1);
        expect(response.body.usage.monthly_limit).toBe(config.monthlyLimit);
        expect(response.body.usage.plan.toUpperCase()).toBe(plan.toUpperCase());

        // Check usage headers
        expect(response.headers['x-api-usage-current']).toBe('1');
        expect(response.headers['x-api-usage-limit']).toBe(config.monthlyLimit.toString());
      }
    });

    test('should handle batch API calls correctly', async () => {
      if (!TEST_CONFIG.starter.apiKey) {
        console.warn('⚠️  Skipping batch test - no API key for starter tier');
        return;
      }

      const batchSize = 50;

      const response = await request(app)
        .post('/api/v2/test/_proc/rate-limit-batch')
        .set('x-api-key', TEST_CONFIG.starter.apiKey)
        .send({ count: batchSize })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.batch_info.calls_processed).toBe(batchSize);
      expect(response.body.usage.current_api_calls).toBe(batchSize);

      // Verify with usage info call (should not increment counter)
      const usageResponse = await request(app)
        .get('/api/v2/test/_proc/usage-info')
        .set('x-api-key', TEST_CONFIG.starter.apiKey)
        .expect(200);

      expect(usageResponse.body.usage_details.api_calls_used).toBe(batchSize);
    });

    test('should enforce FREE plan limits strictly', async () => {
      if (!TEST_CONFIG.free.apiKey) {
        console.warn('⚠️  Skipping FREE limit test - no API key');
        return;
      }

      console.log('🧪 Testing FREE plan limit enforcement...');

      // Use up the entire free quota (25,000 calls)
      const freeLimit = TEST_CONFIG.free.monthlyLimit;

      // Do this in batches to avoid timeout
      const batchSize = 1000;
      const batches = Math.ceil(freeLimit / batchSize);

      for (let i = 0; i < batches; i++) {
        const callsToMake = Math.min(batchSize, freeLimit - i * batchSize);

        await request(app)
          .post('/api/v2/test/_proc/rate-limit-batch')
          .set('x-api-key', TEST_CONFIG.free.apiKey)
          .send({ count: callsToMake })
          .expect(200);

        console.log(
          `   Batch ${i + 1}/${batches}: ${callsToMake} calls (Total: ${(i + 1) * batchSize})`
        );
      }

      // Next call should be rejected for FREE plan
      const response = await request(app)
        .get('/api/v2/test/_proc/rate-limit-test')
        .set('x-api-key', TEST_CONFIG.free.apiKey)
        .expect(429);

      expect(response.body.error.code).toBe('API_LIMIT_EXCEEDED');
      expect(response.body.error.plan).toBe('FREE');
    });

    test('should allow paid plans to exceed FREE limits', async () => {
      if (!TEST_CONFIG.starter.apiKey) {
        console.warn('⚠️  Skipping STARTER overage test - no API key');
        return;
      }

      console.log('🧪 Testing STARTER plan can exceed FREE limits...');

      // Make calls that would exceed FREE plan limit
      const overageAmount = TEST_CONFIG.free.monthlyLimit + 1000;

      const response = await request(app)
        .post('/api/v2/test/_proc/rate-limit-batch')
        .set('x-api-key', TEST_CONFIG.starter.apiKey)
        .send({ count: overageAmount })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.usage.current_api_calls).toBe(overageAmount);

      // Should still be able to make more calls
      const nextResponse = await request(app)
        .get('/api/v2/test/_proc/rate-limit-test')
        .set('x-api-key', TEST_CONFIG.starter.apiKey)
        .expect(200);

      expect(nextResponse.body.success).toBe(true);
    });
  });

  describe('Internal API Exclusions', () => {
    test('should not count internal API calls toward limits', async () => {
      if (!TEST_CONFIG.free.apiKey) {
        console.warn('⚠️  Skipping internal API test - no API key');
        return;
      }

      // Get initial usage
      const initialResponse = await request(app)
        .get('/api/v2/test/_proc/usage-info')
        .set('x-api-key', TEST_CONFIG.free.apiKey)
        .expect(200);

      const initialUsage = initialResponse.body.usage_details.api_calls_used;

      // Make several internal API calls (these should not count)
      // Note: These would need to be actual internal endpoints in your app
      // For now, we'll test the usage-info endpoint multiple times
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/v2/test/_proc/usage-info')
          .set('x-api-key', TEST_CONFIG.free.apiKey)
          .expect(200);
      }

      // Check that usage hasn't increased
      const finalResponse = await request(app)
        .get('/api/v2/test/_proc/usage-info')
        .set('x-api-key', TEST_CONFIG.free.apiKey)
        .expect(200);

      expect(finalResponse.body.usage_details.api_calls_used).toBe(initialUsage);
    });

    test('should count public API calls but not internal ones', async () => {
      if (!TEST_CONFIG.starter.apiKey) {
        console.warn('⚠️  Skipping mixed API test - no API key');
        return;
      }

      // Reset usage
      await request(app)
        .delete('/api/v2/test/_proc/reset-usage')
        .set('x-api-key', TEST_CONFIG.starter.apiKey)
        .expect(200);

      // Make 5 billable calls
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/api/v2/test/_proc/rate-limit-test')
          .set('x-api-key', TEST_CONFIG.starter.apiKey)
          .expect(200);
      }

      // Make 10 non-billable calls
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/v2/test/_proc/usage-info')
          .set('x-api-key', TEST_CONFIG.starter.apiKey)
          .expect(200);
      }

      // Check final usage - should only count the 5 billable calls
      const finalResponse = await request(app)
        .get('/api/v2/test/_proc/usage-info')
        .set('x-api-key', TEST_CONFIG.starter.apiKey)
        .expect(200);

      expect(finalResponse.body.usage_details.api_calls_used).toBe(5);
    });
  });

  describe('Usage Warnings and Headers', () => {
    test('should include usage headers in API responses', async () => {
      if (!TEST_CONFIG.team.apiKey) {
        console.warn('⚠️  Skipping header test - no API key');
        return;
      }

      const response = await request(app)
        .get('/api/v2/test/_proc/rate-limit-test')
        .set('x-api-key', TEST_CONFIG.team.apiKey)
        .expect(200);

      // Check that usage headers are present
      expect(response.headers['x-api-usage-current']).toBeDefined();
      expect(response.headers['x-api-usage-limit']).toBe(TEST_CONFIG.team.monthlyLimit.toString());
      expect(response.headers['x-api-usage-remaining']).toBeDefined();
      expect(response.headers['x-api-usage-plan']).toBeDefined();
    });

    test('should provide warning when approaching limits', async () => {
      if (!TEST_CONFIG.free.apiKey) {
        console.warn('⚠️  Skipping warning test - no API key');
        return;
      }

      // Use 90% of free quota to trigger warnings
      const warningThreshold = Math.floor(TEST_CONFIG.free.monthlyLimit * 0.9);

      await request(app)
        .post('/api/v2/test/_proc/rate-limit-batch')
        .set('x-api-key', TEST_CONFIG.free.apiKey)
        .send({ count: warningThreshold })
        .expect(200);

      const response = await request(app)
        .get('/api/v2/test/_proc/usage-info')
        .set('x-api-key', TEST_CONFIG.free.apiKey)
        .expect(200);

      expect(response.body.rate_limit_status.approaching_limit).toBe(true);
      expect(response.body.usage_details.usage_percentage).toBeGreaterThan(80);
    });
  });

  describe('Enterprise Plan', () => {
    test('should allow unlimited API calls for enterprise', async () => {
      if (!TEST_CONFIG.enterprise.apiKey) {
        console.warn('⚠️  Skipping enterprise test - no API key');
        return;
      }

      console.log('🧪 Testing ENTERPRISE unlimited plan...');

      // Make a large number of calls that would exceed other plans
      const largeBatch = 50000;

      const response = await request(app)
        .post('/api/v2/test/_proc/rate-limit-batch')
        .set('x-api-key', TEST_CONFIG.enterprise.apiKey)
        .send({ count: largeBatch })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.usage.remaining).toBe('unlimited');

      // Should still be able to make more calls
      const nextResponse = await request(app)
        .get('/api/v2/test/_proc/rate-limit-test')
        .set('x-api-key', TEST_CONFIG.enterprise.apiKey)
        .expect(200);

      expect(nextResponse.body.success).toBe(true);
    });
  });
});

// Helper function to run the test suite
function runPlanRateLimitTests() {
  console.log('\n🧪 Plan-Based Rate Limit Test Suite');
  console.log('=====================================');
  console.log('This test suite verifies:');
  console.log('✓ API calls are counted correctly per subscription plan');
  console.log('✓ Internal APIs do not count toward limits');
  console.log('✓ Public APIs count toward monthly quotas');
  console.log('✓ FREE plan limits are strictly enforced');
  console.log('✓ Paid plans can exceed FREE limits');
  console.log('✓ Enterprise has unlimited access');
  console.log('✓ Usage warnings work correctly');
  console.log('\n📋 Prerequisites:');
  console.log('1. Run: node scripts/generateTestUserApiKeys.js');
  console.log('2. Ensure test users exist with: node scripts/createTestUsers.js');
  console.log('3. Start server in development mode');
  console.log('\n🚀 Running tests...\n');
}

if (require.main === module) {
  runPlanRateLimitTests();
}

module.exports = {
  TEST_CONFIG,
  runPlanRateLimitTests,
};
