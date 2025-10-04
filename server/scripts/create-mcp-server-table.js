require('dotenv').config();
const { Client } = require('pg');

async function createTable() {
  const adminUrl = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    console.log('✓ Connected as admin\n');

    // Create MCPServerInstance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MCPServerInstance" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "roleId" VARCHAR(255) NOT NULL,
        "organizationId" VARCHAR(255) NOT NULL,
        "serverUrl" TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        tools JSONB NOT NULL,
        "lastHealthCheck" TIMESTAMP,
        "requestCount" INTEGER NOT NULL DEFAULT 0,
        "avgResponseTime" DOUBLE PRECISION,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ MCPServerInstance table created');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS "MCPServerInstance_roleId_idx" ON "MCPServerInstance"("roleId");
      CREATE INDEX IF NOT EXISTS "MCPServerInstance_organizationId_idx" ON "MCPServerInstance"("organizationId");
      CREATE INDEX IF NOT EXISTS "MCPServerInstance_status_idx" ON "MCPServerInstance"(status);
    `);
    console.log('✅ Indexes created');

    // Create MCPServerStatus enum if it doesn't exist
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "MCPServerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ MCPServerStatus enum created');

    // Alter status column to use enum - drop default first, then change type, then add default back
    await client.query(`
      ALTER TABLE "MCPServerInstance"
      ALTER COLUMN status DROP DEFAULT;
    `);

    await client.query(`
      ALTER TABLE "MCPServerInstance"
      ALTER COLUMN status TYPE "MCPServerStatus"
      USING status::"MCPServerStatus";
    `);

    await client.query(`
      ALTER TABLE "MCPServerInstance"
      ALTER COLUMN status SET DEFAULT 'ACTIVE'::"MCPServerStatus";
    `);
    console.log('✅ Status column updated to use enum');

    console.log('\n✅ Migration complete!');
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

createTable();
