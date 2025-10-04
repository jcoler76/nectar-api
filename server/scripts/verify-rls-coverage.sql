-- ============================================================================
-- COMPREHENSIVE RLS VERIFICATION SCRIPT
-- Run this on your production database to verify tenant isolation
-- ============================================================================

-- 1. Check which tables have organizationId field
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'organizationId'
  AND table_schema = 'public'
ORDER BY table_name;

-- 2. Verify RLS is enabled on all tenant tables
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = t.tablename
      AND column_name = 'organizationId'
      AND table_schema = 'public'
  )
ORDER BY 
  CASE WHEN rowsecurity = true THEN 0 ELSE 1 END,
  tablename;

-- 3. Verify all policies use current_organization_id() function
SELECT
  tablename,
  policyname,
  CASE
    WHEN qual LIKE '%current_organization_id()%' OR with_check LIKE '%current_organization_id()%' THEN 'CORRECT ✅'
    WHEN qual LIKE '%current_setting%' OR with_check LIKE '%current_setting%' THEN 'BROKEN ❌'
    ELSE 'UNKNOWN ⚠️'
  END AS policy_status,
  qual AS using_clause,
  with_check AS check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY
  CASE 
    WHEN qual LIKE '%current_organization_id()%' OR with_check LIKE '%current_organization_id()%' THEN 0
    ELSE 1
  END,
  tablename;

-- 4. Find tables with organizationId but NO RLS enabled (CRITICAL ISSUE)
SELECT
  t.tablename AS "⚠️ VULNERABLE TABLE",
  'Missing RLS' AS issue,
  'Add RLS policy immediately' AS action_required
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.tablename
      AND c.column_name = 'organizationId'
      AND c.table_schema = 'public'
  )
  AND t.rowsecurity = false
ORDER BY t.tablename;

-- 5. Check for tables with RLS but no policies (CRITICAL ISSUE)
SELECT
  t.tablename AS "⚠️ MISCONFIGURED TABLE",
  'RLS enabled but no policies' AS issue,
  'Add tenant_isolation policy' AS action_required
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = t.tablename
      AND p.schemaname = 'public'
  )
ORDER BY t.tablename;

-- 6. Verify current_organization_id() function exists and is correct
SELECT
  proname AS function_name,
  prosrc AS function_body
FROM pg_proc
WHERE proname = 'current_organization_id';

-- 7. Test RLS enforcement (should return 0 rows without setting organization)
-- This query should return 0 rows if RLS is working
SELECT COUNT(*) AS should_be_zero, 'If not 0, RLS is BROKEN' AS warning
FROM "Service"
WHERE current_organization_id() IS NULL;

-- 8. List all API activity logs statistics by table
SELECT
  tablename,
  n_live_tup AS approximate_row_count,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%Activity%'
ORDER BY tablename;

-- ============================================================================
-- EXPECTED RESULTS:
-- 1. All tables with organizationId should show up in first query
-- 2. All tables with organizationId should have rls_enabled = true
-- 3. All policies should show "CORRECT ✅" status
-- 4. Query 4 should return 0 rows (no vulnerable tables)
-- 5. Query 5 should return 0 rows (no misconfigured tables)
-- 6. Function should exist and use 'app.current_organization_id'
-- 7. Query 7 should return 0 (RLS blocks access without org context)
-- ============================================================================

