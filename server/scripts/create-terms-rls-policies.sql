-- Create RLS policies for Terms-related tables
-- This script creates proper tenant isolation policies

-- TermsAcceptance table RLS policy
-- This table contains tenant-specific data (organizationId field)
DROP POLICY IF EXISTS tenant_isolation ON "TermsAcceptance";
CREATE POLICY tenant_isolation ON "TermsAcceptance"
FOR ALL
USING ("organizationId" = current_organization_id())
WITH CHECK ("organizationId" = current_organization_id());

-- AuditLog table RLS policy
-- This table contains tenant-specific data (organizationId field)
DROP POLICY IF EXISTS tenant_isolation ON "AuditLog";
CREATE POLICY tenant_isolation ON "AuditLog"
FOR ALL
USING ("organizationId" = current_organization_id())
WITH CHECK ("organizationId" = current_organization_id());

-- Verify policies were created
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('TermsAcceptance', 'AuditLog')
ORDER BY tablename, policyname;