#!/usr/bin/env node

/**
 * Production Backfill Script for Activity Log Importance Field
 *
 * This script adds the 'importance' field to existing Activity Log entries
 * that were created before the importance classification system was implemented.
 *
 * Safe to run multiple times - only processes logs without importance field.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Load the model
const ApiActivityLog = require('../models/ApiActivityLog');

// Import the classification logic from activity logger
function classifyEndpoint(path, method) {
  // Define classification rules with importance levels
  const rules = [
    { pattern: /^\/api\/auth/, category: 'auth', endpointType: 'client', importance: 'critical' },
    { pattern: /^\/api\/admin/, category: 'admin', endpointType: 'developer', importance: 'high' },
    {
      pattern: /^\/api\/workflows/,
      category: 'workflow',
      endpointType: 'client',
      importance: 'high',
    },
    { pattern: /^\/api\/public/, category: 'api', endpointType: 'public', importance: 'high' },
    {
      pattern: /^\/api\/v[0-9]+\/.*\/_proc/,
      category: 'api',
      endpointType: 'public',
      importance: 'critical',
    }, // Public API procedures
    { pattern: /^\/webhooks/, category: 'webhook', endpointType: 'public', importance: 'high' },
    { pattern: /^\/graphql/, category: 'api', endpointType: 'client', importance: 'medium' },
    { pattern: /^\/api\/reports/, category: 'api', endpointType: 'client', importance: 'low' },
    {
      pattern: /^\/api\/activity-logs/,
      category: 'api',
      endpointType: 'internal',
      importance: 'low',
    },
    {
      pattern: /^\/api\/notifications/,
      category: 'api',
      endpointType: 'internal',
      importance: 'low',
    },
    { pattern: /^\/api\/dashboard/, category: 'api', endpointType: 'internal', importance: 'low' },
    { pattern: /^\/api/, category: 'api', endpointType: 'client', importance: 'medium' },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(path)) {
      return {
        category: rule.category,
        endpointType: rule.endpointType,
        importance: rule.importance,
      };
    }
  }

  return { category: 'api', endpointType: 'internal', importance: 'low' };
}

async function backfillImportance() {
  let connection = null;

  try {
    console.log('🔧 Starting Activity Log importance field backfill...');

    // Connect to MongoDB using environment configuration
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    connection = await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check if backfill is needed
    const totalLogs = await ApiActivityLog.countDocuments();
    const logsWithoutImportance = await ApiActivityLog.countDocuments({
      importance: { $exists: false },
    });

    console.log(`📊 Found ${totalLogs} total activity logs`);
    console.log(`📊 Found ${logsWithoutImportance} logs without importance field`);

    if (logsWithoutImportance === 0) {
      console.log('✅ All logs already have importance field - backfill not needed');
      return;
    }

    console.log(`🔄 Processing ${logsWithoutImportance} logs in batches of 100...`);

    let updated = 0;
    let batches = 0;
    let offset = 0;
    const batchSize = 100;

    // Process in batches to avoid memory issues
    while (offset < logsWithoutImportance) {
      const batch = await ApiActivityLog.find({
        importance: { $exists: false },
      })
        .limit(batchSize)
        .skip(offset)
        .lean();

      if (batch.length === 0) break;

      batches++;
      console.log(`   Processing batch ${batches} (${batch.length} logs)...`);

      // Prepare bulk operations
      const bulkOps = batch.map(log => {
        const classification = classifyEndpoint(log.url || '', log.method || 'GET');
        return {
          updateOne: {
            filter: { _id: log._id },
            update: {
              $set: {
                importance: classification.importance,
                // Also update classification if needed
                category: classification.category,
                endpointType: classification.endpointType,
              },
            },
          },
        };
      });

      try {
        const result = await ApiActivityLog.bulkWrite(bulkOps, { ordered: false });
        updated += result.modifiedCount;
        console.log(`     ✅ Updated ${result.modifiedCount} logs in this batch`);
      } catch (bulkError) {
        console.error(`     ⚠️  Batch ${batches} failed:`, bulkError.message);
        // Continue with next batch
      }

      offset += batchSize;
    }

    console.log(`\n🎉 BACKFILL COMPLETE`);
    console.log(`   Total logs processed: ${updated}`);

    // Show final distribution
    const importanceStats = await ApiActivityLog.aggregate([
      { $group: { _id: '$importance', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log('\n📊 Final importance distribution:');
    importanceStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} logs`);
    });

    // Verify the "Important Only" filter will work
    const importantCount = await ApiActivityLog.countDocuments({
      importance: { $in: ['critical', 'high'] },
      category: { $in: ['api', 'workflow', 'webhook'] },
    });

    console.log(`\n🎯 Logs matching "Important Only" filter: ${importantCount}`);
    console.log('✅ Backfill completed successfully');
  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the backfill if this script is executed directly
if (require.main === module) {
  backfillImportance()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillImportance };
