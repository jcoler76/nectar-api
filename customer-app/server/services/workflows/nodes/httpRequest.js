const axios = require('axios');
const { logger } = require('../../../utils/logger');
const { createWorkflowRequest } = require('../../../middleware/workflowContext');
const { validateWorkflowUrl } = require('../../../middleware/ssrfProtection');

const execute = async (config, context) => {
  const { label, method, url, headers, body } = config;
  logger.info(`Executing HTTP Request Node: "${label}"`);

  if (!url) {
    logger.error('HTTP Request node is missing URL.');
    return { status: 'error', message: 'URL is not defined.' };
  }

  // SSRF Protection: Validate URL before making request
  const urlValidation = validateWorkflowUrl(url, {
    workflowId: context.workflowContext?.workflowId,
    nodeId: context.workflowContext?.nodeId,
    nodeLabel: label,
  });

  if (!urlValidation.isValid) {
    logger.error(`HTTP Request node "${label}" blocked by SSRF protection:`, urlValidation.error);
    return {
      status: 'error',
      message: `Request blocked for security: ${urlValidation.error}`,
    };
  }

  // Use sanitized URL
  const sanitizedUrl = urlValidation.sanitizedUrl;

  // Convert headers array from [{key, value}] to a headers object {key: value}
  const requestHeaders = (headers || []).reduce((acc, header) => {
    if (header.key) {
      acc[header.key] = header.value;
    }
    return acc;
  }, {});

  let requestBody = null;
  let hasBody = false;

  // Only process body if it's not empty/null/undefined and not just whitespace
  if (body && body.toString().trim()) {
    hasBody = true;
    try {
      // The body is a string from the config, so it needs to be parsed.
      // It might already be an object if interpolation resulted in one.
      requestBody = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (error) {
      logger.error('Invalid JSON in request body for node:', label);
      return { status: 'error', message: `Invalid JSON in body: ${error.message}` };
    }
  }

  // Only set Content-Type to application/json if we're actually sending a body
  if (hasBody && !requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  try {
    // Add workflow context to request headers for enhanced logging
    let enhancedHeaders = { ...requestHeaders };
    if (context.workflowContext) {
      const { workflowId, workflowRunId, nodeType, nodeId } = context.workflowContext;
      enhancedHeaders = {
        ...enhancedHeaders,
        'x-workflow-id': workflowId,
        'x-workflow-run-id': workflowRunId,
        'x-workflow-node-type': nodeType,
        'x-workflow-node-id': nodeId,
        'x-workflow-correlation-id': `${workflowId}:${workflowRunId}:${nodeId}`,
        'user-agent':
          enhancedHeaders['user-agent'] || `Mirabel-Workflow/${nodeType} (Node: ${label})`,
      };
    }

    const response = await axios({
      method,
      url: sanitizedUrl, // Use SSRF-validated and sanitized URL
      headers: enhancedHeaders,
      data: requestBody,
      timeout: 10000, // 10 second timeout
      maxRedirects: 3, // Limit redirects to prevent redirect attacks
    });

    logger.info(`HTTP Request "${label}" successful with status: ${response.status}`);
    return {
      status: 'success',
      data: response.data,
      statusCode: response.status,
      headers: response.headers,
    };
  } catch (error) {
    logger.error(`HTTP Request "${label}" failed:`, error.message);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return {
        status: 'error',
        message: `Request failed with status ${error.response.status}`,
        statusCode: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      };
    } else if (error.request) {
      // The request was made but no response was received
      return {
        status: 'error',
        message: 'No response received from the server.',
      };
    } else {
      // Something happened in setting up the request that triggered an Error
      return {
        status: 'error',
        message: `Error setting up request: ${error.message}`,
      };
    }
  }
};

module.exports = {
  execute,
};
