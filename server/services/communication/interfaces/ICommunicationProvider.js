/**
 * Interface for communication providers (email, SMS, push notifications)
 * All communication providers must implement these methods
 */
class ICommunicationProvider {
  constructor(config) {
    if (new.target === ICommunicationProvider) {
      throw new Error('Cannot instantiate abstract class ICommunicationProvider directly');
    }
    this.config = config;
  }

  /**
   * Test the communication service connection/credentials
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async testConnection() {
    throw new Error('Method testConnection must be implemented');
  }

  /**
   * Send a message
   * @param {Object} message - Message details
   * @param {string|string[]} message.to - Recipient(s)
   * @param {string} message.subject - Message subject (email) or title (push)
   * @param {string} message.content - Message content/body
   * @param {string} [message.from] - Sender (if applicable)
   * @param {Object} [message.metadata] - Additional message metadata
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendMessage(message) {
    throw new Error('Method sendMessage must be implemented');
  }

  /**
   * Send bulk messages
   * @param {Array<Object>} messages - Array of message objects
   * @returns {Promise<{success: boolean, results: Array<{messageId?: string, error?: string}>}>}
   */
  async sendBulkMessages(messages) {
    throw new Error('Method sendBulkMessages must be implemented');
  }

  /**
   * Get message delivery status
   * @param {string} messageId - Message ID to check
   * @returns {Promise<{status: string, details?: Object}>}
   */
  async getMessageStatus(messageId) {
    throw new Error('Method getMessageStatus must be implemented');
  }

  /**
   * Get delivery statistics
   * @param {Object} options - Query options (date range, etc.)
   * @returns {Promise<{sent: number, delivered: number, failed: number, pending: number}>}
   */
  async getStatistics(options = {}) {
    throw new Error('Method getStatistics must be implemented');
  }

  /**
   * Validate recipient format (email, phone, device token, etc.)
   * @param {string} recipient - Recipient to validate
   * @returns {boolean}
   */
  validateRecipient(recipient) {
    throw new Error('Method validateRecipient must be implemented');
  }

  /**
   * Get supported message types for this provider
   * @returns {string[]} Array of supported types (e.g., ['text', 'html', 'template'])
   */
  getSupportedMessageTypes() {
    throw new Error('Method getSupportedMessageTypes must be implemented');
  }

  /**
   * Get rate limits for this provider
   * @returns {Object} Rate limit information
   */
  getRateLimits() {
    throw new Error('Method getRateLimits must be implemented');
  }

  /**
   * Get provider information
   * @returns {Object}
   */
  static getProviderInfo() {
    throw new Error('Static method getProviderInfo must be implemented');
  }

  /**
   * Get configuration validation rules
   * @returns {Object}
   */
  static getConfigValidation() {
    throw new Error('Static method getConfigValidation must be implemented');
  }
}

module.exports = ICommunicationProvider;
