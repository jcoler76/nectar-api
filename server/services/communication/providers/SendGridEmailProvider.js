const sgMail = require('@sendgrid/mail');
const ICommunicationProvider = require('../interfaces/ICommunicationProvider');
const { logger } = require('../../../utils/logger');

/**
 * SendGrid Email Provider
 * Provides email functionality using SendGrid API
 */
class SendGridEmailProvider extends ICommunicationProvider {
  constructor(config) {
    super(config);
    this.rateLimits = {
      sendRate: 100, // requests per second (varies by plan)
      dailyQuota: 100000, // emails per day (varies by plan)
    };

    this._initializeClient();
  }

  /**
   * Initialize SendGrid client
   * @private
   */
  _initializeClient() {
    if (!this.config.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    sgMail.setApiKey(this.config.apiKey);
  }

  /**
   * Test the SendGrid connection
   */
  async testConnection() {
    try {
      logger.debug('Testing SendGrid connection');

      // Test with a simple API call (get API key info)
      const request = {
        url: '/v3/user/account',
        method: 'GET',
      };

      await sgMail.request(request);

      return {
        success: true,
        message: 'SendGrid connection successful',
      };
    } catch (error) {
      logger.error('SendGrid connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          statusCode: error.response?.status,
        },
      };
    }
  }

  /**
   * Send an email message
   */
  async sendMessage(message) {
    try {
      if (!this.validateRecipient(message.to)) {
        throw new Error('Invalid recipient email address');
      }

      const msg = {
        to: Array.isArray(message.to) ? message.to : [message.to],
        from: message.from || this.config.defaultFrom,
        subject: message.subject,
      };

      // Handle HTML vs text content
      if (message.metadata?.contentType === 'text/html' || message.content.includes('<')) {
        msg.html = message.content;
      } else {
        msg.text = message.content;
      }

      // Add CC and BCC if provided
      if (message.metadata?.cc) {
        msg.cc = Array.isArray(message.metadata.cc) ? message.metadata.cc : [message.metadata.cc];
      }

      if (message.metadata?.bcc) {
        msg.bcc = Array.isArray(message.metadata.bcc)
          ? message.metadata.bcc
          : [message.metadata.bcc];
      }

      // Add reply-to if provided
      if (message.metadata?.replyTo) {
        msg.replyTo = message.metadata.replyTo;
      }

      // Add attachments if provided
      if (message.metadata?.attachments) {
        msg.attachments = message.metadata.attachments;
      }

      // Add custom headers if provided
      if (message.metadata?.headers) {
        msg.headers = message.metadata.headers;
      }

      const response = await sgMail.send(msg);

      logger.info('Email sent via SendGrid', {
        messageId: response[0].headers['x-message-id'],
        to: message.to,
        subject: message.subject,
        statusCode: response[0].statusCode,
      });

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        statusCode: response[0].statusCode,
      };
    } catch (error) {
      logger.error('Failed to send email via SendGrid:', {
        to: message.to,
        subject: message.subject,
        error: error.message,
        code: error.code,
      });
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  /**
   * Send bulk email messages
   */
  async sendBulkMessages(messages) {
    try {
      // SendGrid supports bulk sending with personalization
      const bulkMessages = messages.map(message => ({
        to: Array.isArray(message.to) ? message.to : [message.to],
        from: message.from || this.config.defaultFrom,
        subject: message.subject,
        ...(message.metadata?.contentType === 'text/html' || message.content.includes('<')
          ? { html: message.content }
          : { text: message.content }),
        ...(message.metadata?.cc && {
          cc: Array.isArray(message.metadata.cc) ? message.metadata.cc : [message.metadata.cc],
        }),
        ...(message.metadata?.bcc && {
          bcc: Array.isArray(message.metadata.bcc) ? message.metadata.bcc : [message.metadata.bcc],
        }),
      }));

      const response = await sgMail.send(bulkMessages);
      const results = response.map((res, index) => ({
        success: res.statusCode >= 200 && res.statusCode < 300,
        messageId: res.headers['x-message-id'],
        statusCode: res.statusCode,
      }));

      const successCount = results.filter(r => r.success).length;

      logger.info('Bulk email sent via SendGrid', {
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
    } catch (error) {
      logger.error('Failed to send bulk email via SendGrid:', error.message);

      // If bulk fails, fall back to individual sends
      const results = [];
      for (const message of messages) {
        const result = await this.sendMessage(message);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;

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
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId) {
    try {
      // SendGrid Activity API to check message status
      const request = {
        url: `/v3/messages`,
        method: 'GET',
        qs: {
          query: `msg_id="${messageId}"`,
          limit: 1,
        },
      };

      const response = await sgMail.request(request);

      if (response[1].messages && response[1].messages.length > 0) {
        const message = response[1].messages[0];
        return {
          status: message.status,
          details: {
            messageId,
            events: message.events,
            lastEventTimestamp: message.last_event_time,
          },
        };
      }

      return {
        status: 'unknown',
        details: {
          messageId,
          note: 'Message not found in activity feed',
        },
      };
    } catch (error) {
      logger.error('Failed to get message status from SendGrid:', error.message);
      return {
        status: 'error',
        details: {
          messageId,
          error: error.message,
        },
      };
    }
  }

  /**
   * Get delivery statistics
   */
  async getStatistics(options = {}) {
    try {
      const endDate = options.endDate || new Date().toISOString().split('T')[0];
      const startDate =
        options.startDate ||
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const request = {
        url: '/v3/stats',
        method: 'GET',
        qs: {
          start_date: startDate,
          end_date: endDate,
          aggregated_by: 'day',
        },
      };

      const response = await sgMail.request(request);
      const stats = response[1][0]?.stats[0]?.metrics || {};

      return {
        sent: stats.requests || 0,
        delivered: stats.delivered || 0,
        failed: (stats.bounces || 0) + (stats.invalid_emails || 0),
        pending: 0, // SendGrid doesn't provide pending count
        additional: {
          opens: stats.unique_opens || 0,
          clicks: stats.unique_clicks || 0,
          bounces: stats.bounces || 0,
          spam_reports: stats.spam_reports || 0,
          unsubscribes: stats.unsubscribes || 0,
        },
      };
    } catch (error) {
      logger.error('Failed to get SendGrid statistics:', error.message);
      throw error;
    }
  }

  /**
   * Validate email address format
   */
  validateRecipient(recipient) {
    if (Array.isArray(recipient)) {
      return recipient.every(email => this._isValidEmail(email));
    }
    return this._isValidEmail(recipient);
  }

  /**
   * Validate single email address
   * @private
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get supported message types
   */
  getSupportedMessageTypes() {
    return ['text', 'html', 'template', 'attachment'];
  }

  /**
   * Get rate limits
   */
  getRateLimits() {
    return {
      sendRate: this.rateLimits.sendRate,
      dailyQuota: this.rateLimits.dailyQuota,
      burstLimit: 1000,
      timeWindow: '24h',
    };
  }

  /**
   * Get provider information
   */
  static getProviderInfo() {
    return {
      type: 'SENDGRID',
      name: 'SendGrid',
      description: 'SendGrid email delivery service with advanced analytics',
      features: [
        'High deliverability',
        'Real-time analytics',
        'Template engine',
        'A/B testing',
        'Bounce management',
        'Click tracking',
        'Open tracking',
        'Unsubscribe management',
      ],
      icon: '📨',
      category: 'email',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigValidation() {
    return {
      apiKey: {
        required: true,
        type: 'string',
        description: 'SendGrid API key',
        sensitive: true,
      },
      defaultFrom: {
        required: true,
        type: 'string',
        description: 'Default sender email address',
      },
    };
  }
}

module.exports = SendGridEmailProvider;
