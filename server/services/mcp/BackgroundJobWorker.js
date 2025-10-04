const { PrismaClient } = require('@prisma/client');
const { logger } = require('../../utils/logger');
const DocumentParserService = require('./DocumentParserService');
const EmbeddingService = require('./EmbeddingService');

/**
 * BackgroundJobWorker
 *
 * Processes background jobs for folder MCP operations including:
 * - File parsing and embedding generation
 * - Folder reindexing
 * - Cleanup operations
 */
class BackgroundJobWorker {
  constructor() {
    this.prisma = new PrismaClient();
    this.isRunning = false;
    this.pollInterval = 5000; // 5 seconds
    this.maxConcurrent = 3; // Process up to 3 jobs concurrently
    this.currentJobs = new Set();
  }

  /**
   * Start the worker
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Background job worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('Background job worker started');

    // Start polling for jobs
    this.poll();
  }

  /**
   * Stop the worker
   */
  async stop() {
    this.isRunning = false;
    logger.info('Background job worker stopped');

    // Wait for current jobs to finish
    if (this.currentJobs.size > 0) {
      logger.info(`Waiting for ${this.currentJobs.size} jobs to complete`);
      await this.waitForJobs();
    }
  }

  /**
   * Poll for pending jobs
   */
  async poll() {
    while (this.isRunning) {
      try {
        // Check if we can process more jobs
        if (this.currentJobs.size < this.maxConcurrent) {
          await this.processPendingJobs();
        }

        // Wait before next poll
        await this.delay(this.pollInterval);
      } catch (error) {
        logger.error('Error in job polling', {
          error: error.message,
          stack: error.stack,
        });

        // Continue polling even if there's an error
        await this.delay(this.pollInterval);
      }
    }
  }

  /**
   * Process pending jobs from the queue
   */
  async processPendingJobs() {
    try {
      const availableSlots = this.maxConcurrent - this.currentJobs.size;
      if (availableSlots <= 0) return;

      // Fetch pending jobs ordered by priority and creation date
      const jobs = await this.prisma.backgroundJob.findMany({
        where: {
          status: 'pending',
        },
        orderBy: [
          { priority: 'asc' }, // Lower priority number = higher priority
          { createdAt: 'asc' },
        ],
        take: availableSlots,
      });

      if (jobs.length === 0) return;

      logger.info(`Processing ${jobs.length} pending jobs`);

      // Process jobs concurrently
      for (const job of jobs) {
        this.processJob(job).catch(error => {
          logger.error('Unhandled error in job processing', {
            jobId: job.id,
            error: error.message,
          });
        });
      }
    } catch (error) {
      logger.error('Error fetching pending jobs', {
        error: error.message,
      });
    }
  }

  /**
   * Process a single job
   * @param {Object} job - Background job
   */
  async processJob(job) {
    const jobId = job.id;
    this.currentJobs.add(jobId);

    try {
      logger.info('Processing job', {
        jobId,
        jobType: job.jobType,
        folderId: job.folderId,
        fileId: job.fileId,
      });

      // Mark job as processing
      await this.prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });

      // Execute job based on type
      let result;
      switch (job.jobType) {
        case 'file_embedding':
          result = await this.processFileEmbedding(job);
          break;
        case 'folder_embedding':
          result = await this.processFolderEmbedding(job);
          break;
        case 'folder_reindex':
          result = await this.processFolderReindex(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Mark job as completed
      await this.prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          result,
        },
      });

      logger.info('Job completed successfully', {
        jobId,
        jobType: job.jobType,
      });
    } catch (error) {
      logger.error('Job failed', {
        jobId,
        jobType: job.jobType,
        error: error.message,
        stack: error.stack,
      });

      // Update job with error and increment attempts
      const attempts = job.attempts + 1;
      const shouldRetry = attempts < job.maxAttempts;

      await this.prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: shouldRetry ? 'pending' : 'failed',
          attempts,
          errorMessage: error.message,
          completedAt: shouldRetry ? null : new Date(),
        },
      });

      if (shouldRetry) {
        logger.info('Job will be retried', {
          jobId,
          attempts,
          maxAttempts: job.maxAttempts,
        });
      }
    } finally {
      this.currentJobs.delete(jobId);
    }
  }

  /**
   * Process file embedding job
   * @param {Object} job - Background job
   * @returns {Promise<Object>} - Result
   */
  async processFileEmbedding(job) {
    const { fileId, folderId, organizationId } = job.payload;

    // Fetch file from database
    const file = await this.prisma.fileStorage.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Get folder config
    const folder = await this.prisma.fileFolder.findUnique({
      where: { id: folderId },
    });

    if (!folder || !folder.mcpEnabled) {
      throw new Error(`Folder MCP not enabled: ${folderId}`);
    }

    const config = folder.mcpConfig || {};

    // Parse document
    const text = await DocumentParserService.parseFile(file);

    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from document');
    }

    // Chunk text
    const chunks = DocumentParserService.chunkText(text, {
      chunkSize: config.chunk_size || 1000,
      chunkOverlap: config.chunk_overlap || 200,
    });

    // Generate embeddings
    const embeddingResult = await EmbeddingService.generateEmbeddings({
      fileId,
      folderId,
      organizationId,
      chunks,
      model: config.embedding_model || 'text-embedding-3-small',
    });

    return {
      fileId,
      filename: file.filename,
      textLength: text.length,
      chunkCount: chunks.length,
      embeddingCount: embeddingResult.count,
      tokens: embeddingResult.tokens,
      cost: embeddingResult.cost,
    };
  }

  /**
   * Process folder embedding job (all files in folder)
   * @param {Object} job - Background job
   * @returns {Promise<Object>} - Result
   */
  async processFolderEmbedding(job) {
    const { folderId, organizationId } = job.payload;

    // Get all files in folder
    const files = await this.prisma.fileStorage.findMany({
      where: {
        folderId,
        organizationId,
        isActive: true,
      },
    });

    logger.info('Processing folder embedding', {
      folderId,
      fileCount: files.length,
    });

    // Create individual file jobs
    const fileJobs = [];
    for (const file of files) {
      // Check if file type is supported
      if (!DocumentParserService.isSupported(file.mimeType)) {
        logger.warn('Skipping unsupported file type', {
          fileId: file.id,
          filename: file.filename,
          mimeType: file.mimeType,
        });
        continue;
      }

      // Create file embedding job
      const fileJob = await this.prisma.backgroundJob.create({
        data: {
          jobType: 'file_embedding',
          status: 'pending',
          priority: 5,
          fileId: file.id,
          folderId,
          organizationId,
          payload: {
            fileId: file.id,
            folderId,
            organizationId,
          },
        },
      });

      fileJobs.push(fileJob.id);
    }

    return {
      folderId,
      totalFiles: files.length,
      jobsCreated: fileJobs.length,
      jobIds: fileJobs,
    };
  }

  /**
   * Process folder reindex job
   * @param {Object} job - Background job
   * @returns {Promise<Object>} - Result
   */
  async processFolderReindex(job) {
    const { folderId, organizationId } = job.payload;

    // Delete existing embeddings
    const deletedCount = await EmbeddingService.deleteFolderEmbeddings(folderId);

    logger.info('Deleted existing embeddings', {
      folderId,
      deletedCount,
    });

    // Create new folder embedding job
    const newJob = await this.prisma.backgroundJob.create({
      data: {
        jobType: 'folder_embedding',
        status: 'pending',
        priority: 3, // Higher priority for reindex
        folderId,
        organizationId,
        payload: {
          folderId,
          organizationId,
        },
      },
    });

    return {
      folderId,
      deletedEmbeddings: deletedCount,
      newJobId: newJob.id,
    };
  }

  /**
   * Wait for all current jobs to complete
   */
  async waitForJobs() {
    while (this.currentJobs.size > 0) {
      await this.delay(1000);
    }
  }

  /**
   * Delay helper
   * @param {number} ms - Milliseconds
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get worker status
   * @returns {Object} - Status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentJobs: this.currentJobs.size,
      maxConcurrent: this.maxConcurrent,
    };
  }

  /**
   * Cleanup - close Prisma client
   */
  async cleanup() {
    await this.stop();
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
const worker = new BackgroundJobWorker();

// Start worker if not in test environment
if (process.env.NODE_ENV !== 'test') {
  worker.start().catch(error => {
    logger.error('Failed to start background job worker', {
      error: error.message,
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down worker');
    await worker.cleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down worker');
    await worker.cleanup();
    process.exit(0);
  });
}

module.exports = worker;
