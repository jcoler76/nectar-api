require('dotenv').config();
const prismaService = require('../services/prismaService');

async function verify() {
  const prisma = prismaService.getSystemClient();

  try {
    const email = 'jestin@jestincoler.com';

    // Find user by email (same as login flow)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: {
              include: { subscription: true },
            },
          },
        },
      },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    const membership = user.memberships[0];

    if (!membership) {
      console.log('❌ No membership found');
      return;
    }

    console.log('✅ User membership verified:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: jestin@jestincoler.com');
    console.log('Organization:', membership.organization.name);
    console.log('Role:', membership.role);
    console.log('Plan:', membership.organization.subscription?.plan || 'No subscription');
    console.log('Status:', membership.organization.subscription?.status || 'N/A');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ You should now be able to log in successfully!');
    console.log('   MCP toggle should be ENABLED for TEAM plan.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

verify();
