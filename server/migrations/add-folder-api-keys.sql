-- Add Folder API Key Support
-- This migration adds folder-scoped API keys for granular MCP access control

-- Add folderId to ApiKey table
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "folderId" TEXT;

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ApiKey_folderId_fkey'
    ) THEN
        ALTER TABLE "ApiKey"
        ADD CONSTRAINT "ApiKey_folderId_fkey"
        FOREIGN KEY ("folderId")
        REFERENCES "file_folders"("id")
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add index for folderId lookups
CREATE INDEX IF NOT EXISTS "ApiKey_folderId_idx" ON "ApiKey"("folderId");

-- Add apiKeys relation to FileFolder (no schema change needed, just Prisma relation)

-- Add RLS policy for ApiKey table (if not exists)
DO $$
BEGIN
    -- Enable RLS on ApiKey if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'ApiKey'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Create RLS policy for tenant isolation
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ApiKey'
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON "ApiKey"
        FOR ALL
        USING ("organizationId" = current_organization_id())
        WITH CHECK ("organizationId" = current_organization_id());
    END IF;
END $$;

-- Comments for documentation
COMMENT ON COLUMN "ApiKey"."folderId" IS 'Optional: Scope API key to specific folder for MCP access. NULL means organization-wide access.';
