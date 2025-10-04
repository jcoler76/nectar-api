/**
 * Upgrade User to TEAM Plan
 *
 * Updates jestin@jestincoler.com to TEAM tier for MCP testing
 */

const prismaService = require('../services/prismaService');

async function upgradeUserToTeam() {
  try {
    console.log('🔍 Finding user jestin@jestincoler.com...');

    // Get user from system client (User table not RLS protected)
    const systemPrisma = prismaService.getSystemClient();
    const user = await systemPrisma.user.findUnique({
      where: { email: 'jestin@jestincoler.com' },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
    console.log(`   User ID: ${user.id}`);

    if (!user.memberships || user.memberships.length === 0) {
      console.error('❌ User has no organization memberships');
      process.exit(1);
    }

    const membership = user.memberships[0];
    const organization = membership.organization;

    console.log(`   Organization: ${organization.name}`);
    console.log(`   Organization ID: ${organization.id}`);

    // Check current subscription
    const currentSubscription = await systemPrisma.subscription.findFirst({
      where: {
        organizationId: organization.id,
        status: 'ACTIVE',
      },
    });

    if (currentSubscription) {
      console.log(`   Current Plan: ${currentSubscription.plan}`);
    } else {
      console.log('   Current Plan: FREE (no subscription found)');
    }

    // Update or create TEAM subscription
    console.log('\n📝 Upgrading to TEAM plan...');

    if (currentSubscription) {
      // Update existing subscription
      await systemPrisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          plan: 'TEAM',
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });
      console.log('✅ Updated existing subscription to TEAM');
    } else {
      // Create new subscription
      await systemPrisma.subscription.create({
        data: {
          organizationId: organization.id,
          plan: 'TEAM',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          startDate: new Date(),
        },
      });
      console.log('✅ Created new TEAM subscription');
    }

    // Verify the change
    const verifySubscription = await systemPrisma.subscription.findFirst({
      where: {
        organizationId: organization.id,
        status: 'ACTIVE',
      },
    });

    if (verifySubscription && verifySubscription.plan === 'TEAM') {
      console.log('\n✅ SUCCESS: User upgraded to TEAM plan');
      console.log('   Plan: TEAM');
      console.log('   Status: ACTIVE');
      console.log('   MCP Access: ENABLED');
      console.log('\n🎉 You can now test MCP functionality!');
    } else {
      console.error('\n❌ Verification failed - subscription not updated correctly');
    }
  } catch (error) {
    console.error('❌ Error upgrading user:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prismaService.disconnect();
  }
}

upgradeUserToTeam();
