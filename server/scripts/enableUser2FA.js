const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const otplib = require('otplib');
const { encryptDatabasePassword } = require('../utils/encryption');
const { generateBackupCodes } = require('../utils/twoFactorUtils');

async function enableUser2FA() {
  try {
    const [, , emailArg] = process.argv;
    const email = emailArg || process.env.TARGET_USER_EMAIL;
    if (!email) {
      console.error('Usage: node scripts/enableUser2FA.js <email>');
      console.error('Or set TARGET_USER_EMAIL in env');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the .env file');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email }).select('+twoFactorSecret +trustedDevices');
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    // Generate secret and backup codes
    const secret = otplib.authenticator.generateSecret();
    user.twoFactorSecret = encryptDatabasePassword(secret);
    const { codes: backupCodes, plaintextCodes } = await generateBackupCodes();
    user.twoFactorBackupCodes = backupCodes;
    user.twoFactorEnabledAt = new Date();

    // Clear trusted devices to ensure 2FA is required
    user.trustedDevices = [];

    // Ensure not admin to avoid dev bypass
    // Comment out if you want to keep admin role
    if (user.isAdmin) {
      console.log('User is admin; leaving admin flag as-is, but dev bypass may skip 2FA.');
      console.log('To force 2FA, ensure NODE_ENV is not development or remove admin.');
    }

    await user.save();

    console.log('✅ 2FA enabled and trusted devices cleared.');
    console.log(`📧 Email: ${email}`);
    console.log('🔐 A new 2FA secret was generated.');
    console.log('🔑 Backup codes (displayed only once for testing):');
    plaintextCodes.forEach(c => console.log('   - ' + c));
    console.log('Note: Use authenticator app or request an email/SMS code on login.');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

enableUser2FA();
