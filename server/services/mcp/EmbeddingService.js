const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../../utils/logger');

/**
 * EmbeddingService
 *
 * Generates and stores vector embeddings for document chunks using OpenAI's API.
 * Manages embedding lifecycle including creation, updates, and deletion.
 */
class EmbeddingService {
  constructor() {
    this.prisma = new PrismaClient();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Embedding models and their dimensions
    this.models = {
      'text-embedding-3-small': { dimensions: 1536, cost: 0.00002 }, // $0.02 per 1M tokens
      'text-embedding-3-large': { dimensions: 3072, cost: 0.00013 }, // $0.13 per 1M tokens
      'text-embedding-ada-002': { dimensions: 1536, cost: 0.0001 }, // $0.10 per 1M tokens (legacy)
    };

    this.defaultModel = 'text-embedding-3-small';
  }

  /**
   * Generate embeddings for a file's text chunks
   * @param {Object} params
   * @param {string} params.fileId - File ID
   * @param {string} params.folderId - Folder ID
   * @param {string} params.organizationId - Organization ID
   * @param {Array<Object>} params.chunks - Text chunks
   * @param {string} params.model - Embedding model (optional)
   * @returns {Promise<Object>} - Result with embedding IDs and costs
   */
  async generateEmbeddings({ fileId, folderId, organizationId, chunks, model }) {
    const startTime = Date.now();
    const embeddingModel = model || this.defaultModel;

    try {
      logger.info('Generating embeddings', {
        fileId,
        folderId,
        chunkCount: chunks.length,
        model: embeddingModel,
      });

      // Validate model
      if (!this.models[embeddingModel]) {
        throw new Error(`Unsupported embedding model: ${embeddingModel}`);
      }

      // Delete existing embeddings for this file
      await this.deleteFileEmbeddings(fileId);

      const embeddings = [];
      const batchSize = 100; // OpenAI allows up to 2048 inputs per request
      let totalTokens = 0;

      // Process chunks in batches
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchResults = await this.generateBatchEmbeddings(batch, embeddingModel);

        // Store embeddings in database
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embedding = batchResults.data[j].embedding;

          const storedEmbedding = await this.prisma.fileEmbedding.create({
            data: {
              fileId,
              folderId,
              organizationId,
              chunkIndex: chunk.index,
              chunkText: chunk.text,
              embedding: `[${embedding.join(',')}]`, // Store as vector
              metadata: {
                startChar: chunk.startChar,
                endChar: chunk.endChar,
                ...chunk.metadata,
              },
            },
          });

          embeddings.push(storedEmbedding);
        }

        totalTokens += batchResults.usage.total_tokens;

        logger.info('Batch embedded', {
          fileId,
          batchIndex: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
          totalEmbeddings: embeddings.length,
        });
      }

      // Update folder embedding count
      await this.updateFolderEmbeddingCount(folderId);

      const duration = Date.now() - startTime;
      const cost = this.calculateCost(totalTokens, embeddingModel);

      logger.info('Embeddings generated successfully', {
        fileId,
        folderId,
        embeddingCount: embeddings.length,
        totalTokens,
        cost,
        duration,
      });

      return {
        success: true,
        embeddingIds: embeddings.map(e => e.id),
        count: embeddings.length,
        model: embeddingModel,
        tokens: totalTokens,
        cost,
        duration,
      };
    } catch (error) {
      logger.error('Error generating embeddings', {
        fileId,
        folderId,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Generate embeddings for a batch of chunks
   * @param {Array<Object>} chunks - Text chunks
   * @param {string} model - Embedding model
   * @returns {Promise<Object>} - OpenAI response
   */
  async generateBatchEmbeddings(chunks, model) {
    try {
      const response = await this.openai.embeddings.create({
        model,
        input: chunks.map(chunk => chunk.text),
        encoding_format: 'float',
      });

      return response;
    } catch (error) {
      logger.error('OpenAI embedding API error', {
        model,
        chunkCount: chunks.length,
        error: error.message,
      });

      // Handle rate limiting
      if (error.status === 429) {
        logger.warn('Rate limit hit, retrying after delay');
        await this.delay(5000); // Wait 5 seconds
        return this.generateBatchEmbeddings(chunks, model);
      }

      throw error;
    }
  }

  /**
   * Generate embedding for a single query
   * @param {string} query - Query text
   * @param {string} model - Embedding model (optional)
   * @returns {Promise<Array<number>>} - Embedding vector
   */
  async generateQueryEmbedding(query, model) {
    const embeddingModel = model || this.defaultModel;

    try {
      const response = await this.openai.embeddings.create({
        model: embeddingModel,
        input: query,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating query embedding', {
        query: query.substring(0, 100),
        model: embeddingModel,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Search for similar embeddings using vector similarity
   * @param {Object} params
   * @param {string} params.folderId - Folder ID
   * @param {string} params.organizationId - Organization ID
   * @param {Array<number>} params.queryEmbedding - Query embedding vector
   * @param {number} params.topK - Number of results to return
   * @param {number} params.minSimilarity - Minimum similarity threshold (0-1)
   * @returns {Promise<Array<Object>>} - Similar chunks with metadata
   */
  async searchSimilar({ folderId, organizationId, queryEmbedding, topK = 5, minSimilarity = 0.5 }) {
    try {
      // Use PostgreSQL function for vector search
      const results = await this.prisma.$queryRaw`
        SELECT
          fe.id,
          fe.file_id as "fileId",
          fe.chunk_text as "chunkText",
          fe.chunk_index as "chunkIndex",
          fe.metadata,
          fs.filename,
          (1 - (fe.embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector)) as similarity
        FROM "FileEmbedding" fe
        JOIN "FileStorage" fs ON fs.id = fe.file_id
        WHERE fe.folder_id = ${folderId}::uuid
          AND fe.organization_id = ${organizationId}::uuid
          AND fs."isActive" = TRUE
          AND (1 - (fe.embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector)) >= ${minSimilarity}
        ORDER BY fe.embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector
        LIMIT ${topK}
      `;

      logger.info('Vector search completed', {
        folderId,
        resultCount: results.length,
        topK,
      });

      return results.map(r => ({
        id: r.id,
        fileId: r.fileId,
        filename: r.filename,
        chunkText: r.chunkText,
        chunkIndex: r.chunkIndex,
        metadata: r.metadata,
        similarity: parseFloat(r.similarity),
      }));
    } catch (error) {
      logger.error('Error searching embeddings', {
        folderId,
        organizationId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Delete all embeddings for a file
   * @param {string} fileId - File ID
   * @returns {Promise<number>} - Count of deleted embeddings
   */
  async deleteFileEmbeddings(fileId) {
    try {
      const result = await this.prisma.fileEmbedding.deleteMany({
        where: { fileId },
      });

      logger.info('File embeddings deleted', {
        fileId,
        deletedCount: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Error deleting file embeddings', {
        fileId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Delete all embeddings for a folder
   * @param {string} folderId - Folder ID
   * @returns {Promise<number>} - Count of deleted embeddings
   */
  async deleteFolderEmbeddings(folderId) {
    try {
      const result = await this.prisma.fileEmbedding.deleteMany({
        where: { folderId },
      });

      logger.info('Folder embeddings deleted', {
        folderId,
        deletedCount: result.count,
      });

      // Reset folder embedding count
      await this.prisma.fileFolder.update({
        where: { id: folderId },
        data: {
          embeddingCount: 0,
          lastIndexedAt: null,
        },
      });

      return result.count;
    } catch (error) {
      logger.error('Error deleting folder embeddings', {
        folderId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Update folder's embedding count
   * @param {string} folderId - Folder ID
   * @returns {Promise<void>}
   */
  async updateFolderEmbeddingCount(folderId) {
    try {
      const count = await this.prisma.fileEmbedding.count({
        where: { folderId },
      });

      await this.prisma.fileFolder.update({
        where: { id: folderId },
        data: {
          embeddingCount: count,
          lastIndexedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error updating folder embedding count', {
        folderId,
        error: error.message,
      });
    }
  }

  /**
   * Get embedding statistics for a folder
   * @param {string} folderId - Folder ID
   * @returns {Promise<Object>} - Statistics
   */
  async getFolderStats(folderId) {
    try {
      const [embeddingCount, fileCount, totalChars] = await Promise.all([
        this.prisma.fileEmbedding.count({ where: { folderId } }),
        this.prisma.fileEmbedding.groupBy({
          by: ['fileId'],
          where: { folderId },
          _count: true,
        }),
        this.prisma.fileEmbedding.aggregate({
          where: { folderId },
          _sum: {
            chunkText: true,
          },
        }),
      ]);

      return {
        totalEmbeddings: embeddingCount,
        totalFiles: fileCount.length,
        avgEmbeddingsPerFile:
          fileCount.length > 0 ? Math.round(embeddingCount / fileCount.length) : 0,
      };
    } catch (error) {
      logger.error('Error getting folder stats', {
        folderId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Calculate embedding cost
   * @param {number} tokens - Token count
   * @param {string} model - Embedding model
   * @returns {number} - Cost in USD
   */
  calculateCost(tokens, model) {
    const costPerToken = this.models[model]?.cost || this.models[this.defaultModel].cost;
    return tokens * costPerToken;
  }

  /**
   * Delay helper for rate limiting
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup - close Prisma client
   */
  async cleanup() {
    await this.prisma.$disconnect();
  }
}

module.exports = new EmbeddingService();
