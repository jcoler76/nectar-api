const express = require('express');
const { logger } = require('../utils/logger');
const { verifyJiraWebhookSignature, requireApiKey } = require('../utils/jiraWebhookAuth');
const JiraAutomation = require('../models/JiraAutomation');
const jiraService = require('../services/jiraService');
const axios = require('axios');
const { executeWorkflow } = require('../services/workflows/engine');
const { Workflow } = require('../models/workflowModels');

const router = express.Router();
router.use(express.json());

// POST /api/webhooks/jira/dynamic
// Main dynamic Jira webhook endpoint
router.post('/', async (req, res) => {
  try {
    // Verify webhook signature
    if (!verifyJiraWebhookSignature(req)) {
      logger.error('Invalid Jira webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { issue, webhookEvent, issue_event_type_name } = req.body;

    if (!issue) {
      return res.status(400).json({ error: 'No issue data in webhook' });
    }

    logger.info('Dynamic Jira webhook received:', {
      event: webhookEvent,
      eventType: issue_event_type_name,
      issueKey: issue.key,
      summary: issue.fields?.summary,
    });

    // Find all matching automations for this ticket
    const matchingAutomations = await JiraAutomation.findMatchingAutomations(issue);

    if (matchingAutomations.length === 0) {
      logger.info(`No automations match ticket ${issue.key}`);
      return res.status(200).json({
        message: 'Webhook received, no matching automations',
        ticketKey: issue.key,
      });
    }

    logger.info(`Found ${matchingAutomations.length} matching automations for ${issue.key}`);

    // Immediately respond to Jira
    res.status(200).json({
      message: 'Webhook received and processing',
      automations: matchingAutomations.map(a => a.name),
    });

    // Execute all matching automations asynchronously
    for (const automation of matchingAutomations) {
      executeAutomation(automation, issue).catch(error => {
        logger.error(`Failed to execute automation "${automation.name}" for ${issue.key}:`, error);
      });
    }
  } catch (error) {
    logger.error('Dynamic Jira webhook processing error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
});

// Execute a single automation
async function executeAutomation(automation, issue) {
  const startTime = Date.now();

  try {
    logger.info(`Executing automation "${automation.name}" for ${issue.key}`);

    // Execute the action based on type
    let result;
    switch (automation.action.type) {
      case 'api':
        result = await executeApiAction(automation.action.api);
        break;
      case 'stored_procedure':
        result = await executeStoredProcedure(automation.action.storedProcedure);
        break;
      case 'workflow':
        result = await triggerWorkflow(automation.action.workflow, issue);
        break;
      case 'custom_code':
        result = await executeCustomCode(automation.action.customCode, issue);
        break;
      default:
        throw new Error(`Unknown action type: ${automation.action.type}`);
    }

    // Update Jira ticket with results
    await updateJiraTicket(issue.key, automation, result, startTime);

    // Record execution in database
    await automation.recordExecution(
      issue.key,
      result.success,
      result.message || 'Completed',
      result.recordsProcessed || 0
    );

    logger.info(`Completed automation "${automation.name}" for ${issue.key}`);
  } catch (error) {
    logger.error(`Failed automation "${automation.name}" for ${issue.key}:`, error);

    // Try to update Jira with error status
    try {
      await updateJiraTicket(
        issue.key,
        automation,
        {
          success: false,
          error: error.message,
        },
        startTime
      );
    } catch (updateError) {
      logger.error('Failed to update Jira with error status:', updateError);
    }

    // Record failure in database
    await automation.recordExecution(issue.key, false, error.message, 0);
  }
}

// Execute API action
async function executeApiAction(apiConfig) {
  try {
    const response = await axios({
      method: apiConfig.method || 'GET',
      url: apiConfig.url,
      headers: apiConfig.headers || {},
      data: apiConfig.body,
      timeout: apiConfig.timeout || 30000,
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
      recordsProcessed: extractRecordCount(response.data),
      message: 'API call successful',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      message: `API call failed: ${error.message}`,
    };
  }
}

// Execute stored procedure
async function executeStoredProcedure(spConfig) {
  try {
    const apiKey = requireApiKey();

    const url = `http://localhost:3001/api/v2/${spConfig.database || 'icoler'}/_proc/${spConfig.name}`;

    const response = await axios({
      method: 'GET',
      url: url,
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
      recordsProcessed: extractRecordCount(response.data),
      message: 'Stored procedure executed successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      message: `Stored procedure failed: ${error.message}`,
    };
  }
}

// Trigger a workflow
async function triggerWorkflow(workflowConfig, issue) {
  try {
    const workflow = await Workflow.findById(workflowConfig.workflowId);

    if (!workflow || !workflow.active) {
      throw new Error('Workflow not found or inactive');
    }

    // Execute workflow with Jira context
    await executeWorkflow(workflow, {
      source: 'jira-automation',
      issue: issue,
      ticketKey: issue.key,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Workflow "${workflow.name}" triggered successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Workflow trigger failed: ${error.message}`,
    };
  }
}

// Execute custom code - DISABLED FOR SECURITY
async function executeCustomCode(codeConfig, issue) {
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

// Extract record count from response data
function extractRecordCount(data, field = null) {
  if (!data) return 0;

  // Try common field names
  const commonFields = [
    'recordsUpdated',
    'recordsProcessed',
    'affectedRows',
    'changedRows',
    'count',
    'total',
    'records',
  ];

  if (field && data[field] !== undefined) {
    return data[field];
  }

  for (const f of commonFields) {
    if (data[f] !== undefined) {
      return data[f];
    }
  }

  // If data is an array, return its length
  if (Array.isArray(data)) {
    return data.length;
  }

  return 0;
}

// Update Jira ticket with results
async function updateJiraTicket(ticketKey, automation, result, startTime) {
  const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const { responseConfig, jiraConfig } = automation;

  // Build comment based on result
  let comment;
  if (result.success) {
    const recordCount =
      result.recordsProcessed || extractRecordCount(result.data, responseConfig?.recordCountField);

    comment = `${responseConfig?.successMessage || '✅ Automation completed successfully'}

**Automation**: ${automation.name}
**Execution Time**: ${executionTime} seconds
${result.status ? `**API Status**: ${result.status}` : ''}
${recordCount ? `**Records Processed**: ${recordCount}` : ''}
${result.message ? `**Message**: ${result.message}` : ''}

_Automated by Mirabel Workflow System_`;
  } else {
    comment = `${responseConfig?.failureMessage || '❌ Automation failed'}

**Automation**: ${automation.name}
**Error**: ${result.error}
${result.status ? `**Status Code**: ${result.status}` : ''}
**Execution Time**: ${executionTime} seconds

_Please review and run manually if needed._
_Automated by Mirabel Workflow System_`;
  }

  try {
    // Add comment to ticket
    await jiraService.addComment(ticketKey, comment);

    // Add labels if configured
    if (jiraConfig.addLabels?.length > 0) {
      for (const label of jiraConfig.addLabels) {
        await jiraService.addLabel(ticketKey, label);
      }
    }

    // Add success/failure label
    await jiraService.addLabel(
      ticketKey,
      result.success ? 'automation-success' : 'automation-failed'
    );

    // Try to transition if successful and configured
    if (result.success && jiraConfig.successTransition) {
      await jiraService.transitionByName(ticketKey, jiraConfig.successTransition);
    }

    logger.info(`Updated Jira ticket ${ticketKey}`);
  } catch (error) {
    logger.error(`Failed to update Jira ticket ${ticketKey}:`, error.message);
    throw error;
  }
}

// GET /api/webhooks/jira/dynamic/automations
// List all automations
router.get('/automations', async (req, res) => {
  try {
    const automations = await JiraAutomation.find().sort({ name: 1 });
    res.json(automations);
  } catch (error) {
    logger.error('Failed to list automations:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/webhooks/jira/dynamic/automations
// Create a new automation
router.post('/automations', async (req, res) => {
  try {
    const automation = new JiraAutomation(req.body);
    await automation.save();
    res.status(201).json(automation);
  } catch (error) {
    logger.error('Failed to create automation:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/webhooks/jira/dynamic/automations/:id
// Update an automation
router.put('/automations/:id', async (req, res) => {
  try {
    const automation = await JiraAutomation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json(automation);
  } catch (error) {
    logger.error('Failed to update automation:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/webhooks/jira/dynamic/automations/:id
// Delete an automation
router.delete('/automations/:id', async (req, res) => {
  try {
    const automation = await JiraAutomation.findByIdAndDelete(req.params.id);

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json({ message: 'Automation deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete automation:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/webhooks/jira/dynamic/test/:ticketKey
// Test automation for a specific ticket
router.post('/test/:ticketKey', async (req, res) => {
  try {
    const { ticketKey } = req.params;

    // Fetch ticket from Jira
    const issue = await jiraService.getIssue(ticketKey);

    // Find matching automations
    const matchingAutomations = await JiraAutomation.findMatchingAutomations(issue);

    res.json({
      message: 'Test triggered',
      ticketKey: issue.key,
      summary: issue.fields.summary,
      matchingAutomations: matchingAutomations.map(a => ({
        id: a._id,
        name: a.name,
        enabled: a.enabled,
      })),
    });

    // Execute automations asynchronously
    for (const automation of matchingAutomations) {
      executeAutomation(automation, issue).catch(error => {
        logger.error(`Test execution failed for "${automation.name}":`, error);
      });
    }
  } catch (error) {
    logger.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
