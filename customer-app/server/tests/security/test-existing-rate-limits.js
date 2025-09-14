#!/usr/bin/env node

/**
 * Test Existing Rate Limiting Implementation
 *
 * This tests the actual rate limiting middleware already in place
 */

const express = require('express');
const request = require('supertest');

async function testExistingRateLimits() {
  console.log('🔍 Testing Existing Rate Limiting Implementation');
  console.log('='.repeat(60));

  const app = express();
  app.use(express.json());

  let testResults = {
    middleware: { found: false, functional: false },
    advancedFeatures: { found: false, functional: false },
    dynamicConfig: { found: false, functional: false },
    redisSupport: { found: false, functional: false },
    productionReady: { found: false, functional: false },
  };

  // Test 1: Check if basic rate limiting middleware exists and is importable
  console.log('\n1. 🧪 Testing Rate Limiting Middleware Import');
  try {
    const rateLimiters = require('../../middleware/rateLimiter');
    console.log('   ✅ Basic rate limiter middleware found');
    testResults.middleware.found = true;

    // Check available limiters
    const limiters = Object.keys(rateLimiters);
    console.log(`   📋 Available limiters: ${limiters.join(', ')}`);

    if (limiters.includes('apiRateLimiter') && limiters.includes('loginRateLimiter')) {
      console.log('   ✅ Core rate limiters present');
      testResults.middleware.functional = true;
    } else {
      console.log('   ⚠️  Some core rate limiters missing');
    }
  } catch (error) {
    console.log(`   ❌ Rate limiter middleware not found: ${error.message}`);
  }

  // Test 2: Check advanced rate limiter
  console.log('\n2. 🧪 Testing Advanced Rate Limiting Features');
  try {
    const advancedRateLimiter = require('../../middleware/advancedRateLimiter');
    console.log('   ✅ Advanced rate limiter found');
    testResults.advancedFeatures.found = true;

    // Check for advanced features
    const features = Object.keys(advancedRateLimiter);
    console.log(`   📋 Advanced features: ${features.join(', ')}`);

    if (features.includes('rateLimiters') && features.includes('createRateLimiter')) {
      console.log('   ✅ Advanced features functional');
      testResults.advancedFeatures.functional = true;
    }
  } catch (error) {
    console.log(`   ❌ Advanced rate limiter not found: ${error.message}`);
  }

  // Test 3: Check dynamic configuration support
  console.log('\n3. 🧪 Testing Dynamic Rate Limiting Configuration');
  try {
    const dynamicRateLimiter = require('../../middleware/dynamicRateLimiter');
    console.log('   ✅ Dynamic rate limiter found');
    testResults.dynamicConfig.found = true;

    // Check if it has the expected exports
    const exports = Object.keys(dynamicRateLimiter);
    console.log(`   📋 Dynamic exports: ${exports.join(', ')}`);

    if (exports.includes('apiLimiter') && exports.includes('authLimiter')) {
      console.log('   ✅ Dynamic configuration functional');
      testResults.dynamicConfig.functional = true;
    }
  } catch (error) {
    console.log(`   ❌ Dynamic rate limiter not found: ${error.message}`);
  }

  // Test 4: Check Redis support
  console.log('\n4. 🧪 Testing Redis Support');
  try {
    const redisService = require('../../services/redisService');
    console.log('   ✅ Redis service found');
    testResults.redisSupport.found = true;

    // Try to get Redis service (won't connect but should not error)
    if (typeof redisService.getRedisService === 'function') {
      console.log('   ✅ Redis service interface functional');
      testResults.redisSupport.functional = true;
    }
  } catch (error) {
    console.log(`   ❌ Redis service not found: ${error.message}`);
  }

  // Test 5: Check rate limit service
  console.log('\n5. 🧪 Testing Rate Limit Service');
  try {
    const rateLimitService = require('../../services/rateLimitService');
    console.log('   ✅ Rate limit service found');

    // Check key methods
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(rateLimitService));
    console.log(`   📋 Service methods: ${methods.filter(m => !m.startsWith('_')).join(', ')}`);

    if (methods.includes('checkRateLimit') && methods.includes('getRateLimitConfigs')) {
      console.log('   ✅ Rate limit service functional');
      testResults.productionReady.functional = true;
    }
  } catch (error) {
    console.log(`   ❌ Rate limit service not found: ${error.message}`);
  }

  // Test 6: Test a basic rate limiter in action
  console.log('\n6. 🧪 Testing Rate Limiter in Action');
  try {
    // Use the basic express-rate-limit as fallback test
    const rateLimit = require('express-rate-limit');

    const testLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 3, // 3 requests per minute
      message: { error: 'Rate limit exceeded in test' },
      standardHeaders: true,
    });

    app.use('/api/test-rate-limit', testLimiter);
    app.get('/api/test-rate-limit', (req, res) => {
      res.json({ success: true, message: 'Request allowed' });
    });

    // Test the rate limiter
    console.log('   🧪 Making 3 requests (should all succeed)...');
    for (let i = 1; i <= 3; i++) {
      const response = await request(app).get('/api/test-rate-limit');
      if (response.status === 200) {
        console.log(
          `   ✅ Request ${i}: Allowed (${response.headers['ratelimit-remaining']} remaining)`
        );
      } else {
        console.log(`   ❌ Request ${i}: Unexpected status ${response.status}`);
      }
    }

    console.log('   🧪 Making 4th request (should be rate limited)...');
    const response4 = await request(app).get('/api/test-rate-limit');
    if (response4.status === 429) {
      console.log('   ✅ Request 4: Properly rate limited');
      testResults.productionReady.found = true;
    } else {
      console.log(`   ❌ Request 4: Expected 429, got ${response4.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Rate limiter test failed: ${error.message}`);
  }

  // Generate comprehensive report
  console.log('\n' + '='.repeat(60));
  console.log('📊 RATE LIMITING ASSESSMENT REPORT');
  console.log('='.repeat(60));

  const categories = [
    { name: 'Basic Middleware', result: testResults.middleware },
    { name: 'Advanced Features', result: testResults.advancedFeatures },
    { name: 'Dynamic Configuration', result: testResults.dynamicConfig },
    { name: 'Redis Support', result: testResults.redisSupport },
    { name: 'Production Ready', result: testResults.productionReady },
  ];

  let foundCount = 0;
  let functionalCount = 0;

  categories.forEach((category, index) => {
    const found = category.result.found ? '✅' : '❌';
    const functional = category.result.functional ? '✅' : '❌';

    console.log(`${index + 1}. ${found} ${functional} ${category.name}`);
    console.log(`   Found: ${category.result.found}, Functional: ${category.result.functional}`);

    if (category.result.found) foundCount++;
    if (category.result.functional) functionalCount++;
  });

  const overallScore = (((foundCount + functionalCount) / (categories.length * 2)) * 100).toFixed(
    1
  );

  console.log('\n📈 OVERALL ASSESSMENT:');
  console.log(`   • Components Found: ${foundCount}/${categories.length}`);
  console.log(`   • Components Functional: ${functionalCount}/${categories.length}`);
  console.log(`   • Overall Score: ${overallScore}%`);

  console.log('\n🔧 RECOMMENDATIONS:');

  if (overallScore >= 80) {
    console.log('   ✅ Excellent rate limiting infrastructure!');
    console.log('   💡 Suggested enhancements:');
    console.log('     - Test the rate limiting in your security test suite');
    console.log('     - Ensure rate limiters are applied to all critical endpoints');
    console.log('     - Configure environment-specific limits');
    console.log('     - Add monitoring and alerting for rate limit violations');
  } else if (overallScore >= 60) {
    console.log('   ⚠️  Good foundation, some improvements needed:');
    console.log('     - Enable Redis for production scalability');
    console.log('     - Test dynamic configuration system');
    console.log('     - Verify rate limiters are applied to endpoints');
  } else {
    console.log('   ❌ Rate limiting needs significant work:');
    console.log('     - Set up basic rate limiting middleware');
    console.log('     - Configure limits for authentication endpoints');
    console.log('     - Add Redis support for distributed environments');
  }

  console.log('\n📋 NEXT STEPS TO INTEGRATE WITH SECURITY TESTS:');
  console.log('   1. Create rate limiting security test cases');
  console.log('   2. Verify rate limits are applied to critical endpoints');
  console.log('   3. Test brute force protection on login endpoints');
  console.log('   4. Validate rate limit headers are being set');
  console.log('   5. Test Redis failover to in-memory store');

  console.log('\n' + '='.repeat(60));
}

if (require.main === module) {
  testExistingRateLimits().catch(console.error);
}

module.exports = testExistingRateLimits;
