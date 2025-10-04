require('dotenv').config();
const { Client } = require('pg');

async function cleanup() {
  const adminUrl = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    console.log('✓ Connected as admin\n');

    const userId = 'd261d489-f3f2-4c9a-8de5-28835eae2b0e';
    const teamOrgId = '1c633340-ab38-4618-83c0-0746d542a3f5';

    // First, show all current memberships
    const before = await client.query(
      `
      SELECT m.id, o.name, s.plan, m.role
      FROM "Membership" m
      JOIN "Organization" o ON m."organizationId" = o.id
      LEFT JOIN "Subscription" s ON o.id = s."organizationId"
      WHERE m."userId" = $1
      ORDER BY m."joinedAt"
    `,
      [userId]
    );

    console.log('📋 Current memberships:');
    before.rows.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} - ${m.plan || 'No plan'} (${m.role})`);
    });

    // Delete the TEAM membership
    const deleteResult = await client.query(
      `
      DELETE FROM "Membership"
      WHERE "userId" = $1 AND "organizationId" = $2
      RETURNING id
    `,
      [userId, teamOrgId]
    );

    console.log(`\n✅ Deleted ${deleteResult.rowCount} membership(s)`);

    // Delete the TEAM subscription if it exists
    const subDeleteResult = await client.query(
      `
      DELETE FROM "Subscription"
      WHERE "organizationId" = $1
      RETURNING id, plan
    `,
      [teamOrgId]
    );

    if (subDeleteResult.rowCount > 0) {
      console.log(`✅ Deleted ${subDeleteResult.rows[0].plan} subscription`);
    }

    // Show remaining memberships
    const after = await client.query(
      `
      SELECT m.id, o.name, s.plan, m.role
      FROM "Membership" m
      JOIN "Organization" o ON m."organizationId" = o.id
      LEFT JOIN "Subscription" s ON o.id = s."organizationId"
      WHERE m."userId" = $1
      ORDER BY m."joinedAt"
    `,
      [userId]
    );

    console.log('\n📋 Remaining memberships:');
    after.rows.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} - ${m.plan || 'No plan'} (${m.role})`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

cleanup();
