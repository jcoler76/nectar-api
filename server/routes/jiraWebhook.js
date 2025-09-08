const express = require('express');
const { logger } = require('../utils/logger');
const { verifyJiraWebhookSignature, requireApiKey } = require('../utils/jiraWebhookAuth');
const { Workflow } = require('../models/workflowModels');
const { executeWorkflow } = require('../services/workflows/engine');
const axios = require('axios');

const router = express.Router();
router.use(express.json());

// POST /api/webhooks/jira
// Main Jira webhook endpoint
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

    logger.info('Jira webhook received:', {
      event: webhookEvent,
      eventType: issue_event_type_name,
      issueKey: issue.key,
      summary: issue.fields?.summary,
    });

    // Check for TS-2929 or matching pattern
    const summary = issue.fields?.summary || '';
    const isRecurringInvoiceUpdate =
      issue.key === 'TS-2929' ||
      (summary.includes('32430') &&
        summary.includes('RECURRING') &&
        summary.includes('Update Invoice on Rep'));

    if (!isRecurringInvoiceUpdate) {
      logger.info('Webhook received but not for invoice update ticket:', issue.key);
      return res.status(200).json({ message: 'Webhook received, no action needed' });
    }

    // Check if ticket is in a state that should trigger the automation
    const status = issue.fields?.status?.name || '';
    const validStatuses = ['Open', 'To Do', 'In Progress', 'Reopened'];

    if (!validStatuses.includes(status)) {
      logger.info(`Ticket ${issue.key} status is ${status}, skipping processing`);
      return res.status(200).json({ message: 'Ticket not in processable state' });
    }

    // Immediately respond to Jira
    res.status(200).json({ message: 'Webhook received and processing' });

    // Execute the invoice update automation
    await executeInvoiceUpdateAutomation(issue);
  } catch (error) {
    logger.error('Jira webhook processing error:', error);
    // If we haven't sent a response yet
    if (!res.headersSent) {
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
});

// Execute the invoice update automation
async function executeInvoiceUpdateAutomation(issue) {
  const startTime = Date.now();

  try {
    logger.info(`Starting invoice update automation for ${issue.key}`);

    // Step 1: Execute the stored procedure API
    const apiResult = await executeInvoiceUpdateAPI();

    // Step 2: Update Jira ticket with results
    await updateJiraTicket(issue.key, apiResult, startTime);

    logger.info(`Completed invoice update automation for ${issue.key}`);
  } catch (error) {
    logger.error(`Failed invoice update automation for ${issue.key}:`, error);

    // Try to update Jira with error status
    try {
      await updateJiraTicket(
        issue.key,
        {
          success: false,
          error: error.message,
        },
        startTime
      );
    } catch (updateError) {
      logger.error('Failed to update Jira with error status:', updateError);
    }
  }
}

// Execute the invoice update API
async function executeInvoiceUpdateAPI() {
  try {
    const apiKey = requireApiKey();

    logger.info('Executing invoice update API...');

    const response = await axios({
      method: 'GET',
      url: 'http://localhost:3001/api/v2/icoler/_proc/api_UpdateInvoiceReptoMatchContract',
      headers: {
        'x-nectar-api-key': apiKey,
        Accept: 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    logger.info('Invoice update API executed successfully:', {
      status: response.status,
      recordsUpdated: response.data?.recordsUpdated,
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Invoice update API failed:', error.message);

    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      timestamp: new Date().toISOString(),
    };
  }
}

// Update Jira ticket with results
async function updateJiraTicket(ticketKey, apiResult, startTime) {
  const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Construct comment based on result
  let comment;
  if (apiResult.success) {
    const recordsUpdated =
      apiResult.data?.recordsUpdated ||
      apiResult.data?.affectedRows ||
      apiResult.data?.changedRows ||
      'N/A';

    comment = `✅ **Invoice Rep Update Completed Successfully**

**Execution Details:**
- Timestamp: ${apiResult.timestamp}
- Execution Time: ${executionTime} seconds
- API Status: ${apiResult.status}
- Records Updated: ${recordsUpdated}

${apiResult.data?.message ? `Message: ${apiResult.data.message}` : ''}

_This ticket was automatically processed by Mirabel Workflow Automation._`;
  } else {
    comment = `❌ **Invoice Rep Update Failed**

**Error Details:**
- Error: ${apiResult.error}
- Status Code: ${apiResult.status || 'N/A'}
- Timestamp: ${apiResult.timestamp}
- Execution Time: ${executionTime} seconds

${apiResult.data ? `Response: ${JSON.stringify(apiResult.data, null, 2)}` : ''}

_Please review and run manually if needed._
_This ticket was automatically processed by Mirabel Workflow Automation._`;
  }

  try {
    // Add comment to ticket
    const jiraAuth = {
      username: process.env.JIRA_EMAIL,
      password: process.env.JIRA_API_TOKEN,
    };

    await axios({
      method: 'POST',
      url: `${process.env.JIRA_BASE_URL}/rest/api/2/issue/${ticketKey}/comment`,
      auth: jiraAuth,
      data: {
        body: comment,
      },
    });

    logger.info(`Added comment to Jira ticket ${ticketKey}`);

    // Update ticket status if successful
    if (apiResult.success) {
      // Get available transitions
      const transitionsResponse = await axios({
        method: 'GET',
        url: `${process.env.JIRA_BASE_URL}/rest/api/2/issue/${ticketKey}/transitions`,
        auth: jiraAuth,
      });

      // Find "Done" or "Resolved" transition
      const doneTransition = transitionsResponse.data.transitions.find(
        t =>
          t.name.toLowerCase() === 'done' ||
          t.name.toLowerCase() === 'resolved' ||
          t.name.toLowerCase() === 'close'
      );

      if (doneTransition) {
        await axios({
          method: 'POST',
          url: `${process.env.JIRA_BASE_URL}/rest/api/2/issue/${ticketKey}/transitions`,
          auth: jiraAuth,
          data: {
            transition: {
              id: doneTransition.id,
            },
          },
        });

        logger.info(`Updated Jira ticket ${ticketKey} status to ${doneTransition.name}`);
      } else {
        logger.warn(`Could not find Done/Resolved transition for ${ticketKey}`);
      }
    }
  } catch (error) {
    logger.error(`Failed to update Jira ticket ${ticketKey}:`, error.message);
    throw error;
  }
}

// POST /api/webhooks/jira/test
// Test endpoint to manually trigger the automation
router.post('/test/:ticketKey', async (req, res) => {
  try {
    const { ticketKey } = req.params;

    // Fetch ticket details from Jira
    const jiraAuth = {
      username: process.env.JIRA_EMAIL,
      password: process.env.JIRA_API_TOKEN,
    };

    const ticketResponse = await axios({
      method: 'GET',
      url: `${process.env.JIRA_BASE_URL}/rest/api/2/issue/${ticketKey}`,
      auth: jiraAuth,
    });

    const issue = ticketResponse.data;

    res.json({
      message: 'Test automation triggered',
      ticketKey: issue.key,
      summary: issue.fields.summary,
    });

    // Execute automation asynchronously
    executeInvoiceUpdateAutomation(issue);
  } catch (error) {
    logger.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
