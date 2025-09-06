#!/usr/bin/env node

/**
 * Script to backup the current encryption key
 * Run this whenever you change the encryption key to prevent future loss
 */

require('dotenv').config();
const KeyManager = require('../utils/keyManagement');

async function backupKey() {
  console.log('🔐 Mirabel API - Encryption Key Backup Tool');
  console.log('==========================================');

  const keyManager = new KeyManager();

  try {
    // Verify current key
    const verification = await keyManager.verifyCurrentKey();
    console.log('Current key status:', verification);

    if (!verification.valid) {
      console.error('❌ Current encryption key is invalid:', verification.error);
      process.exit(1);
    }

    if (verification.isKnownKey) {
      console.log('ℹ️  This key is already backed up (created:', verification.keyAge, ')');
    }

    // Backup the key
    const backupFile = await keyManager.backupCurrentKey();

    console.log('✅ Encryption key backup completed successfully');
    console.log('📁 Backup location:', backupFile);
    console.log('');
    console.log('💡 Tips:');
    console.log('   - Store backup files securely outside your project directory');
    console.log('   - Consider using a password manager or secure cloud storage');
    console.log('   - Run this script after every key change');
    console.log('');
    console.log('📋 Key History:');
    const history = await keyManager.getKeyHistory();
    history.forEach((entry, index) => {
      console.log(
        `   ${index + 1}. Created: ${entry.created} (Hash: ${entry.keyHash.substring(0, 8)}...)`
      );
    });
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  backupKey();
}

module.exports = backupKey;
