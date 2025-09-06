/**
 * Workflow Context Middleware
 * Sets workflow execution context on requests made from within workflow nodes
 */

/**
 * Creates middleware that sets workflow context on requests
 * @param {string} workflowId - The workflow ID
 * @param {string} workflowRunId - The workflow run ID
 * @param {string} nodeType - The type of node making the request
 * @param {string} nodeId - The specific node ID
 * @returns {Function} Express middleware function
 */
function createWorkflowContextMiddleware(workflowId, workflowRunId, nodeType, nodeId) {
  return (req, res, next) => {
    // Set workflow context for activity logging
    req.workflowId = workflowId;
    req.workflowRunId = workflowRunId;
    req.nodeType = nodeType;
    req.nodeId = nodeId;

    // Set workflow correlation header for tracing
    req.headers['x-workflow-correlation-id'] = `${workflowId}:${workflowRunId}:${nodeId}`;

    next();
  };
}

/**
 * Sets workflow context directly on a request object (for use in workflow nodes)
 * @param {Object} req - Express request object
 * @param {string} workflowId - The workflow ID
 * @param {string} workflowRunId - The workflow run ID
 * @param {string} nodeType - The type of node making the request
 * @param {string} nodeId - The specific node ID
 */
function setWorkflowContext(req, workflowId, workflowRunId, nodeType, nodeId) {
  req.workflowId = workflowId;
  req.workflowRunId = workflowRunId;
  req.nodeType = nodeType;
  req.nodeId = nodeId;

  // Set correlation header for tracing
  if (!req.headers) req.headers = {};
  req.headers['x-workflow-correlation-id'] = `${workflowId}:${workflowRunId}:${nodeId}`;
}

/**
 * Creates an enhanced request object for workflow node HTTP requests
 * Includes workflow context and proper headers
 * @param {Object} baseOptions - Base HTTP request options
 * @param {string} workflowId - The workflow ID
 * @param {string} workflowRunId - The workflow run ID
 * @param {string} nodeType - The type of node making the request
 * @param {string} nodeId - The specific node ID
 * @returns {Object} Enhanced request options with workflow context
 */
function createWorkflowRequest(baseOptions = {}, workflowId, workflowRunId, nodeType, nodeId) {
  const headers = {
    ...baseOptions.headers,
    'x-workflow-id': workflowId,
    'x-workflow-run-id': workflowRunId,
    'x-workflow-node-type': nodeType,
    'x-workflow-node-id': nodeId,
    'x-workflow-correlation-id': `${workflowId}:${workflowRunId}:${nodeId}`,
    'user-agent': `Mirabel-Workflow/${nodeType} (Workflow: ${workflowId})`,
  };

  return {
    ...baseOptions,
    headers,
    // Add metadata for internal tracking
    _workflowContext: {
      workflowId,
      workflowRunId,
      nodeType,
      nodeId,
    },
  };
}

module.exports = {
  createWorkflowContextMiddleware,
  setWorkflowContext,
  createWorkflowRequest,
};
