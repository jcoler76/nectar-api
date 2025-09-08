// MongoDB models replaced with Prisma for PostgreSQL migration
// const { Workflow } = require('../../models/workflowModels');
// const WorkflowRun = require('../../models/WorkflowRun');

const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();
const { executeWorkflow } = require('../../services/workflows/engine');
const { scheduleWorkflow, unscheduleWorkflow } = require('../../services/scheduler');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { withFilter, PubSub } = require('graphql-subscriptions');
const { createCursorConnection } = require('../utils/pagination');
// const mongoose = require('mongoose'); // Removed for Prisma migration

// Create PubSub instance for real-time subscriptions
const pubsub = new PubSub();

// Subscription topics
const WORKFLOW_RUN_UPDATES = 'WORKFLOW_RUN_UPDATES';
const WORKFLOW_RUN_STARTED = 'WORKFLOW_RUN_STARTED';
const WORKFLOW_RUN_COMPLETED = 'WORKFLOW_RUN_COMPLETED';
const WORKFLOW_RUN_FAILED = 'WORKFLOW_RUN_FAILED';
const WORKFLOW_STATUS_CHANGED = 'WORKFLOW_STATUS_CHANGED';

const workflowResolvers = {
  // Type resolvers
  Workflow: {
    user: async (workflow, _, { dataloaders }) => {
      return dataloaders.userLoader.load(workflow.userId);
    },

    runs: async (workflow, { first = 10, after, status }, { dataloaders }) => {
      const query = { workflowId: workflow._id };
      if (status) {
        query.status = status.toLowerCase();
      }

      return createCursorConnection(WorkflowRun, { first, after }, query, { createdAt: -1 });
    },

    lastRun: async (workflow, _, { dataloaders }) => {
      return dataloaders.lastWorkflowRunLoader.load(workflow._id);
    },

    totalRuns: async (workflow, _, { dataloaders }) => {
      const stats = await dataloaders.workflowStatsLoader.load(workflow._id);
      return stats.totalRuns;
    },

    successRate: async (workflow, _, { dataloaders }) => {
      const stats = await dataloaders.workflowStatsLoader.load(workflow._id);
      return stats.successRate;
    },
  },

  WorkflowRun: {
    workflow: async (run, _, { dataloaders }) => {
      return dataloaders.workflowLoader.load(run.workflowId);
    },

    duration: run => {
      if (run.startedAt && run.finishedAt) {
        return run.finishedAt.getTime() - run.startedAt.getTime();
      }
      return null;
    },
  },

  WorkflowRunStatus: {
    RUNNING: 'running',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
  },

  // Query resolvers
  Query: {
    workflow: async (_, { id }, { user, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing workflow management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = await dataloaders.workflowLoader.load(id);
      if (!workflow) return null;

      // Check ownership
      if (workflow.userId.toString() !== user.userId) {
        throw new ForbiddenError('Access denied');
      }

      return workflow;
    },

    workflows: async (
      _,
      { first = 10, after, filters = {}, orderBy = 'DESC' },
      { user, jwtUser, apiKeyUser, dataloaders }
    ) => {
      // Block client API keys from accessing workflows list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const query = {};

      // Apply filters
      if (filters.name) {
        query.name = { $regex: filters.name, $options: 'i' };
      }
      if (filters.active !== undefined) {
        query.active = filters.active;
      }
      if (filters.userId) {
        query.userId = filters.userId;
      } else {
        // Default to user's workflows if no userId specified
        query.userId = user.userId;
      }
      if (filters.hasSchedule !== undefined) {
        query.schedule = filters.hasSchedule ? { $ne: null } : null;
      }
      if (filters.createdAfter) {
        query.createdAt = { ...query.createdAt, $gte: new Date(filters.createdAfter) };
      }
      if (filters.createdBefore) {
        query.createdAt = { ...query.createdAt, $lte: new Date(filters.createdBefore) };
      }

      return createCursorConnection(Workflow, { first, after }, query, {
        createdAt: orderBy === 'DESC' ? -1 : 1,
      });
    },

    workflowRun: async (_, { id }, { user, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing workflow runs
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const run = await dataloaders.workflowRunLoader.load(id);
      if (!run) return null;

      // Check ownership through workflow
      const workflow = await dataloaders.workflowLoader.load(run.workflowId);
      if (workflow.userId.toString() !== user.userId) {
        throw new ForbiddenError('Access denied');
      }

      return run;
    },

    workflowRuns: async (
      _,
      { first = 10, after, filters = {}, orderBy = 'DESC' },
      { user, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing workflow runs list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const query = {};

      // Apply filters
      if (filters.workflowId) {
        query.workflowId = filters.workflowId;

        // Verify ownership
        const workflow = await Workflow.findById(filters.workflowId);
        if (!workflow || workflow.userId.toString() !== user.userId) {
          throw new ForbiddenError('Access denied');
        }
      } else {
        // Get all workflows for the user
        const userWorkflows = await Workflow.find({ userId: user.userId }).select('_id');
        query.workflowId = { $in: userWorkflows.map(w => w._id) };
      }

      if (filters.status) {
        query.status = filters.status.toLowerCase();
      }
      if (filters.startedAfter) {
        query.startedAt = { ...query.startedAt, $gte: new Date(filters.startedAfter) };
      }
      if (filters.startedBefore) {
        query.startedAt = { ...query.startedAt, $lte: new Date(filters.startedBefore) };
      }

      return createCursorConnection(WorkflowRun, { first, after }, query, {
        createdAt: orderBy === 'DESC' ? -1 : 1,
      });
    },

    myWorkflows: async (_, { first = 10, after, active }, { user, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing workflows
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const query = { userId: user.userId };
      if (active !== undefined) {
        query.active = active;
      }

      return createCursorConnection(Workflow, { first, after }, query, { updatedAt: -1 });
    },

    workflowStats: async (_, __, { user, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing workflow stats
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const [totalWorkflows, activeWorkflows, runStats, mostActiveWorkflow, recentFailures] =
        await Promise.all([
          Workflow.countDocuments({ userId: user.userId }),
          Workflow.countDocuments({ userId: user.userId, active: true }),
          WorkflowRun.aggregate([
            {
              $lookup: {
                from: 'workflows',
                localField: 'workflowId',
                foreignField: '_id',
                as: 'workflow',
              },
            },
            { $unwind: '$workflow' },
            { $match: { 'workflow.userId': new mongoose.Types.ObjectId(user.userId) } },
            {
              $group: {
                _id: null,
                totalRuns: { $sum: 1 },
                successfulRuns: {
                  $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] },
                },
                failedRuns: {
                  $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
                },
                averageExecutionTime: {
                  $avg: {
                    $subtract: ['$finishedAt', '$startedAt'],
                  },
                },
              },
            },
          ]),
          WorkflowRun.aggregate([
            {
              $lookup: {
                from: 'workflows',
                localField: 'workflowId',
                foreignField: '_id',
                as: 'workflow',
              },
            },
            { $unwind: '$workflow' },
            { $match: { 'workflow.userId': new mongoose.Types.ObjectId(user.userId) } },
            { $group: { _id: '$workflowId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: 'workflows',
                localField: '_id',
                foreignField: '_id',
                as: 'workflow',
              },
            },
            { $unwind: '$workflow' },
          ]),
          WorkflowRun.find({})
            .populate({
              path: 'workflowId',
              match: { userId: user.userId },
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .then(runs => runs.filter(run => run.workflowId && run.status === 'failed')),
        ]);

      const stats = runStats[0] || {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        averageExecutionTime: 0,
      };

      return {
        totalWorkflows,
        activeWorkflows,
        totalRuns: stats.totalRuns,
        successfulRuns: stats.successfulRuns,
        failedRuns: stats.failedRuns,
        averageExecutionTime: stats.averageExecutionTime || 0,
        mostActiveWorkflow: mostActiveWorkflow[0]?.workflow || null,
        recentFailures: recentFailures || [],
      };
    },
  },

  // Mutation resolvers
  Mutation: {
    createWorkflow: async (_, { input }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = new Workflow({
        ...input,
        userId: user.userId,
      });

      await workflow.save();
      return workflow;
    },

    updateWorkflow: async (_, { id, input }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = await Workflow.findOneAndUpdate(
        { _id: id, userId: user.userId },
        { $set: input },
        { new: true }
      );

      if (!workflow) {
        throw new UserInputError('Workflow not found or access denied');
      }

      // Handle scheduling
      const hasSchedulerTrigger = workflow.nodes.some(n => n.data.nodeType === 'trigger:schedule');

      if (workflow.active && hasSchedulerTrigger && workflow.schedule) {
        await scheduleWorkflow(workflow);
      } else {
        unscheduleWorkflow(workflow._id);
      }

      // Publish status change
      pubsub.publish(WORKFLOW_STATUS_CHANGED, {
        workflowStatusChanged: workflow,
        userId: user.userId,
      });

      return workflow;
    },

    deleteWorkflow: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = await Workflow.findOneAndDelete({ _id: id, userId: user.userId });

      if (!workflow) {
        throw new UserInputError('Workflow not found or access denied');
      }

      // Unschedule if it was scheduled
      unscheduleWorkflow(id);

      return true;
    },

    executeWorkflow: async (_, { id, triggerData = {} }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = await Workflow.findOne({ _id: id, userId: user.userId });

      if (!workflow) {
        throw new UserInputError('Workflow not found or access denied');
      }

      const startTime = Date.now();

      try {
        const result = await executeWorkflow(workflow, triggerData);
        const executionTime = Date.now() - startTime;

        // Publish execution started
        const run = await WorkflowRun.findById(result._id);
        pubsub.publish(WORKFLOW_RUN_STARTED, {
          workflowRunStarted: run,
          userId: user.userId,
        });

        return {
          success: true,
          runId: result._id,
          message: 'Workflow execution started',
          executionTime,
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          executionTime: Date.now() - startTime,
        };
      }
    },

    stopWorkflowRun: async (_, { runId }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const run = await WorkflowRun.findById(runId).populate('workflowId');

      if (!run || run.workflowId.userId.toString() !== user.userId) {
        throw new UserInputError('Workflow run not found or access denied');
      }

      if (run.status !== 'running') {
        throw new UserInputError('Workflow run is not currently running');
      }

      // Update run status
      run.status = 'failed';
      run.finishedAt = new Date();
      run.steps.set('system', { status: 'failed', error: 'Manually stopped by user' });
      await run.save();

      // Publish completion
      pubsub.publish(WORKFLOW_RUN_FAILED, {
        workflowRunFailed: run,
        userId: user.userId,
      });

      return true;
    },

    activateWorkflow: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = await Workflow.findOneAndUpdate(
        { _id: id, userId: user.userId },
        { $set: { active: true } },
        { new: true }
      );

      if (!workflow) {
        throw new UserInputError('Workflow not found or access denied');
      }

      // Schedule if it has a scheduler trigger
      const hasSchedulerTrigger = workflow.nodes.some(n => n.data.nodeType === 'trigger:schedule');
      if (hasSchedulerTrigger && workflow.schedule) {
        await scheduleWorkflow(workflow);
      }

      // Publish status change
      pubsub.publish(WORKFLOW_STATUS_CHANGED, {
        workflowStatusChanged: workflow,
        userId: user.userId,
      });

      return workflow;
    },

    deactivateWorkflow: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = await Workflow.findOneAndUpdate(
        { _id: id, userId: user.userId },
        { $set: { active: false } },
        { new: true }
      );

      if (!workflow) {
        throw new UserInputError('Workflow not found or access denied');
      }

      // Unschedule
      unscheduleWorkflow(id);

      // Publish status change
      pubsub.publish(WORKFLOW_STATUS_CHANGED, {
        workflowStatusChanged: workflow,
        userId: user.userId,
      });

      return workflow;
    },

    scheduleWorkflow: async (_, { id, schedule }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = await Workflow.findOneAndUpdate(
        { _id: id, userId: user.userId },
        { $set: { schedule, active: true } },
        { new: true }
      );

      if (!workflow) {
        throw new UserInputError('Workflow not found or access denied');
      }

      await scheduleWorkflow(workflow);

      return workflow;
    },

    unscheduleWorkflow: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = await Workflow.findOneAndUpdate(
        { _id: id, userId: user.userId },
        { $unset: { schedule: 1 } },
        { new: true }
      );

      if (!workflow) {
        throw new UserInputError('Workflow not found or access denied');
      }

      unscheduleWorkflow(id);

      return workflow;
    },

    testWorkflowConnection: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = await Workflow.findOne({ _id: id, userId: user.userId });

      if (!workflow) {
        throw new UserInputError('Workflow not found or access denied');
      }

      // Simple validation - check if workflow has nodes and edges
      if (!workflow.nodes || workflow.nodes.length === 0) {
        return {
          success: false,
          message: 'Workflow has no nodes',
        };
      }

      // Check for starting node
      const hasStartNode = workflow.nodes.some(
        node => !workflow.edges.some(edge => edge.target === node.id)
      );

      if (!hasStartNode) {
        return {
          success: false,
          message: 'Workflow has no starting node',
        };
      }

      return {
        success: true,
        message: 'Workflow structure is valid',
      };
    },

    validateWorkflow: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const workflow = await Workflow.findOne({ _id: id, userId: user.userId });

      if (!workflow) {
        throw new UserInputError('Workflow not found or access denied');
      }

      // Comprehensive validation logic
      const errors = [];

      if (!workflow.nodes || workflow.nodes.length === 0) {
        errors.push('Workflow must have at least one node');
      }

      // Check for orphaned nodes
      const connectedNodes = new Set();
      workflow.edges.forEach(edge => {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      });

      const orphanedNodes = workflow.nodes.filter(
        node => !connectedNodes.has(node.id) && workflow.nodes.length > 1
      );

      if (orphanedNodes.length > 0) {
        errors.push(`Found ${orphanedNodes.length} orphaned nodes`);
      }

      // Check for circular dependencies (simplified)
      const visited = new Set();
      const recursionStack = new Set();

      const hasCycle = nodeId => {
        if (recursionStack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;

        visited.add(nodeId);
        recursionStack.add(nodeId);

        const outgoingEdges = workflow.edges.filter(edge => edge.source === nodeId);
        for (const edge of outgoingEdges) {
          if (hasCycle(edge.target)) return true;
        }

        recursionStack.delete(nodeId);
        return false;
      };

      for (const node of workflow.nodes) {
        if (hasCycle(node.id)) {
          errors.push('Workflow contains circular dependencies');
          break;
        }
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0 ? 'Workflow is valid' : errors.join('; '),
      };
    },
  },

  // Subscription resolvers
  Subscription: {
    workflowRunUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([WORKFLOW_RUN_UPDATES]),
        (payload, variables) => {
          if (!variables.workflowId) return true;
          return payload.workflowRunUpdates.workflowId === variables.workflowId;
        }
      ),
    },

    workflowRunStarted: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([WORKFLOW_RUN_STARTED]),
        (payload, variables) => {
          if (!variables.userId) return true;
          return payload.userId === variables.userId;
        }
      ),
    },

    workflowRunCompleted: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([WORKFLOW_RUN_COMPLETED]),
        (payload, variables) => {
          if (!variables.userId) return true;
          return payload.userId === variables.userId;
        }
      ),
    },

    workflowRunFailed: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([WORKFLOW_RUN_FAILED]),
        (payload, variables) => {
          if (!variables.userId) return true;
          return payload.userId === variables.userId;
        }
      ),
    },

    workflowStatusChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([WORKFLOW_STATUS_CHANGED]),
        (payload, variables) => {
          if (!variables.userId) return true;
          return payload.userId === variables.userId;
        }
      ),
    },
  },
};

// Export pubsub for use in workflow engine
module.exports = {
  workflowResolvers,
  pubsub,
  WORKFLOW_RUN_UPDATES,
  WORKFLOW_RUN_STARTED,
  WORKFLOW_RUN_COMPLETED,
  WORKFLOW_RUN_FAILED,
  WORKFLOW_STATUS_CHANGED,
};
