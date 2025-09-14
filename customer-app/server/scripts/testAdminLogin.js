const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const authService = require('../services/authService');

async function testAdminLogin() {
  try {
    console.log('🔧 Testing admin user login...');

    const email = 'me@jestincoler.com';
    const password = '<password>';

    console.log(`📧 Email: ${email}`);
    console.log('🔐 Attempting login...');

    const result = await authService.login(email, password);

    console.log('\n✅ Login successful!');
    console.log('\n👤 User Info:');
    console.log(`   User ID: ${result.user.id}`);
    console.log(`   Email: ${result.user.email}`);
    console.log(`   Name: ${result.user.firstName} ${result.user.lastName}`);
    console.log(`   Active: ${result.user.isActive}`);
    console.log(`   Email Verified: ${result.user.emailVerified}`);

    console.log('\n🏢 Organization Info:');
    console.log(`   Organization ID: ${result.organization.id}`);
    console.log(`   Name: ${result.organization.name}`);
    console.log(`   Slug: ${result.organization.slug}`);

    console.log('\n👑 Membership Info:');
    console.log(`   Role: ${result.membership.role}`);
    console.log(`   Joined At: ${result.membership.joinedAt}`);

    console.log('\n🎫 Token Info:');
    console.log(`   Expires In: ${result.expiresIn}`);

    // Decode the JWT to see what's in it
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(result.token);
    console.log('\n🔍 JWT Payload:');
    console.log(`   User ID: ${decoded.userId}`);
    console.log(`   Email: ${decoded.email}`);
    console.log(`   Organization ID: ${decoded.organizationId}`);
    console.log(`   Role: ${decoded.role}`);
    console.log(`   Is Admin: ${decoded.isAdmin}`);
    console.log(`   Type: ${decoded.type}`);

    if (decoded.isAdmin) {
      console.log('\n✅ Admin flag is correctly set to TRUE');
      console.log('   NavBar should show:');
      console.log('   ✅ All standard items (Dashboard, Connections, Services, etc.)');
      console.log('   ✅ Admin-only items (Rate Limits, Developer Endpoints)');
      console.log('   ✅ Admin Settings (instead of User Settings)');
    } else {
      console.log('\n❌ Admin flag is FALSE - this is the problem!');
      console.log('   Role:', decoded.role);
      console.log('   Expected: OWNER role should set isAdmin to true');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }
}

testAdminLogin();
