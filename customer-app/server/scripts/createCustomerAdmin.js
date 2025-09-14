#!/usr/bin/env node

/**
 * Create Customer Admin Script for Silo B
 * Creates a customer admin user using the existing MongoDB User model
 */

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const User = require('../models/User');

async function createCustomerAdmin() {
  const email = 'meadmin@jestincoler.com';
  const password = '<password>';

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully.');

    console.log('Starting customer admin creation process...');

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(`User with email ${email} already exists.`);
      console.log('User details:');
      console.log(`- ID: ${existingUser._id}`);
      console.log(`- Email: ${existingUser.email}`);
      console.log(`- Name: ${existingUser.firstName} ${existingUser.lastName}`);
      console.log(`- Is Admin: ${existingUser.isAdmin}`);
      console.log(`- Is Active: ${existingUser.isActive}`);
      return;
    }

    // Hash the password
    console.log('Hashing password...');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the customer admin user
    console.log('Creating customer admin user...');
    const user = new User({
      email,
      password: hashedPassword,
      firstName: 'Jestin',
      lastName: 'Coler',
      isAdmin: true, // Set as admin for now
      isActive: true,
      lastLogin: new Date(),
    });

    await user.save();

    console.log(`Customer admin user created successfully!`);
    console.log(`User ID: ${user._id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Is Admin: ${user.isAdmin}`);
    console.log(`Is Active: ${user.isActive}`);
    console.log('');
    console.log('Login credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('');
    console.log('NOTE: This user is created for Silo B (Customer Application).');
    console.log('Organization context will be handled via JWT tokens during authentication.');
  } catch (error) {
    console.error('Error creating customer admin:', error);
    if (error.code === 11000) {
      console.error('This user already exists in the database.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

// Run the script
createCustomerAdmin()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
