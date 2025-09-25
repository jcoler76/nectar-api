-- Enable RLS and create policies for ApiActivityLog table
-- This script should be run to fix the RLS policy violation

-- Enable Row Level Security on ApiActivityLog table
ALTER TABLE "public"."ApiActivityLog" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert logs for their organization
CREATE POLICY "api_activity_log_tenant_insert_policy" ON "public"."ApiActivityLog"
    FOR INSERT
    TO nectar_app_user
    WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

-- Create policy to allow users to read logs for their organization
CREATE POLICY "api_activity_log_tenant_select_policy" ON "public"."ApiActivityLog"
    FOR SELECT
    TO nectar_app_user
    USING ("organizationId" = current_setting('app.current_organization_id', true));

-- Create policy to allow users to update logs for their organization
CREATE POLICY "api_activity_log_tenant_update_policy" ON "public"."ApiActivityLog"
    FOR UPDATE
    TO nectar_app_user
    USING ("organizationId" = current_setting('app.current_organization_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

-- Create policy to allow users to delete logs for their organization
CREATE POLICY "api_activity_log_tenant_delete_policy" ON "public"."ApiActivityLog"
    FOR DELETE
    TO nectar_app_user
    USING ("organizationId" = current_setting('app.current_organization_id', true));

-- Grant necessary permissions to the nectar_app_user role (if not already granted)
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."ApiActivityLog" TO nectar_app_user;

-- Refresh table statistics
ANALYZE "public"."ApiActivityLog";

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'ApiActivityLog';

COMMIT;