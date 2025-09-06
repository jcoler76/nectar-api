const mongoose = require('mongoose');
const RateLimitConfig = require('../models/RateLimitConfig');
const User = require('../models/User');

// Default rate limit configurations
const defaultConfigs = [
  {
    name: 'api',
    displayName: 'General API Rate Limit',
    description: 'Rate limit for all API endpoints',
    type: 'api',
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    prefix: 'rl:api:',
    message: 'Too many API requests, please try again later.',
    keyStrategy: 'application',
    environmentOverrides: {
      development: {
        max: 1000,
        enabled: true,
      },
      production: {
        max: 100,
        enabled: true,
      },
    },
    enabled: true,
  },
  {
    name: 'auth',
    displayName: 'Authentication Rate Limit',
    description: 'Rate limit for authentication endpoints',
    type: 'auth',
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
    prefix: 'rl:auth:',
    message: 'Too many authentication attempts, please try again later.',
    keyStrategy: 'ip',
    skipSuccessfulRequests: true,
    enabled: true,
  },
  {
    name: 'upload',
    displayName: 'File Upload Rate Limit',
    description: 'Rate limit for file upload endpoints',
    type: 'upload',
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    prefix: 'rl:upload:',
    message: 'Too many file uploads, please try again later.',
    keyStrategy: 'application',
    enabled: true,
  },
  {
    name: 'graphql',
    displayName: 'GraphQL Rate Limit',
    description: 'Rate limit for GraphQL endpoint with complexity analysis',
    type: 'graphql',
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200,
    prefix: 'rl:graphql:',
    message: 'Too many GraphQL requests, please try again later.',
    keyStrategy: 'application',
    enabled: true,
  },
  {
    name: 'websocket',
    displayName: 'WebSocket Rate Limit',
    description: 'Rate limit for WebSocket connections',
    type: 'websocket',
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    prefix: 'rl:ws:',
    message: 'Too many WebSocket messages, please slow down.',
    keyStrategy: 'ip',
    execEvenly: true,
    enabled: true,
  },
  {
    name: 'expensive-queries',
    displayName: 'Expensive Query Rate Limit',
    description: 'Rate limit for computationally expensive database operations',
    type: 'custom',
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10,
    prefix: 'rl:expensive:',
    message: 'Too many resource-intensive requests, please try again later.',
    keyStrategy: 'component',
    enabled: true,
  },
];

async function seedRateLimitConfigs() {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
    }

    // Find a system admin user to use as the creator
    let adminUser = await User.findOne({ isAdmin: true });

    if (!adminUser) {
      console.log('No admin user found, creating system user...');
      adminUser = new User({
        email: 'system@mirabel.local',
        firstName: 'System',
        lastName: 'Administrator',
        isAdmin: true,
        tier: 'enterprise',
      });
      await adminUser.save();
    }

    console.log('Seeding rate limit configurations...');

    for (const configData of defaultConfigs) {
      try {
        // Check if config already exists
        const existingConfig = await RateLimitConfig.findOne({ name: configData.name });

        if (existingConfig) {
          console.log(`Rate limit config '${configData.name}' already exists, skipping...`);
          continue;
        }

        // Create new config
        const config = new RateLimitConfig({
          ...configData,
          createdBy: adminUser._id,
        });

        await config.save();
        console.log(`✓ Created rate limit config: ${configData.name}`);
      } catch (error) {
        console.error(`✗ Error creating config '${configData.name}':`, error.message);
      }
    }

    console.log('Rate limit configuration seeding completed!');

    // Display summary
    const totalConfigs = await RateLimitConfig.countDocuments();
    const enabledConfigs = await RateLimitConfig.countDocuments({ enabled: true });

    console.log('\n=== Rate Limit Configuration Summary ===');
    console.log(`Total configurations: ${totalConfigs}`);
    console.log(`Enabled configurations: ${enabledConfigs}`);
    console.log(`Disabled configurations: ${totalConfigs - enabledConfigs}`);

    const configsByType = await RateLimitConfig.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log('\nConfigurations by type:');
    configsByType.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count}`);
    });
  } catch (error) {
    console.error('Error seeding rate limit configurations:', error);
  } finally {
    if (process.env.NODE_ENV !== 'test') {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the seeder if called directly
if (require.main === module) {
  require('dotenv').config();
  seedRateLimitConfigs()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedRateLimitConfigs;
