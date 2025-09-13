const axios = require('axios');
const { interpolateSecure } = require('../interpolationSecure');
const { get } = require('../../../utils/objectUtils');
const { logger } = require('../../../utils/logger');

const execute = async (config, context, node) => {
  const { apiCalls = [] } = config;
  logger.info(`Executing API Sequence Node: "${config.label}"`);

  if (!Array.isArray(apiCalls) || apiCalls.length === 0) {
    return { status: 'error', message: 'No APIs to call in sequence.' };
  }

  const localContext = { ...context };

  for (const apiCall of apiCalls) {
    const { name, method, url, headers, body, responseMapping, executeOnce } = apiCall;

    // Simple check for executeOnce. This relies on the run state having a memory.
    // The node's run state could be stored in the main execution context.
    if (executeOnce && get(localContext, `runState.${node.id}.${name}.executed`)) {
      logger.info(`Skipping already executed call (executeOnce): "${name}"`);
      continue;
    }

    logger.info(`Executing API call: "${name}"`);

    try {
      // Interpolate everything before making the call using secure interpolation
      const interpolatedUrl = interpolateSecure(url, localContext);
      const interpolatedHeaders = interpolateSecure(headers, localContext);
      const interpolatedBody = interpolateSecure(body, localContext);

      // Convert headers from array to object
      const requestHeaders = (interpolatedHeaders || []).reduce((acc, header) => {
        if (header.key) acc[header.key] = header.value;
        return acc;
      }, {});

      const response = await axios({
        method,
        url: interpolatedUrl,
        headers: requestHeaders,
        data: interpolatedBody,
        timeout: 15000, // 15 second timeout
      });

      logger.info(`API call "${name}" successful with status: ${response.status}`);

      // Map response to localContext for subsequent calls
      if (Array.isArray(responseMapping)) {
        for (const mapping of responseMapping) {
          if (mapping.key && mapping.value) {
            const value = get(response.data, mapping.value);
            if (value !== undefined) {
              localContext[mapping.key] = value;
            }
          }
        }
      }

      // Store this call's full result in a namespaced object in the context
      const stepResult = {
        status: 'success',
        data: response.data,
        statusCode: response.status,
        headers: response.headers,
      };

      // This structure helps avoid polluting the main context
      if (!localContext.results) localContext.results = {};
      localContext.results[name] = stepResult;

      if (executeOnce) {
        if (!get(localContext, `runState.${node.id}.${name}`)) {
          if (!localContext.runState) localContext.runState = {};
          if (!localContext.runState[node.id]) localContext.runState[node.id] = {};
          if (!localContext.runState[node.id][name]) localContext.runState[node.id][name] = {};
        }
        localContext.runState[node.id][name].executed = true;
      }
    } catch (error) {
      logger.error(`API call "${name}" in sequence "${config.label}" failed:`, error.message);
      const errorResult = {
        status: 'error',
        message: `API call "${name}" failed: ${error.message}`,
      };
      if (error.response) {
        errorResult.statusCode = error.response.status;
        errorResult.data = error.response.data;
        errorResult.headers = error.response.headers;
      }
      // If one call fails, the whole sequence fails
      return errorResult;
    }
  }

  // Return the results of the last successful call, or a summary
  const finalResult = {
    status: 'success',
    message: 'API sequence completed successfully.',
    // Expose the results of all sub-calls for subsequent workflow nodes
    ...localContext.results,
  };

  return finalResult;
};

module.exports = {
  execute,
};
