const ZoomInfoService = require('../../zoominfo/ZoomInfoService');
const { logger } = require('../../../utils/logger');

/**
 * ZoomInfo Intent Signals Trigger Node
 * Polls ZoomInfo for companies showing purchase intent
 */
class ZoomInfoIntentTrigger {
  constructor() {
    this.zoomInfoService = new ZoomInfoService();
    this.pollingIntervals = new Map(); // Track active polling for each workflow
  }

  /**
   * Start polling for intent signals
   * @param {Object} config - Node configuration
   * @param {Function} triggerCallback - Function to call when intent signals are found
   */
  async startPolling(config, triggerCallback) {
    const {
      credentials,
      intentTopics = [],
      signalStrength = 'moderate',
      companyFilters = {},
      pollingInterval = 900000, // 15 minutes default
      workflowId,
    } = config;

    logger.info(`Starting ZoomInfo intent polling for workflow ${workflowId}`);

    // Clear any existing interval
    if (this.pollingIntervals.has(workflowId)) {
      clearInterval(this.pollingIntervals.get(workflowId));
    }

    const poll = async () => {
      try {
        // Decrypt credentials
        const decryptedCredentials = this.zoomInfoService.decryptCredentials(credentials);

        // Authenticate
        const token = await this.zoomInfoService.authenticate(decryptedCredentials);

        // Get intent signals
        const intentSignals = await this.zoomInfoService.getIntentSignals(token, {
          intentTopics,
          signalStrength,
          ...companyFilters,
        });

        // Process each intent signal
        for (const signal of intentSignals) {
          const triggerData = {
            trigger: 'zoominfo:intent',
            timestamp: new Date().toISOString(),
            data: {
              company: signal.company,
              intent: {
                topics: signal.intent_topics,
                strength: signal.signal_strength,
                confidence: signal.confidence_score,
                timestamp: signal.signal_timestamp,
              },
              contacts: signal.contacts || [],
              metadata: {
                source: 'zoominfo-intent-trigger',
                workflowId,
              },
            },
          };

          // Trigger the workflow
          await triggerCallback(triggerData);

          logger.info(
            `Triggered workflow ${workflowId} for intent signal from ${signal.company?.name || 'Unknown Company'}`
          );
        }

        if (intentSignals.length > 0) {
          logger.info(
            `Processed ${intentSignals.length} intent signals for workflow ${workflowId}`
          );
        }
      } catch (error) {
        logger.error(`Error in ZoomInfo intent polling for workflow ${workflowId}:`, error.message);
      }
    };

    // Run initial poll
    await poll();

    // Set up recurring polling
    const intervalId = setInterval(poll, pollingInterval);
    this.pollingIntervals.set(workflowId, intervalId);

    return intervalId;
  }

  /**
   * Stop polling for a specific workflow
   * @param {string} workflowId - Workflow identifier
   */
  stopPolling(workflowId) {
    if (this.pollingIntervals.has(workflowId)) {
      clearInterval(this.pollingIntervals.get(workflowId));
      this.pollingIntervals.delete(workflowId);
      logger.info(`Stopped ZoomInfo intent polling for workflow ${workflowId}`);
    }
  }

  /**
   * Test the trigger configuration
   * @param {Object} config - Node configuration
   * @returns {Promise<Object>} Test result
   */
  async testTrigger(config) {
    try {
      const { credentials, intentTopics = [], signalStrength = 'moderate' } = config;

      // Decrypt credentials
      const decryptedCredentials = this.zoomInfoService.decryptCredentials(credentials);

      // Test connection
      const connectionTest = await this.zoomInfoService.testConnection(decryptedCredentials);

      if (!connectionTest) {
        return {
          success: false,
          error: 'Failed to authenticate with ZoomInfo API',
        };
      }

      // Try to get a sample of intent data
      const token = await this.zoomInfoService.authenticate(decryptedCredentials);
      const sampleData = await this.zoomInfoService.getIntentSignals(token, {
        intentTopics,
        signalStrength,
        limit: 5, // Small sample for testing
      });

      return {
        success: true,
        message: `Connection successful. Found ${sampleData.length} intent signals.`,
        sampleData: sampleData.slice(0, 2), // Return small sample
      };
    } catch (error) {
      logger.error('ZoomInfo intent trigger test failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export the node executor function for the workflow engine
module.exports = async (nodeData, workflowData, context) => {
  const trigger = new ZoomInfoIntentTrigger();

  // This is called when the workflow is being set up
  if (context.action === 'setup') {
    const triggerCallback = context.triggerCallback;
    const intervalId = await trigger.startPolling(nodeData, triggerCallback);

    return {
      success: true,
      data: {
        message: 'ZoomInfo intent trigger started',
        intervalId,
      },
    };
  }

  // This is called when stopping the workflow
  if (context.action === 'teardown') {
    trigger.stopPolling(nodeData.workflowId);

    return {
      success: true,
      data: {
        message: 'ZoomInfo intent trigger stopped',
      },
    };
  }

  // This is called for testing the configuration
  if (context.action === 'test') {
    return await trigger.testTrigger(nodeData);
  }

  // Default action - this shouldn't be called for trigger nodes
  return {
    success: false,
    error: 'Invalid action for trigger node',
  };
};
