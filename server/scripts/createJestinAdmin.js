const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../models/User');

async function createJestinAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the .env file');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const adminEmail = 'meadmin@jestincoler.com';
    const adminPassword = 'Fr33d0M!!@!NC';
    console.log(`Creating/updating admin user: ${adminEmail}...`);

    // Find or create the user
    let user = await User.findOne({ email: adminEmail });

    if (!user) {
      console.log('User not found, creating new admin user...');

      user = new User({
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save middleware
        firstName: 'Jestin',
        lastName: 'Coler',
        isAdmin: true,
        userType: 'admin',
        isActive: true,
        roles: [],
        ownedServices: [],
      });

      await user.save();
      console.log('✅ New Silo B customer admin user created!');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
      console.log('⚠️  This user is configured for Silo B (Customer Application) access');
    } else {
      console.log('User found, updating admin privileges...');

      // Make sure user is admin and active
      user.isAdmin = true;
      user.userType = 'admin';
      user.isActive = true;

      // Update password if needed
      user.password = adminPassword;

      await user.save();
      console.log('✅ User updated with admin privileges!');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
    }

    console.log('\n🎯 Silo B Customer Application Access:');
    console.log('1. This user can access the customer application (Silo B)');
    console.log('2. Login credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('3. User has admin privileges within customer context');
    console.log('4. Organization context will be managed via JWT tokens');

    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createJestinAdmin();
