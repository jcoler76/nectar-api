const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentData() {
  console.log('🔍 Checking current data...\n');

  try {
    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isSuperAdmin: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    console.log('📊 Current Users:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
      console.log(`    - isSuperAdmin: ${user.isSuperAdmin}`);
      if (user.memberships.length > 0) {
        user.memberships.forEach(membership => {
          console.log(`    - Role: ${membership.role} in ${membership.organization.name}`);
        });
      } else {
        console.log('    - No memberships');
      }
      console.log('');
    });

    // Check memberships with roles
    const membershipRoles = await prisma.membership.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });

    console.log('📈 Current MemberRole distribution:');
    membershipRoles.forEach(role => {
      console.log(`  - ${role.role}: ${role._count.role} memberships`);
    });

  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

async function migrateUserToSuperAdmin() {
  console.log('\n🚀 Migrating jestin@jestincoler.com to SUPER_ADMIN...\n');

  try {
    // First, update the user to be isSuperAdmin
    const user = await prisma.user.update({
      where: { email: 'jestin@jestincoler.com' },
      data: { isSuperAdmin: true },
      include: {
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    console.log(`✅ Updated user ${user.email} to isSuperAdmin: ${user.isSuperAdmin}`);

    // Update all memberships to SUPER_ADMIN role (after schema is updated)
    // This will need to be done after the enum is updated
    console.log('📝 User memberships that will need role update:');
    user.memberships.forEach(membership => {
      console.log(`  - ${membership.organization.name}: ${membership.role} -> SUPER_ADMIN`);
    });

  } catch (error) {
    console.error('❌ Error migrating user:', error);
  }
}

async function createFirstAdminUser() {
  console.log('\n👤 Creating first AdminUser...\n');

  try {
    // This will be done after the AdminUser table is created
    console.log('📝 Will create AdminUser for jestin@jestincoler.com with SUPER_ADMIN role');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

async function main() {
  console.log('🔄 Role Migration Script\n');
  console.log('========================\n');

  await checkCurrentData();
  await migrateUserToSuperAdmin();
  await createFirstAdminUser();

  console.log('\n✨ Migration planning complete!');
  console.log('\nNext steps:');
  console.log('1. Update Prisma schema with new enums');
  console.log('2. Run database migration');
  console.log('3. Run this script again to complete data migration');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());