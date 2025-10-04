require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function enableRLS() {
  const adminUrl = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    console.log('✓ Connected as admin\n');

    // Read the migration SQL file
    const sqlPath = path.join(__dirname, '../migrations/enable-rls-mcp-server-instance.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    await client.query(sql);
    console.log('✅ RLS enabled on MCPServerInstance table');
    console.log('✅ Tenant isolation policy created');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

enableRLS();
