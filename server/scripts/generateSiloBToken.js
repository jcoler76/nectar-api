#!/usr/bin/env node

/**
 * Generate JWT Token for Silo B Access
 * Creates a valid JWT token that can be used to access the customer application
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

function generateSiloBToken() {
  const email = 'meadmin@jestincoler.com';
  const password = 'Fr33d0M!!@!NC'; // For reference only

  try {
    console.log('🔑 Generating Silo B Access Token...');
    console.log('');

    // Create a mock user payload for Silo B customer application
    const payload = {
      userId: 'silo-b-admin-001',
      email: email,
      firstName: 'Jestin',
      lastName: 'Coler',
      organizationId: 'jestin-coler-org-001',
      organizationSlug: 'jestin-coler',
      role: 'OWNER', // Organization owner role
      type: 'customer', // Customer token (not platform admin)
      permissions: {
        canViewDashboard: true,
        canManageConnections: true,
        canManageServices: true,
        canManageApplications: true,
        canManageWorkflows: true,
        canManageOrgUsers: true,
        canManageOrgSettings: true,
        canViewOrgReports: true,
        canManageOrgBilling: true,
        canExportData: true,
        canImportData: true,
        canDeleteData: true,
      },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };

    const secret = process.env.JWT_SECRET || 'nectar_jwt_secret_development_only_2024!';
    const token = jwt.sign(payload, secret);

    console.log('✅ Silo B Access Token Generated Successfully!');
    console.log('');
    console.log('🔐 Token Details:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${payload.role} (Organization Owner)`);
    console.log(`Organization: ${payload.organizationSlug}`);
    console.log(`Type: ${payload.type} (Customer Application Access)`);
    console.log(`Valid Until: ${new Date(payload.exp * 1000).toLocaleString()}`);
    console.log('');
    console.log('🎯 Access Token:');
    console.log(token);
    console.log('');
    console.log('📋 How to Use:');
    console.log('1. Copy the token above');
    console.log('2. Use it in API requests as: Authorization: Bearer <token>');
    console.log('3. Or save it for frontend authentication');
    console.log('4. This token grants full Silo B customer application access');
    console.log('');
    console.log('🔍 Token Verification:');

    // Verify the token works
    try {
      const decoded = jwt.verify(token, secret);
      console.log('✅ Token verification successful');
      console.log(`   User: ${decoded.firstName} ${decoded.lastName} (${decoded.email})`);
      console.log(`   Organization: ${decoded.organizationSlug}`);
      console.log(`   Role: ${decoded.role}`);
      console.log(`   Expires: ${new Date(decoded.exp * 1000).toLocaleString()}`);
    } catch (verifyError) {
      console.log('❌ Token verification failed:', verifyError.message);
    }

    console.log('');
    console.log('⚠️  Important Notes:');
    console.log('- This token is for Silo B (Customer Application) access only');
    console.log('- Platform admin tokens will be rejected by the customer auth middleware');
    console.log('- Token expires in 24 hours - regenerate as needed');
    console.log('- Organization context is included for tenant isolation');
  } catch (error) {
    console.error('Error generating token:', error);
    process.exit(1);
  }
}

// Run the script
generateSiloBToken();

console.log('');
console.log('🚀 Next Steps:');
console.log('1. Use this token to authenticate with Silo B APIs');
console.log(
  '2. Test with: curl -H "Authorization: Bearer <token>" http://localhost:3001/api/customer/...'
);
console.log('3. Or use in your frontend application for authentication');
