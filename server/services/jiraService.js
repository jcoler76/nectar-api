const axios = require('axios');
const { logger } = require('../utils/logger');
const { requireApiKey } = require('../utils/jiraWebhookAuth');

class JiraService {
  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL || 'https://mirabel.atlassian.net';
    this.auth = {
      username: process.env.JIRA_EMAIL,
      password: process.env.JIRA_API_TOKEN,
    };
  }

  /**
   * Search for Jira issues using JQL
   */
  async searchIssues(jql, fields = ['key', 'summary', 'status', 'created', 'updated']) {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/rest/api/2/search`,
        auth: this.auth,
        params: {
          jql,
          fields: fields.join(','),
          maxResults: 100,
        },
      });

      return response.data.issues;
    } catch (error) {
      logger.error('Jira search failed:', error.message);
      throw error;
    }
  }

  /**
   * Get a single issue by key
   */
  async getIssue(issueKey) {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/rest/api/2/issue/${issueKey}`,
        auth: this.auth,
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to get issue ${issueKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Add a comment to an issue
   */
  async addComment(issueKey, comment) {
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/rest/api/2/issue/${issueKey}/comment`,
        auth: this.auth,
        data: {
          body: comment,
        },
      });

      logger.info(`Added comment to issue ${issueKey}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to add comment to ${issueKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Get available transitions for an issue
   */
  async getTransitions(issueKey) {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/rest/api/2/issue/${issueKey}/transitions`,
        auth: this.auth,
      });

      return response.data.transitions;
    } catch (error) {
      logger.error(`Failed to get transitions for ${issueKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Transition an issue to a new status
   */
  async transitionIssue(issueKey, transitionId, comment = null) {
    try {
      const data = {
        transition: {
          id: transitionId,
        },
      };

      if (comment) {
        data.update = {
          comment: [
            {
              add: {
                body: comment,
              },
            },
          ],
        };
      }

      await axios({
        method: 'POST',
        url: `${this.baseUrl}/rest/api/2/issue/${issueKey}/transitions`,
        auth: this.auth,
        data,
      });

      logger.info(`Transitioned issue ${issueKey} with transition ${transitionId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to transition ${issueKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Find and apply a transition by name
   */
  async transitionByName(issueKey, transitionName, comment = null) {
    try {
      const transitions = await this.getTransitions(issueKey);

      const transition = transitions.find(
        t => t.name.toLowerCase() === transitionName.toLowerCase()
      );

      if (!transition) {
        logger.warn(`Transition "${transitionName}" not found for ${issueKey}`);
        return false;
      }

      return await this.transitionIssue(issueKey, transition.id, comment);
    } catch (error) {
      logger.error(`Failed to transition ${issueKey} to ${transitionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Update issue fields
   */
  async updateIssue(issueKey, fields) {
    try {
      await axios({
        method: 'PUT',
        url: `${this.baseUrl}/rest/api/2/issue/${issueKey}`,
        auth: this.auth,
        data: {
          fields,
        },
      });

      logger.info(`Updated issue ${issueKey}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update ${issueKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Add a label to an issue
   */
  async addLabel(issueKey, label) {
    try {
      await axios({
        method: 'PUT',
        url: `${this.baseUrl}/rest/api/2/issue/${issueKey}`,
        auth: this.auth,
        data: {
          update: {
            labels: [
              {
                add: label,
              },
            ],
          },
        },
      });

      logger.info(`Added label "${label}" to ${issueKey}`);
      return true;
    } catch (error) {
      logger.error(`Failed to add label to ${issueKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Check for recurring invoice update tickets
   */
  async findRecurringInvoiceTickets() {
    const jql = `
            (key = "TS-2929" OR 
             summary ~ "32430 - RECURRING - Update Invoice on Rep") 
            AND status in ("Open", "To Do", "In Progress", "Reopened")
            ORDER BY created DESC
        `.trim();

    return await this.searchIssues(jql);
  }

  /**
   * Process a recurring invoice update ticket
   */
  async processInvoiceUpdateTicket(issueKey) {
    const startTime = Date.now();

    try {
      // Add initial comment
      await this.addComment(issueKey, '🔄 Starting automated invoice rep update process...');

      // Execute the API
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
      const recordsUpdated =
        response.data?.recordsUpdated ||
        response.data?.affectedRows ||
        response.data?.changedRows ||
        'N/A';

      // Add success comment
      await this.addComment(
        issueKey,
        `✅ **Invoice Rep Update Completed Successfully**

**Execution Details:**
- Timestamp: ${new Date().toISOString()}
- Execution Time: ${executionTime} seconds
- API Status: ${response.status}
- Records Updated: ${recordsUpdated}

${response.data?.message ? `Message: ${response.data.message}` : ''}

_Automated by Mirabel Workflow System_`
      );

      // Try to transition to Done
      await this.transitionByName(issueKey, 'Done');

      // Add label for tracking
      await this.addLabel(issueKey, 'automated-processing');

      return {
        success: true,
        issueKey,
        executionTime,
        recordsUpdated,
      };
    } catch (error) {
      const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

      // Add error comment
      await this.addComment(
        issueKey,
        `❌ **Invoice Rep Update Failed**

**Error Details:**
- Error: ${error.message}
- Status Code: ${error.response?.status || 'N/A'}
- Timestamp: ${new Date().toISOString()}
- Execution Time: ${executionTime} seconds

_Please review and run manually if needed._
_Automated by Mirabel Workflow System_`
      );

      // Add error label
      await this.addLabel(issueKey, 'automation-failed');

      throw error;
    }
  }
}

// Export singleton instance
module.exports = new JiraService();
