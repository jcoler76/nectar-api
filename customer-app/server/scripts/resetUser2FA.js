// This script resets the Two-Factor Authentication for a user,
// allowing them to set it up again on their next login.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const emailToReset = process.argv[2];

if (!emailToReset) {
  console.error('Please provide an email address as an argument.');
  console.error('Usage: node server/scripts/resetUser2FA.js <user_email>');
  process.exit(1);
}

const reset2FA = async () => {
  console.log(`Attempting to reset 2FA for: ${emailToReset}`);
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected...');

    // Find the user
    const user = await User.findOne({ email: emailToReset });

    if (!user) {
      console.log(`User with email "${emailToReset}" not found.`);
      return;
    }

    // Clear the 2FA secret
    console.log('User found. Clearing 2FA secret...');
    user.twoFactorSecret = undefined;
    await user.save();

    console.log(`✅ Successfully cleared 2FA secret for user: ${user.email}`);
    console.log('The user will be prompted to set up 2FA on their next login.');
  } catch (error) {
    console.error('❌ An error occurred:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

reset2FA();
