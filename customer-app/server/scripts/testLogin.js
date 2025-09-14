#!/usr/bin/env node

/**
 * Test login functionality
 */

const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login for jcoler@mirabeltechnologies.com...');

    const response = await axios.post(
      'http://localhost:3001/api/auth/login',
      {
        email: 'jcoler@mirabeltechnologies.com',
        password: 'Fr33d0M!!@!MC',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Login successful!');
    console.log('Response status:', response.status);
    console.log('Full response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Login failed');
    console.error('Status:', error.response?.status);
    console.error('Error data:', error.response?.data);
  }
}

testLogin();
