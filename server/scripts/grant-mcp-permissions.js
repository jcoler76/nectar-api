require('dotenv').config();
const { Client } = require('pg');

async function grantPermissions() {
  const adminUrl = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    console.log('✓ Connected as admin\n');

    // Grant permissions on MCPServerInstance table to nectar_app_user
    await client.query(`
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "MCPServerInstance" TO nectar_app_user;
    `);
    console.log('✅ Granted CRUD permissions on MCPServerInstance to nectar_app_user');

    // Grant usage on the sequence (for UUID generation)
    await client.query(`
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nectar_app_user;
    `);
    console.log('✅ Granted sequence permissions to nectar_app_user');

    // Verify permissions
    const result = await client.query(`
      SELECT
        grantee,
        table_name,
        string_agg(privilege_type, ', ') as privileges
      FROM information_schema.role_table_grants
      WHERE table_name = 'MCPServerInstance'
        AND grantee = 'nectar_app_user'
      GROUP BY grantee, table_name;
    `);

    console.log('\n📋 Current permissions:');
    console.table(result.rows);

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

grantPermissions();
