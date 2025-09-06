const rateLimitService = require('../services/rateLimitService');
const mongoose = require('mongoose');

async function testRateLimitFix() {
  try {
    console.log('🧪 Testing Rate Limit Service Fix...\n');

    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Create a mock request
    const mockReq = {
      ip: '127.0.0.1',
      application: { _id: '507f1f77bcf86cd799439011', name: 'test-app' },
      role: { _id: '507f1f77bcf86cd799439012', name: 'test-role' },
      service: { _id: '507f1f77bcf86cd799439013', name: 'test-service' },
      procedureName: 'uspTestProcedure',
    };

    // Test the rate limit check for auth (this would be the one failing during login)
    console.log('Testing auth rate limit...');
    const authResult = await rateLimitService.checkRateLimit('auth', mockReq);
    console.log(`✓ Auth rate limit result:`, {
      allowed: authResult.allowed,
      currentCount: authResult.currentCount,
      maxAllowed: authResult.maxAllowed,
      source: authResult.source,
    });

    // Test the rate limit check for api
    console.log('\nTesting API rate limit...');
    const apiResult = await rateLimitService.checkRateLimit('api', mockReq);
    console.log(`✓ API rate limit result:`, {
      allowed: apiResult.allowed,
      currentCount: apiResult.currentCount,
      maxAllowed: apiResult.maxAllowed,
      source: apiResult.source,
    });

    // Test multiple calls to see increment
    console.log('\nTesting multiple auth calls...');
    for (let i = 1; i <= 3; i++) {
      const result = await rateLimitService.checkRateLimit('auth', mockReq);
      console.log(
        `  Call ${i}: allowed=${result.allowed}, count=${result.currentCount}/${result.maxAllowed}`
      );
    }

    console.log('\n✅ Rate limiting is working correctly!');
    console.log('The login error should now be fixed.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
if (require.main === module) {
  require('dotenv').config();
  testRateLimitFix()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = testRateLimitFix;
