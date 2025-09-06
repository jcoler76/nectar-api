const { Workflow } = require('../models/workflowModels');
const WorkflowRun = require('../models/WorkflowRun');
const { executeWorkflow } = require('../services/workflows/engine');
const { scheduleWorkflow, unscheduleWorkflow } = require('../services/scheduler');
const { logger } = require('../middleware/logger');
const mongoose = require('mongoose');

// Get all workflows for the authenticated user
exports.getWorkflows = async (req, res) => {
  try {
    // Admin users can see all workflows, others only see their own
    const query = req.user.isAdmin ? {} : { userId: req.user.userId };
    const workflows = await Workflow.find(query).sort({ updatedAt: -1 });
    res.json(workflows);
  } catch (error) {
    console.error('Failed to retrieve workflows:', error);
    res.status(500).json({ message: 'Failed to retrieve workflows' });
  }
};

// Get a single workflow by ID
exports.getWorkflowById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid workflow ID' });
    }
    // Admin users can access any workflow, others only their own
    const query = req.user.isAdmin ? { _id: id } : { _id: id, userId: req.user.userId };
    const workflow = await Workflow.findOne(query);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    console.error('Failed to retrieve workflow:', error);
    res.status(500).json({ message: 'Failed to retrieve workflow' });
  }
};

// Create a new workflow
exports.createWorkflow = async (req, res) => {
  try {
    const newWorkflow = new Workflow({
      ...req.body,
      userId: req.user.userId,
    });
    await newWorkflow.save();
    res.status(201).json(newWorkflow);
  } catch (error) {
    // Using console.warn to provide more visibility in logs for validation errors
    if (error.name === 'ValidationError') {
      console.warn('Workflow validation failed:', error);
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    console.error('Failed to create workflow:', error);
    res.status(500).json({ message: 'Failed to create workflow' });
  }
};

// Update a workflow
exports.updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nodes, edges, active, schedule } = req.body;
    const updateData = { name, nodes, edges, active, schedule };
    // Admin users can update any workflow, others only their own
    const query = req.user.isAdmin ? { _id: id } : { _id: id, userId: req.user.userId };
    const updatedWorkflow = await Workflow.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    );
    if (!updatedWorkflow) {
      return res
        .status(404)
        .json({ message: 'Workflow not found or user does not have permission' });
    }
    // Check if workflow has a scheduler trigger node and is active
    const hasSchedulerTrigger = updatedWorkflow.nodes.some(
      n => n.data.nodeType === 'trigger:schedule'
    );

    if (updatedWorkflow.active && hasSchedulerTrigger) {
      // Using logger instead of console.log for production
      logger.info(`Scheduling workflow after update: ${updatedWorkflow.name}`);
      await scheduleWorkflow(updatedWorkflow);
    } else {
      logger.info(`Unscheduling workflow after update: ${updatedWorkflow.name}`);
      unscheduleWorkflow(updatedWorkflow._id);
    }
    res.json(updatedWorkflow);
  } catch (error) {
    console.error('Failed to update workflow:', error);
    res.status(500).json({ message: 'Failed to update workflow' });
  }
};

// Delete a workflow
exports.deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid workflow ID format' });
    }

    // Admin users can delete any workflow, others only their own
    const query = req.user.isAdmin ? { _id: id } : { _id: id, userId: req.user.userId };
    const workflow = await Workflow.findOne(query);

    if (!workflow) {
      const message = req.user.isAdmin
        ? 'Workflow not found'
        : 'Workflow not found or you do not have permission to delete it';
      return res.status(404).json({ message });
    }

    // Unschedule before deletion
    unscheduleWorkflow(id);

    // Delete the workflow
    await Workflow.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    res.status(500).json({ message: 'Failed to delete workflow' });
  }
};

// Test a workflow execution
exports.testWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!workflow) {
      return res
        .status(404)
        .json({ message: 'Workflow not found or user does not have permission' });
    }
    const runSteps = await executeWorkflow(workflow, req.body.triggerData || {});
    const resultsObject = Object.fromEntries(runSteps);
    res.status(200).json(resultsObject);
  } catch (error) {
    console.error('Workflow test execution failed:', error);
    res.status(500).json({ message: 'Internal Server Error during test execution.' });
  }
};

// Get all runs for a workflow
exports.getWorkflowRuns = async (req, res) => {
  try {
    // IDOR Fix: First, ensure the user owns the workflow they are trying to access runs for.
    const workflow = await Workflow.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!workflow) {
      return res
        .status(404)
        .json({ message: 'Workflow not found or user does not have permission' });
    }

    const runs = await WorkflowRun.find({ workflowId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(runs);
  } catch (error) {
    console.error(`Failed to fetch runs for workflow ${req.params.id}:`, error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
