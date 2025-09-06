const { interpolateSecure, validateInterpolationContext } = require('./interpolationSecure');
const { ObjectId } = require('mongodb');
const WorkflowRun = require('../../models/WorkflowRun');
const { logger } = require('../../utils/logger');

const nodeRegistry = {
  'action:httpRequest': require('./nodes/httpRequest'),
  'action:delay': require('./nodes/delay'),
  'logic:filter': require('./nodes/filter'),
  'action:code': require('./nodes/code'),
  'action:apiSequence': require('./nodes/apiSequence'),
  'action:openAi': require('./nodes/openAi'),
  'action:email': require('./nodes/email'),
  'action:fileGeneration': require('./nodes/fileGeneration'),
  'action:ftpUpload': require('./nodes/ftpUpload'),
  'action:logger': require('./nodes/logger'),
  'action:approval': require('./nodes/approval'),
  'action:template20:procedure': require('./nodes/template20Procedure'),
  'action:graphql:execute': require('./nodes/graphqlExecute'),
  'action:transform': require('./nodes/transform'),
  'action:idempotency': require('./nodes/idempotency'),
  'action:teams:notify': require('./nodes/teamsNotify'),
  'action:csvParse': require('./nodes/csvParse'),
  'action:sqlServerAdmin': require('./nodes/sqlServerAdmin'),
  'trigger:s3Bucket': require('./nodes/s3BucketTrigger'),
  'trigger:zoominfo:intent': require('./nodes/zoomInfoIntentTrigger'),
  'action:zoominfo:contactDiscovery': require('./nodes/zoomInfoContactDiscovery'),
  'action:crm:integration': require('./nodes/crmIntegration'),
  'action:salesforce:record': require('./nodes/salesforceRecordAction'),
  'action:hubspot:record': require('./nodes/hubspotRecordAction'),
  // Add other node executors here
};

const executeWorkflow = async (workflow, context = {}) => {
  logger.info(`Starting workflow execution for: ${workflow.name}`);
  const { nodes, edges } = workflow;

  const run = new WorkflowRun({
    workflowId: workflow._id,
    trigger: context,
    status: 'running',
  });
  run.steps = new Map(); // Initialize the steps map
  await run.save();

  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const executionContext = {
    // The initial data from the trigger (e.g., webhook body)
    trigger: context,
  };
  // This object will track the state of the run
  const runState = {};

  // Find the starting node (a node with no incoming edges)
  // This is a simplified approach; a real engine might handle multiple start nodes.
  const startNode = nodes.find(node => !edges.some(edge => edge.target === node.id));

  if (!startNode) {
    logger.error('Workflow has no start node.');
    run.status = 'failed';
    run.finishedAt = new Date();
    run.steps.set('system', { status: 'failed', error: 'Workflow has no start node.' });
    await run.save();
    return run.steps;
  }

  await executeNode(startNode, nodeMap, edges, executionContext, run);

  const hasFailedStep = Array.from(run.steps.values()).some(step => step.status === 'failed');
  run.status = hasFailedStep ? 'failed' : 'succeeded';
  run.finishedAt = new Date();
  await run.save();

  logger.info(`Workflow execution finished for: ${workflow.name} with status: ${run.status}`);
  return run.steps;
};

const executeNode = async (node, nodeMap, edges, context, run) => {
  logger.info(`Executing node: ${node.data.label} (Type: ${node.data.nodeType})`);
  run.steps.set(node.id, { status: 'running' });

  // Get the executor function from the registry
  const executor = nodeRegistry[node.data.nodeType];
  let result = {};

  if (executor) {
    // SECURITY: Validate interpolation context before processing
    try {
      validateInterpolationContext(context);
    } catch (contextError) {
      logger.error(
        `Invalid interpolation context for node ${node.data.label}:`,
        contextError.message
      );
      run.steps.set(node.id, {
        status: 'failed',
        error: `Security validation failed: ${contextError.message}`,
      });
      return;
    }

    // Use secure interpolation to prevent injection attacks
    const interpolatedConfig = interpolateSecure(node.data, context);

    // Enhanced context with workflow metadata for logging
    const enhancedContext = {
      ...context,
      run,
      currentNodeId: node.id,
      workflowContext: {
        workflowId: run.workflowId,
        workflowRunId: run._id,
        nodeType: node.data.nodeType,
        nodeId: node.id,
        nodeLabel: node.data.label,
      },
    };

    result = await executor.execute(interpolatedConfig, enhancedContext);
  } else if (typeof node.data.nodeType === 'string' && node.data.nodeType.startsWith('trigger:')) {
    // All trigger nodes pass the trigger context through
    result = context.trigger;
  } else {
    logger.warn(`No executor found for node type: ${node.data.nodeType}`);
  }

  run.steps.set(node.id, { status: 'succeeded', result });
  context[node.id] = result;

  // --- Path-based execution ---
  const outputHandles = Array.isArray(node.data.outputs) && node.data.outputs.length > 0;

  if (outputHandles) {
    // This is a node with multiple explicit output paths (e.g., Router, Approval)
    const nextPath = result.nextPath || 'fallback';
    const nextNode = getNextNodeFromPath(node, nextPath, nodeMap, edges);

    if (!nextNode) {
      logger.info(
        `No node connected to path "${nextPath}" for node "${node.data.label}". Halting branch.`
      );
      return result;
    }

    await executeNode(nextNode, nodeMap, edges, context, run);
  } else {
    // This is a simple node with a single output path
    const nextEdge = edges.find(edge => edge.source === node.id);
    if (nextEdge) {
      const nextNode = nodeMap.get(nextEdge.target);
      if (nextNode) {
        await executeNode(nextNode, nodeMap, edges, context, run);
      }
    }
  }
};

// Helper: find the next node for a multi-output node based on source handle id
const getNextNodeFromPath = (node, nextPath, nodeMap, edges) => {
  const outgoing = edges.filter(e => e.source === node.id);
  if (outgoing.length === 0) return null;

  // Prefer exact match on sourceHandle
  let edge = outgoing.find(e => e.sourceHandle === nextPath);

  // Fallback path
  if (!edge) {
    edge = outgoing.find(e => e.sourceHandle === 'fallback');
  }

  // As a last resort, take the first outgoing edge
  if (!edge) {
    edge = outgoing[0];
  }

  return edge ? nodeMap.get(edge.target) : null;
};

module.exports = {
  executeWorkflow,
  resumeApproval: async (workflowId, runId, decision) => {
    // Load models here to avoid circular imports at top
    const { Workflow } = require('../../models/workflowModels');
    const WorkflowRunModel = require('../../models/WorkflowRun');

    const workflow = await Workflow.findById(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const run = await WorkflowRunModel.findById(runId);
    if (!run) throw new Error('Workflow run not found');

    // Build node/edge maps
    const { nodes, edges } = workflow;
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Reconstruct context using stored step results
    const context = { trigger: run.trigger };
    if (run.steps && run.steps.forEach) {
      run.steps.forEach((value, key) => {
        if (value && value.result !== undefined) {
          context[key] = value.result;
        }
      });
    }

    // Find the approval node awaiting decision
    let pendingNodeId = null;
    if (run.steps && run.steps.forEach) {
      run.steps.forEach((value, key) => {
        if (!pendingNodeId && value && value.result && value.result.status === 'pending') {
          pendingNodeId = key;
        }
      });
    }

    if (!pendingNodeId) throw new Error('No pending approval node found to resume');
    const approvalNode = nodeMap.get(pendingNodeId);
    if (!approvalNode) throw new Error('Pending approval node not found in workflow');

    // Compute next node based on decision
    const nextPath = decision === 'approve' ? 'approve' : 'reject';
    const nextNode = getNextNodeFromPath(approvalNode, nextPath, nodeMap, edges);
    if (!nextNode) throw new Error(`No next node connected for decision path '${nextPath}'`);

    // Update run status back to running
    run.status = 'running';
    await run.save();

    // Continue execution
    await executeNode(nextNode, nodeMap, edges, context, run);

    // Finalize status
    const hasFailedStep = Array.from(run.steps.values()).some(step => step.status === 'failed');
    run.status = hasFailedStep ? 'failed' : 'succeeded';
    run.finishedAt = new Date();
    await run.save();

    return { success: true, status: run.status };
  },
};
