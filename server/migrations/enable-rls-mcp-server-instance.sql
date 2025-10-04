-- Enable RLS on MCPServerInstance table
-- This ensures tenant isolation for MCP server instances

-- Enable RLS
ALTER TABLE "MCPServerInstance" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tenant_isolation" ON "MCPServerInstance";

-- Create RLS policy for tenant isolation
CREATE POLICY "tenant_isolation" ON "MCPServerInstance"
  FOR ALL
  USING ("organizationId" = current_organization_id())
  WITH CHECK ("organizationId" = current_organization_id());

-- Verify the policy was created
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'MCPServerInstance';
