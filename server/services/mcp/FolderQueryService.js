const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../../utils/logger');
const EmbeddingService = require('./EmbeddingService');
const NodeCache = require('node-cache');

/**
 * FolderQueryService
 *
 * RAG (Retrieval-Augmented Generation) pipeline for querying documents in folders.
 * Implements semantic search, context building, and LLM-based answer generation.
 */
class FolderQueryService {
  constructor() {
    this.prisma = new PrismaClient();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Query cache (TTL: 1 hour)
    this.cache = new NodeCache({
      stdTTL: 3600,
      checkperiod: 600,
    });

    // LLM models and costs
    this.llmModels = {
      'gpt-4-turbo': { inputCost: 0.01, outputCost: 0.03 }, // per 1K tokens
      'gpt-4': { inputCost: 0.03, outputCost: 0.06 },
      'gpt-3.5-turbo': { inputCost: 0.0015, outputCost: 0.002 },
    };

    this.defaultModel = 'gpt-4-turbo';
  }

  /**
   * Query folder documents
   * @param {Object} params
   * @param {string} params.folderId - Folder ID
   * @param {string} params.organizationId - Organization ID
   * @param {string} params.question - User question
   * @param {string} params.userId - User ID (optional)
   * @param {string} params.apiKeyId - API key ID (optional)
   * @param {Object} params.options - Query options
   * @returns {Promise<Object>} - Answer with sources and metadata
   */
  async queryFolder({ folderId, organizationId, question, userId, apiKeyId, options = {} }) {
    const startTime = Date.now();

    try {
      logger.info('Querying folder', {
        folderId,
        organizationId,
        question: question.substring(0, 100),
      });

      // Check cache
      const cacheKey = this.getCacheKey(folderId, question);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult && !options.skipCache) {
        logger.info('Returning cached result', { folderId, cacheKey });
        return cachedResult;
      }

      // Verify folder MCP is enabled
      const folder = await this.verifyFolderMCP(folderId, organizationId);

      // Check if folder has embeddings
      if (folder.embeddingCount === 0) {
        throw new Error(
          'Folder has no indexed documents. Please enable MCP and wait for indexing to complete.'
        );
      }

      const config = folder.mcpConfig || {};
      const embeddingModel = config.embedding_model || 'text-embedding-3-small';
      const llmModel = options.model || config.llm_model || this.defaultModel;
      const topK = options.topK || config.top_k_results || 5;

      // Step 1: Generate query embedding
      const queryEmbedding = await EmbeddingService.generateQueryEmbedding(
        question,
        embeddingModel
      );

      // Step 2: Vector similarity search
      const relevantChunks = await EmbeddingService.searchSimilar({
        folderId,
        organizationId,
        queryEmbedding,
        topK,
        minSimilarity: options.minSimilarity || 0.5,
      });

      if (relevantChunks.length === 0) {
        return {
          answer:
            "I couldn't find any relevant information in the documents to answer your question.",
          sources: [],
          relevantChunks: [],
          metadata: {
            relevanceScore: 0,
            confidence: 'low',
          },
        };
      }

      // Step 3: Build context from chunks
      const context = this.buildContext(relevantChunks);

      // Step 4: Generate answer with LLM
      const { answer, tokensUsed } = await this.generateAnswer(question, context, llmModel);

      // Step 5: Extract sources
      const sources = this.extractSources(relevantChunks);

      // Calculate metrics
      const responseTimeMs = Date.now() - startTime;
      const relevanceScore = this.calculateRelevanceScore(relevantChunks);
      const cost = this.calculateQueryCost(tokensUsed, llmModel);

      // Build result
      const result = {
        answer,
        sources,
        relevantChunks: relevantChunks.map(chunk => ({
          fileId: chunk.fileId,
          filename: chunk.filename,
          excerpt: chunk.chunkText.substring(0, 200),
          similarity: chunk.similarity,
        })),
        metadata: {
          relevanceScore,
          confidence: this.getConfidenceLevel(relevanceScore),
          tokensUsed,
          cost,
          responseTimeMs,
          model: llmModel,
          embeddingModel,
          chunksRetrieved: relevantChunks.length,
        },
      };

      // Log query for analytics
      await this.logQuery({
        folderId,
        organizationId,
        apiKeyId,
        userId,
        question,
        answer,
        sources: JSON.stringify(sources),
        embeddingModel,
        llmModel,
        tokensUsed,
        costUsd: cost,
        responseTimeMs,
        relevanceScore,
      });

      // Cache result
      this.cache.set(cacheKey, result);

      logger.info('Query completed successfully', {
        folderId,
        responseTimeMs,
        relevanceScore,
        cost,
      });

      return result;
    } catch (error) {
      logger.error('Error querying folder', {
        folderId,
        organizationId,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Verify folder has MCP enabled
   * @param {string} folderId - Folder ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} - Folder object
   */
  async verifyFolderMCP(folderId, organizationId) {
    const folder = await this.prisma.fileFolder.findFirst({
      where: {
        id: folderId,
        organizationId,
      },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (!folder.mcpEnabled) {
      throw new Error('MCP is not enabled for this folder');
    }

    return folder;
  }

  /**
   * Build context from relevant chunks
   * @param {Array<Object>} chunks - Relevant chunks
   * @returns {string} - Context text
   */
  buildContext(chunks) {
    const contextParts = chunks.map((chunk, index) => {
      return `[Document ${index + 1}: ${chunk.filename}]\n${chunk.chunkText}\n`;
    });

    return contextParts.join('\n---\n\n');
  }

  /**
   * Generate answer using LLM
   * @param {string} question - User question
   * @param {string} context - Context from documents
   * @param {string} model - LLM model
   * @returns {Promise<Object>} - Answer and token usage
   */
  async generateAnswer(question, context, model) {
    try {
      const systemPrompt = `You are a helpful AI assistant that answers questions based on provided document context.

Rules:
1. Only answer based on the information in the provided documents
2. If the documents don't contain relevant information, say so clearly
3. Always cite which document your information comes from
4. Be concise but thorough
5. If you're uncertain, indicate your level of confidence
6. Format your answer in clear, readable markdown`;

      const userPrompt = `Context from documents:
${context}

Question: ${question}

Please answer the question based on the provided context. Cite specific documents when possible.`;

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more factual responses
        max_tokens: 1000,
      });

      return {
        answer: response.choices[0].message.content,
        tokensUsed: response.usage.total_tokens,
      };
    } catch (error) {
      logger.error('Error generating answer with LLM', {
        model,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Extract sources from chunks
   * @param {Array<Object>} chunks - Relevant chunks
   * @returns {Array<Object>} - Unique sources
   */
  extractSources(chunks) {
    const sourceMap = new Map();

    for (const chunk of chunks) {
      if (!sourceMap.has(chunk.fileId)) {
        sourceMap.set(chunk.fileId, {
          fileId: chunk.fileId,
          filename: chunk.filename,
          excerpts: [],
        });
      }

      const source = sourceMap.get(chunk.fileId);
      source.excerpts.push({
        text: chunk.chunkText.substring(0, 200) + '...',
        similarity: chunk.similarity,
        chunkIndex: chunk.chunkIndex,
      });
    }

    return Array.from(sourceMap.values());
  }

  /**
   * Calculate relevance score from chunks
   * @param {Array<Object>} chunks - Relevant chunks
   * @returns {number} - Average similarity score
   */
  calculateRelevanceScore(chunks) {
    if (chunks.length === 0) return 0;
    const avgSimilarity = chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length;
    return Math.round(avgSimilarity * 100) / 100;
  }

  /**
   * Get confidence level from relevance score
   * @param {number} score - Relevance score
   * @returns {string} - Confidence level
   */
  getConfidenceLevel(score) {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Calculate query cost
   * @param {number} tokens - Total tokens used
   * @param {string} model - LLM model
   * @returns {number} - Cost in USD
   */
  calculateQueryCost(tokens, model) {
    const modelCosts = this.llmModels[model] || this.llmModels[this.defaultModel];
    // Rough estimate: 70% input, 30% output
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.floor(tokens * 0.3);

    const cost =
      (inputTokens / 1000) * modelCosts.inputCost + (outputTokens / 1000) * modelCosts.outputCost;

    return Math.round(cost * 1000000) / 1000000; // Round to 6 decimals
  }

  /**
   * Log query for analytics and billing
   * @param {Object} data - Query data
   * @returns {Promise<void>}
   */
  async logQuery(data) {
    try {
      await this.prisma.folderMCPQuery.create({
        data: {
          folderId: data.folderId,
          organizationId: data.organizationId,
          apiKeyId: data.apiKeyId || null,
          userId: data.userId || null,
          question: data.question,
          answer: data.answer,
          sources: data.sources,
          embeddingModel: data.embeddingModel,
          llmModel: data.llmModel,
          tokensUsed: data.tokensUsed,
          costUsd: data.costUsd,
          responseTimeMs: data.responseTimeMs,
          relevanceScore: data.relevanceScore,
        },
      });
    } catch (error) {
      logger.error('Error logging query', {
        folderId: data.folderId,
        error: error.message,
      });
      // Don't throw - logging failure shouldn't break queries
    }
  }

  /**
   * Get cache key
   * @param {string} folderId - Folder ID
   * @param {string} question - Question
   * @returns {string} - Cache key
   */
  getCacheKey(folderId, question) {
    // Simple hash of folder + question
    const crypto = require('crypto');
    return crypto.createHash('md5').update(`${folderId}:${question}`).digest('hex');
  }

  /**
   * Get query history for a folder
   * @param {string} folderId - Folder ID
   * @param {number} limit - Max results
   * @returns {Promise<Array<Object>>} - Query history
   */
  async getQueryHistory(folderId, limit = 50) {
    return await this.prisma.folderMCPQuery.findMany({
      where: { folderId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        question: true,
        createdAt: true,
        relevanceScore: true,
        responseTimeMs: true,
        costUsd: true,
      },
    });
  }

  /**
   * Get usage statistics for a folder
   * @param {string} folderId - Folder ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} - Usage stats
   */
  async getUsageStats(folderId, startDate, endDate) {
    const stats = await this.prisma.folderMCPQuery.aggregate({
      where: {
        folderId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
      _sum: {
        tokensUsed: true,
        costUsd: true,
      },
      _avg: {
        relevanceScore: true,
        responseTimeMs: true,
      },
    });

    return {
      totalQueries: stats._count,
      totalTokens: stats._sum.tokensUsed || 0,
      totalCost: stats._sum.costUsd || 0,
      avgRelevanceScore: stats._avg.relevanceScore || 0,
      avgResponseTime: stats._avg.responseTimeMs || 0,
    };
  }

  /**
   * Cleanup - close connections
   */
  async cleanup() {
    await this.prisma.$disconnect();
    this.cache.close();
  }
}

module.exports = new FolderQueryService();
