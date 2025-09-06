#!/usr/bin/env node

/**
 * Simple script to generate a new encryption key
 * Use this when you want a new key but will manually update connections
 */

require('dotenv').config();
const KeyManager = require('../utils/keyManagement');

async function generateNewKey() {
  console.log('🔑 Mirabel API - New Encryption Key Generator');
  console.log('===========================================');

  const keyManager = new KeyManager();

  try {
    // Backup current key first
    console.log('💾 Backing up current key...');
    await keyManager.backupCurrentKey();
    console.log('✅ Current key backed up');

    // Generate new key
    console.log('🔑 Generating new encryption key...');
    const newKey = keyManager.generateNewKey();

    console.log('');
    console.log('✅ NEW ENCRYPTION KEY GENERATED');
    console.log('===============================');
    console.log('');
    console.log('📝 Copy this key to your .env file:');
    console.log(`ENCRYPTION_KEY=${newKey}`);
    console.log('');
    console.log('⚠️  IMPORTANT NOTES:');
    console.log('   - Your old key has been backed up securely');
    console.log('   - After updating .env, you will need to:');
    console.log('     1. Restart your application');
    console.log('     2. Re-enter all database connection passwords in the UI');
    console.log('     3. OR run the full rotation script to migrate automatically');
    console.log('');
    console.log('🔄 For automatic migration, use:');
    console.log('   node scripts/rotateEncryptionKey.js');
  } catch (error) {
    console.error('❌ Key generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateNewKey();
}

module.exports = generateNewKey;
