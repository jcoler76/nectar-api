-- ============================================================================
-- Add organizationId to WorkflowExecution for proper RLS enforcement
-- CRITICAL: This fixes data leakage vulnerability in workflow executions
-- ============================================================================

-- Step 1: Add organizationId column (nullable first for backfill)
ALTER TABLE "WorkflowExecution" 
ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Step 2: Backfill organizationId from parent Workflow table
UPDATE "WorkflowExecution" we
SET "organizationId" = w."organizationId"
FROM "Workflow" w
WHERE we."workflowId" = w.id
  AND we."organizationId" IS NULL;

-- Step 3: Make organizationId required
ALTER TABLE "WorkflowExecution" 
ALTER COLUMN "organizationId" SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE "WorkflowExecution" 
ADD CONSTRAINT "WorkflowExecution_organizationId_fkey" 
  FOREIGN KEY ("organizationId") 
  REFERENCES "Organization"("id") 
  ON DELETE CASCADE;

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS "WorkflowExecution_organizationId_idx" 
ON "WorkflowExecution"("organizationId");

-- Step 6: Enable Row Level Security
ALTER TABLE "WorkflowExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecution" FORCE ROW LEVEL SECURITY;

-- Step 7: Drop existing policy if any
DROP POLICY IF EXISTS tenant_isolation ON "WorkflowExecution";

-- Step 8: Create tenant isolation policy
CREATE POLICY tenant_isolation ON "WorkflowExecution"
FOR ALL
USING ("organizationId" = current_organization_id())
WITH CHECK ("organizationId" = current_organization_id());

COMMENT ON POLICY tenant_isolation ON "WorkflowExecution" IS
'Ensures workflow executions are only accessible within their organization. Critical for preventing execution log leakage.';

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify organizationId was added and backfilled
SELECT 
  COUNT(*) as total_executions,
  COUNT("organizationId") as with_org_id,
  COUNT(*) - COUNT("organizationId") as missing_org_id
FROM "WorkflowExecution";
-- Expected: missing_org_id should be 0

-- Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'WorkflowExecution' AND policyname = 'tenant_isolation') AS has_policy
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'WorkflowExecution';
-- Expected: rls_enabled = true, has_policy = 1

-- Verify policy uses correct function
SELECT
  policyname,
  qual AS using_clause,
  with_check AS check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'WorkflowExecution';
-- Expected: Should show current_organization_id() in both clauses

-- Test RLS enforcement (should return 0 without organization context)
SELECT COUNT(*) AS should_be_zero
FROM "WorkflowExecution"
WHERE current_organization_id() IS NULL;
-- Expected: 0 (if not 0, RLS is not working)

-- Success message
SELECT 'WorkflowExecution RLS successfully enabled! ✅' AS status;

