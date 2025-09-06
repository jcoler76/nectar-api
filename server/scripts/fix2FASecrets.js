#!/usr/bin/env node

/**
 * Fix corrupted 2FA secrets after encryption key change
 * This script will disable 2FA for users with corrupted secrets
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../utils/logger');

async function fix2FASecrets() {
  console.log('🔐 Fixing corrupted 2FA secrets after encryption key change');
  console.log('========================================================');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find users with 2FA enabled
    const usersWithTwoFactor = await User.find({
      twoFactorSecret: { $exists: true, $ne: null },
    }).select('+twoFactorSecret');

    console.log(`🔍 Found ${usersWithTwoFactor.length} users with 2FA enabled`);

    if (usersWithTwoFactor.length === 0) {
      console.log('✅ No users with 2FA found - nothing to fix');
      return;
    }

    let fixedCount = 0;
    let errorCount = 0;

    for (const user of usersWithTwoFactor) {
      try {
        console.log(`🔍 Checking 2FA for user: ${user.email}`);

        // Try to decrypt the 2FA secret
        decryptDatabasePassword(user.twoFactorSecret);
        console.log(`   ✅ 2FA secret is valid`);
      } catch (decryptError) {
        console.log(`   ❌ 2FA secret is corrupted, disabling 2FA for ${user.email}`);

        // Disable 2FA for this user
        await User.findByIdAndUpdate(user._id, {
          $unset: {
            twoFactorSecret: 1,
            twoFactorEnabledAt: 1,
          },
          $set: {
            twoFactorBackupCodes: [],
          },
        });

        fixedCount++;
        console.log(`   ✅ 2FA disabled for ${user.email}`);

        logger.info('2FA disabled due to encryption key change', {
          userId: user._id,
          email: user.email,
          reason: 'Corrupted 2FA secret after key rotation',
        });
      }
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Users checked: ${usersWithTwoFactor.length}`);
    console.log(`   - 2FA disabled: ${fixedCount}`);
    console.log(`   - Valid 2FA: ${usersWithTwoFactor.length - fixedCount}`);

    if (fixedCount > 0) {
      console.log('');
      console.log('📝 Next Steps:');
      console.log('   - Affected users can now login without 2FA');
      console.log('   - Users should re-enable 2FA in their account settings');
      console.log('   - Consider notifying affected users about the change');
    }

    console.log('');
    console.log('✅ 2FA secret fix completed successfully');
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fix2FASecrets();
}

module.exports = fix2FASecrets;
