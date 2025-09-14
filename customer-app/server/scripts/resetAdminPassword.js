const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../models/User');

async function resetAdminPassword() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the .env file');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const adminEmail = 'jcoler@mirabeltechnologies.com';
    const newPassword = process.env.TEMP_ADMIN_PASSWORD || 'ChangeMe123!'; // Get from environment or use default

    console.log(`Resetting password for ${adminEmail}...`);

    // Find the user
    const user = await User.findOne({ email: adminEmail });

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ User found, resetting password...');

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user with new password and ensure admin privileges
    user.password = hashedPassword;
    user.isAdmin = true;
    user.userType = 'admin';
    user.isActive = true;

    await user.save();

    console.log('✅ Password reset successfully!');
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔐 Password: [REDACTED - Check TEMP_ADMIN_PASSWORD env var]`);
    console.log('');
    console.log('⚠️  CRITICAL: Change this password immediately after logging in!');
    console.log('⚠️  Password was set from TEMP_ADMIN_PASSWORD env var or using default value');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Wait 15 minutes for any account lockout to expire, OR');
    console.log('2. Restart the server to clear in-memory lockouts');
    console.log('3. Log in with the credentials above');
    console.log('4. Go to settings to create an API key');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetAdminPassword();
