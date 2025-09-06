#!/usr/bin/env node

/**
 * Script to restore encryption key from backup
 * Use this if you lose your encryption key
 */

require('dotenv').config();
const KeyManager = require('../utils/keyManagement');

async function restoreKey() {
  console.log('🔐 Mirabel API - Encryption Key Restore Tool');
  console.log('==========================================');

  const keyManager = new KeyManager();

  try {
    // Show available backups
    const history = await keyManager.getKeyHistory();

    if (history.length === 0) {
      console.log('❌ No key backups found');
      console.log('💡 You will need to:');
      console.log('   1. Set a new encryption key in your .env file');
      console.log('   2. Re-enter all database connection passwords in the UI');
      process.exit(1);
    }

    console.log('📋 Available Key Backups:');
    history.forEach((entry, index) => {
      console.log(
        `   ${index + 1}. Created: ${entry.created} (Hash: ${entry.keyHash.substring(0, 8)}...)`
      );
    });

    // Load latest backup
    console.log('\\n🔄 Restoring latest backup...');
    const restoredKey = await keyManager.loadLatestBackup();

    console.log('✅ Encryption key restored successfully');
    console.log('');
    console.log('📝 Update your .env file with the restored key:');
    console.log(`ENCRYPTION_KEY=${restoredKey}`);
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('   - Copy the key above to your .env file');
    console.log('   - Restart your application');
    console.log('   - Test database connections to verify they work');
    console.log('   - Delete this console output for security');
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    console.log('');
    console.log('💡 Manual Recovery Options:');
    console.log('   1. Check if you have the key written down somewhere');
    console.log('   2. Look for backup .env files');
    console.log('   3. Set a new key and re-enter database passwords');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  restoreKey();
}

module.exports = restoreKey;
