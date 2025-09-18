const apn = require('@parse/node-apn');
const ICommunicationProvider = require('../interfaces/ICommunicationProvider');
const { logger } = require('../../../utils/logger');

/**
 * Apple Push Notification Provider
 * Provides iOS push notification functionality using APNs
 */
class APNProvider extends ICommunicationProvider {
  constructor(config) {
    super(config);
    this.provider = null;
    this.rateLimits = {
      sendRate: 1000, // notifications per second
      dailyQuota: 10000000, // notifications per day
    };

    this._initializeProvider();
  }

  /**
   * Initialize APN provider
   * @private
   */
  _initializeProvider() {
    const options = {
      production: this.config.production || false,
      bundleId: this.config.bundleId,
    };

    // Configure authentication method
    if (this.config.token) {
      // Token-based authentication (preferred)
      options.token = {
        key: this.config.token.key,
        keyId: this.config.token.keyId,
        teamId: this.config.token.teamId,
      };
    } else if (this.config.cert && this.config.key) {
      // Certificate-based authentication
      options.cert = this.config.cert;
      options.key = this.config.key;
      if (this.config.passphrase) {
        options.passphrase = this.config.passphrase;
      }
    } else {
      throw new Error(
        'Either token authentication or certificate authentication must be configured'
      );
    }

    this.provider = new apn.Provider(options);
  }

  /**
   * Test the APN connection
   */
  async testConnection() {
    try {
      logger.debug('Testing Apple Push Notification connection', {
        production: this.config.production,
        bundleId: this.config.bundleId,
      });

      // Create a test notification (won't be sent)
      const testNotification = new apn.Notification({
        alert: 'Test notification',
        topic: this.config.bundleId,
      });

      // Validate configuration
      if (!this.config.bundleId) {
        throw new Error('Bundle ID is required');
      }

      if (this.config.token) {
        if (!this.config.token.key || !this.config.token.keyId || !this.config.token.teamId) {
          throw new Error('Token authentication requires key, keyId, and teamId');
        }
      }

      return {
        success: true,
        message: 'Apple Push Notification configuration is valid',
        details: {
          production: this.config.production,
          bundleId: this.config.bundleId,
          authMethod: this.config.token ? 'token' : 'certificate',
        },
      };
    } catch (error) {
      logger.error('APN connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a push notification to iOS device
   */
  async sendMessage(message) {
    try {
      if (!this.validateRecipient(message.to)) {
        throw new Error('Invalid device token format');
      }

      const notification = new apn.Notification();

      // Set basic notification properties
      notification.alert = {
        title: message.subject,
        body: message.content,
      };

      // Set additional properties from metadata
      if (message.metadata) {
        if (message.metadata.badge) {
          notification.badge = message.metadata.badge;
        }
        if (message.metadata.sound) {
          notification.sound = message.metadata.sound;
        }
        if (message.metadata.category) {
          notification.category = message.metadata.category;
        }
        if (message.metadata.contentAvailable) {
          notification.contentAvailable = message.metadata.contentAvailable;
        }
        if (message.metadata.mutableContent) {
          notification.mutableContent = message.metadata.mutableContent;
        }
        if (message.metadata.threadId) {
          notification.threadId = message.metadata.threadId;
        }
        if (message.metadata.payload) {
          notification.payload = message.metadata.payload;
        }
        if (message.metadata.priority) {
          notification.priority = message.metadata.priority;
        }
        if (message.metadata.collapseId) {
          notification.collapseId = message.metadata.collapseId;
        }
      }

      // Set topic (bundle ID)
      notification.topic = this.config.bundleId;

      // Set expiry (default to 24 hours)
      notification.expiry = Math.floor(Date.now() / 1000) + (message.metadata?.ttl || 86400);

      const deviceTokens = Array.isArray(message.to) ? message.to : [message.to];
      const result = await this.provider.send(notification, deviceTokens);

      // Process results
      const successful = result.sent.length;
      const failed = result.failed.length;

      if (failed > 0) {
        logger.warn('Some APN notifications failed', {
          successful,
          failed,
          failures: result.failed,
        });
      }

      logger.info('APN notification sent', {
        successful,
        failed,
        deviceTokens: deviceTokens.length,
        subject: message.subject,
      });

      return {
        success: successful > 0,
        messageId: `apn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        results: {
          sent: result.sent,
          failed: result.failed,
        },
        summary: {
          successful,
          failed,
        },
      };
    } catch (error) {
      logger.error('Failed to send APN notification:', {
        error: error.message,
        subject: message.subject,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk push notifications
   */
  async sendBulkMessages(messages) {
    const results = [];

    for (const message of messages) {
      try {
        const result = await this.sendMessage(message);
        results.push(result);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    logger.info('Bulk APN notifications sent', {
      total: messages.length,
      successful: successCount,
      failed: messages.length - successCount,
    });

    return {
      success: successCount > 0,
      results,
      summary: {
        total: messages.length,
        successful: successCount,
        failed: messages.length - successCount,
      },
    };
  }

  /**
   * Get notification delivery status
   */
  async getMessageStatus(messageId) {
    // APNs doesn't provide direct delivery status tracking
    // This would require implementing feedback service or custom tracking
    return {
      status: 'sent',
      details: {
        messageId,
        note: 'APNs does not provide direct delivery status. Use feedback service for failed device tokens.',
      },
    };
  }

  /**
   * Get delivery statistics
   */
  async getStatistics(options = {}) {
    // APNs doesn't provide built-in statistics
    return {
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      note: 'APNs statistics require custom implementation with feedback service.',
    };
  }

  /**
   * Validate device token format
   */
  validateRecipient(recipient) {
    if (Array.isArray(recipient)) {
      return recipient.every(token => this._isValidDeviceToken(token));
    }
    return this._isValidDeviceToken(recipient);
  }

  /**
   * Validate single device token
   * @private
   */
  _isValidDeviceToken(token) {
    // iOS device tokens are 64 hexadecimal characters
    const tokenRegex = /^[a-fA-F0-9]{64}$/;
    return tokenRegex.test(token);
  }

  /**
   * Get supported message types
   */
  getSupportedMessageTypes() {
    return ['alert', 'silent', 'background', 'voip'];
  }

  /**
   * Get rate limits
   */
  getRateLimits() {
    return {
      sendRate: this.rateLimits.sendRate,
      dailyQuota: this.rateLimits.dailyQuota,
      burstLimit: 5000,
      timeWindow: '24h',
      connectionLimit: 1000, // concurrent connections to APNs
    };
  }

  /**
   * Close the APN provider connection
   */
  async shutdown() {
    if (this.provider) {
      this.provider.shutdown();
      logger.info('APN provider shutdown');
    }
  }

  /**
   * Get provider information
   */
  static getProviderInfo() {
    return {
      type: 'APN',
      name: 'Apple Push Notifications',
      description: 'Apple Push Notification service for iOS apps',
      features: [
        'iOS push notifications',
        'Silent notifications',
        'Background updates',
        'Rich notifications',
        'Notification categories',
        'Critical alerts',
        'Grouped notifications',
        'Badge management',
      ],
      icon: '🍎',
      category: 'push',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigValidation() {
    return {
      bundleId: {
        required: true,
        type: 'string',
        description: 'iOS app bundle identifier',
      },
      production: {
        required: false,
        type: 'boolean',
        description: 'Use production APNs environment',
        default: false,
      },
      token: {
        required: false,
        type: 'object',
        description: 'Token-based authentication (recommended)',
        properties: {
          key: {
            required: true,
            type: 'string',
            description: 'Path to .p8 key file or key content',
          },
          keyId: {
            required: true,
            type: 'string',
            description: 'Key ID from Apple Developer account',
          },
          teamId: {
            required: true,
            type: 'string',
            description: 'Team ID from Apple Developer account',
          },
        },
      },
      cert: {
        required: false,
        type: 'string',
        description: 'Path to certificate file (certificate-based auth)',
      },
      key: {
        required: false,
        type: 'string',
        description: 'Path to private key file (certificate-based auth)',
      },
      passphrase: {
        required: false,
        type: 'string',
        description: 'Passphrase for private key',
        sensitive: true,
      },
    };
  }
}

module.exports = APNProvider;
