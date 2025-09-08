const { logger } = require('../../../utils/logger');
const { requireApiKey } = require('../../../utils/jiraWebhookAuth');
const JiraAutomation = require('../../../models/JiraAutomation');
const jiraService = require('../../jiraService');
const axios = require('axios');

/**
 * Dynamic Jira Automation Node
 * Allows configuring automations directly in the workflow without database setup
 */
const executeJiraDynamicAutomation = async (config, context) => {
  const {
    label,
    mode = 'config', // 'config' for inline config, 'database' for DB lookup, 'manual' for specific ticket

    // For database mode
    automationId,
    automationName,

    // For config mode - inline automation configuration
    ticketKeys = [],
    summaryPattern,
    projectKeys = [],
    validStatuses = ['Open', 'To Do', 'In Progress', 'Reopened'],

    // Action configuration
    actionType = 'api', // 'api', 'stored_procedure', 'custom_code'

    // API action
    apiUrl,
    apiMethod = 'GET',
    apiHeaders = {},
    apiBody,

    // Stored procedure action
    procedureName,
    procedureDatabase = 'icoler',
    procedureParameters = {},

    // Custom code action
    customCode,

    // Response configuration
    successTransition = 'Done',
    addLabels = [],
    successMessage = '✅ Automation completed successfully',
    failureMessage = '❌ Automation failed',

    // For manual mode
    specificTicketKey,

    // Options
    skipJiraUpdate = false,
    timeout = 30000,
  } = config;

  logger.info(`Executing Dynamic Jira Automation Node: ${label}`);

  try {
    let automationConfig;
    let ticketsToProcess = [];

    if (mode === 'database') {
      // Load automation from database
      if (automationId) {
        automationConfig = await JiraAutomation.findById(automationId);
      } else if (automationName) {
        automationConfig = await JiraAutomation.findOne({ name: automationName });
      } else {
        throw new Error('Database mode requires automationId or automationName');
      }

      if (!automationConfig) {
        throw new Error('Automation configuration not found in database');
      }

      if (!automationConfig.enabled) {
        logger.info(`Automation "${automationConfig.name}" is disabled`);
        return {
          status: 'skipped',
          reason: 'Automation is disabled',
        };
      }
    } else if (mode === 'config') {
      // Use inline configuration from workflow node
      automationConfig = {
        name: label,
        jiraConfig: {
          ticketKeys,
          summaryPattern,
          projectKeys,
          validStatuses,
          successTransition,
          addLabels,
        },
        action: {
          type: actionType,
        },
        responseConfig: {
          successMessage,
          failureMessage,
        },
      };

      // Set up action details based on type
      if (actionType === 'api') {
        if (!apiUrl) throw new Error('API URL is required for API action type');
        automationConfig.action.api = {
          url: apiUrl,
          method: apiMethod,
          headers: apiHeaders,
          body: apiBody,
          timeout,
        };
      } else if (actionType === 'stored_procedure') {
        if (!procedureName)
          throw new Error('Procedure name is required for stored procedure action type');
        automationConfig.action.storedProcedure = {
          name: procedureName,
          database: procedureDatabase,
          parameters: procedureParameters,
        };
      } else if (actionType === 'custom_code') {
        if (!customCode) throw new Error('Custom code is required for custom code action type');
        automationConfig.action.customCode = {
          code: customCode,
          timeout,
        };
      }
    } else if (mode === 'manual') {
      // Process specific ticket
      if (!specificTicketKey) {
        throw new Error('Manual mode requires specificTicketKey');
      }
      ticketsToProcess = [specificTicketKey];

      // Use inline config for the action
      automationConfig = {
        name: label,
        jiraConfig: {
          successTransition,
          addLabels,
        },
        action: {
          type: actionType,
        },
        responseConfig: {
          successMessage,
          failureMessage,
        },
      };

      // Set up action details (same as config mode)
      if (actionType === 'api' && apiUrl) {
        automationConfig.action.api = {
          url: apiUrl,
          method: apiMethod,
          headers: apiHeaders,
          body: apiBody,
          timeout,
        };
      } else if (actionType === 'stored_procedure' && procedureName) {
        automationConfig.action.storedProcedure = {
          name: procedureName,
          database: procedureDatabase,
          parameters: procedureParameters,
        };
      } else if (actionType === 'custom_code' && customCode) {
        automationConfig.action.customCode = {
          code: customCode,
          timeout,
        };
      }
    }

    // Find tickets to process if not in manual mode
    if (mode !== 'manual') {
      // Check if triggered by webhook
      if (context.trigger?.issue) {
        const issue = context.trigger.issue;
        if (matchesConfig(issue, automationConfig.jiraConfig)) {
          ticketsToProcess = [issue.key];
        }
      } else {
        // Find matching tickets from Jira
        ticketsToProcess = await findMatchingTickets(automationConfig.jiraConfig);
      }
    }

    if (ticketsToProcess.length === 0) {
      logger.info('No tickets to process');
      return {
        status: 'success',
        message: 'No matching tickets found',
        checkedAt: new Date().toISOString(),
      };
    }

    // Process tickets
    const results = [];
    for (const ticketKey of ticketsToProcess) {
      try {
        logger.info(`Processing ticket ${ticketKey}`);

        // Get ticket details
        const issue = await jiraService.getIssue(ticketKey);

        // Execute action
        const actionResult = await executeAction(automationConfig.action, issue);

        // Update Jira if not skipped
        if (!skipJiraUpdate) {
          await updateJiraTicket(ticketKey, automationConfig, actionResult);
        }

        results.push({
          ticketKey,
          success: actionResult.success,
          message: actionResult.message,
          data: actionResult.data,
        });
      } catch (error) {
        logger.error(`Failed to process ${ticketKey}:`, error);
        results.push({
          ticketKey,
          success: false,
          error: error.message,
        });
      }
    }

    // Return results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      status: failureCount === 0 ? 'success' : 'partial',
      processed: results.length,
      succeeded: successCount,
      failed: failureCount,
      results,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Dynamic Jira Automation node failed:', error);
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Check if issue matches configuration
function matchesConfig(issue, config) {
  // Check ticket keys
  if (config.ticketKeys?.length > 0) {
    if (config.ticketKeys.includes(issue.key)) {
      return true;
    }
  }

  // Check project keys
  if (config.projectKeys?.length > 0) {
    const projectKey = issue.key.split('-')[0];
    if (!config.projectKeys.includes(projectKey)) {
      return false;
    }
  }

  // Check summary pattern
  if (config.summaryPattern) {
    const pattern = new RegExp(config.summaryPattern, 'i');
    if (!pattern.test(issue.fields?.summary || '')) {
      return false;
    }
  }

  // Check status
  if (config.validStatuses?.length > 0) {
    const status = issue.fields?.status?.name;
    if (!config.validStatuses.includes(status)) {
      return false;
    }
  }

  return true;
}

// Find matching tickets from Jira
async function findMatchingTickets(config) {
  const jqlParts = [];

  // Build JQL query from configuration
  if (config.ticketKeys?.length > 0) {
    jqlParts.push(`key in (${config.ticketKeys.join(',')})`);
  }

  if (config.projectKeys?.length > 0) {
    jqlParts.push(`project in (${config.projectKeys.join(',')})`);
  }

  if (config.summaryPattern) {
    jqlParts.push(`summary ~ "${config.summaryPattern}"`);
  }

  if (config.validStatuses?.length > 0) {
    jqlParts.push(`status in (${config.validStatuses.map(s => `"${s}"`).join(',')})`);
  }

  if (jqlParts.length === 0) {
    return [];
  }

  const jql = jqlParts.join(' AND ');
  const issues = await jiraService.searchIssues(jql);

  return issues.map(issue => issue.key);
}

// Execute the configured action
async function executeAction(actionConfig, issue) {
  const startTime = Date.now();

  try {
    let result;

    switch (actionConfig.type) {
      case 'api':
        result = await executeApiCall(actionConfig.api, issue);
        break;

      case 'stored_procedure':
        result = await executeStoredProc(actionConfig.storedProcedure, issue);
        break;

      case 'custom_code':
        result = await executeCode(actionConfig.customCode, issue);
        break;

      default:
        throw new Error(`Unknown action type: ${actionConfig.type}`);
    }

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    result.executionTime = executionTime;

    return result;
  } catch (error) {
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
      success: false,
      error: error.message,
      executionTime,
    };
  }
}

// Execute API call
async function executeApiCall(apiConfig, issue) {
  // Replace placeholders in URL and body with issue data
  let url = apiConfig.url;
  let body = apiConfig.body;

  // Simple template replacement
  if (typeof url === 'string') {
    url = url.replace(/\{\{issueKey\}\}/g, issue.key);
    url = url.replace(/\{\{projectKey\}\}/g, issue.key.split('-')[0]);
  }

  if (body && typeof body === 'object') {
    body = JSON.parse(
      JSON.stringify(body)
        .replace(/\{\{issueKey\}\}/g, issue.key)
        .replace(/\{\{summary\}\}/g, issue.fields?.summary || '')
    );
  }

  const response = await axios({
    method: apiConfig.method || 'GET',
    url,
    headers: apiConfig.headers || {},
    data: body,
    timeout: apiConfig.timeout || 30000,
  });

  return {
    success: true,
    status: response.status,
    data: response.data,
    message: 'API call successful',
  };
}

// Execute stored procedure
async function executeStoredProc(spConfig, issue) {
  const apiKey = requireApiKey();

  const url = `http://localhost:3001/api/v2/${spConfig.database}/_proc/${spConfig.name}`;

  const response = await axios({
    method: 'GET',
    url,
    headers: {
      'x-nectar-api-key': apiKey,
      Accept: 'application/json',
    },
    params: spConfig.parameters || {},
    timeout: 30000,
  });

  return {
    success: true,
    status: response.status,
    data: response.data,
    message: 'Stored procedure executed successfully',
  };
}

// Execute custom code - DISABLED FOR SECURITY
async function executeCode(codeConfig, issue) {
  // Custom code execution has been disabled for security reasons
  // This feature allowed arbitrary code execution which poses a significant security risk
  logger.warn('Custom code execution attempted but is disabled for security');
  return {
    success: false,
    error: 'Custom code execution is disabled',
    message:
      'Custom code execution has been disabled for security reasons. Please use API or stored procedure actions instead.',
  };
}

// Update Jira ticket
async function updateJiraTicket(ticketKey, config, result) {
  const { jiraConfig, responseConfig } = config;

  // Build comment
  let comment;
  if (result.success) {
    comment = `${responseConfig.successMessage}

**Automation**: ${config.name}
${result.executionTime ? `**Execution Time**: ${result.executionTime} seconds` : ''}
${result.status ? `**Status**: ${result.status}` : ''}
${result.message ? `**Message**: ${result.message}` : ''}

_Automated by Mirabel Workflow System_`;
  } else {
    comment = `${responseConfig.failureMessage}

**Automation**: ${config.name}
**Error**: ${result.error}
${result.executionTime ? `**Execution Time**: ${result.executionTime} seconds` : ''}

_Please review and run manually if needed._
_Automated by Mirabel Workflow System_`;
  }

  // Add comment
  await jiraService.addComment(ticketKey, comment);

  // Add labels
  if (jiraConfig.addLabels?.length > 0) {
    for (const label of jiraConfig.addLabels) {
      await jiraService.addLabel(ticketKey, label);
    }
  }

  // Transition if successful
  if (result.success && jiraConfig.successTransition) {
    await jiraService.transitionByName(ticketKey, jiraConfig.successTransition);
  }
}

module.exports = {
  execute: executeJiraDynamicAutomation,
};
