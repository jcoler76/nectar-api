const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const prismaService = require('../services/prismaService');
const jwt = require('jsonwebtoken');

async function debugUserPermissions() {
  try {
    console.log('🔍 Debugging User Permissions Architecture\n');
    
    const prisma = await prismaService.getClient();
    
    // Find the admin user we created
    const adminUser = await prisma.user.findUnique({
      where: { email: 'me@jestincoler.com' },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('👤 USER DETAILS:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`   User ID: ${adminUser.id}`);
    console.log(`   Active: ${adminUser.isActive}`);
    
    console.log('\n🏢 ORGANIZATION & MEMBERSHIP:');
    const membership = adminUser.memberships[0];
    if (membership) {
      console.log(`   Organization: ${membership.organization.name}`);
      console.log(`   Organization ID: ${membership.organization.id}`);
      console.log(`   Role: ${membership.role}`);
      console.log(`   Subscription: ${membership.organization.subscription?.plan || 'None'}`);
    }

    // Test login to see JWT payload
    console.log('\n🎫 JWT TOKEN ANALYSIS:');
    const authService = require('../services/authService');
    try {
      const loginResult = await authService.login('me@jestincoler.com', '<password>');
      const decodedToken = jwt.decode(loginResult.token);
      
      console.log('   JWT Payload:');
      console.log(`     userId: ${decodedToken.userId}`);
      console.log(`     email: ${decodedToken.email}`);
      console.log(`     organizationId: ${decodedToken.organizationId}`);
      console.log(`     role: ${decodedToken.role}`);
      console.log(`     isAdmin: ${decodedToken.isAdmin}`);
      console.log(`     type: ${decodedToken.type}`);
      
    } catch (loginError) {
      console.log('   ❌ Login failed:', loginError.message);
    }

    // Check what we need for different user types
    console.log('\n📋 REQUIRED USER ARCHITECTURE:');
    console.log('   1. SUPERADMIN (Platform Level):');
    console.log('      - Cross-tenant access');
    console.log('      - System-wide activity monitoring');
    console.log('      - Platform configuration');
    console.log('      - Should bypass organization restrictions');
    
    console.log('   2. ADMIN (Organization Level):');
    console.log('      - Full access within organization');
    console.log('      - All NavBar items for their tenant');
    console.log('      - Manage connections, services, users');
    console.log('      - Cannot see other organizations');
    
    console.log('   3. USER (Organization Member):');
    console.log('      - Limited access based on permissions');
    console.log('      - Configurable by admin');
    console.log('      - Restricted NavBar');

    console.log('\n🔍 CURRENT ISSUE ANALYSIS:');
    console.log('   Current Role:', membership?.role || 'None');
    console.log('   Current isAdmin logic: role === "OWNER"');
    console.log('   Problem: OWNER role is organization-bound');
    console.log('   Solution needed: Platform-level superadmin + proper org admin');

    // Check current permissions in frontend constants
    console.log('\n🎛️  FRONTEND PERMISSIONS ANALYSIS:');
    console.log('   ADMIN_PERMISSIONS should grant:');
    console.log('   - canViewDashboard: true');
    console.log('   - canManageServices: true (for Connections/Services)');
    console.log('   - canManageUsers: true (for Users)');
    console.log('   - canManageRoles: true (for Roles)');
    console.log('   - canManageApplications: true (for Applications)');
    console.log('   - canViewDocs: true');

    console.log('\n✅ RECOMMENDED SOLUTION:');
    console.log('   1. Add isSuperAdmin flag to User model');
    console.log('   2. Create platform-level superadmin user');
    console.log('   3. Keep OWNER role as organization admin');
    console.log('   4. Update NavBar logic to check both isAdmin and isSuperAdmin');
    console.log('   5. Add permission-based access for standard users');

    process.exit(0);
  } catch (error) {
    console.error('❌ Debug error:', error);
    process.exit(1);
  }
}

debugUserPermissions();