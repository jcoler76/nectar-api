const axios = require('axios');
const { interpolateSecure, SECURITY_CONTEXTS } = require('../interpolationSecure');
const { logger } = require('../../../utils/logger');
const PromptSecurityService = require('../../promptSecurityService');

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

  // Apply AI security validation
  const promptSecurity = new PromptSecurityService();
  const securityAnalysis = promptSecurity.analyzePrompt(interpolatedPrompt, 'WORKFLOW');

  if (!securityAnalysis.isSecure) {
    const highSeverityThreats = securityAnalysis.threats.filter(
      t => t.severity === 'CRITICAL' || t.severity === 'HIGH'
    );

    if (highSeverityThreats.length > 0) {
      logger.warn(`OpenAI Node "${label}" blocked due to security threats:`, {
        workflowId: context.workflowContext?.workflowId,
        nodeId: context.workflowContext?.nodeId,
        threats: highSeverityThreats.map(t => ({ category: t.category, severity: t.severity })),
      });

      return {
        status: 'error',
        message: 'Prompt blocked by security filters',
        securityDetails: {
          threatsDetected: highSeverityThreats.length,
          categories: [...new Set(highSeverityThreats.map(t => t.category))],
        },
      };
    }

    // Use sanitized prompt for medium/low threats
    interpolatedPrompt = securityAnalysis.sanitizedPrompt;
    logger.info(`OpenAI Node "${label}" using sanitized prompt due to security concerns`);
  }

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

    // Validate AI response for security issues
    const responseValidation = promptSecurity.validateResponse(result, interpolatedPrompt);
    let finalResult = result;

    if (!responseValidation.isSecure) {
      logger.warn(`OpenAI Node "${label}" response sanitized due to security issues:`, {
        workflowId: context.workflowContext?.workflowId,
        nodeId: context.workflowContext?.nodeId,
        issues: responseValidation.issues.map(i => ({
          category: i.category,
          severity: i.severity,
        })),
      });
      finalResult = responseValidation.sanitizedResponse;
    }

    logger.info(`OpenAI Node "${label}" successful.`);

    return {
      status: 'success',
      data: {
        fullResponse: response.data,
        messageContent: finalResult,
        securityValidation: {
          promptSecure: securityAnalysis.isSecure,
          responseSecure: responseValidation.isSecure,
          threats: securityAnalysis.threats.length,
          responseIssues: responseValidation.issues.length,
        },
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
