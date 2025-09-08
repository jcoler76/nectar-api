const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const prismaService = require('../services/prismaService');

async function createAdminUser() {
  try {
    // User details
    const email = 'me@jestincoler.com';
    const password = '<password>';
    const firstName = 'Jestin';
    const lastName = 'Coler';
    const organizationName = 'Jestin Admin Organization';
    
    console.log('🔧 Creating standard admin user...');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${firstName} ${lastName}`);
    console.log(`🏢 Organization: ${organizationName}`);

    // Get Prisma client
    const prisma = await prismaService.getClient();
    console.log('✅ Connected to PostgreSQL with Prisma');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ 
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    if (existingUser) {
      console.log(`⚠️  User with email ${email} already exists`);
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Organization: ${existingUser.memberships[0]?.organization?.name || 'No organization'}`);
      console.log(`   Role: ${existingUser.memberships[0]?.role || 'No role'}`);
      process.exit(0);
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log('🔒 Password hashed successfully');

    // Generate unique organization slug
    const orgSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Create user, organization, subscription, and membership in transaction
    const result = await prisma.$transaction(async (tx) => {
      console.log('🔄 Starting database transaction...');

      // Create organization first
      const organization = await tx.organization.create({
        data: {
          id: crypto.randomUUID(),
          name: organizationName,
          slug: orgSlug,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Organization created: ${organization.name} (${organization.id})`);

      // Create subscription (premium tier for admin)
      const subscription = await tx.subscription.create({
        data: {
          id: crypto.randomUUID(),
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          maxDatabaseConnections: 100,
          maxApiCallsPerMonth: 1000000,
          maxUsersPerOrg: 50,
          maxWorkflows: 100,
          organizationId: organization.id,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Enterprise subscription created for organization`);

      // Create user
      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          email,
          passwordHash,
          firstName,
          lastName,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`✅ User created: ${user.firstName} ${user.lastName} (${user.id})`);

      // Create membership as OWNER (which gives admin privileges)
      const membership = await tx.membership.create({
        data: {
          id: crypto.randomUUID(),
          role: 'OWNER', // OWNER role gives full admin access in NavBar
          userId: user.id,
          organizationId: organization.id,
        },
      });
      console.log(`✅ Membership created with role: ${membership.role}`);

      return { user, organization, subscription, membership };
    });

    console.log('\n🎉 Admin user created successfully!');
    console.log('\n📋 User Details:');
    console.log(`   User ID: ${result.user.id}`);
    console.log(`   Email: ${result.user.email}`);
    console.log(`   Name: ${result.user.firstName} ${result.user.lastName}`);
    console.log(`   Active: ${result.user.isActive}`);
    console.log(`   Email Verified: ${result.user.emailVerified}`);
    
    console.log('\n🏢 Organization Details:');
    console.log(`   Organization ID: ${result.organization.id}`);
    console.log(`   Name: ${result.organization.name}`);
    console.log(`   Slug: ${result.organization.slug}`);
    
    console.log('\n💳 Subscription Details:');
    console.log(`   Plan: ${result.subscription.plan}`);
    console.log(`   Status: ${result.subscription.status}`);
    console.log(`   Max Connections: ${result.subscription.maxDatabaseConnections}`);
    console.log(`   Max API Calls/Month: ${result.subscription.maxApiCallsPerMonth}`);
    
    console.log('\n👑 Access Details:');
    console.log(`   Role: ${result.membership.role}`);
    console.log('   NavBar Access: Full Admin (All features including Rate Limits, Developer Endpoints)');
    console.log('   Settings Access: Admin Settings (not User Settings)');
    
    console.log('\n🔐 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log('   Password: [PROTECTED - Use the password you provided]');

    console.log('\n✅ You can now log in with full admin privileges!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.meta) {
      console.error(`   Database Error: ${JSON.stringify(error.meta, null, 2)}`);
    }
    process.exit(1);
  }
}

// Run the script
createAdminUser();