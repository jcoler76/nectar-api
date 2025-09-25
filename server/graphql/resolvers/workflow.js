// MongoDB models replaced with Prisma for PostgreSQL migration
// const { Workflow } = require('../../models/workflowModels');
// const WorkflowRun = require('../../models/WorkflowRun');

const prismaService = require('../../services/prismaService');
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
    user: async (workflow, _, { user: currentUser }) => {
      if (!currentUser) return null;

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        return await tx.user.findUnique({
          where: { id: workflow.createdBy },
          select: { id: true, email: true, firstName: true, lastName: true },
        });
      });
    },

    runs: async (workflow, { first = 10, after, status }, { user: currentUser }) => {
      if (!currentUser) return { edges: [], pageInfo: { hasNextPage: false } };

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const where = { workflowId: workflow.id };
        if (status) {
          where.status = status;
        }

        const executions = await tx.workflowExecution.findMany({
          where,
          orderBy: { startedAt: 'desc' },
          take: first,
        });

        return {
          edges: executions.map(execution => ({ node: execution })),
          pageInfo: { hasNextPage: executions.length === first },
        };
      });
    },

    lastRun: async (workflow, _, { user: currentUser }) => {
      if (!currentUser) return null;

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        return await tx.workflowExecution.findFirst({
          where: { workflowId: workflow.id },
          orderBy: { startedAt: 'desc' },
        });
      });
    },

    totalRuns: async (workflow, _, { user: currentUser }) => {
      if (!currentUser) return 0;

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        return await tx.workflowExecution.count({
          where: { workflowId: workflow.id },
        });
      });
    },

    successRate: async (workflow, _, { user: currentUser }) => {
      if (!currentUser) return 0;

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const [total, successful] = await Promise.all([
          tx.workflowExecution.count({
            where: { workflowId: workflow.id },
          }),
          tx.workflowExecution.count({
            where: { workflowId: workflow.id, status: 'SUCCESS' },
          }),
        ]);

        return total > 0 ? (successful / total) * 100 : 0;
      });
    },
  },

  WorkflowRun: {
    workflow: async (execution, _, { user: currentUser }) => {
      if (!currentUser) return null;

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        return await tx.workflow.findUnique({
          where: { id: execution.workflowId },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });
      });
    },

    duration: execution => {
      if (execution.startedAt && execution.completedAt) {
        return execution.completedAt.getTime() - execution.startedAt.getTime();
      }
      return null;
    },
  },

  // Query resolvers
  Query: {
    workflow: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing workflow management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const workflow = await tx.workflow.findFirst({
          where: { id },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });

        if (!workflow) return null;

        // Check ownership
        if (workflow.createdBy !== currentUser.userId) {
          throw new ForbiddenError('Access denied');
        }

        return workflow;
      });
    },

    workflows: async (
      _,
      { first = 10, after, filters = {}, orderBy = 'DESC' },
      { user: currentUser, jwtUser, apiKeyUser, dataloaders }
    ) => {
      // Block client API keys from accessing workflows list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const where = {};

        // Apply filters
        if (filters.name) {
          where.name = { contains: filters.name, mode: 'insensitive' };
        }
        if (filters.active !== undefined) {
          where.isActive = filters.active;
        }
        if (filters.userId) {
          where.createdBy = filters.userId;
        } else {
          // Default to user's workflows if no userId specified
          where.createdBy = currentUser.userId;
        }
        if (filters.createdAfter) {
          where.createdAt = { ...where.createdAt, gte: new Date(filters.createdAfter) };
        }
        if (filters.createdBefore) {
          where.createdAt = { ...where.createdAt, lte: new Date(filters.createdBefore) };
        }

        const workflows = await tx.workflow.findMany({
          where,
          orderBy: { createdAt: orderBy === 'DESC' ? 'desc' : 'asc' },
          take: first,
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });

        return {
          edges: workflows.map(workflow => ({ node: workflow })),
          pageInfo: { hasNextPage: workflows.length === first },
        };
      });
    },

    workflowRun: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing workflow runs
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const execution = await tx.workflowExecution.findFirst({
          where: { id },
          include: {
            workflow: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
              },
            },
          },
        });

        if (!execution) return null;

        // Check ownership through workflow
        if (execution.workflow.createdBy !== currentUser.userId) {
          throw new ForbiddenError('Access denied');
        }

        return execution;
      });
    },

    workflowRuns: async (
      _,
      { first = 10, after, filters = {}, orderBy = 'DESC' },
      { user: currentUser, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing workflow runs list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const where = {};

        // Apply filters
        if (filters.workflowId) {
          // Verify ownership
          const workflow = await tx.workflow.findFirst({
            where: { id: filters.workflowId },
          });

          if (!workflow || workflow.createdBy !== currentUser.userId) {
            throw new ForbiddenError('Access denied');
          }

          where.workflowId = filters.workflowId;
        } else {
          // Get all workflows for the user
          const userWorkflows = await tx.workflow.findMany({
            where: { createdBy: currentUser.userId },
            select: { id: true },
          });
          where.workflowId = { in: userWorkflows.map(w => w.id) };
        }

        if (filters.status) {
          where.status = filters.status;
        }
        if (filters.startedAfter) {
          where.startedAt = { ...where.startedAt, gte: new Date(filters.startedAfter) };
        }
        if (filters.startedBefore) {
          where.startedAt = { ...where.startedAt, lte: new Date(filters.startedBefore) };
        }

        const executions = await tx.workflowExecution.findMany({
          where,
          orderBy: { startedAt: orderBy === 'DESC' ? 'desc' : 'asc' },
          take: first,
          include: {
            workflow: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
              },
            },
          },
        });

        return {
          edges: executions.map(execution => ({ node: execution })),
          pageInfo: { hasNextPage: executions.length === first },
        };
      });
    },

    myWorkflows: async (
      _,
      { first = 10, after, active },
      { user: currentUser, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing workflows
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const where = { createdBy: currentUser.userId };
        if (active !== undefined) {
          where.isActive = active;
        }

        const workflows = await tx.workflow.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: first,
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });

        return {
          edges: workflows.map(workflow => ({ node: workflow })),
          pageInfo: { hasNextPage: workflows.length === first },
        };
      });
    },

    workflowStats: async (_, __, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing workflow stats
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access workflow management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Get user's workflows
        const userWorkflows = await tx.workflow.findMany({
          where: { createdBy: currentUser.userId },
          select: { id: true },
        });

        const workflowIds = userWorkflows.map(w => w.id);

        const [totalWorkflows, activeWorkflows, executions] = await Promise.all([
          tx.workflow.count({ where: { createdBy: currentUser.userId } }),
          tx.workflow.count({ where: { createdBy: currentUser.userId, isActive: true } }),
          tx.workflowExecution.findMany({
            where: { workflowId: { in: workflowIds } },
            include: { workflow: true },
          }),
        ]);

        // Calculate stats from executions
        let totalRuns = executions.length;
        let successfulRuns = 0;
        let failedRuns = 0;
        let totalExecutionTime = 0;
        let executionCount = 0;

        const workflowRunCounts = {};
        const recentFailures = [];

        for (const execution of executions) {
          if (execution.status === 'SUCCESS') successfulRuns++;
          if (execution.status === 'FAILED') {
            failedRuns++;
            if (recentFailures.length < 5) {
              recentFailures.push(execution);
            }
          }

          // Calculate execution time
          if (execution.startedAt && execution.completedAt) {
            totalExecutionTime += execution.completedAt.getTime() - execution.startedAt.getTime();
            executionCount++;
          }

          // Count runs per workflow
          if (!workflowRunCounts[execution.workflowId]) {
            workflowRunCounts[execution.workflowId] = {
              count: 0,
              workflow: execution.workflow,
            };
          }
          workflowRunCounts[execution.workflowId].count++;
        }

        // Find most active workflow
        let mostActiveWorkflow = null;
        let maxCount = 0;
        for (const [workflowId, data] of Object.entries(workflowRunCounts)) {
          if (data.count > maxCount) {
            maxCount = data.count;
            mostActiveWorkflow = data.workflow;
          }
        }

        const averageExecutionTime = executionCount > 0 ? totalExecutionTime / executionCount : 0;

        return {
          totalWorkflows,
          activeWorkflows,
          totalRuns,
          successfulRuns,
          failedRuns,
          averageExecutionTime,
          mostActiveWorkflow,
          recentFailures: recentFailures.slice(0, 5),
        };
      });
    },
  },

  // Mutation resolvers
  Mutation: {
    createWorkflow: async (_, { input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const workflow = await tx.workflow.create({
          data: {
            ...input,
            organizationId: currentUser.organizationId,
            createdBy: currentUser.userId,
          },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });

        return workflow;
      });
    },

    updateWorkflow: async (_, { id, input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Verify ownership
        const existing = await tx.workflow.findFirst({
          where: { id, createdBy: currentUser.userId },
        });

        if (!existing) {
          throw new UserInputError('Workflow not found or access denied');
        }

        const workflow = await tx.workflow.update({
          where: { id },
          data: input,
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });

        // Publish status change
        pubsub.publish(WORKFLOW_STATUS_CHANGED, {
          workflowStatusChanged: workflow,
          userId: currentUser.userId,
        });

        return workflow;
      });
    },

    deleteWorkflow: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Verify ownership
        const workflow = await tx.workflow.findFirst({
          where: { id, createdBy: currentUser.userId },
        });

        if (!workflow) {
          throw new UserInputError('Workflow not found or access denied');
        }

        await tx.workflow.delete({ where: { id } });

        return true;
      });
    },

    executeWorkflow: async (_, { id, triggerData = {} }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const workflow = await tx.workflow.findFirst({
          where: { id, createdBy: currentUser.userId },
        });

        if (!workflow) {
          throw new UserInputError('Workflow not found or access denied');
        }

        const startTime = Date.now();

        try {
          const result = await executeWorkflow(workflow, triggerData);
          const executionTime = Date.now() - startTime;

          return {
            success: true,
            runId: result.id,
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
      });
    },

    stopWorkflowRun: async (_, { runId }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const execution = await tx.workflowExecution.findFirst({
          where: { id: runId },
          include: {
            workflow: true,
          },
        });

        if (!execution || execution.workflow.createdBy !== currentUser.userId) {
          throw new UserInputError('Workflow run not found or access denied');
        }

        if (execution.status !== 'RUNNING') {
          throw new UserInputError('Workflow run is not currently running');
        }

        // Update execution status
        const updated = await tx.workflowExecution.update({
          where: { id: runId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            error: 'Manually stopped by user',
          },
        });

        // Publish completion
        pubsub.publish(WORKFLOW_RUN_FAILED, {
          workflowRunFailed: updated,
          userId: currentUser.userId,
        });

        return true;
      });
    },

    activateWorkflow: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Verify ownership
        const existing = await tx.workflow.findFirst({
          where: { id, createdBy: currentUser.userId },
        });

        if (!existing) {
          throw new UserInputError('Workflow not found or access denied');
        }

        const workflow = await tx.workflow.update({
          where: { id },
          data: { isActive: true },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });

        // Publish status change
        pubsub.publish(WORKFLOW_STATUS_CHANGED, {
          workflowStatusChanged: workflow,
          userId: currentUser.userId,
        });

        return workflow;
      });
    },

    deactivateWorkflow: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Verify ownership
        const existing = await tx.workflow.findFirst({
          where: { id, createdBy: currentUser.userId },
        });

        if (!existing) {
          throw new UserInputError('Workflow not found or access denied');
        }

        const workflow = await tx.workflow.update({
          where: { id },
          data: { isActive: false },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });

        // Publish status change
        pubsub.publish(WORKFLOW_STATUS_CHANGED, {
          workflowStatusChanged: workflow,
          userId: currentUser.userId,
        });

        return workflow;
      });
    },

    scheduleWorkflow: async (_, { id, schedule }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Verify ownership
        const existing = await tx.workflow.findFirst({
          where: { id, createdBy: currentUser.userId },
        });

        if (!existing) {
          throw new UserInputError('Workflow not found or access denied');
        }

        const workflow = await tx.workflow.update({
          where: { id },
          data: { isActive: true },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });

        await scheduleWorkflow(workflow);

        return workflow;
      });
    },

    unscheduleWorkflow: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Verify ownership
        const workflow = await tx.workflow.findFirst({
          where: { id, createdBy: currentUser.userId },
        });

        if (!workflow) {
          throw new UserInputError('Workflow not found or access denied');
        }

        unscheduleWorkflow(id);

        return workflow;
      });
    },

    testWorkflowConnection: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const workflow = await tx.workflow.findFirst({
          where: { id, createdBy: currentUser.userId },
        });

        if (!workflow) {
          throw new UserInputError('Workflow not found or access denied');
        }

        // Simple validation - check if workflow has definition
        if (!workflow.definition || typeof workflow.definition !== 'object') {
          return {
            success: false,
            message: 'Workflow has invalid definition',
          };
        }

        return {
          success: true,
          message: 'Workflow structure is valid',
        };
      });
    },

    validateWorkflow: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const workflow = await tx.workflow.findFirst({
          where: { id, createdBy: currentUser.userId },
        });

        if (!workflow) {
          throw new UserInputError('Workflow not found or access denied');
        }

        // Comprehensive validation logic
        const errors = [];

        if (!workflow.definition || typeof workflow.definition !== 'object') {
          errors.push('Workflow must have a valid definition');
          return {
            success: false,
            message: errors.join('; '),
          };
        }

        const def = workflow.definition;
        if (!def.nodes || def.nodes.length === 0) {
          errors.push('Workflow must have at least one node');
        }

        if (def.nodes && def.edges) {
          // Check for orphaned nodes
          const connectedNodes = new Set();
          def.edges.forEach(edge => {
            connectedNodes.add(edge.source);
            connectedNodes.add(edge.target);
          });

          const orphanedNodes = def.nodes.filter(
            node => !connectedNodes.has(node.id) && def.nodes.length > 1
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

            const outgoingEdges = def.edges.filter(edge => edge.source === nodeId);
            for (const edge of outgoingEdges) {
              if (hasCycle(edge.target)) return true;
            }

            recursionStack.delete(nodeId);
            return false;
          };

          for (const node of def.nodes) {
            if (hasCycle(node.id)) {
              errors.push('Workflow contains circular dependencies');
              break;
            }
          }
        }

        return {
          success: errors.length === 0,
          message: errors.length === 0 ? 'Workflow is valid' : errors.join('; '),
        };
      });
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
