const axios = require('axios');
const { interpolateSecure, SECURITY_CONTEXTS } = require('../interpolationSecure');
const { logger } = require('../../../utils/logger');

// Ensure you have OPENAI_API_KEY in your environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const execute = async (config, context) => {
  const { label, prompt, model = 'gpt-3.5-turbo', maxTokens = 150 } = config;
  logger.info(`Executing OpenAI Node: "${label}"`);

  if (!OPENAI_API_KEY) {
    logger.error('OpenAI API key is not set.');
    return { status: 'error', message: 'OPENAI_API_KEY is not configured on the server.' };
  }

  if (!prompt) {
    return { status: 'error', message: 'Prompt is not defined.' };
  }

  // Interpolate the prompt with data from the context using secure interpolation
  const interpolatedPrompt = interpolateSecure(prompt, context, SECURITY_CONTEXTS.GENERAL);

  const requestBody = {
    model,
    messages: [{ role: 'user', content: interpolatedPrompt }],
    temperature: 0.7,
  };

  try {
    // Prepare request headers with workflow context
    const headers = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // Add workflow context to headers for enhanced logging
    if (context.workflowContext) {
      const { workflowId, workflowRunId, nodeType, nodeId } = context.workflowContext;
      headers['x-workflow-id'] = workflowId;
      headers['x-workflow-run-id'] = workflowRunId;
      headers['x-workflow-node-type'] = nodeType;
      headers['x-workflow-node-id'] = nodeId;
      headers['x-workflow-correlation-id'] = `${workflowId}:${workflowRunId}:${nodeId}`;
      headers['user-agent'] = `NectarStudio-Workflow/${nodeType} (Node: ${label})`;
    }

    const response = await axios.post(OPENAI_API_URL, requestBody, {
      headers,
      timeout: 30000, // 30 second timeout for AI responses
    });

    const result = response.data.choices[0].message.content.trim();
    logger.info(`OpenAI Node "${label}" successful.`);

    return {
      status: 'success',
      data: {
        fullResponse: response.data,
        messageContent: result,
      },
    };
  } catch (error) {
    logger.error(`OpenAI Node "${label}" failed:`, error.message);
    if (error.response) {
      return {
        status: 'error',
        message: `OpenAI API request failed with status ${error.response.status}`,
        details: error.response.data,
      };
    } else {
      return {
        status: 'error',
        message: `Error setting up request to OpenAI: ${error.message}`,
      };
    }
  }
};

module.exports = {
  execute,
};
