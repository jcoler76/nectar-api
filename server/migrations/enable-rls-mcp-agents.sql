-- RLS Policies for MCP Server and Autonomous Agent Tables
-- Must be run after the main RLS migration (enable-rls.sql)
-- Ensures complete tenant isolation for MCP and AI agent operations

-- ============================================================================
-- MCPServerInstance Table
-- ============================================================================

-- Enable RLS
ALTER TABLE "MCPServerInstance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MCPServerInstance" FORCE ROW LEVEL SECURITY;

-- Drop existing policy if any
DROP POLICY IF EXISTS tenant_isolation ON "MCPServerInstance";

-- Create tenant isolation policy
CREATE POLICY tenant_isolation ON "MCPServerInstance"
FOR ALL
USING ("organizationId" = current_organization_id())
WITH CHECK ("organizationId" = current_organization_id());

COMMENT ON POLICY tenant_isolation ON "MCPServerInstance" IS
'Ensures MCP server instances are only accessible within their organization. Uses current_organization_id() function for proper RLS enforcement.';

-- ============================================================================
-- AgentExecution Table
-- ============================================================================

-- Enable RLS
ALTER TABLE "AgentExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentExecution" FORCE ROW LEVEL SECURITY;

-- Drop existing policy if any
DROP POLICY IF EXISTS tenant_isolation ON "AgentExecution";

-- Create tenant isolation policy
CREATE POLICY tenant_isolation ON "AgentExecution"
FOR ALL
USING ("organizationId" = current_organization_id())
WITH CHECK ("organizationId" = current_organization_id());

COMMENT ON POLICY tenant_isolation ON "AgentExecution" IS
'Ensures agent execution logs and results are isolated per organization. Prevents cross-tenant data leakage in AI operations.';

-- ============================================================================
-- AgentMemory Table
-- ============================================================================

-- Enable RLS
ALTER TABLE "AgentMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentMemory" FORCE ROW LEVEL SECURITY;

-- Drop existing policy if any
DROP POLICY IF EXISTS tenant_isolation ON "AgentMemory";

-- Create tenant isolation policy
CREATE POLICY tenant_isolation ON "AgentMemory"
FOR ALL
USING ("organizationId" = current_organization_id())
WITH CHECK ("organizationId" = current_organization_id());

COMMENT ON POLICY tenant_isolation ON "AgentMemory" IS
'Critical: Isolates AI learning and memory by organization. Prevents agents from learning from other tenants data.';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify all MCP/Agent tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename AND policyname = 'tenant_isolation') AS has_policy
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN ('MCPServerInstance', 'AgentExecution', 'AgentMemory')
ORDER BY tablename;

-- Verify policies use current_organization_id() function (not direct current_setting)
SELECT
  tablename,
  policyname,
  CASE
    WHEN qual LIKE '%current_organization_id()%' THEN 'CORRECT: Uses function'
    WHEN qual LIKE '%current_setting%' THEN 'BROKEN: Direct setting'
    ELSE 'UNKNOWN'
  END AS policy_status,
  qual AS policy_definition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('MCPServerInstance', 'AgentExecution', 'AgentMemory')
ORDER BY tablename;

-- Expected output:
-- All tables should show:
-- - rls_enabled = true
-- - has_policy = 1
-- - policy_status = 'CORRECT: Uses function'
