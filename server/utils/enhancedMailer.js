const CommunicationProviderFactory = require('../services/communication/CommunicationProviderFactory');
const { logger } = require('./logger');
const nodemailer = require('nodemailer');

/**
 * Enhanced Mailer with Multi-Provider Support
 * Integrates our Phase 2 communication services with the existing workflow system
 */
class EnhancedMailer {
  constructor() {
    this.providers = new Map();
    this.fallbackTransporter = null;
    this.initialized = false;
  }

  /**
   * Initialize the enhanced mailer with configured providers
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize providers based on environment configuration
      await this._initializeProviders();
      await this._initializeFallback();

      this.initialized = true;
      logger.info('Enhanced Mailer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Enhanced Mailer:', error.message);
      // Fall back to basic nodemailer
      await this._initializeFallback();
      this.initialized = true;
    }
  }

  /**
   * Initialize communication providers based on environment
   * @private
   */
  async _initializeProviders() {
    const providers = [];

    // AWS SES Provider
    if (process.env.AWS_SES_REGION && process.env.AWS_SES_DEFAULT_FROM) {
      try {
        const sesProvider = CommunicationProviderFactory.createProvider('SES', {
          region: process.env.AWS_SES_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          defaultFrom: process.env.AWS_SES_DEFAULT_FROM,
        });

        this.providers.set('ses', sesProvider);
        providers.push('AWS SES');
        logger.info('AWS SES provider initialized');
      } catch (error) {
        logger.warn('Failed to initialize AWS SES provider:', error.message);
      }
    }

    // SendGrid Provider
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_DEFAULT_FROM) {
      try {
        const sendgridProvider = CommunicationProviderFactory.createProvider('SENDGRID', {
          apiKey: process.env.SENDGRID_API_KEY,
          defaultFrom: process.env.SENDGRID_DEFAULT_FROM,
        });

        this.providers.set('sendgrid', sendgridProvider);
        providers.push('SendGrid');
        logger.info('SendGrid provider initialized');
      } catch (error) {
        logger.warn('Failed to initialize SendGrid provider:', error.message);
      }
    }

    if (providers.length > 0) {
      logger.info(`Enhanced Mailer providers available: ${providers.join(', ')}`);
    } else {
      logger.info('No enhanced email providers configured, using fallback');
    }
  }

  /**
   * Initialize fallback nodemailer transporter
   * @private
   */
  async _initializeFallback() {
    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
      const testAccount = await nodemailer.createTestAccount();
      logger.info('Using Ethereal for development emails');

      this.fallbackTransporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } else {
      this.fallbackTransporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
  }

  /**
   * Send email with automatic provider selection and failover
   */
  async sendEmail({ to, subject, html, attachments, provider = 'auto' }) {
    await this.initialize();

    // If specific provider requested
    if (provider !== 'auto' && this.providers.has(provider)) {
      return await this._sendWithProvider(provider, { to, subject, html, attachments });
    }

    // Auto provider selection with failover
    const providerPriority = ['ses', 'sendgrid']; // Prefer SES, then SendGrid

    for (const providerName of providerPriority) {
      if (this.providers.has(providerName)) {
        try {
          const result = await this._sendWithProvider(providerName, {
            to,
            subject,
            html,
            attachments,
          });
          if (result.success) {
            return {
              ...result,
              usedProvider: providerName,
              enhancedFeatures: true,
            };
          }
        } catch (error) {
          logger.warn(`Provider ${providerName} failed, trying next:`, error.message);
        }
      }
    }

    // Fallback to basic nodemailer
    logger.info('Using fallback nodemailer transport');
    return await this._sendWithFallback({ to, subject, html, attachments });
  }

  /**
   * Send email using specific provider
   * @private
   */
  async _sendWithProvider(providerName, message) {
    const provider = this.providers.get(providerName);

    const result = await provider.sendMessage({
      to: message.to,
      subject: message.subject,
      content: message.html,
      metadata: {
        contentType: 'text/html',
        attachments: message.attachments,
      },
    });

    if (result.success) {
      logger.info(`Email sent via ${providerName}: ${result.messageId}`);
      return {
        success: true,
        messageId: result.messageId,
        provider: providerName,
      };
    } else {
      throw new Error(result.error);
    }
  }

  /**
   * Send email using fallback nodemailer
   * @private
   */
  async _sendWithFallback(message) {
    try {
      const info = await this.fallbackTransporter.sendMail({
        from: process.env.EMAIL_FROM || '"Nectar Studio" <no-reply@example.com>',
        to: message.to,
        subject: message.subject,
        html: message.html,
        attachments: message.attachments,
      });

      // Log preview URL for development
      if (process.env.NODE_ENV === 'development' && nodemailer.getTestMessageUrl) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          logger.info('📬 Email Preview URL: ' + previewUrl);
        }
      }

      logger.info(`Email sent via fallback: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        previewUrl:
          process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : null,
        provider: 'fallback',
        enhancedFeatures: false,
      };
    } catch (error) {
      logger.error('Fallback email sending failed:', error.message);
      throw new Error('Failed to send email with all providers');
    }
  }

  /**
   * Get email statistics from all providers
   */
  async getStatistics() {
    await this.initialize();

    const stats = {};

    for (const [name, provider] of this.providers.entries()) {
      try {
        stats[name] = await provider.getStatistics();
      } catch (error) {
        stats[name] = { error: error.message };
      }
    }

    return stats;
  }

  /**
   * Test all provider connections
   */
  async testProviders() {
    await this.initialize();

    const results = {};

    for (const [name, provider] of this.providers.entries()) {
      try {
        results[name] = await provider.testConnection();
      } catch (error) {
        results[name] = {
          success: false,
          error: error.message,
        };
      }
    }

    return results;
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }
}

// Create singleton instance
const enhancedMailer = new EnhancedMailer();

/**
 * Enhanced sendEmail function with backward compatibility
 */
const sendEmail = async ({ to, subject, html, attachments, provider }) => {
  return await enhancedMailer.sendEmail({ to, subject, html, attachments, provider });
};

module.exports = {
  sendEmail,
  enhancedMailer,
  EnhancedMailer,
};
