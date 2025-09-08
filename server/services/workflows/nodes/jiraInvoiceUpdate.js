const { logger } = require('../../../utils/logger');
const { requireApiKey } = require('../../../utils/jiraWebhookAuth');
const jiraService = require('../../jiraService');
const axios = require('axios');

/**
 * Jira Invoice Update Node
 * Automatically processes recurring invoice update requests from Jira
 */
const executeJiraInvoiceUpdate = async (config, context) => {
  const {
    label,
    mode = 'webhook', // 'webhook', 'polling', or 'manual'
    issueKey,
    checkPattern = true,
  } = config;

  logger.info(`Executing Jira Invoice Update Node: ${label}`);

  try {
    let issuesToProcess = [];

    if (mode === 'webhook') {
      // Process from webhook trigger
      const webhookData = context.trigger || context.webhook || {};
      const issue = webhookData.issue || webhookData.body?.issue;

      if (!issue) {
        throw new Error('No issue data found in webhook context');
      }

      if (checkPattern) {
        const summary = issue.fields?.summary || '';
        const isValid =
          issue.key === 'TS-2929' ||
          (summary.includes('32430') &&
            summary.includes('RECURRING') &&
            summary.includes('Update Invoice on Rep'));

        if (!isValid) {
          logger.info(`Issue ${issue.key} does not match pattern, skipping`);
          return {
            status: 'skipped',
            reason: 'Issue does not match invoice update pattern',
            issueKey: issue.key,
          };
        }
      }

      issuesToProcess.push(issue.key);
    } else if (mode === 'polling') {
      // Find and process matching tickets
      const tickets = await jiraService.findRecurringInvoiceTickets();

      if (tickets.length === 0) {
        logger.info('No pending invoice update tickets found');
        return {
          status: 'success',
          message: 'No tickets to process',
          checkedAt: new Date().toISOString(),
        };
      }

      issuesToProcess = tickets.map(t => t.key);
      logger.info(`Found ${issuesToProcess.length} tickets to process`);
    } else if (mode === 'manual' && issueKey) {
      // Manual processing of specific ticket
      issuesToProcess.push(issueKey);
    } else {
      throw new Error(`Invalid mode: ${mode}`);
    }

    // Process each ticket
    const results = [];
    for (const ticketKey of issuesToProcess) {
      try {
        logger.info(`Processing ticket ${ticketKey}`);

        // Execute the invoice update API
        const apiResult = await executeInvoiceAPI();

        // Update Jira ticket
        await updateJiraTicket(ticketKey, apiResult);

        results.push({
          ticketKey,
          success: true,
          ...apiResult,
        });
      } catch (error) {
        logger.error(`Failed to process ${ticketKey}:`, error);
        results.push({
          ticketKey,
          success: false,
          error: error.message,
        });

        // Try to update Jira with error
        try {
          await updateJiraTicket(ticketKey, {
            success: false,
            error: error.message,
          });
        } catch (updateError) {
          logger.error('Failed to update Jira with error:', updateError);
        }
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
    logger.error('Jira Invoice Update node failed:', error);
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Execute the invoice update stored procedure
 */
async function executeInvoiceAPI() {
  const startTime = Date.now();

  try {
    const apiKey = requireApiKey();

    const response = await axios({
      method: 'GET',
      url: 'http://localhost:3001/api/v2/icoler/_proc/api_UpdateInvoiceReptoMatchContract',
      headers: {
        'x-nectar-api-key': apiKey,
        Accept: 'application/json',
      },
      timeout: 30000,
    });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('Invoice API executed successfully', {
      status: response.status,
      executionTime,
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
      executionTime,
      recordsUpdated:
        response.data?.recordsUpdated ||
        response.data?.affectedRows ||
        response.data?.changedRows ||
        'N/A',
    };
  } catch (error) {
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.error('Invoice API failed:', error.message);

    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      executionTime,
    };
  }
}

/**
 * Update Jira ticket with results
 */
async function updateJiraTicket(ticketKey, apiResult) {
  try {
    let comment;

    if (apiResult.success) {
      comment = `✅ **Invoice Rep Update Completed Successfully**

**Execution Details:**
- Timestamp: ${new Date().toISOString()}
- Execution Time: ${apiResult.executionTime} seconds
- API Status: ${apiResult.status}
- Records Updated: ${apiResult.recordsUpdated}

${apiResult.data?.message ? `Message: ${apiResult.data.message}` : ''}

_Automated by Mirabel Workflow System_`;
    } else {
      comment = `❌ **Invoice Rep Update Failed**

**Error Details:**
- Error: ${apiResult.error}
- Status Code: ${apiResult.status || 'N/A'}
- Timestamp: ${new Date().toISOString()}
- Execution Time: ${apiResult.executionTime} seconds

_Please review and run manually if needed._
_Automated by Mirabel Workflow System_`;
    }

    // Add comment
    await jiraService.addComment(ticketKey, comment);

    // Add appropriate label
    await jiraService.addLabel(
      ticketKey,
      apiResult.success ? 'automated-success' : 'automated-failed'
    );

    // Try to transition if successful
    if (apiResult.success) {
      const transitioned = await jiraService.transitionByName(ticketKey, 'Done');
      if (!transitioned) {
        // Try alternative transition names
        (await jiraService.transitionByName(ticketKey, 'Resolved')) ||
          (await jiraService.transitionByName(ticketKey, 'Closed')) ||
          (await jiraService.transitionByName(ticketKey, 'Complete'));
      }
    }

    logger.info(`Updated Jira ticket ${ticketKey}`);
  } catch (error) {
    logger.error(`Failed to update Jira ticket ${ticketKey}:`, error.message);
    throw error;
  }
}

module.exports = {
  execute: executeJiraInvoiceUpdate,
};
