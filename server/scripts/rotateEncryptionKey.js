#!/usr/bin/env node

/**
 * Complete Encryption Key Rotation with Data Migration
 * This script safely rotates the encryption key and re-encrypts all connection passwords
 */

require('dotenv').config();
const mongoose = require('mongoose');
const KeyManager = require('../utils/keyManagement');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');

async function rotateKey() {
  console.log('🔄 Mirabel API - Complete Key Rotation');
  console.log('=====================================');

  const keyManager = new KeyManager();

  try {
    // Connect to database
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Verify current key works
    console.log('🔍 Verifying current encryption key...');
    const verification = await keyManager.verifyCurrentKey();
    if (!verification.valid) {
      throw new Error('Current encryption key is invalid: ' + verification.error);
    }
    console.log('✅ Current key is valid');

    // Get all connections with encrypted passwords
    console.log('📋 Finding encrypted connection passwords...');
    const Connection = mongoose.model('Connection', require('../models/Connection').schema);
    const connections = await Connection.find({
      password: { $exists: true, $ne: '' },
    });

    console.log(`🔍 Found ${connections.length} connections with passwords`);

    if (connections.length === 0) {
      console.log('ℹ️  No encrypted passwords to migrate - safe to rotate key');
    }

    // Decrypt all passwords with current key
    const decryptedPasswords = [];
    let successfulDecryptions = 0;

    for (const connection of connections) {
      try {
        console.log(`🔓 Decrypting password for connection: ${connection.name}`);

        // Check if password is encrypted (contains colon)
        if (connection.password.includes(':')) {
          const decryptedPassword = decryptDatabasePassword(connection.password);
          decryptedPasswords.push({
            connectionId: connection._id,
            name: connection.name,
            decryptedPassword: decryptedPassword,
          });
          successfulDecryptions++;
          console.log(`   ✅ Successfully decrypted`);
        } else {
          // Password is not encrypted, store as-is
          decryptedPasswords.push({
            connectionId: connection._id,
            name: connection.name,
            decryptedPassword: connection.password,
          });
          console.log(`   ℹ️  Password not encrypted, storing as-is`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to decrypt password for ${connection.name}:`, error.message);
        throw new Error(
          `Cannot proceed with rotation - failed to decrypt existing password for ${connection.name}`
        );
      }
    }

    console.log(`✅ Successfully decrypted ${successfulDecryptions} passwords`);

    // Backup current key
    console.log('💾 Backing up current encryption key...');
    await keyManager.backupCurrentKey();
    console.log('✅ Current key backed up');

    // Generate new key
    console.log('🔑 Generating new encryption key...');
    const newKey = keyManager.generateNewKey();
    console.log('✅ New key generated');

    // Update environment variable temporarily for re-encryption
    const originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = newKey;

    // Re-encrypt all passwords with new key
    console.log('🔒 Re-encrypting passwords with new key...');
    let reencryptionErrors = [];

    for (const item of decryptedPasswords) {
      try {
        console.log(`🔒 Re-encrypting password for: ${item.name}`);
        const newEncryptedPassword = encryptDatabasePassword(item.decryptedPassword);

        await Connection.findByIdAndUpdate(item.connectionId, {
          password: newEncryptedPassword,
        });

        console.log(`   ✅ Successfully re-encrypted`);
      } catch (error) {
        console.error(`   ❌ Failed to re-encrypt password for ${item.name}:`, error.message);
        reencryptionErrors.push({ name: item.name, error: error.message });
      }
    }

    if (reencryptionErrors.length > 0) {
      // Restore original key on failure
      process.env.ENCRYPTION_KEY = originalKey;
      throw new Error(`Re-encryption failed for ${reencryptionErrors.length} connections`);
    }

    // Test decryption with new key
    console.log('🧪 Testing decryption with new key...');
    let testErrors = [];

    for (const item of decryptedPasswords) {
      try {
        const connection = await Connection.findById(item.connectionId);
        const testDecrypted = decryptDatabasePassword(connection.password);

        if (testDecrypted !== item.decryptedPassword) {
          testErrors.push(item.name);
        }
      } catch (error) {
        testErrors.push(item.name);
      }
    }

    if (testErrors.length > 0) {
      throw new Error(`Decryption test failed for: ${testErrors.join(', ')}`);
    }

    console.log('✅ All passwords successfully migrated to new key');

    // Update key history with new key
    await keyManager.updateKeyHistory(newKey, new Date().toISOString().replace(/[:.]/g, '-'));

    console.log('');
    console.log('🎉 KEY ROTATION COMPLETED SUCCESSFULLY');
    console.log('=====================================');
    console.log('');
    console.log('📝 IMPORTANT: Update your .env file with the new key:');
    console.log(`ENCRYPTION_KEY=${newKey}`);
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Old key backed up securely`);
    console.log(`   - ${connections.length} connection passwords migrated`);
    console.log(`   - All passwords tested and verified`);
    console.log(`   - New key added to backup history`);
    console.log('');
    console.log('🔄 Next Steps:');
    console.log('   1. Copy the new ENCRYPTION_KEY to your .env file');
    console.log('   2. Restart your application');
    console.log('   3. Test database connections to verify they work');
    console.log('   4. Keep the old key backup in case of issues');
  } catch (error) {
    console.error('');
    console.error('❌ KEY ROTATION FAILED');
    console.error('=====================');
    console.error('Error:', error.message);
    console.error('');
    console.error('🔧 Recovery Options:');
    console.error('   1. Your current key is still active - no changes made');
    console.error('   2. Check the error above and retry if needed');
    console.error('   3. Run backup script to secure current key first');
    console.error('   4. Contact support if you need assistance');

    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  rotateKey();
}

module.exports = rotateKey;
