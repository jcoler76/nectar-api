const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../models/User');

async function createUser() {
  try {
    // User details
    const email = '<email>';
    const password = '<password>';
    const firstName = 'Jestin';
    const lastName = 'Coler';

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the .env file');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      process.exit(0);
    }

    // Create new user
    const user = new User({
      email,
      password, // Will be hashed by pre-save hook
      firstName,
      lastName,
      isActive: true,
      isAdmin: true, // Making this user an admin
    });

    await user.save();

    console.log('✅ User created successfully');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${firstName} ${lastName}`);
    console.log('🔐 Password: [SET - masked for security]');
    console.log('👑 Admin: Yes');
    console.log('✓ Active: Yes');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createUser();
