const { logger } = require('../utils/logger');

// Try to load Bull and Redis, but gracefully handle if not available
let Bull;
let redis;

try {
  Bull = require('bull');
  redis = require('redis');
} catch (error) {
  logger.warn('[MessageQueue] Bull/Redis not available, using in-memory fallback');
}

class MessageQueueService {
  constructor() {
    const redisDisabled =
      process.env.REDIS_DISABLED === 'true' ||
      (process.env.NODE_ENV === 'development' && !process.env.REDIS_HOST);
    this.useRedis = !!Bull && !!redis && !redisDisabled;

    if (this.useRedis) {
      this.redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      };

      try {
        // Initialize queues
        this.databaseEventQueue = new Bull('database-events', {
          redis: this.redisConfig,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        });

        this.workflowExecutionQueue = new Bull('workflow-execution', {
          redis: this.redisConfig,
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        });

        this.setupProcessors();
        this.setupEventListeners();
        logger.info('[MessageQueue] Redis-based queues initialized successfully');
      } catch (error) {
        logger.warn(
          '[MessageQueue] Redis connection failed, falling back to in-memory:',
          error.message
        );
        this.useRedis = false;
        this.initializeInMemoryQueues();
      }
    } else {
      this.initializeInMemoryQueues();
    }
  }

  /**
   * Initialize in-memory fallback queues
   */
  initializeInMemoryQueues() {
    logger.info('[MessageQueue] Using in-memory queue fallback');
    this.inMemoryQueues = {
      databaseEvents: [],
      workflowExecution: [],
    };
    this.stats = {
      databaseEvents: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      workflowExecution: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
    };
    this.processing = false;
    this.startInMemoryProcessing();
  }

  /**
   * Start processing in-memory queues
   */
  startInMemoryProcessing() {
    if (this.processing) return;
    this.processing = true;

    // Process database events every 2 seconds
    setInterval(async () => {
      while (this.inMemoryQueues.databaseEvents.length > 0) {
        const job = this.inMemoryQueues.databaseEvents.shift();
        this.stats.databaseEvents.waiting--;
        this.stats.databaseEvents.active++;

        try {
          await this.processDatabaseEvent(job.data);
          this.stats.databaseEvents.active--;
          this.stats.databaseEvents.completed++;
        } catch (error) {
          logger.error('[MessageQueue] Database event processing failed:', error);
          this.stats.databaseEvents.active--;
          this.stats.databaseEvents.failed++;
        }
      }
    }, 2000);

    // Process workflow executions every 3 seconds
    setInterval(async () => {
      const concurrentLimit = 3; // Limit concurrent workflows in memory mode
      let activeCount = 0;

      while (this.inMemoryQueues.workflowExecution.length > 0 && activeCount < concurrentLimit) {
        const job = this.inMemoryQueues.workflowExecution.shift();
        this.stats.workflowExecution.waiting--;
        this.stats.workflowExecution.active++;
        activeCount++;

        // Process asynchronously
        this.processWorkflowExecution(job.data)
          .then(() => {
            this.stats.workflowExecution.active--;
            this.stats.workflowExecution.completed++;
          })
          .catch(error => {
            logger.error('[MessageQueue] Workflow execution failed:', error);
            this.stats.workflowExecution.active--;
            this.stats.workflowExecution.failed++;
          });
      }
    }, 3000);
  }

  /**
   * Add a database event to the queue
   */
  async addDatabaseEvent(eventData) {
    const jobData = {
      eventType: eventData.eventType,
      table: eventData.table,
      database: eventData.database,
      connectionId: eventData.connectionId,
      data: eventData.data,
      timestamp: new Date(),
      sourceWorkflowId: eventData.sourceWorkflowId,
    };

    if (this.useRedis) {
      return await this.databaseEventQueue.add('process-database-event', jobData, {
        priority: this.getEventPriority(eventData.eventType),
        delay: 0,
      });
    } else {
      // In-memory fallback
      this.inMemoryQueues.databaseEvents.push({ data: jobData });
      this.stats.databaseEvents.waiting++;
      return { id: Date.now().toString() };
    }
  }

  /**
   * Add a batch of database events to the queue (CDC optimization)
   */
  async addDatabaseEventBatch(batchData) {
    const jobData = {
      eventType: batchData.eventType,
      table: batchData.table,
      database: batchData.database,
      connectionId: batchData.connectionId,
      batch: batchData.batch,
      batchInfo: batchData.batchInfo,
      timestamp: new Date(),
      sourceWorkflowId: batchData.sourceWorkflowId,
      isBatch: true,
    };

    if (this.useRedis) {
      return await this.databaseEventQueue.add('process-database-event-batch', jobData, {
        priority: this.getEventPriority(batchData.eventType) + 1, // Higher priority for batches
        delay: 0,
      });
    } else {
      // In-memory fallback
      this.inMemoryQueues.databaseEvents.push({ data: jobData });
      this.stats.databaseEvents.waiting++;
      return { id: Date.now().toString() };
    }
  }

  /**
   * Add workflow execution to queue
   */
  async addWorkflowExecution(workflowId, triggerContext) {
    const jobData = {
      workflowId,
      triggerContext,
      timestamp: new Date(),
    };

    if (this.useRedis) {
      return await this.workflowExecutionQueue.add('execute-workflow', jobData, {
        priority: 1,
      });
    } else {
      // In-memory fallback
      this.inMemoryQueues.workflowExecution.push({ data: jobData });
      this.stats.workflowExecution.waiting++;
      return { id: Date.now().toString() };
    }
  }

  /**
   * Process database event (shared logic)
   */
  async processDatabaseEvent(jobData) {
    // Handle batch processing
    if (jobData.isBatch) {
      return await this.processDatabaseEventBatch(jobData);
    }

    const { eventType, table, database, connectionId, data, sourceWorkflowId } = jobData;

    logger.info(`[Queue] Processing database event: ${eventType} on ${table}`);

    // Find all workflows that should be triggered by this event
    const { Workflow } = require('../models/workflowModels');

    const matchingWorkflows = await Workflow.find({
      active: true,
      _id: { $ne: sourceWorkflowId },
      'nodes.data.nodeType': 'trigger:database',
      'nodes.data.connectionId': connectionId,
      'nodes.data.database': database,
      'nodes.data.table': table,
      'nodes.data.eventType': eventType,
    });

    logger.info(
      `[Queue] Found ${matchingWorkflows.length} matching workflows for ${eventType} on ${table}`
    );

    // Queue each workflow for execution
    const executionPromises = matchingWorkflows.map(workflow =>
      this.addWorkflowExecution(workflow._id, {
        triggerType: 'database',
        eventType,
        table,
        database,
        connectionId,
        data,
        timestamp: new Date(),
      })
    );

    await Promise.all(executionPromises);

    return {
      processed: true,
      workflowsTriggered: matchingWorkflows.length,
      table,
      eventType,
    };
  }

  /**
   * Process database event batch (CDC optimization)
   */
  async processDatabaseEventBatch(jobData) {
    const { eventType, table, database, connectionId, batch, batchInfo, sourceWorkflowId } =
      jobData;

    logger.info(
      `[Queue] Processing database event batch: ${eventType} on ${table} (batch ${batchInfo.batchIndex}/${batchInfo.totalBatches}, ${batchInfo.batchSize} rows)`
    );

    // Find all workflows that should be triggered by this event
    const { Workflow } = require('../models/workflowModels');

    const matchingWorkflows = await Workflow.find({
      active: true,
      _id: { $ne: sourceWorkflowId },
      'nodes.data.nodeType': 'trigger:database',
      'nodes.data.connectionId': connectionId,
      'nodes.data.database': database,
      'nodes.data.table': table,
      'nodes.data.eventType': eventType,
    });

    logger.info(
      `[Queue] Found ${matchingWorkflows.length} matching workflows for batch on ${table}`
    );

    // Queue each workflow for execution with batch context
    const executionPromises = matchingWorkflows.map(workflow =>
      this.addWorkflowExecution(workflow._id, {
        triggerType: 'database',
        eventType,
        table,
        database,
        connectionId,
        batch,
        batchInfo,
        isBatch: true,
        timestamp: new Date(),
      })
    );

    await Promise.all(executionPromises);

    return {
      processed: true,
      workflowsTriggered: matchingWorkflows.length,
      table,
      eventType,
      batchInfo,
    };
  }

  /**
   * Process workflow execution (shared logic)
   */
  async processWorkflowExecution(jobData) {
    const { workflowId, triggerContext } = jobData;

    logger.info(`[Queue] Executing workflow: ${workflowId}`);

    const { Workflow } = require('../models/workflowModels');
    const { executeWorkflow } = require('./workflows/engine');

    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.active) {
      logger.info(`[Queue] Skipping inactive workflow: ${workflow.name}`);
      return { skipped: true, reason: 'workflow inactive' };
    }

    const result = await executeWorkflow(workflow, triggerContext);

    return {
      executed: true,
      workflowId,
      workflowName: workflow.name,
      result,
    };
  }

  /**
   * Setup queue processors (Redis only)
   */
  setupProcessors() {
    if (!this.useRedis) return;

    // Process database events
    this.databaseEventQueue.process('process-database-event', 10, async job => {
      return await this.processDatabaseEvent(job.data);
    });

    // Process workflow executions
    this.workflowExecutionQueue.process('execute-workflow', 5, async job => {
      return await this.processWorkflowExecution(job.data);
    });
  }

  /**
   * Setup event listeners (Redis only)
   */
  setupEventListeners() {
    if (!this.useRedis) return;

    // Database event queue listeners
    this.databaseEventQueue.on('completed', (job, result) => {
      logger.info(`[Queue] Database event completed: ${job.id}`, result);
    });

    this.databaseEventQueue.on('failed', (job, err) => {
      logger.error(`[Queue] Database event failed: ${job.id}`, err.message);
    });

    // Workflow execution queue listeners
    this.workflowExecutionQueue.on('completed', (job, result) => {
      logger.info(`[Queue] Workflow execution completed: ${job.id}`, result);
    });

    this.workflowExecutionQueue.on('failed', (job, err) => {
      logger.error(`[Queue] Workflow execution failed: ${job.id}`, err.message);
    });

    // Global error handlers
    this.databaseEventQueue.on('error', error => {
      logger.error('[Queue] Database event queue error:', error);
    });

    this.workflowExecutionQueue.on('error', error => {
      logger.error('[Queue] Workflow execution queue error:', error);
    });
  }

  /**
   * Get event priority based on type
   */
  getEventPriority(eventType) {
    switch (eventType) {
      case 'newRow':
        return 3;
      case 'updatedRow':
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (this.useRedis) {
      const databaseEventStats = {
        waiting: await this.databaseEventQueue.getWaiting().then(jobs => jobs.length),
        active: await this.databaseEventQueue.getActive().then(jobs => jobs.length),
        completed: await this.databaseEventQueue.getCompleted().then(jobs => jobs.length),
        failed: await this.databaseEventQueue.getFailed().then(jobs => jobs.length),
        delayed: await this.databaseEventQueue.getDelayed().then(jobs => jobs.length),
      };

      const workflowExecutionStats = {
        waiting: await this.workflowExecutionQueue.getWaiting().then(jobs => jobs.length),
        active: await this.workflowExecutionQueue.getActive().then(jobs => jobs.length),
        completed: await this.workflowExecutionQueue.getCompleted().then(jobs => jobs.length),
        failed: await this.workflowExecutionQueue.getFailed().then(jobs => jobs.length),
        delayed: await this.workflowExecutionQueue.getDelayed().then(jobs => jobs.length),
      };

      return {
        databaseEvents: databaseEventStats,
        workflowExecution: workflowExecutionStats,
        totalActiveJobs: databaseEventStats.active + workflowExecutionStats.active,
        timestamp: new Date(),
        mode: 'redis',
      };
    } else {
      return {
        databaseEvents: { ...this.stats.databaseEvents },
        workflowExecution: { ...this.stats.workflowExecution },
        totalActiveJobs: this.stats.databaseEvents.active + this.stats.workflowExecution.active,
        timestamp: new Date(),
        mode: 'in-memory',
      };
    }
  }

  /**
   * Clean up queues and close connections
   */
  async close() {
    if (this.useRedis) {
      await this.databaseEventQueue.close();
      await this.workflowExecutionQueue.close();
    }
    this.processing = false;
  }

  /**
   * Pause all queues
   */
  async pauseAll() {
    if (this.useRedis) {
      await this.databaseEventQueue.pause();
      await this.workflowExecutionQueue.pause();
    } else {
      this.processing = false;
    }
    logger.info('[Queue] All queues paused');
  }

  /**
   * Resume all queues
   */
  async resumeAll() {
    if (this.useRedis) {
      await this.databaseEventQueue.resume();
      await this.workflowExecutionQueue.resume();
    } else {
      this.processing = true;
      this.startInMemoryProcessing();
    }
    logger.info('[Queue] All queues resumed');
  }
}

// Singleton instance
let messageQueueInstance = null;

const getMessageQueue = () => {
  if (!messageQueueInstance) {
    messageQueueInstance = new MessageQueueService();
  }
  return messageQueueInstance;
};

module.exports = {
  MessageQueueService,
  getMessageQueue,
};
