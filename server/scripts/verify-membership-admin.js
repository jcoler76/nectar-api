require('dotenv').config();
const { Client } = require('pg');

async function verifyAdmin() {
  const adminUrl = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    console.log('✓ Connected as admin');

    const userId = 'd261d489-f3f2-4c9a-8de5-28835eae2b0e';
    const orgId = '1c633340-ab38-4618-83c0-0746d542a3f5';

    // Check membership
    const membershipResult = await client.query(
      `
      SELECT m.id, m.role, m."joinedAt", o.name as org_name
      FROM "Membership" m
      JOIN "Organization" o ON m."organizationId" = o.id
      WHERE m."userId" = $1 AND m."organizationId" = $2
    `,
      [userId, orgId]
    );

    console.log('\n📋 Membership Query Result:');
    console.log('Row count:', membershipResult.rowCount);
    if (membershipResult.rowCount > 0) {
      console.log('✅ Membership EXISTS in database:');
      console.log(membershipResult.rows[0]);
    } else {
      console.log('❌ No membership found');
    }

    // Check subscription
    const subResult = await client.query(
      `
      SELECT id, plan, status, "currentPeriodStart", "currentPeriodEnd"
      FROM "Subscription"
      WHERE "organizationId" = $1
    `,
      [orgId]
    );

    console.log('\n💳 Subscription Query Result:');
    console.log('Row count:', subResult.rowCount);
    if (subResult.rowCount > 0) {
      console.log('✅ Subscription EXISTS in database:');
      console.log(subResult.rows[0]);
    } else {
      console.log('❌ No subscription found');
    }

    // Check RLS policies on Membership table
    const rlsResult = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'Membership'
    `);

    console.log('\n🔒 RLS Policies on Membership table:');
    console.log('Policy count:', rlsResult.rowCount);
    if (rlsResult.rowCount > 0) {
      rlsResult.rows.forEach(policy => {
        console.log('\nPolicy:', policy.policyname);
        console.log('  Command:', policy.cmd);
        console.log('  Roles:', policy.roles);
        console.log('  Using:', policy.qual);
        console.log('  With check:', policy.with_check);
      });
    } else {
      console.log('No RLS policies found (RLS may not be enabled)');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

verifyAdmin();
