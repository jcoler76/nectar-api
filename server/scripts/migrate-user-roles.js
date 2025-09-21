const { Client } = require('pg');
require('dotenv').config();

// Use raw SQL to avoid Prisma client generation issues
const client = new Client({
  connectionString: 'postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectarstudio_ai',
});

async function migrateUserRoles() {
  try {
    await client.connect();
    console.log('🔗 Connected to database\n');

    // Step 1: Check current user data
    console.log('1. 📊 Checking current user data...');

    const userQuery = `
      SELECT u.id, u.email, u."isSuperAdmin",
             array_agg(
               json_build_object(
                 'role', m.role,
                 'orgName', o.name,
                 'orgId', o.id
               )
             ) as memberships
      FROM "User" u
      LEFT JOIN "Membership" m ON u.id = m."userId"
      LEFT JOIN "Organization" o ON m."organizationId" = o.id
      WHERE u.email = 'jestin@jestincoler.com'
      GROUP BY u.id, u.email, u."isSuperAdmin"
    `;

    const userResult = await client.query(userQuery);

    if (userResult.rows.length === 0) {
      console.log('❌ User jestin@jestincoler.com not found');
      return;
    }

    const user = userResult.rows[0];
    console.log(`   ✅ Found user: ${user.email}`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - isSuperAdmin: ${user.isuperadmin}`);
    console.log(`   - Memberships:`, user.memberships);

    // Step 2: Update user to isSuperAdmin if not already
    console.log('\n2. 🚀 Updating user to Super Admin...');

    if (!user.isuperadmin) {
      await client.query('UPDATE "User" SET "isSuperAdmin" = true WHERE email = $1', [
        'jestin@jestincoler.com',
      ]);
      console.log('   ✅ Updated user.isSuperAdmin to true');
    } else {
      console.log('   ℹ️  User already has isSuperAdmin = true');
    }

    // Step 3: Update membership roles from legacy to new
    console.log('\n3. 🔄 Updating membership roles...');

    const membershipsToUpdate = user.memberships.filter(m => m !== null);

    for (const membership of membershipsToUpdate) {
      let newRole;

      switch (membership.role) {
        case 'OWNER':
          newRole = 'SUPER_ADMIN'; // You are platform super admin
          break;
        case 'ADMIN':
          newRole = 'ORGANIZATION_ADMIN';
          break;
        case 'MEMBER':
          newRole = 'MEMBER'; // Keep as is
          break;
        case 'VIEWER':
          newRole = 'VIEWER'; // Keep as is
          break;
        default:
          console.log(`   ⚠️  Unknown role: ${membership.role}, skipping`);
          continue;
      }

      if (newRole !== membership.role) {
        await client.query(
          'UPDATE "Membership" SET role = $1 WHERE "userId" = $2 AND "organizationId" = $3',
          [newRole, user.id, membership.orgid]
        );
        console.log(`   ✅ Updated ${membership.orgname}: ${membership.role} → ${newRole}`);
      } else {
        console.log(`   ℹ️  ${membership.orgname}: ${membership.role} (no change needed)`);
      }
    }

    // Step 4: Create AdminUser record
    console.log('\n4. 👤 Creating AdminUser record...');

    // Check if AdminUser already exists
    const adminUserCheck = await client.query('SELECT id FROM "AdminUser" WHERE email = $1', [
      'jestin@jestincoler.com',
    ]);

    if (adminUserCheck.rows.length === 0) {
      // Get user details
      const userDetails = await client.query(
        'SELECT "firstName", "lastName", "passwordHash" FROM "User" WHERE email = $1',
        ['jestin@jestincoler.com']
      );

      if (userDetails.rows.length > 0) {
        const { firstName, lastName, passwordHash } = userDetails.rows[0];

        await client.query(
          `
          INSERT INTO "AdminUser" (id, email, "passwordHash", "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, 'SUPER_ADMIN', true, NOW(), NOW())
        `,
          ['jestin@jestincoler.com', passwordHash, firstName, lastName]
        );

        console.log('   ✅ Created AdminUser with SUPER_ADMIN role');
      } else {
        console.log('   ❌ Could not find user details for AdminUser creation');
      }
    } else {
      console.log('   ℹ️  AdminUser record already exists');
    }

    // Step 5: Verify changes
    console.log('\n5. ✅ Verifying changes...');

    const verifyUser = await client.query(`
      SELECT u.email, u."isSuperAdmin",
             m.role as membership_role,
             o.name as org_name,
             au.role as admin_role
      FROM "User" u
      LEFT JOIN "Membership" m ON u.id = m."userId"
      LEFT JOIN "Organization" o ON m."organizationId" = o.id
      LEFT JOIN "AdminUser" au ON u.email = au.email
      WHERE u.email = 'jestin@jestincoler.com'
    `);

    console.log('   📋 Final user state:');
    verifyUser.rows.forEach(row => {
      console.log(`   - User: ${row.email} (isSuperAdmin: ${row.isuperadmin})`);
      if (row.membership_role) {
        console.log(`   - Membership: ${row.membership_role} in ${row.org_name}`);
      }
      if (row.admin_role) {
        console.log(`   - AdminUser role: ${row.admin_role}`);
      }
    });

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

// Run migration
migrateUserRoles();
