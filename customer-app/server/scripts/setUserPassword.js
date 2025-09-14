const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../models/User');

async function setUserPassword() {
  try {
    const [, , emailArg, passwordArg] = process.argv;
    const email = emailArg || process.env.TARGET_USER_EMAIL;
    const newPassword = passwordArg || process.env.TARGET_USER_PASSWORD || 'TestAuth123!';

    if (!email) {
      console.error('Usage: node scripts/setUserPassword.js <email> [password]');
      console.error('Or set TARGET_USER_EMAIL and optional TARGET_USER_PASSWORD in env');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the .env file');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`Setting password for ${email} ...`);
    user.password = newPassword; // Will be hashed by pre-save hook
    user.isActive = true;
    await user.save();

    console.log('✅ Password set successfully');
    console.log(`🔐 Email: ${email}`);
    console.log('🔑 Password: [SET - masked]');
    console.log('Note: This is a dummy password for development/testing.');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

setUserPassword();
