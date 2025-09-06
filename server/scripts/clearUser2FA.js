#!/usr/bin/env node

/**
 * Manually clear 2FA for a specific user
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function clearUser2FA() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: node clearUser2FA.js <email>');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Clearing 2FA for ${email}...`);

    const result = await User.findOneAndUpdate(
      { email: email },
      {
        $unset: {
          twoFactorSecret: 1,
          twoFactorEnabledAt: 1,
        },
        $set: {
          twoFactorBackupCodes: [],
        },
      },
      { new: true }
    );

    if (!result) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('✅ 2FA cleared successfully');
    console.log('User ID:', result._id);
    console.log('Has twoFactorSecret now:', !!result.twoFactorSecret);
    console.log('twoFactorEnabledAt now:', result.twoFactorEnabledAt);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

clearUser2FA();
