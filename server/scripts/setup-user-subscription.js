require('dotenv').config();
const { Client } = require('pg');

async function setup() {
  const adminUrl = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL as admin');

    const userId = 'd261d489-f3f2-4c9a-8de5-28835eae2b0e';
    const orgId = '1c633340-ab38-4618-83c0-0746d542a3f5';

    // Create membership
    const membershipResult = await client.query(
      `
      INSERT INTO "Membership" (id, "userId", "organizationId", role, "joinedAt")
      VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW())
      ON CONFLICT DO NOTHING
      RETURNING id
    `,
      [userId, orgId]
    );
    console.log('✓ Membership:', membershipResult.rowCount > 0 ? 'Created' : 'Already exists');

    // Create subscription
    const subResult = await client.query(
      `
      INSERT INTO "Subscription" (id, "organizationId", plan, status, "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'TEAM', 'ACTIVE', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
      ON CONFLICT ("organizationId") DO UPDATE
      SET plan = 'TEAM', status = 'ACTIVE', "updatedAt" = NOW()
      RETURNING id, plan
    `,
      [orgId]
    );
    console.log('✓ Subscription: TEAM plan', subResult.rowCount > 0 ? 'created/updated' : '');

    console.log('\n✅ Setup complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User: jestin@jestincoler.com');
    console.log('Organization: Jestin Coler Organization');
    console.log('Role: OWNER');
    console.log('Plan: TEAM');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔄 Refresh your browser - MCP toggle should now be enabled!');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

setup();
