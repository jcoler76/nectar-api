const webpush = require('web-push');
const ICommunicationProvider = require('../interfaces/ICommunicationProvider');
const { logger } = require('../../../utils/logger');

/**
 * Web Push Notification Provider
 * Provides push notification functionality using Web Push Protocol
 */
class WebPushProvider extends ICommunicationProvider {
  constructor(config) {
    super(config);
    this.rateLimits = {
      sendRate: 1000, // notifications per second
      dailyQuota: 1000000, // notifications per day
    };

    this._initializeClient();
  }

  /**
   * Initialize Web Push client
   * @private
   */
  _initializeClient() {
    if (
      !this.config.vapidKeys ||
      !this.config.vapidKeys.publicKey ||
      !this.config.vapidKeys.privateKey
    ) {
      throw new Error('VAPID keys are required for Web Push');
    }

    webpush.setVapidDetails(
      this.config.vapidSubject || 'mailto:admin@example.com',
      this.config.vapidKeys.publicKey,
      this.config.vapidKeys.privateKey
    );

    if (this.config.gcmApiKey) {
      webpush.setGCMAPIKey(this.config.gcmApiKey);
    }
  }

  /**
   * Test the push notification service
   */
  async testConnection() {
    try {
      logger.debug('Testing Web Push configuration');

      // Validate VAPID keys format
      if (
        !this.config.vapidKeys.publicKey.startsWith('B') ||
        this.config.vapidKeys.publicKey.length !== 88
      ) {
        throw new Error('Invalid VAPID public key format');
      }

      if (this.config.vapidKeys.privateKey.length !== 43) {
        throw new Error('Invalid VAPID private key format');
      }

      return {
        success: true,
        message: 'Web Push configuration is valid',
        details: {
          publicKey: this.config.vapidKeys.publicKey,
          hasGCMKey: !!this.config.gcmApiKey,
        },
      };
    } catch (error) {
      logger.error('Web Push configuration test failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a push notification
   */
  async sendMessage(message) {
    try {
      if (!this.validateRecipient(message.to)) {
        throw new Error('Invalid push subscription format');
      }

      const subscription = typeof message.to === 'string' ? JSON.parse(message.to) : message.to;

      const payload = JSON.stringify({
        title: message.subject,
        body: message.content,
        icon: message.metadata?.icon || '/default-icon.png',
        badge: message.metadata?.badge || '/default-badge.png',
        image: message.metadata?.image,
        data: message.metadata?.data || {},
        actions: message.metadata?.actions || [],
        tag: message.metadata?.tag,
        renotify: message.metadata?.renotify || false,
        requireInteraction: message.metadata?.requireInteraction || false,
        silent: message.metadata?.silent || false,
        timestamp: Date.now(),
      });

      const options = {
        TTL: message.metadata?.ttl || 86400, // 24 hours default
        urgency: message.metadata?.urgency || 'normal', // low, normal, high
        topic: message.metadata?.topic,
        headers: message.metadata?.headers || {},
      };

      const response = await webpush.sendNotification(subscription, payload, options);

      logger.info('Push notification sent', {
        endpoint: subscription.endpoint,
        statusCode: response.statusCode,
        subject: message.subject,
      });

      return {
        success: true,
        messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        statusCode: response.statusCode,
        headers: response.headers,
      };
    } catch (error) {
      logger.error('Failed to send push notification:', {
        error: error.message,
        statusCode: error.statusCode,
        subject: message.subject,
      });

      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
  }

  /**
   * Send bulk push notifications
   */
  async sendBulkMessages(messages) {
    const results = [];
    const promises = messages.map(async (message, index) => {
      try {
        const result = await this.sendMessage(message);
        return { index, result };
      } catch (error) {
        return {
          index,
          result: {
            success: false,
            error: error.message,
          },
        };
      }
    });

    // Send notifications in batches to respect rate limits
    const batchSize = 50;
    for (let i = 0; i < promises.length; i += batchSize) {
      const batch = promises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);

      batchResults.forEach(({ index, result }) => {
        results[index] = result;
      });

      // Small delay between batches
      if (i + batchSize < promises.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success).length;

    logger.info('Bulk push notifications sent', {
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
   * Get push notification delivery status
   */
  async getMessageStatus(messageId) {
    // Web Push doesn't provide delivery tracking by default
    // This would require custom implementation with service worker confirmation
    return {
      status: 'sent',
      details: {
        messageId,
        note: 'Web Push does not provide delivery tracking. Implement service worker confirmation for delivery status.',
      },
    };
  }

  /**
   * Get push notification statistics
   */
  async getStatistics(options = {}) {
    // Web Push doesn't provide built-in analytics
    // This would require custom tracking implementation
    return {
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      note: 'Web Push statistics require custom implementation. Consider integrating with analytics service.',
    };
  }

  /**
   * Validate push subscription format
   */
  validateRecipient(recipient) {
    try {
      const subscription = typeof recipient === 'string' ? JSON.parse(recipient) : recipient;

      return (
        subscription &&
        typeof subscription === 'object' &&
        subscription.endpoint &&
        subscription.keys &&
        subscription.keys.p256dh &&
        subscription.keys.auth
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported message types
   */
  getSupportedMessageTypes() {
    return ['notification', 'data', 'silent'];
  }

  /**
   * Get rate limits
   */
  getRateLimits() {
    return {
      sendRate: this.rateLimits.sendRate,
      dailyQuota: this.rateLimits.dailyQuota,
      burstLimit: 10000,
      timeWindow: '24h',
      note: 'Actual limits depend on browser vendor (Chrome, Firefox, etc.)',
    };
  }

  /**
   * Generate VAPID keys
   */
  static generateVAPIDKeys() {
    return webpush.generateVAPIDKeys();
  }

  /**
   * Get provider information
   */
  static getProviderInfo() {
    return {
      type: 'WEBPUSH',
      name: 'Web Push',
      description: 'Web Push Protocol for browser push notifications',
      features: [
        'Cross-browser support',
        'No app installation required',
        'Background notifications',
        'Rich notification support',
        'Action buttons',
        'Custom icons and images',
        'TTL and urgency control',
      ],
      icon: '🔔',
      category: 'push',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigValidation() {
    return {
      vapidKeys: {
        required: true,
        type: 'object',
        description: 'VAPID key pair for push notifications',
        properties: {
          publicKey: {
            required: true,
            type: 'string',
            description: 'VAPID public key (88 characters starting with B)',
          },
          privateKey: {
            required: true,
            type: 'string',
            description: 'VAPID private key (43 characters)',
            sensitive: true,
          },
        },
      },
      vapidSubject: {
        required: false,
        type: 'string',
        description: 'VAPID subject (mailto: or https: URL)',
        default: 'mailto:admin@example.com',
      },
      gcmApiKey: {
        required: false,
        type: 'string',
        description: 'GCM API key for legacy Chrome support',
        sensitive: true,
      },
    };
  }
}

module.exports = WebPushProvider;
