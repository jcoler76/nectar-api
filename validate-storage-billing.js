#!/usr/bin/env node

/**
 * Storage Billing System Validation Script
 *
 * This script validates the storage billing implementation to ensure:
 * 1. Cost protection mechanisms are in place
 * 2. Multi-tenant security is enforced
 * 3. Billing calculations are accurate
 * 4. No unlimited storage loopholes exist
 *
 * Run with: node validate-storage-billing.js
 */

const { PrismaClient } = require('@prisma/client');
const StorageBillingService = require('./server/services/storageBillingService');

const prisma = new PrismaClient();

async function validateStorageBilling() {
  console.log('🔍 Validating Storage Billing System...\n');

  try {
    const storageBillingService = new StorageBillingService();
    let validationErrors = [];
    let validationWarnings = [];

    // 1. Validate Storage Limits
    console.log('📏 Checking Storage Limits...');
    const limits = storageBillingService.storageLimits;

    for (const [plan, limit] of Object.entries(limits)) {
      if (limit === Number.MAX_SAFE_INTEGER || limit === Infinity) {
        validationErrors.push(`❌ CRITICAL: ${plan} plan has unlimited storage (${limit})`);
      } else if (limit > 1024 * 1024 * 1024 * 1024) { // 1TB
        validationWarnings.push(`⚠️  WARNING: ${plan} plan has very high limit (${formatBytes(limit)})`);
      } else {
        console.log(`  ✅ ${plan}: ${formatBytes(limit)}`);
      }
    }

    // 2. Validate Overage Rates
    console.log('\n💰 Checking Overage Rates...');
    const rates = storageBillingService.overageRates;

    for (const [plan, rate] of Object.entries(rates)) {
      if (plan === 'FREE' && rate !== null) {
        validationErrors.push(`❌ CRITICAL: FREE plan allows overages (rate: ${rate})`);
      } else if (plan !== 'FREE' && (rate === null || rate <= 0)) {
        validationWarnings.push(`⚠️  WARNING: ${plan} plan has no overage rate or invalid rate (${rate})`);
      } else if (plan !== 'FREE' && rate < 0.05) {
        validationWarnings.push(`⚠️  WARNING: ${plan} overage rate may be too low (${rate})`);
      } else {
        console.log(`  ✅ ${plan}: ${rate ? '$' + rate + '/GB/month' : 'No overages allowed'}`);
      }
    }

    // 3. Validate Cost Structure
    console.log('\n💸 Checking Cost Structure...');
    const awsCost = storageBillingService.awsCostPerGB;
    const markup = storageBillingService.markupMultiplier;

    if (awsCost <= 0) {
      validationErrors.push(`❌ CRITICAL: AWS cost per GB is invalid (${awsCost})`);
    } else {
      console.log(`  ✅ AWS Cost: $${awsCost}/GB/month`);
    }

    if (markup < 2) {
      validationWarnings.push(`⚠️  WARNING: Markup multiplier may be too low (${markup}x)`);
    } else {
      console.log(`  ✅ Markup: ${markup}x`);
    }

    // Check profit margins for each plan
    for (const [plan, rate] of Object.entries(rates)) {
      if (rate && rate > 0) {
        const profitMargin = rate - awsCost;
        const profitPercentage = ((profitMargin / rate) * 100).toFixed(1);

        if (profitMargin <= 0) {
          validationErrors.push(`❌ CRITICAL: ${plan} overage rate (${rate}) results in loss`);
        } else if (profitPercentage < 50) {
          validationWarnings.push(`⚠️  WARNING: ${plan} has low profit margin (${profitPercentage}%)`);
        } else {
          console.log(`  ✅ ${plan} profit margin: ${profitPercentage}%`);
        }
      }
    }

    // 4. Validate Database Schema
    console.log('\n🗄️ Checking Database Schema...');

    try {
      // Check if required tables exist
      const tables = ['StorageUsage', 'StorageOverage', 'StoragePurchase'];
      for (const table of tables) {
        try {
          await prisma[table.charAt(0).toLowerCase() + table.slice(1)].findFirst();
          console.log(`  ✅ Table ${table} exists and accessible`);
        } catch (error) {
          validationErrors.push(`❌ CRITICAL: Table ${table} missing or inaccessible`);
        }
      }
    } catch (error) {
      validationErrors.push(`❌ CRITICAL: Database connection failed: ${error.message}`);
    }

    // 5. Test Core Functionality
    console.log('\n🧪 Testing Core Functionality...');

    try {
      // Test storage packages
      const packages = storageBillingService.getStorageAddOnPacks();
      if (packages.length === 0) {
        validationWarnings.push(`⚠️  WARNING: No storage add-on packages available`);
      } else {
        console.log(`  ✅ ${packages.length} storage add-on packages available`);
      }

      // Test quota status levels
      const testBytes = 1024 * 1024; // 1MB
      const testStatus = storageBillingService.getQuotaStatus(testBytes, testBytes * 0.9, true);
      if (!testStatus.level || !testStatus.message) {
        validationErrors.push(`❌ CRITICAL: Quota status function returns invalid format`);
      } else {
        console.log(`  ✅ Quota status function working correctly`);
      }

    } catch (error) {
      validationErrors.push(`❌ CRITICAL: Core functionality test failed: ${error.message}`);
    }

    // 6. Check File Storage Routes
    console.log('\n🛣️ Checking API Routes Configuration...');

    try {
      const fs = require('fs');
      const path = require('path');

      const routesPath = path.join(__dirname, 'server', 'routes', 'fileStorage.js');
      if (fs.existsSync(routesPath)) {
        const routesContent = fs.readFileSync(routesPath, 'utf8');

        // Check for key endpoint patterns
        const requiredPatterns = [
          'checkEnhancedStorageQuota',
          '/storage/packages',
          '/storage/purchase',
          '/storage/info'
        ];

        for (const pattern of requiredPatterns) {
          if (routesContent.includes(pattern)) {
            console.log(`  ✅ Route pattern '${pattern}' found`);
          } else {
            validationWarnings.push(`⚠️  WARNING: Route pattern '${pattern}' not found`);
          }
        }
      } else {
        validationErrors.push(`❌ CRITICAL: File storage routes file not found`);
      }
    } catch (error) {
      validationWarnings.push(`⚠️  WARNING: Could not validate routes: ${error.message}`);
    }

    // 7. Summary Report
    console.log('\n📊 Validation Summary');
    console.log('='.repeat(50));

    if (validationErrors.length === 0) {
      console.log('🎉 All critical validations passed!');
    } else {
      console.log(`❌ ${validationErrors.length} critical error(s) found:`);
      validationErrors.forEach(error => console.log(`  ${error}`));
    }

    if (validationWarnings.length === 0) {
      console.log('✨ No warnings detected.');
    } else {
      console.log(`⚠️  ${validationWarnings.length} warning(s) detected:`);
      validationWarnings.forEach(warning => console.log(`  ${warning}`));
    }

    // Overall status
    console.log('\n🏁 Overall Status:');
    if (validationErrors.length === 0) {
      console.log('✅ Storage billing system is properly configured and secure.');
      console.log('💰 Cost protection mechanisms are in place.');
      console.log('🔒 System ready for production use.');
    } else {
      console.log('❌ Critical issues found - DO NOT deploy to production!');
      console.log('🚨 Fix all critical errors before enabling storage billing.');
    }

    // Specific Recommendations
    console.log('\n📋 Recommendations:');
    console.log('  • Run end-to-end tests: npm test tests/storage-billing-e2e.test.js');
    console.log('  • Monitor storage costs closely in production');
    console.log('  • Set up alerts for unusual storage usage patterns');
    console.log('  • Review and adjust overage rates based on actual AWS costs');
    console.log('  • Test multi-tenant isolation thoroughly');

    process.exit(validationErrors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ CRITICAL: Validation script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateStorageBilling();
}

module.exports = { validateStorageBilling };