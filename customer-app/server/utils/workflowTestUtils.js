/**
 * Real Workflow Engine Test Utilities for Nectar Studio
 * NO MOCKS - Uses real workflow execution, real queue processing, real database operations
 */

const Bull = require('bull');
const { logger } = require('../middleware/logger');

// Import real models and services
const { Workflow } = require('../models/workflowModels');
const WorkflowRun = require('../models/WorkflowRun');
const { getQueueService } = require('../services/messageQueue');
// Import workflow engine directly
const workflowEngine = require('../services/workflows/engine');

/**
 * Real Workflow Test Manager
 */
class RealWorkflowTestManager {
  constructor(dbManager, authHelper) {
    this.db = dbManager;
    this.auth = authHelper;
    this.queueService = null;
    this.testQueues = new Map();
  }

  /**
   * Initialize real workflow services
   */
  async initialize() {
    await this.db.connect();

    // Initialize real services if available
    try {
      this.queueService = await getQueueService();
    } catch (error) {
      logger.warn('Queue service not available for testing, using mock queue');
    }

    // Create test-specific queues
    this.testQueues.set(
      'workflow-test',
      new Bull('workflow-test', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          db: 15, // Use separate DB for tests
        },
        settings: {
          stalledInterval: 30000,
          retryProcessDelay: 5000,
        },
      })
    );

    logger.info('Real workflow test manager initialized');
  }

  /**
   * Create real workflow for testing
   */
  async createTestWorkflow(workflowData = {}, userId = null) {
    if (!userId) {
      const authData = await this.auth.createAuthenticatedUser();
      userId = authData.user._id;
    }

    const defaultWorkflow = {
      name: `Test Workflow ${Date.now()}`,
      description: 'A real workflow for integration testing',
      isActive: true,
      userId,
      nodes: [
        {
          id: 'start',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Start',
            triggerType: 'manual',
          },
        },
        {
          id: 'action1',
          type: 'http-request',
          position: { x: 300, y: 100 },
          data: {
            label: 'HTTP Request',
            method: 'GET',
            url: 'https://httpbin.org/get',
            headers: { 'Content-Type': 'application/json' },
          },
        },
        {
          id: 'end',
          type: 'end',
          position: { x: 500, y: 100 },
          data: {
            label: 'End',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'action1' },
        { id: 'e2', source: 'action1', target: 'end' },
      ],
      status: 'draft',
    };

    const workflowToCreate = { ...defaultWorkflow, ...workflowData };
    const workflow = new Workflow(workflowToCreate);
    await workflow.save();

    logger.info(`Created test workflow: ${workflow.name}`);
    return workflow;
  }

  /**
   * Execute real workflow
   */
  async executeWorkflow(workflowId, triggerData = {}, options = {}) {
    try {
      const workflow = await Workflow.findById(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Create real workflow execution record
      const execution = new WorkflowRun({
        workflowId: workflow._id,
        status: 'running',
        startedAt: new Date(),
        trigger: triggerData,
        steps: new Map(),
      });
      await execution.save();

      // Execute workflow using real workflow engine
      const result = await workflowEngine.executeWorkflow(workflow, triggerData, execution);

      // Update execution with final result
      execution.status = result.success ? 'succeeded' : 'failed';
      execution.finishedAt = new Date();

      // Store results in steps map
      if (result.nodeResults) {
        for (const [nodeId, nodeResult] of Object.entries(result.nodeResults)) {
          execution.steps.set(nodeId, {
            status: 'succeeded',
            result: nodeResult,
          });
        }
      }

      if (!result.success && result.error) {
        execution.steps.set('error', {
          status: 'failed',
          error: result.error,
        });
      }

      await execution.save();

      logger.info(`Executed workflow ${workflow.name}: ${execution.status}`);
      return { execution, result };
    } catch (error) {
      logger.error('Workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Test different node types
   */
  async createTestWorkflowWithNodes(
    nodeTypes = ['http-request', 'database-query', 'email', 'filter']
  ) {
    const nodes = [
      {
        id: 'start',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { label: 'Start', triggerType: 'manual' },
      },
    ];

    const edges = [];
    let xPosition = 300;
    let lastNodeId = 'start';

    // Create nodes based on specified types
    for (let i = 0; i < nodeTypes.length; i++) {
      const nodeType = nodeTypes[i];
      const nodeId = `node${i + 1}`;

      let nodeData = { label: nodeType };

      switch (nodeType) {
        case 'http-request':
          nodeData = {
            ...nodeData,
            method: 'GET',
            url: 'https://httpbin.org/get',
            headers: { 'Content-Type': 'application/json' },
          };
          break;

        case 'database-query':
          nodeData = {
            ...nodeData,
            query: 'SELECT * FROM test_table WHERE id = @id',
            parameters: { id: 1 },
            connectionId: 'test-connection',
          };
          break;

        case 'email':
          nodeData = {
            ...nodeData,
            to: 'test@example.com',
            subject: 'Test Email',
            body: 'This is a test email from workflow',
          };
          break;

        case 'filter':
          nodeData = {
            ...nodeData,
            condition: 'data.status === "success"',
            operator: 'equals',
          };
          break;

        case 'code':
          nodeData = {
            ...nodeData,
            code: 'return { result: input.data + " processed" };',
            language: 'javascript',
          };
          break;
      }

      nodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: xPosition, y: 100 },
        data: nodeData,
      });

      edges.push({
        id: `e${i + 1}`,
        source: lastNodeId,
        target: nodeId,
      });

      lastNodeId = nodeId;
      xPosition += 200;
    }

    // Add end node
    nodes.push({
      id: 'end',
      type: 'end',
      position: { x: xPosition, y: 100 },
      data: { label: 'End' },
    });

    edges.push({
      id: `e${nodeTypes.length + 1}`,
      source: lastNodeId,
      target: 'end',
    });

    return this.createTestWorkflow({
      name: `Test Workflow with ${nodeTypes.join(', ')}`,
      nodes,
      edges,
    });
  }

  /**
   * Test workflow with error handling
   */
  async createErrorTestWorkflow() {
    return this.createTestWorkflow({
      name: 'Error Test Workflow',
      nodes: [
        {
          id: 'start',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Start', triggerType: 'manual' },
        },
        {
          id: 'error-node',
          type: 'http-request',
          position: { x: 300, y: 100 },
          data: {
            label: 'Failing HTTP Request',
            method: 'GET',
            url: 'https://httpbin.org/status/500', // This will fail
            headers: { 'Content-Type': 'application/json' },
          },
        },
        {
          id: 'error-handler',
          type: 'error-handler',
          position: { x: 500, y: 100 },
          data: {
            label: 'Error Handler',
            action: 'continue',
            defaultValue: { error: 'handled' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'error-node' },
        { id: 'e2', source: 'error-node', target: 'error-handler', type: 'error' },
      ],
    });
  }

  /**
   * Test workflow scheduling
   */
  async scheduleWorkflow(workflowId, schedule = '* * * * *') {
    // Every minute
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Add schedule to workflow
    workflow.schedule = {
      enabled: true,
      cron: schedule,
      timezone: 'UTC',
    };
    await workflow.save();

    // Schedule with real queue service
    const queue = this.testQueues.get('workflow-test');
    const job = await queue.add(
      'scheduled-workflow',
      {
        workflowId: workflow._id.toString(),
        triggerType: 'scheduled',
      },
      {
        repeat: { cron: schedule },
        removeOnComplete: 10,
        removeOnFail: 10,
      }
    );

    logger.info(`Scheduled workflow ${workflow.name} with cron: ${schedule}`);
    return { workflow, job };
  }

  /**
   * Test workflow with real database integration
   */
  async testWorkflowDatabaseIntegration(connectionId) {
    const workflow = await this.createTestWorkflow({
      name: 'Database Integration Test Workflow',
      nodes: [
        {
          id: 'start',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Start', triggerType: 'manual' },
        },
        {
          id: 'db-read',
          type: 'database-query',
          position: { x: 300, y: 100 },
          data: {
            label: 'Read Data',
            query: 'SELECT TOP 1 * FROM information_schema.tables',
            connectionId,
            operation: 'select',
          },
        },
        {
          id: 'process',
          type: 'code',
          position: { x: 500, y: 100 },
          data: {
            label: 'Process Data',
            code: 'return { processedCount: input.data.length };',
          },
        },
        {
          id: 'end',
          type: 'end',
          position: { x: 700, y: 100 },
          data: { label: 'End' },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'db-read' },
        { id: 'e2', source: 'db-read', target: 'process' },
        { id: 'e3', source: 'process', target: 'end' },
      ],
    });

    return workflow;
  }

  /**
   * Wait for workflow execution to complete
   */
  async waitForExecution(executionId, timeout = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const execution = await WorkflowRun.findById(executionId);

      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      if (execution.status === 'succeeded' || execution.status === 'failed') {
        return execution;
      }

      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Workflow execution ${executionId} timed out after ${timeout}ms`);
  }

  /**
   * Clean up test workflows and executions
   */
  async cleanup() {
    try {
      // Clean up test workflows
      await Workflow.deleteMany({
        $or: [
          { name: { $regex: /^Test Workflow/i } },
          { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      });

      // Clean up test executions
      await WorkflowRun.deleteMany({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      // Clean up test queues
      for (const [name, queue] of this.testQueues) {
        await queue.clean(0, 'completed');
        await queue.clean(0, 'failed');
        await queue.close();
      }
      this.testQueues.clear();

      logger.info('Workflow test cleanup completed');
    } catch (error) {
      logger.error('Error during workflow test cleanup:', error);
      throw error;
    }
  }
}

/**
 * Real Queue Test Utilities
 */
class RealQueueTestUtils {
  constructor() {
    this.testQueues = new Map();
  }

  /**
   * Create test queue with real Redis connection
   */
  createTestQueue(name) {
    const queueName = `test-${name}-${Date.now()}`;
    const queue = new Bull(queueName, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        db: 15, // Use separate DB for tests
      },
      settings: {
        stalledInterval: 30000,
        retryProcessDelay: 1000,
      },
    });

    this.testQueues.set(queueName, queue);
    return queue;
  }

  /**
   * Process jobs with real worker
   */
  async processJobs(queue, processor, concurrency = 1) {
    return new Promise((resolve, reject) => {
      const results = [];

      queue.process(concurrency, async job => {
        try {
          const result = await processor(job.data);
          results.push({ job: job.data, result });
          return result;
        } catch (error) {
          results.push({ job: job.data, error: error.message });
          throw error;
        }
      });

      // Set timeout for processing
      setTimeout(() => {
        resolve(results);
      }, 5000);
    });
  }

  /**
   * Wait for all jobs to complete
   */
  async waitForCompletion(queue, timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const waiting = await queue.waiting();
      const active = await queue.active();

      if (waiting.length === 0 && active.length === 0) {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * Clean up all test queues
   */
  async cleanup() {
    for (const [name, queue] of this.testQueues) {
      await queue.clean(0, 'completed');
      await queue.clean(0, 'failed');
      await queue.close();
    }
    this.testQueues.clear();
  }
}

module.exports = {
  RealWorkflowTestManager,
  RealQueueTestUtils,
};
