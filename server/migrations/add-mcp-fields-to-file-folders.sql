-- Add MCP fields to file_folders table
-- Run this with: psql -U postgres -d nectarstudio_ai -f add-mcp-fields-to-file-folders.sql

-- Add mcp_enabled column
ALTER TABLE file_folders
ADD COLUMN IF NOT EXISTS mcp_enabled BOOLEAN DEFAULT false;

-- Add mcp_config column
ALTER TABLE file_folders
ADD COLUMN IF NOT EXISTS mcp_config JSONB;

-- Add embedding_count column
ALTER TABLE file_folders
ADD COLUMN IF NOT EXISTS embedding_count INTEGER DEFAULT 0;

-- Add last_indexed_at column
ALTER TABLE file_folders
ADD COLUMN IF NOT EXISTS last_indexed_at TIMESTAMP;

-- Add indexing_status column
ALTER TABLE file_folders
ADD COLUMN IF NOT EXISTS indexing_status VARCHAR(50) DEFAULT 'idle';

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'file_folders'
AND column_name IN ('mcp_enabled', 'mcp_config', 'embedding_count', 'last_indexed_at', 'indexing_status')
ORDER BY column_name;
