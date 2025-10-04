/**
 * Run Folder API Keys Migration
 *
 * Executes the SQL migration using ADMIN_DATABASE_URL with proper permissions
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.ADMIN_DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database with admin privileges');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add-folder-api-keys.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running folder API keys migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'ApiKey'
      AND column_name = 'folderId';
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: folderId column exists in ApiKey table');
      console.log('   Column details:', result.rows[0]);
    } else {
      console.error('❌ Error: folderId column not found after migration');
    }

    // Check RLS policy
    const rlsCheck = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE tablename = 'ApiKey';
    `);

    if (rlsCheck.rows.length > 0 && rlsCheck.rows[0].rowsecurity) {
      console.log('✅ RLS is enabled on ApiKey table');
    } else {
      console.warn('⚠️  RLS may not be enabled on ApiKey table');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
