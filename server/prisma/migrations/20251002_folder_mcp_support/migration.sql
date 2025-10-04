-- Migration: Add Folder MCP Server Support
-- Description: Enables AI-powered document querying for file storage folders
-- Author: Nectar Team
-- Date: 2025-10-02

-- ============================================
-- STEP 1: Install pgvector extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- STEP 2: Add MCP columns to FileFolder table
-- ============================================
ALTER TABLE file_folders
ADD COLUMN IF NOT EXISTS mcp_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mcp_config JSONB DEFAULT '{"embedding_model": "text-embedding-3-small", "llm_model": "gpt-4-turbo", "chunk_size": 1000, "chunk_overlap": 200, "top_k_results": 5}'::jsonb,
ADD COLUMN IF NOT EXISTS embedding_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_indexed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS indexing_status VARCHAR(50) DEFAULT 'idle' CHECK (indexing_status IN ('idle', 'pending', 'processing', 'completed', 'failed'));

-- Add index for MCP-enabled folders
CREATE INDEX IF NOT EXISTS idx_file_folders_mcp_enabled ON file_folders(mcp_enabled) WHERE mcp_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_file_folders_indexing_status ON file_folders(indexing_status);

-- ============================================
-- STEP 3: Create FileEmbedding table
-- ============================================
CREATE TABLE IF NOT EXISTS "FileEmbedding" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES "FileStorage"(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES file_folders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL, -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vector similarity index using IVFFlat
CREATE INDEX IF NOT EXISTS idx_file_embedding_vector ON "FileEmbedding" USING ivfflat (embedding vector_cosine_ops);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_file_embedding_file_id ON "FileEmbedding"(file_id);
CREATE INDEX IF NOT EXISTS idx_file_embedding_folder_id ON "FileEmbedding"(folder_id);
CREATE INDEX IF NOT EXISTS idx_file_embedding_organization_id ON "FileEmbedding"(organization_id);
CREATE INDEX IF NOT EXISTS idx_file_embedding_created_at ON "FileEmbedding"(created_at);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_file_embedding_folder_org ON "FileEmbedding"(folder_id, organization_id);

-- ============================================
-- STEP 4: Create BackgroundJob table
-- ============================================
CREATE TABLE IF NOT EXISTS "BackgroundJob" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(100) NOT NULL CHECK (job_type IN ('folder_embedding', 'file_embedding', 'folder_reindex')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
  folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  file_id UUID REFERENCES "FileStorage"(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for job processing
CREATE INDEX IF NOT EXISTS idx_background_job_status ON "BackgroundJob"(status);
CREATE INDEX IF NOT EXISTS idx_background_job_priority ON "BackgroundJob"(priority) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_background_job_folder ON "BackgroundJob"(folder_id);
CREATE INDEX IF NOT EXISTS idx_background_job_org ON "BackgroundJob"(organization_id);
CREATE INDEX IF NOT EXISTS idx_background_job_created_at ON "BackgroundJob"(created_at);

-- Composite index for job queue processing
CREATE INDEX IF NOT EXISTS idx_background_job_queue ON "BackgroundJob"(status, priority, created_at)
WHERE status IN ('pending', 'processing');

-- ============================================
-- STEP 5: Create FolderMCPQuery table for usage tracking
-- ============================================
CREATE TABLE IF NOT EXISTS "FolderMCPQuery" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES file_folders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES "ApiKey"(id) ON DELETE SET NULL,
  user_id UUID REFERENCES "User"(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  embedding_model VARCHAR(100),
  llm_model VARCHAR(100),
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  response_time_ms INTEGER,
  relevance_score DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics and billing
CREATE INDEX IF NOT EXISTS idx_folder_mcp_query_folder ON "FolderMCPQuery"(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_mcp_query_org ON "FolderMCPQuery"(organization_id);
CREATE INDEX IF NOT EXISTS idx_folder_mcp_query_created_at ON "FolderMCPQuery"(created_at);
CREATE INDEX IF NOT EXISTS idx_folder_mcp_query_cost ON "FolderMCPQuery"(cost_usd);

-- Composite index for billing queries
CREATE INDEX IF NOT EXISTS idx_folder_mcp_query_org_date ON "FolderMCPQuery"(organization_id, created_at);

-- ============================================
-- STEP 6: Add trigger to update updated_at timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_file_embedding_updated_at
  BEFORE UPDATE ON "FileEmbedding"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_background_job_updated_at
  BEFORE UPDATE ON "BackgroundJob"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: Add helper function for vector search
-- ============================================
CREATE OR REPLACE FUNCTION search_folder_embeddings(
  p_folder_id UUID,
  p_organization_id UUID,
  p_query_embedding vector(1536),
  p_top_k INTEGER DEFAULT 5
)
RETURNS TABLE (
  file_id UUID,
  filename TEXT,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fe.file_id,
    fs.filename::TEXT,
    fe.chunk_text,
    fe.chunk_index,
    (1 - (fe.embedding <=> p_query_embedding))::FLOAT as similarity,
    fe.metadata
  FROM "FileEmbedding" fe
  JOIN "FileStorage" fs ON fs.id = fe.file_id
  WHERE fe.folder_id = p_folder_id
    AND fe.organization_id = p_organization_id
    AND fs."isActive" = TRUE
  ORDER BY fe.embedding <=> p_query_embedding
  LIMIT p_top_k;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- STEP 8: Create function to get folder embedding stats
-- ============================================
CREATE OR REPLACE FUNCTION get_folder_embedding_stats(p_folder_id UUID)
RETURNS TABLE (
  total_files BIGINT,
  indexed_files BIGINT,
  total_embeddings BIGINT,
  last_indexed_at TIMESTAMP,
  avg_chunks_per_file NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT fs.id)::BIGINT as total_files,
    COUNT(DISTINCT fe.file_id)::BIGINT as indexed_files,
    COUNT(fe.id)::BIGINT as total_embeddings,
    MAX(fe.created_at) as last_indexed_at,
    CASE
      WHEN COUNT(DISTINCT fe.file_id) > 0
      THEN ROUND(COUNT(fe.id)::NUMERIC / COUNT(DISTINCT fe.file_id), 2)
      ELSE 0
    END as avg_chunks_per_file
  FROM file_folders ff
  LEFT JOIN "FileStorage" fs ON fs."folderId" = ff.id AND fs."isActive" = TRUE
  LEFT JOIN "FileEmbedding" fe ON fe.file_id = fs.id
  WHERE ff.id = p_folder_id
  GROUP BY ff.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- STEP 9: Add comments for documentation
-- ============================================
COMMENT ON TABLE "FileEmbedding" IS 'Stores vector embeddings for document chunks in file storage folders';
COMMENT ON COLUMN "FileEmbedding".embedding IS 'Vector embedding using OpenAI text-embedding-3-small (1536 dimensions)';
COMMENT ON COLUMN "FileEmbedding".chunk_text IS 'Original text chunk that was embedded';
COMMENT ON COLUMN "FileEmbedding".metadata IS 'Additional metadata: page numbers, section headers, etc.';

COMMENT ON TABLE "BackgroundJob" IS 'Queue for asynchronous processing of folder embeddings and indexing';
COMMENT ON COLUMN "BackgroundJob".priority IS 'Job priority: 1 (highest) to 10 (lowest)';
COMMENT ON COLUMN "BackgroundJob".payload IS 'Job-specific parameters and configuration';

COMMENT ON TABLE "FolderMCPQuery" IS 'Tracks MCP queries for usage analytics and billing';
COMMENT ON COLUMN "FolderMCPQuery".cost_usd IS 'Estimated cost in USD for embeddings and LLM calls';

COMMENT ON COLUMN file_folders.mcp_enabled IS 'Whether MCP server is enabled for this folder';
COMMENT ON COLUMN file_folders.mcp_config IS 'MCP configuration: embedding model, LLM model, chunk size, etc.';
COMMENT ON COLUMN file_folders.embedding_count IS 'Total number of embeddings for files in this folder';

-- ============================================
-- Migration complete
-- ============================================
