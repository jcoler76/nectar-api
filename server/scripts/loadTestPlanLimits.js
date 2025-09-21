#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Load Testing Script for Plan-based Rate Limits
 * Simulates realistic API usage patterns and tests limit enforcement
 */

class PlanLimitLoadTester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.testConfig = {};
    this.results = {};
    this.concurrentRequests = 10;
    this.requestDelay = 100; // ms between requests
  }

  /**
   * Load test configuration from generated API keys
   */
  async loadTestConfig() {
    try {
      const configPath = './test-api-keys.json';
      if (!fs.existsSync(configPath)) {
        throw new Error('test-api-keys.json not found. Run generateTestUserApiKeys.js first.');
      }

      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      this.testConfig = data.testConfig;

      console.log('✅ Loaded test configuration for', Object.keys(this.testConfig).length, 'plans');
      return true;
    } catch (error) {
      console.error('❌ Failed to load test configuration:', error.message);
      return false;
    }
  }

  /**
   * Make an API request with proper headers
   */
  async makeApiRequest(
    apiKey,
    endpoint = '/api/v2/test/_proc/rate-limit-test',
    method = 'GET',
    data = null
  ) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
      }

      const response = await axios(config);
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        error: error.response?.data || error.message,
        headers: error.response?.headers || {},
      };
    }
  }

  /**
   * Reset usage for a specific plan
   */
  async resetUsage(apiKey) {
    const result = await this.makeApiRequest(apiKey, '/api/v2/test/_proc/reset-usage', 'DELETE');
    return result.success;
  }

  /**
   * Get current usage for a plan
   */
  async getUsage(apiKey) {
    const result = await this.makeApiRequest(apiKey, '/api/v2/test/_proc/usage-info', 'GET');
    if (result.success) {
      return result.data.usage_details;
    }
    return null;
  }

  /**
   * Make a batch of API calls
   */
  async makeBatchCalls(apiKey, count) {
    return await this.makeApiRequest(apiKey, '/api/v2/test/_proc/rate-limit-batch', 'POST', {
      count,
    });
  }

  /**
   * Test a single plan's rate limits
   */
  async testPlanLimits(planName, config) {
    console.log(`\n🧪 Testing ${planName.toUpperCase()} plan limits...`);
    console.log(`   Monthly Limit: ${config.monthlyLimit.toLocaleString()}`);

    const results = {
      plan: planName,
      monthlyLimit: config.monthlyLimit,
      testsRun: [],
      errors: [],
      finalUsage: null,
      limitEnforcement: null,
    };

    try {
      // Reset usage first
      console.log('   🔄 Resetting usage...');
      const resetSuccess = await this.resetUsage(config.apiKey);
      if (!resetSuccess) {
        results.errors.push('Failed to reset usage');
        return results;
      }

      // Test 1: Basic API calls
      console.log('   📊 Test 1: Basic API call tracking');
      let response = await this.makeApiRequest(config.apiKey);
      if (response.success) {
        results.testsRun.push({
          test: 'basic_call',
          success: true,
          usage: response.data.usage,
        });
        console.log(
          `      ✅ Basic call successful, usage: ${response.data.usage.current_api_calls}`
        );
      } else {
        results.errors.push('Basic API call failed');
      }

      // Test 2: Batch calls
      console.log('   📊 Test 2: Batch API calls');
      const batchSize = Math.min(1000, Math.floor(config.monthlyLimit * 0.1));
      response = await this.makeBatchCalls(config.apiKey, batchSize);
      if (response.success) {
        results.testsRun.push({
          test: 'batch_calls',
          success: true,
          batchSize,
          usage: response.data.usage,
        });
        console.log(`      ✅ Batch of ${batchSize} calls successful`);
      } else {
        results.errors.push(`Batch call of ${batchSize} failed`);
      }

      // Test 3: Rapid successive calls
      console.log('   📊 Test 3: Rapid successive calls');
      const rapidCallCount = 50;
      let successfulCalls = 0;
      for (let i = 0; i < rapidCallCount; i++) {
        const rapidResponse = await this.makeApiRequest(config.apiKey);
        if (rapidResponse.success) successfulCalls++;
        await this.sleep(10); // Small delay
      }
      results.testsRun.push({
        test: 'rapid_calls',
        attempted: rapidCallCount,
        successful: successfulCalls,
      });
      console.log(`      ✅ Rapid calls: ${successfulCalls}/${rapidCallCount} successful`);

      // Test 4: Approach limit (for FREE plan only)
      if (planName === 'free') {
        console.log('   📊 Test 4: Testing FREE plan limit enforcement');

        // Get current usage
        let usage = await this.getUsage(config.apiKey);
        const remaining = config.monthlyLimit - usage.api_calls_used;

        if (remaining > 100) {
          // Use up remaining quota minus a small buffer
          const toUse = remaining - 10;
          console.log(`      📈 Using ${toUse} more calls to approach limit...`);

          const approachResponse = await this.makeBatchCalls(config.apiKey, toUse);
          if (approachResponse.success) {
            console.log(`      ✅ Successfully used ${toUse} calls`);
          }
        }

        // Try to exceed limit
        console.log('      🚫 Attempting to exceed FREE plan limit...');
        const exceedResponse = await this.makeBatchCalls(config.apiKey, 100);

        if (exceedResponse.success) {
          results.limitEnforcement = 'FAILED - Should have been blocked';
          console.log('      ❌ LIMIT ENFORCEMENT FAILED - Calls were allowed');
        } else if (exceedResponse.status === 429) {
          results.limitEnforcement = 'SUCCESS - Properly blocked';
          console.log('      ✅ LIMIT ENFORCEMENT SUCCESS - Calls properly blocked');
        } else {
          results.limitEnforcement = `UNKNOWN - Status: ${exceedResponse.status}`;
          console.log(`      ❓ Unexpected response: ${exceedResponse.status}`);
        }
      }

      // Test 5: Non-billable calls don't count
      console.log('   📊 Test 5: Non-billable calls');
      const preUsage = await this.getUsage(config.apiKey);

      // Make several usage-info calls (these shouldn't count)
      for (let i = 0; i < 10; i++) {
        await this.getUsage(config.apiKey);
      }

      const postUsage = await this.getUsage(config.apiKey);
      const usageIncreased = postUsage.api_calls_used > preUsage.api_calls_used;

      results.testsRun.push({
        test: 'non_billable_calls',
        usage_increased: usageIncreased,
        pre_usage: preUsage.api_calls_used,
        post_usage: postUsage.api_calls_used,
      });

      if (!usageIncreased) {
        console.log('      ✅ Non-billable calls correctly excluded from usage');
      } else {
        console.log('      ❌ Non-billable calls incorrectly counted toward usage');
        results.errors.push('Non-billable calls were counted');
      }

      // Get final usage
      results.finalUsage = await this.getUsage(config.apiKey);
    } catch (error) {
      console.error(`   ❌ Error testing ${planName}:`, error.message);
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Test concurrent usage across multiple plans
   */
  async testConcurrentUsage() {
    console.log('\n🚀 Testing concurrent usage across all plans...');

    const promises = Object.entries(this.testConfig).map(async ([planName, config]) => {
      const calls = [];
      for (let i = 0; i < 20; i++) {
        calls.push(this.makeApiRequest(config.apiKey));
      }
      return Promise.all(calls);
    });

    try {
      const results = await Promise.all(promises);
      console.log('✅ Concurrent testing completed successfully');
      return results;
    } catch (error) {
      console.error('❌ Concurrent testing failed:', error.message);
      return null;
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate load test report
   */
  generateReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      testSummary: {
        plansTestedsuccessfully: Object.keys(this.results).length,
        totalErrors: Object.values(this.results).reduce(
          (sum, result) => sum + result.errors.length,
          0
        ),
        limitEnforcementResults: Object.values(this.results)
          .filter(r => r.limitEnforcement)
          .map(r => ({ plan: r.plan, enforcement: r.limitEnforcement })),
      },
      planResults: this.results,
      recommendations: this.generateRecommendations(),
    };

    const reportPath = `./load-test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`\n📄 Load test report saved to: ${reportPath}`);
    return reportPath;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];

    Object.values(this.results).forEach(result => {
      if (result.errors.length > 0) {
        recommendations.push(`❌ ${result.plan.toUpperCase()}: Fix ${result.errors.length} errors`);
      }

      if (result.limitEnforcement === 'FAILED - Should have been blocked') {
        recommendations.push(
          `🔴 CRITICAL: ${result.plan.toUpperCase()} plan limit enforcement is not working`
        );
      }

      if (
        result.testsRun.some(test => test.test === 'non_billable_calls' && test.usage_increased)
      ) {
        recommendations.push(
          `⚠️  ${result.plan.toUpperCase()}: Non-billable calls are being counted - check middleware`
        );
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('✅ All tests passed - rate limiting is working correctly');
    }

    return recommendations;
  }

  /**
   * Display real-time progress
   */
  displayProgress(current, total, action) {
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    process.stdout.write(`\r   [${bar}] ${percent}% - ${action}`);
  }

  /**
   * Run the complete load test suite
   */
  async runLoadTests() {
    console.log('🚀 NECTAR API - PLAN LIMIT LOAD TESTING');
    console.log('═'.repeat(60));

    // Load configuration
    const configLoaded = await this.loadTestConfig();
    if (!configLoaded) {
      process.exit(1);
    }

    console.log(`\n📋 Testing ${Object.keys(this.testConfig).length} subscription plans:`);
    Object.entries(this.testConfig).forEach(([plan, config]) => {
      console.log(
        `   • ${plan.toUpperCase()}: ${config.monthlyLimit.toLocaleString()} calls/month`
      );
    });

    // Test each plan individually
    for (const [planName, config] of Object.entries(this.testConfig)) {
      this.results[planName] = await this.testPlanLimits(planName, config);
      await this.sleep(1000); // Brief pause between plans
    }

    // Test concurrent usage
    await this.testConcurrentUsage();

    // Generate and display results
    console.log('\n' + '═'.repeat(60));
    console.log('📊 LOAD TEST RESULTS SUMMARY');
    console.log('═'.repeat(60));

    Object.values(this.results).forEach(result => {
      const status = result.errors.length === 0 ? '✅' : '❌';
      console.log(
        `${status} ${result.plan.toUpperCase()}: ${result.testsRun.length} tests, ${result.errors.length} errors`
      );

      if (result.limitEnforcement) {
        const enforcement = result.limitEnforcement.includes('SUCCESS') ? '✅' : '❌';
        console.log(`   ${enforcement} Limit enforcement: ${result.limitEnforcement}`);
      }
    });

    // Generate report
    const reportPath = this.generateReport();

    // Show recommendations
    const recommendations = this.generateRecommendations();
    console.log('\n🎯 RECOMMENDATIONS:');
    recommendations.forEach(rec => console.log(`   ${rec}`));

    console.log('\n✅ Load testing completed!');
    console.log(`📄 Full report: ${reportPath}`);
  }

  /**
   * Run a quick smoke test
   */
  async runSmokeTest() {
    console.log('💨 Quick Smoke Test - Plan Rate Limits');
    console.log('─'.repeat(40));

    const configLoaded = await this.loadTestConfig();
    if (!configLoaded) {
      process.exit(1);
    }

    for (const [planName, config] of Object.entries(this.testConfig)) {
      console.log(`\n🧪 ${planName.toUpperCase()}:`);

      // Just test basic functionality
      const response = await this.makeApiRequest(config.apiKey);
      if (response.success) {
        console.log(`   ✅ API call successful`);
        console.log(`   📊 Current usage: ${response.data.usage.current_api_calls}`);
        console.log(`   📈 Monthly limit: ${response.data.usage.monthly_limit}`);
      } else {
        console.log(`   ❌ API call failed: ${response.error}`);
      }
    }

    console.log('\n✅ Smoke test completed!');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';
  const baseUrl = args[1] || 'http://localhost:3001';

  const tester = new PlanLimitLoadTester(baseUrl);

  switch (command) {
    case 'full':
    case 'load':
      await tester.runLoadTests();
      break;

    case 'smoke':
    case 'quick':
      await tester.runSmokeTest();
      break;

    case 'help':
      console.log('📋 Plan Limit Load Tester - Usage:');
      console.log('');
      console.log('Commands:');
      console.log('  full, load     Run complete load test suite');
      console.log('  smoke, quick   Run quick smoke test');
      console.log('  help           Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  node loadTestPlanLimits.js full');
      console.log('  node loadTestPlanLimits.js smoke');
      console.log('  node loadTestPlanLimits.js load http://localhost:3001');
      console.log('');
      console.log('Prerequisites:');
      console.log('  1. Run: node scripts/createTestUsers.js');
      console.log('  2. Run: node scripts/generateTestUserApiKeys.js');
      console.log('  3. Start server: npm run start:backend');
      break;

    default:
      console.log('❌ Unknown command. Use "help" for usage information.');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Load test error:', error);
    process.exit(1);
  });
}

module.exports = PlanLimitLoadTester;
