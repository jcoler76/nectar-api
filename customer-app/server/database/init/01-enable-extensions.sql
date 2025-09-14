-- Enable required PostgreSQL extensions
-- Run this on database initialization

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Case-insensitive text
CREATE EXTENSION IF NOT EXISTS "citext";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Row-level security helpers
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- JSON schema validation (optional but recommended)
-- CREATE EXTENSION IF NOT EXISTS "pg_jsonschema";

-- Full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Time-based partitioning (for usage metrics) - only if available
-- CREATE EXTENSION IF NOT EXISTS "pg_partman";

-- Create application user with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nectar_app') THEN
        CREATE ROLE nectar_app WITH LOGIN PASSWORD 'nectar_app_2024!';
    END IF;
END $$;

-- Grant necessary permissions to application user
GRANT CONNECT ON DATABASE nectar_core TO nectar_app;
GRANT USAGE ON SCHEMA public TO nectar_app;
GRANT CREATE ON SCHEMA public TO nectar_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nectar_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT USAGE, SELECT ON SEQUENCES TO nectar_app;

-- Create custom functions for multi-tenancy
CREATE OR REPLACE FUNCTION current_organization_id() 
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_organization_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            action,
            entity_type,
            entity_id,
            metadata,
            organization_id,
            user_id,
            timestamp
        ) VALUES (
            TG_OP,
            TG_TABLE_NAME,
            OLD.id::TEXT,
            to_jsonb(OLD),
            current_organization_id(),
            current_user_id(),
            NOW()
        );
        RETURN OLD;
    ELSE
        INSERT INTO audit_logs (
            action,
            entity_type,
            entity_id,
            metadata,
            organization_id,
            user_id,
            timestamp
        ) VALUES (
            TG_OP,
            TG_TABLE_NAME,
            NEW.id::TEXT,
            jsonb_build_object(
                'old', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
                'new', to_jsonb(NEW)
            ),
            current_organization_id(),
            current_user_id(),
            NOW()
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Performance optimization settings
ALTER DATABASE nectar_core SET shared_preload_libraries = 'pg_stat_statements';
ALTER DATABASE nectar_core SET pg_stat_statements.track = 'all';
ALTER DATABASE nectar_core SET pg_stat_statements.max = 10000;