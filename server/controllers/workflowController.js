// MongoDB models replaced with Prisma for PostgreSQL migration
// const { Workflow } = require('../models/workflowModels');
// const WorkflowRun = require('../models/WorkflowRun');

const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
const { executeWorkflow } = require('../services/workflows/engine');
const { scheduleWorkflow, unscheduleWorkflow } = require('../services/scheduler');
const { logger } = require('../middleware/logger');
// const mongoose = require('mongoose'); // Removed for Prisma migration

// Get all workflows for the authenticated user
exports.getWorkflows = async (req, res) => {
  try {
    // Admin users can see all workflows, others only see their own
    const whereClause = req.user.isAdmin ? {} : { organizationId: req.user.organizationId };

    const workflows = await prisma.workflow.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        executions: {
          take: 5,
          orderBy: { startedAt: 'desc' },
        },
      },
    });
    res.json(workflows);
  } catch (error) {
    logger.error('Failed to retrieve workflows:', { error: error.message });
    res.status(500).json({ message: 'Failed to retrieve workflows' });
  }
};

// Get a single workflow by ID
exports.getWorkflowById = async (req, res) => {
  try {
    const { id } = req.params;

    // Admin users can access any workflow, others only their own organization
    const whereClause = req.user.isAdmin ? { id } : { id, organizationId: req.user.organizationId };

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        organization: true,
      },
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Check organization access for non-admin users
    if (!req.user.isAdmin && workflow.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(workflow);
  } catch (error) {
    logger.error('Failed to retrieve workflow:', { error: error.message });
    res.status(500).json({ message: 'Failed to retrieve workflow' });
  }
};

// Create a new workflow
exports.createWorkflow = async (req, res) => {
  try {
    const { name, description, definition, trigger, nodes, edges } = req.body;

    // Convert MongoDB-style structure to PostgreSQL format
    const workflowDefinition = definition ?? {
      nodes: nodes || [],
      edges: edges || [],
      version: '1.0',
    };

    const workflowTrigger = trigger ?? {
      type: 'manual',
      config: {},
    };

    const newWorkflow = await prisma.workflow.create({
      data: {
        name,
        description: description || null,
        definition: workflowDefinition,
        trigger: workflowTrigger,
        organizationId: req.user.organizationId,
      },
      include: {
        executions: true,
        organization: true,
      },
    });

    res.status(201).json(newWorkflow);
  } catch (error) {
    logger.error('Failed to create workflow:', { error: error.message });
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'A workflow with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to create workflow' });
  }
};

// Update a workflow
exports.updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, definition, trigger, isActive } = req.body;

    // Check if workflow exists and user has access
    const existing = await prisma.workflow.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (!req.user.isAdmin && existing.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedWorkflow = await prisma.workflow.update({
      where: { id },
      data: {
        name,
        description,
        definition,
        trigger,
        isActive,
      },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });

    // Handle workflow scheduling based on definition
    if (updatedWorkflow.isActive && updatedWorkflow.definition?.nodes) {
      const hasSchedulerTrigger = updatedWorkflow.definition.nodes.some(
        n => n.data?.nodeType === 'trigger:schedule'
      );

      if (hasSchedulerTrigger) {
        logger.info(`Scheduling workflow after update: ${updatedWorkflow.name}`);
        await scheduleWorkflow(updatedWorkflow);
      } else {
        logger.info(`Unscheduling workflow after update: ${updatedWorkflow.name}`);
        unscheduleWorkflow(updatedWorkflow.id);
      }
    }

    res.json(updatedWorkflow);
  } catch (error) {
    logger.error('Failed to update workflow:', { error: error.message });
    res.status(500).json({ message: 'Failed to update workflow' });
  }
};

// Delete a workflow
exports.deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if workflow exists and user has access
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (!req.user.isAdmin && workflow.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Unschedule before deletion
    unscheduleWorkflow(id);

    // Delete the workflow (cascades to executions)
    await prisma.workflow.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete workflow:', { error: error.message });
    res.status(500).json({ message: 'Failed to delete workflow' });
  }
};

// Test a workflow execution
exports.testWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (!req.user.isAdmin && workflow.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: id,
        status: 'RUNNING',
        logs: { trigger: 'test', data: req.body.triggerData || {} },
      },
    });

    const runSteps = await executeWorkflow(workflow, req.body.triggerData || {});
    const resultsObject = Object.fromEntries(runSteps);

    // Update execution with results
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        logs: { ...execution.logs, results: resultsObject },
      },
    });

    res.status(200).json(resultsObject);
  } catch (error) {
    logger.error('Workflow test execution failed:', { error: error.message });
    res.status(500).json({ message: 'Internal Server Error during test execution.' });
  }
};

// Get all runs for a workflow
exports.getWorkflowRuns = async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure the user owns the workflow they are trying to access runs for
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (!req.user.isAdmin && workflow.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId: id },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    res.status(200).json(executions);
  } catch (error) {
    logger.error(`Failed to fetch runs for workflow ${req.params.id}:`, { error: error.message });
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
