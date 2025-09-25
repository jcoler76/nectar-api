const prismaService = require('../services/prismaService');
const { executeWorkflow } = require('../services/workflows/engine');
const { scheduleWorkflow, unscheduleWorkflow } = require('../services/scheduler');
const { logger } = require('../middleware/logger');

// Get all workflows for the authenticated user
exports.getWorkflows = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    logger.info('Getting workflows with filter', {
      userId: req.user.userId,
      email: req.user.email,
      organizationId,
    });

    const workflows = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.workflow.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        include: {
          executions: {
            take: 5,
            orderBy: { startedAt: 'desc' },
          },
        },
      });
    });

    logger.info('Workflows query result', {
      userId: req.user.userId,
      email: req.user.email,
      organizationId,
      workflowCount: workflows.length,
      workflowOrgIds: workflows.map(w => w.organizationId).slice(0, 5),
    });

    // Transform workflows to maintain compatibility with client expectations
    // Extract nodes and edges from definition to top level for client compatibility
    const transformedWorkflows = workflows.map(workflow => ({
      ...workflow,
      nodes: workflow.definition?.nodes || [],
      edges: workflow.definition?.edges || [],
    }));

    res.json(transformedWorkflows);
  } catch (error) {
    logger.error('Failed to retrieve workflows:', { error: error.message });
    res.status(500).json({ message: 'Failed to retrieve workflows' });
  }
};

// Get a single workflow by ID
exports.getWorkflowById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const workflow = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.workflow.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          executions: {
            orderBy: { startedAt: 'desc' },
            take: 10,
          },
          organization: true,
        },
      });
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Transform the workflow to maintain compatibility with client expectations
    // Extract nodes and edges from definition to top level for client compatibility
    const transformedWorkflow = {
      ...workflow,
      nodes: workflow.definition?.nodes || [],
      edges: workflow.definition?.edges || [],
    };

    res.json(transformedWorkflow);
  } catch (error) {
    logger.error('Failed to retrieve workflow:', { error: error.message });
    res.status(500).json({ message: 'Failed to retrieve workflow' });
  }
};

// Create a new workflow
exports.createWorkflow = async (req, res) => {
  try {
    const { name, description, definition, trigger, nodes, edges } = req.body;
    const organizationId = req.user.organizationId;

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

    const newWorkflow = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.workflow.create({
        data: {
          name,
          description: description || null,
          definition: workflowDefinition,
          trigger: workflowTrigger,
          organizationId,
        },
        include: {
          executions: true,
          organization: true,
        },
      });
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
    const { name, description, definition, trigger, isActive, nodes, edges } = req.body;
    const organizationId = req.user.organizationId;

    // Handle both old and new data structures - if nodes/edges are provided at top level,
    // structure them into definition for database storage
    let workflowDefinition = definition;
    if (nodes !== undefined || edges !== undefined) {
      workflowDefinition = {
        nodes: nodes || [],
        edges: edges || [],
        version: definition?.version || '1.0',
        ...definition, // Preserve any existing definition properties
      };
    }

    const updatedWorkflow = await prismaService.withTenantContext(organizationId, async tx => {
      // Check if workflow exists and user has access
      const existing = await tx.workflow.findFirst({
        where: {
          id,
          organizationId,
        },
        include: { organization: true },
      });

      if (!existing) {
        return null;
      }

      return await tx.workflow.update({
        where: { id },
        data: {
          name,
          description,
          definition: workflowDefinition,
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
    });

    if (!updatedWorkflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

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

    // Transform the response to maintain compatibility with client expectations
    const transformedWorkflow = {
      ...updatedWorkflow,
      nodes: updatedWorkflow.definition?.nodes || [],
      edges: updatedWorkflow.definition?.edges || [],
    };

    res.json(transformedWorkflow);
  } catch (error) {
    logger.error('Failed to update workflow:', { error: error.message });
    res.status(500).json({ message: 'Failed to update workflow' });
  }
};

// Delete a workflow
exports.deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const deleted = await prismaService.withTenantContext(organizationId, async tx => {
      // Check if workflow exists and user has access
      const workflow = await tx.workflow.findFirst({
        where: {
          id,
          organizationId,
        },
        include: { organization: true },
      });

      if (!workflow) {
        return null;
      }

      // Unschedule before deletion
      unscheduleWorkflow(id);

      // Delete the workflow (cascades to executions)
      await tx.workflow.delete({
        where: { id },
      });

      return true;
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

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
    const organizationId = req.user.organizationId;

    const result = await prismaService.withTenantContext(organizationId, async tx => {
      const workflow = await tx.workflow.findFirst({
        where: {
          id,
          organizationId,
        },
        include: { organization: true },
      });

      if (!workflow) {
        return null;
      }

      // Create execution record
      const execution = await tx.workflowExecution.create({
        data: {
          workflowId: id,
          status: 'RUNNING',
          logs: { trigger: 'test', data: req.body.triggerData || {} },
        },
      });

      const runSteps = await executeWorkflow(workflow, req.body.triggerData || {});
      const resultsObject = Object.fromEntries(runSteps);

      // Update execution with results
      await tx.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          logs: { ...execution.logs, results: resultsObject },
        },
      });

      return resultsObject;
    });

    if (!result) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    logger.error('Workflow test execution failed:', { error: error.message });
    res.status(500).json({ message: 'Internal Server Error during test execution.' });
  }
};

// Get all runs for a workflow
exports.getWorkflowRuns = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const executions = await prismaService.withTenantContext(organizationId, async tx => {
      // Ensure the user owns the workflow they are trying to access runs for
      const workflow = await tx.workflow.findFirst({
        where: {
          id,
          organizationId,
        },
        include: { organization: true },
      });

      if (!workflow) {
        return null;
      }

      return await tx.workflowExecution.findMany({
        where: { workflowId: id },
        orderBy: { startedAt: 'desc' },
        take: 50,
      });
    });

    if (!executions) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    res.status(200).json(executions);
  } catch (error) {
    logger.error(`Failed to fetch runs for workflow ${req.params.id}:`, { error: error.message });
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
