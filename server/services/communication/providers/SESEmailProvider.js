const {
  SESClient,
  SendEmailCommand,
  SendBulkTemplatedEmailCommand,
  GetSendQuotaCommand,
} = require('@aws-sdk/client-ses');
const ICommunicationProvider = require('../interfaces/ICommunicationProvider');
const { logger } = require('../../../utils/logger');

/**
 * AWS SES Email Provider
 * Provides email functionality using Amazon Simple Email Service
 */
class SESEmailProvider extends ICommunicationProvider {
  constructor(config) {
    super(config);
    this.client = null;
    this.rateLimits = {
      sendRate: 14, // messages per second (SES default)
      dailyQuota: 200, // messages per 24 hours (SES default)
    };

    this._initializeClient();
  }

  /**
   * Initialize AWS SES client
   * @private
   */
  _initializeClient() {
    const clientConfig = {
      region: this.config.region || 'us-east-1',
    };

    if (this.config.accessKeyId && this.config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      };
    }

    this.client = new SESClient(clientConfig);
  }

  /**
   * Test the SES connection and configuration
   */
  async testConnection() {
    try {
      logger.debug('Testing AWS SES connection', {
        region: this.config.region,
      });

      // Test by getting send quota
      const command = new GetSendQuotaCommand({});
      const response = await this.client.send(command);

      this.rateLimits.sendRate = response.MaxSendRate;
      this.rateLimits.dailyQuota = response.Max24HourSend;

      return {
        success: true,
        message: 'AWS SES connection successful',
        details: {
          sendRate: response.MaxSendRate,
          dailyQuota: response.Max24HourSend,
          sentLast24Hours: response.SentLast24Hours,
        },
      };
    } catch (error) {
      logger.error('AWS SES connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.name,
          statusCode: error.$metadata?.httpStatusCode,
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

      const params = {
        Source: message.from || this.config.defaultFrom,
        Destination: {
          ToAddresses: Array.isArray(message.to) ? message.to : [message.to],
        },
        Message: {
          Subject: {
            Data: message.subject,
            Charset: 'UTF-8',
          },
          Body: {},
        },
      };

      // Handle HTML vs text content
      if (message.metadata?.contentType === 'text/html' || message.content.includes('<')) {
        params.Message.Body.Html = {
          Data: message.content,
          Charset: 'UTF-8',
        };
      } else {
        params.Message.Body.Text = {
          Data: message.content,
          Charset: 'UTF-8',
        };
      }

      // Add CC and BCC if provided
      if (message.metadata?.cc) {
        params.Destination.CcAddresses = Array.isArray(message.metadata.cc)
          ? message.metadata.cc
          : [message.metadata.cc];
      }

      if (message.metadata?.bcc) {
        params.Destination.BccAddresses = Array.isArray(message.metadata.bcc)
          ? message.metadata.bcc
          : [message.metadata.bcc];
      }

      const command = new SendEmailCommand(params);
      const response = await this.client.send(command);

      logger.info('Email sent via AWS SES', {
        messageId: response.MessageId,
        to: message.to,
        subject: message.subject,
      });

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      logger.error('Failed to send email via AWS SES:', {
        to: message.to,
        subject: message.subject,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk email messages
   */
  async sendBulkMessages(messages) {
    const results = [];

    for (const message of messages) {
      try {
        const result = await this.sendMessage(message);
        results.push(result);

        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
        });
      }
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

  /**
   * Get message delivery status (SES doesn't provide direct status checking)
   */
  async getMessageStatus(messageId) {
    // SES doesn't provide a direct API to check message status
    // This would typically require SNS notifications or CloudWatch logs
    return {
      status: 'sent',
      details: {
        messageId,
        note: 'SES does not provide direct status checking. Use SNS notifications for delivery tracking.',
      },
    };
  }

  /**
   * Get delivery statistics
   */
  async getStatistics(options = {}) {
    try {
      const command = new GetSendQuotaCommand({});
      const response = await this.client.send(command);

      return {
        sent: response.SentLast24Hours || 0,
        delivered: response.SentLast24Hours || 0, // SES doesn't distinguish
        failed: 0, // Would need CloudWatch metrics for this
        pending: 0,
        quota: {
          dailyLimit: response.Max24HourSend,
          sendRate: response.MaxSendRate,
          remaining: response.Max24HourSend - (response.SentLast24Hours || 0),
        },
      };
    } catch (error) {
      logger.error('Failed to get SES statistics:', error.message);
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
    return ['text', 'html', 'template'];
  }

  /**
   * Get rate limits
   */
  getRateLimits() {
    return {
      sendRate: this.rateLimits.sendRate,
      dailyQuota: this.rateLimits.dailyQuota,
      burstLimit: 100, // SES allows bursts
      timeWindow: '24h',
    };
  }

  /**
   * Get provider information
   */
  static getProviderInfo() {
    return {
      type: 'SES',
      name: 'Amazon SES',
      description: 'Amazon Simple Email Service for reliable email delivery',
      features: [
        'High deliverability rates',
        'Bounce and complaint handling',
        'DKIM signing',
        'Dedicated IP pools',
        'Reputation tracking',
        'Integration with SNS for notifications',
      ],
      icon: '📧',
      category: 'email',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigValidation() {
    return {
      region: {
        required: true,
        type: 'string',
        description: 'AWS region for SES service',
        default: 'us-east-1',
      },
      accessKeyId: {
        required: false,
        type: 'string',
        description: 'AWS access key ID (use IAM roles if possible)',
      },
      secretAccessKey: {
        required: false,
        type: 'string',
        description: 'AWS secret access key',
        sensitive: true,
      },
      defaultFrom: {
        required: true,
        type: 'string',
        description: 'Default sender email address (must be verified in SES)',
      },
    };
  }
}

module.exports = SESEmailProvider;
