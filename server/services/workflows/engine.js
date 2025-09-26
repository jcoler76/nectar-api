const { interpolateSecure, validateInterpolationContext } = require('./interpolationSecure');
// MongoDB dependencies - in process of migration to Prisma
// const { ObjectId } = require('mongodb');
// const WorkflowRun = require('../../models/WorkflowRun');

const prismaService = require('../prismaService');
// SECURITY: Remove direct Prisma client usage - RLS policy violation
// const prisma = prismaService.getClient(); // REMOVED - bypasses tenant isolation

// SECURITY: Import workflow authorization middleware
const {
  validateWorkflowContext,
  sanitizeWorkflowContext,
} = require('../../middleware/workflowAuthorization');

// UUID generator for Prisma (replaces MongoDB ObjectId)
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../utils/logger');

/**
 * SECURITY: Enhanced audit logging for workflow operations
 * Logs security-critical events with standardized metadata
 * @param {string} event - Event type for categorization
 * @param {Object} metadata - Event-specific metadata
 * @param {Object} user - Current user context
 * @param {string} organizationId - Tenant context
 */
const auditLog = async (event, metadata = {}, user = null, organizationId = null) => {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId: user?.id,
    organizationId,
    userAgent: metadata.userAgent,
    ip: metadata.ip,
    workflowId: metadata.workflowId,
    workflowRunId: metadata.workflowRunId,
    nodeId: metadata.nodeId,
    nodeType: metadata.nodeType,
    severity: metadata.severity || 'INFO',
    success: metadata.success !== false, // Default to true unless explicitly false
    metadata: {
      ...metadata,
      // Remove redundant fields to avoid duplication
      userAgent: undefined,
      ip: undefined,
      workflowId: undefined,
      workflowRunId: undefined,
      nodeId: undefined,
      nodeType: undefined,
      severity: undefined,
      success: undefined,
    },
  };

  // SECURITY: Log to application logger with structured data
  logger.info(`WORKFLOW_AUDIT: ${event}`, auditEntry);

  // SECURITY: Store audit trail in database with tenant context
  if (organizationId) {
    try {
      await prismaService.withTenantContext(organizationId, async tx => {
        await tx.auditLog.create({
          data: {
            action: event,
            resourceType: 'WORKFLOW',
            resourceId: metadata.workflowId || metadata.workflowRunId,
            userId: user?.id,
            organizationId,
            metadata: auditEntry,
            createdAt: new Date(),
          },
        });
      });
    } catch (error) {
      logger.error('Failed to store workflow audit log', {
        error: error.message,
        event,
        userId: user?.id,
        organizationId,
      });
    }
  }
};

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

/**
 * SECURITY: Node type classification for authorization
 * - UNRESTRICTED: Safe nodes that can be executed by any user
 * - RESTRICTED: Sensitive nodes requiring elevated permissions
 * - ADMIN_ONLY: Critical nodes requiring admin privileges
 */
const NODE_SECURITY_LEVELS = {
  // Unrestricted nodes - safe for all users
  'logic:filter': 'UNRESTRICTED',
  'action:delay': 'UNRESTRICTED',
  'action:transform': 'UNRESTRICTED',
  'action:idempotency': 'UNRESTRICTED',
  'action:logger': 'UNRESTRICTED',
  'trigger:s3Bucket': 'UNRESTRICTED',
  'trigger:zoominfo:intent': 'UNRESTRICTED',

  // Restricted nodes - require specific permissions
  'action:httpRequest': 'RESTRICTED',
  'action:apiSequence': 'RESTRICTED',
  'action:openAi': 'RESTRICTED',
  'action:email': 'RESTRICTED',
  'action:teams:notify': 'RESTRICTED',
  'action:csvParse': 'RESTRICTED',
  'action:approval': 'RESTRICTED',
  'action:graphql:execute': 'RESTRICTED',
  'action:zoominfo:contactDiscovery': 'RESTRICTED',
  'action:crm:integration': 'RESTRICTED',
  'action:salesforce:record': 'RESTRICTED',
  'action:hubspot:record': 'RESTRICTED',

  // Admin-only nodes - require admin privileges
  'action:code': 'ADMIN_ONLY',
  'action:fileGeneration': 'ADMIN_ONLY',
  'action:ftpUpload': 'ADMIN_ONLY',
  'action:sqlServerAdmin': 'ADMIN_ONLY',
};

/**
 * SECURITY: Check if user is authorized to execute a specific node type
 * @param {string} nodeType - The node type to validate
 * @param {Object} user - Current user object
 * @param {string} organizationId - Tenant context
 * @returns {boolean} - Node execution authorized
 */
const isNodeTypeAuthorized = async (nodeType, user, organizationId) => {
  if (!nodeType || !user || !organizationId) {
    return false;
  }

  // SECURITY: Check if node type is in registry
  if (!nodeRegistry[nodeType]) {
    logger.warn('Attempted execution of unregistered node type', {
      nodeType,
      userId: user.id,
      organizationId,
    });
    return false;
  }

  const securityLevel = NODE_SECURITY_LEVELS[nodeType] || 'ADMIN_ONLY'; // Default to most restrictive

  switch (securityLevel) {
    case 'UNRESTRICTED':
      return true; // All authenticated users can execute

    case 'RESTRICTED':
      // SECURITY: Check for WORKFLOW_EXECUTE permission
      const {
        hasWorkflowPermission,
        WORKFLOW_PERMISSIONS,
      } = require('../../middleware/workflowAuthorization');
      return await hasWorkflowPermission(user, WORKFLOW_PERMISSIONS.EXECUTE, organizationId);

    case 'ADMIN_ONLY':
      // SECURITY: Require admin privileges for dangerous nodes
      if (user.isSuperAdmin || user.role === 'SUPER_ADMIN') {
        return true;
      }
      if (
        (user.isAdmin || user.role === 'ORGANIZATION_ADMIN') &&
        user.organizationId === organizationId
      ) {
        return true;
      }
      return false;

    default:
      logger.warn('Unknown node security level', {
        nodeType,
        securityLevel,
        userId: user.id,
        organizationId,
      });
      return false; // Fail secure
  }
};

const executeWorkflow = async (workflow, context = {}, user = null, organizationId = null) => {
  logger.info(`Starting workflow execution for: ${workflow.name}`);

  // SECURITY: Validate authorization for workflow execution
  if (!user) {
    throw new Error('Authentication required for workflow execution');
  }

  if (!organizationId) {
    throw new Error('Organization context required for workflow execution');
  }

  // SECURITY: Validate workflow belongs to the correct tenant
  if (workflow.organizationId && workflow.organizationId !== organizationId) {
    logger.warn('Cross-tenant workflow execution attempt blocked', {
      workflowId: workflow._id || workflow.id,
      requestedOrg: organizationId,
      workflowOrg: workflow.organizationId,
      userId: user.id,
    });

    // SECURITY: Audit cross-tenant access attempt
    await auditLog(
      'WORKFLOW_CROSS_TENANT_ACCESS_BLOCKED',
      {
        workflowId: workflow._id || workflow.id,
        requestedOrganizationId: organizationId,
        workflowOrganizationId: workflow.organizationId,
        severity: 'HIGH',
        success: false,
      },
      user,
      organizationId
    );

    throw new Error('Access denied - workflow not found in your organization');
  }

  // SECURITY: Validate and sanitize execution context
  if (!validateWorkflowContext(context, user, organizationId)) {
    throw new Error('Invalid workflow execution context - security validation failed');
  }

  const sanitizedContext = sanitizeWorkflowContext(context);
  logger.info('Workflow execution authorized', {
    workflowId: workflow._id || workflow.id,
    userId: user.id,
    organizationId,
  });

  // SECURITY: Audit workflow execution start
  await auditLog(
    'WORKFLOW_EXECUTION_STARTED',
    {
      workflowId: workflow._id || workflow.id,
      workflowName: workflow.name,
      severity: 'INFO',
      triggerSize: JSON.stringify(sanitizedContext).length,
      nodeCount: workflow.nodes?.length || 0,
    },
    user,
    organizationId
  );

  const { nodes, edges } = workflow;

  // SECURITY: Use tenant-aware Prisma operations for WorkflowExecution
  let run = null;
  await prismaService.withTenantContext(organizationId, async tx => {
    run = await tx.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        status: 'RUNNING',
        logs: {
          trigger: sanitizedContext, // Use sanitized context
          steps: {},
          metadata: {
            organizationId: organizationId,
            createdBy: user.id,
            startedAt: new Date().toISOString(),
          },
        },
      },
    });
  });

  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const executionContext = {
    // The initial data from the trigger (e.g., webhook body) - sanitized
    trigger: sanitizedContext,
    // SECURITY: Add user and organization context
    user: {
      id: user.id,
      organizationId: organizationId,
    },
  };
  // This object will track the state of the run
  const runState = {};

  // Find the starting node (a node with no incoming edges)
  // This is a simplified approach; a real engine might handle multiple start nodes.
  const startNode = nodes.find(node => !edges.some(edge => edge.target === node.id));

  if (!startNode) {
    logger.error('Workflow has no start node.');

    // SECURITY: Update WorkflowExecution status with tenant context
    await prismaService.withTenantContext(organizationId, async tx => {
      await tx.workflowExecution.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: 'Workflow has no start node.',
          logs: {
            ...run.logs,
            steps: {
              system: { status: 'failed', error: 'Workflow has no start node.' },
            },
          },
        },
      });
    });

    return { system: { status: 'failed', error: 'Workflow has no start node.' } };
  }

  await executeNode(startNode, nodeMap, edges, executionContext, run, organizationId);

  // SECURITY: Get final execution status with tenant context
  let finalExecution = null;
  await prismaService.withTenantContext(organizationId, async tx => {
    finalExecution = await tx.workflowExecution.findUnique({
      where: { id: run.id },
    });
  });

  // Check if any step failed and update final status
  const steps = finalExecution.logs?.steps || {};
  const hasFailedStep = Object.values(steps).some(step => step.status === 'failed');
  const finalStatus = hasFailedStep ? 'FAILED' : 'SUCCESS';

  // SECURITY: Update final execution status with tenant context
  await prismaService.withTenantContext(organizationId, async tx => {
    await tx.workflowExecution.update({
      where: { id: run.id },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
    });
  });

  logger.info(`Workflow execution finished for: ${workflow.name} with status: ${finalStatus}`);

  // SECURITY: Audit workflow execution completion
  await auditLog(
    'WORKFLOW_EXECUTION_COMPLETED',
    {
      workflowId: workflow._id || workflow.id,
      workflowRunId: run.id,
      workflowName: workflow.name,
      finalStatus: finalStatus,
      nodeCount: Object.keys(steps).length,
      severity: finalStatus === 'FAILED' ? 'MEDIUM' : 'INFO',
      success: finalStatus === 'SUCCESS',
    },
    user,
    organizationId
  );

  return steps;
};

const executeNode = async (node, nodeMap, edges, context, run, organizationId) => {
  logger.info(`Executing node: ${node.data.label} (Type: ${node.data.nodeType})`);

  // SECURITY: Update node status in WorkflowExecution with tenant context
  await prismaService.withTenantContext(organizationId, async tx => {
    const currentExecution = await tx.workflowExecution.findUnique({
      where: { id: run.id },
    });

    const updatedSteps = {
      ...currentExecution.logs?.steps,
      [node.id]: { status: 'running' },
    };

    await tx.workflowExecution.update({
      where: { id: run.id },
      data: {
        logs: {
          ...currentExecution.logs,
          steps: updatedSteps,
        },
      },
    });
  });

  // SECURITY: Validate node type is allowed for execution
  if (!isNodeTypeAuthorized(node.data.nodeType, context.user, organizationId)) {
    logger.error('Unauthorized node type execution attempt blocked', {
      nodeId: node.id,
      nodeType: node.data.nodeType,
      userId: context.user?.id,
      organizationId,
    });

    // SECURITY: Audit unauthorized node execution attempt
    await auditLog(
      'WORKFLOW_UNAUTHORIZED_NODE_EXECUTION_BLOCKED',
      {
        workflowId: run.workflowId,
        workflowRunId: run.id,
        nodeId: node.id,
        nodeType: node.data.nodeType,
        nodeLabel: node.data.label,
        severity: 'HIGH',
        success: false,
      },
      context.user,
      organizationId
    );

    // SECURITY: Update node failure status with tenant context
    await prismaService.withTenantContext(organizationId, async tx => {
      const currentExecution = await tx.workflowExecution.findUnique({
        where: { id: run.id },
      });

      const updatedSteps = {
        ...currentExecution.logs?.steps,
        [node.id]: {
          status: 'failed',
          error: 'Unauthorized node type execution blocked',
        },
      };

      await tx.workflowExecution.update({
        where: { id: run.id },
        data: {
          logs: {
            ...currentExecution.logs,
            steps: updatedSteps,
          },
        },
      });
    });
    return;
  }

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

      // SECURITY: Update node failure status with tenant context
      await prismaService.withTenantContext(organizationId, async tx => {
        const currentExecution = await tx.workflowExecution.findUnique({
          where: { id: run.id },
        });

        const updatedSteps = {
          ...currentExecution.logs?.steps,
          [node.id]: {
            status: 'failed',
            error: `Security validation failed: ${contextError.message}`,
          },
        };

        await tx.workflowExecution.update({
          where: { id: run.id },
          data: {
            logs: {
              ...currentExecution.logs,
              steps: updatedSteps,
            },
          },
        });
      });
      return;
    }

    // SECURITY: Additional context validation for workflow security
    if (!validateWorkflowContext(context, context.user || {}, context.user?.organizationId)) {
      logger.error('Workflow context security validation failed', {
        nodeId: node.id,
        nodeType: node.data.nodeType,
        userId: context.user?.id,
        organizationId: context.user?.organizationId,
      });

      // SECURITY: Update node failure status with tenant context
      await prismaService.withTenantContext(organizationId, async tx => {
        const currentExecution = await tx.workflowExecution.findUnique({
          where: { id: run.id },
        });

        const updatedSteps = {
          ...currentExecution.logs?.steps,
          [node.id]: {
            status: 'failed',
            error: 'Workflow context security validation failed',
          },
        };

        await tx.workflowExecution.update({
          where: { id: run.id },
          data: {
            logs: {
              ...currentExecution.logs,
              steps: updatedSteps,
            },
          },
        });
      });
      return;
    }

    // Use secure interpolation to prevent injection attacks
    const interpolatedConfig = interpolateSecure(node.data, context);

    // SECURITY: Sanitize interpolated config to prevent injection
    const sanitizedConfig = sanitizeWorkflowContext(interpolatedConfig);

    // Enhanced context with workflow metadata for logging - sanitized
    const enhancedContext = sanitizeWorkflowContext({
      ...context,
      run,
      currentNodeId: node.id,
      workflowContext: {
        workflowId: run.workflowId,
        workflowRunId: run._id,
        nodeType: node.data.nodeType,
        nodeId: node.id,
        nodeLabel: node.data.label,
        // SECURITY: Add security context
        userId: context.user?.id,
        organizationId: context.user?.organizationId,
      },
    });

    // SECURITY: Log node execution for audit trail
    logger.info('Node execution starting', {
      nodeId: node.id,
      nodeType: node.data.nodeType,
      workflowId: run.workflowId,
      userId: context.user?.id,
      organizationId: context.user?.organizationId,
    });

    // SECURITY: Audit node execution start
    await auditLog(
      'WORKFLOW_NODE_EXECUTION_STARTED',
      {
        workflowId: run.workflowId,
        workflowRunId: run.id,
        nodeId: node.id,
        nodeType: node.data.nodeType,
        nodeLabel: node.data.label,
        severity: 'INFO',
      },
      context.user,
      organizationId
    );

    result = await executor.execute(sanitizedConfig, enhancedContext);
  } else if (typeof node.data.nodeType === 'string' && node.data.nodeType.startsWith('trigger:')) {
    // All trigger nodes pass the trigger context through
    result = context.trigger;
  } else {
    logger.warn(`No executor found for node type: ${node.data.nodeType}`);
  }

  // SECURITY: Update successful node completion with tenant context
  await prismaService.withTenantContext(organizationId, async tx => {
    const currentExecution = await tx.workflowExecution.findUnique({
      where: { id: run.id },
    });

    const updatedSteps = {
      ...currentExecution.logs?.steps,
      [node.id]: { status: 'succeeded', result },
    };

    await tx.workflowExecution.update({
      where: { id: run.id },
      data: {
        logs: {
          ...currentExecution.logs,
          steps: updatedSteps,
        },
      },
    });
  });

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

    await executeNode(nextNode, nodeMap, edges, context, run, organizationId);
  } else {
    // This is a simple node with a single output path
    const nextEdge = edges.find(edge => edge.source === node.id);
    if (nextEdge) {
      const nextNode = nodeMap.get(nextEdge.target);
      if (nextNode) {
        await executeNode(nextNode, nodeMap, edges, context, run, organizationId);
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
  resumeApproval: async (workflowId, runId, decision, user = null, organizationId = null) => {
    // SECURITY: Validate authorization for resume approval
    if (!user) {
      throw new Error('Authentication required for approval resumption');
    }

    if (!organizationId) {
      throw new Error('Organization context required for approval resumption');
    }

    // SECURITY: Validate decision parameter
    if (!decision || !['approve', 'reject'].includes(decision)) {
      throw new Error('Invalid decision parameter - must be "approve" or "reject"');
    }

    // SECURITY: Validate ID formats
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workflowId) &&
      !/^[0-9a-fA-F]{24}$/.test(workflowId)
    ) {
      throw new Error('Invalid workflow ID format');
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId) &&
      !/^[0-9a-fA-F]{24}$/.test(runId)
    ) {
      throw new Error('Invalid workflow run ID format');
    }

    // Load models here to avoid circular imports at top
    const { Workflow } = require('../../models/workflowModels');

    // SECURITY: Use tenant-aware Prisma operations for workflow loading
    let workflow = null;
    await prismaService.withTenantContext(organizationId, async tx => {
      // Try Prisma workflow first
      try {
        workflow = await tx.workflow.findFirst({
          where: {
            id: workflowId,
            organizationId: organizationId, // Ensure tenant isolation
          },
        });
      } catch (prismaError) {
        // During migration, some workflows may still be in MongoDB
        logger.debug('Workflow not found in Prisma, checking MongoDB', { workflowId });
      }
    });

    // Fallback to MongoDB during migration period (TEMPORARY)
    if (!workflow) {
      workflow = await Workflow.findById(workflowId);
      // SECURITY: Validate workflow belongs to user's organization
      if (workflow && workflow.organizationId && workflow.organizationId !== organizationId) {
        logger.warn('Cross-tenant workflow approval attempt blocked', {
          workflowId,
          requestedOrg: organizationId,
          workflowOrg: workflow.organizationId,
          userId: user.id,
        });
        throw new Error('Access denied - workflow not found in your organization');
      }
    }

    if (!workflow) throw new Error('Workflow not found');

    // SECURITY: Use tenant-aware Prisma operations for WorkflowExecution loading
    let run = null;
    await prismaService.withTenantContext(organizationId, async tx => {
      run = await tx.workflowExecution.findFirst({
        where: {
          id: runId,
          workflow: {
            organizationId: organizationId, // Ensure tenant isolation through relationship
          },
        },
      });
    });

    if (!run) throw new Error('Workflow run not found');

    // Build node/edge maps
    const { nodes, edges } = workflow;
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // SECURITY: Reconstruct context using stored step results - with sanitization
    const context = {
      trigger: sanitizeWorkflowContext(run.logs?.trigger || {}),
      // SECURITY: Add user and organization context
      user: {
        id: user.id,
        organizationId: organizationId,
      },
    };

    // SECURITY: Reconstruct context from Prisma logs.steps
    const steps = run.logs?.steps || {};
    for (const [nodeId, stepData] of Object.entries(steps)) {
      if (stepData && stepData.result !== undefined) {
        // SECURITY: Sanitize step results before adding to context
        context[nodeId] = sanitizeWorkflowContext(stepData.result);
      }
    }

    // SECURITY: Validate reconstructed context
    if (!validateWorkflowContext(context, user, organizationId)) {
      throw new Error('Invalid workflow context during approval resumption');
    }

    // Find the approval node awaiting decision
    let pendingNodeId = null;
    // Reuse the steps variable declared above
    for (const [nodeId, stepData] of Object.entries(steps)) {
      if (!pendingNodeId && stepData && stepData.result && stepData.result.status === 'pending') {
        pendingNodeId = nodeId;
        break;
      }
    }

    if (!pendingNodeId) throw new Error('No pending approval node found to resume');
    const approvalNode = nodeMap.get(pendingNodeId);
    if (!approvalNode) throw new Error('Pending approval node not found in workflow');

    // Compute next node based on decision
    const nextPath = decision === 'approve' ? 'approve' : 'reject';
    const nextNode = getNextNodeFromPath(approvalNode, nextPath, nodeMap, edges);
    if (!nextNode) throw new Error(`No next node connected for decision path '${nextPath}'`);

    // SECURITY: Update run status back to running with tenant context
    await prismaService.withTenantContext(organizationId, async tx => {
      await tx.workflowExecution.update({
        where: { id: run.id },
        data: {
          status: 'RUNNING',
        },
      });
    });

    // Continue execution
    await executeNode(nextNode, nodeMap, edges, context, run, organizationId);

    // SECURITY: Get final execution status with tenant context
    let finalExecution = null;
    await prismaService.withTenantContext(organizationId, async tx => {
      finalExecution = await tx.workflowExecution.findUnique({
        where: { id: run.id },
      });
    });

    // Finalize status
    const finalSteps = finalExecution.logs?.steps || {};
    const hasFailedStep = Object.values(finalSteps).some(step => step.status === 'failed');
    const finalStatus = hasFailedStep ? 'FAILED' : 'SUCCESS';

    // SECURITY: Update final execution status with tenant context
    await prismaService.withTenantContext(organizationId, async tx => {
      await tx.workflowExecution.update({
        where: { id: run.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
        },
      });
    });

    // SECURITY: Audit approval resumption completion
    await auditLog(
      'WORKFLOW_APPROVAL_RESUMED',
      {
        workflowId: workflowId,
        workflowRunId: runId,
        decision: decision,
        pendingNodeId: pendingNodeId,
        finalStatus: finalStatus,
        severity: 'INFO',
        success: true,
      },
      user,
      organizationId
    );

    return { success: true, status: finalStatus };
  },
};
