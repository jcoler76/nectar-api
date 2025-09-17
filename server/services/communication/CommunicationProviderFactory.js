const SESEmailProvider = require('./providers/SESEmailProvider');
const SendGridEmailProvider = require('./providers/SendGridEmailProvider');
const WebPushProvider = require('./providers/WebPushProvider');
const APNProvider = require('./providers/APNProvider');
const { logger } = require('../../utils/logger');

/**
 * Communication Provider Factory
 * Creates appropriate communication provider instances based on provider type
 */
class CommunicationProviderFactory {
  static providers = new Map([
    ['SES', SESEmailProvider],
    ['SENDGRID', SendGridEmailProvider],
    ['WEBPUSH', WebPushProvider],
    ['APN', APNProvider],
  ]);

  /**
   * Create a communication provider instance
   * @param {string} providerType - Type of communication provider (SES, SENDGRID, etc.)
   * @param {Object} config - Provider configuration
   * @returns {ICommunicationProvider} Communication provider instance
   */
  static createProvider(providerType, config) {
    const normalizedType = providerType.toUpperCase();

    if (!this.providers.has(normalizedType)) {
      throw new Error(
        `Unsupported communication provider: ${providerType}. Supported providers: ${Array.from(this.providers.keys()).join(', ')}`
      );
    }

    const ProviderClass = this.providers.get(normalizedType);
    return new ProviderClass(config);
  }

  /**
   * Register a new communication provider
   * @param {string} providerType - Provider type identifier
   * @param {class} ProviderClass - Provider class that extends ICommunicationProvider
   */
  static registerProvider(providerType, ProviderClass) {
    const normalizedType = providerType.toUpperCase();

    // Validate that the provider extends ICommunicationProvider
    const ICommunicationProvider = require('./interfaces/ICommunicationProvider');
    const testInstance = new ProviderClass({});
    if (!(testInstance instanceof ICommunicationProvider)) {
      throw new Error(`Provider for ${providerType} must extend ICommunicationProvider`);
    }

    this.providers.set(normalizedType, ProviderClass);
    logger.info(`Registered communication provider: ${normalizedType}`);
  }

  /**
   * Get all supported provider types
   * @returns {string[]} Array of supported provider types
   */
  static getSupportedTypes() {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider type is supported
   * @param {string} providerType - Provider type to check
   * @returns {boolean} True if supported
   */
  static isTypeSupported(providerType) {
    return this.providers.has(providerType.toUpperCase());
  }

  /**
   * Get configuration validation rules for a provider type
   * @param {string} providerType - Provider type
   * @returns {Object} Validation rules
   */
  static getValidationRules(providerType) {
    const normalizedType = providerType.toUpperCase();

    if (!this.providers.has(normalizedType)) {
      throw new Error(`Unsupported communication provider: ${providerType}`);
    }

    const ProviderClass = this.providers.get(normalizedType);
    return ProviderClass.getConfigValidation();
  }

  /**
   * Get provider type info with display names and descriptions
   * @returns {Object[]} Array of provider type information
   */
  static getProviderTypeInfo() {
    return Array.from(this.providers.entries()).map(([type, ProviderClass]) => {
      const info = ProviderClass.getProviderInfo();
      return {
        type,
        ...info,
        validation: ProviderClass.getConfigValidation(),
      };
    });
  }

  /**
   * Test a communication provider configuration
   * @param {string} providerType - Provider type
   * @param {Object} config - Provider configuration
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  static async testProvider(providerType, config) {
    try {
      const provider = this.createProvider(providerType, config);
      const result = await provider.testConnection();
      return result;
    } catch (error) {
      logger.error('Communication provider test failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a unified communication service with multiple providers
   * @param {Array<{type: string, config: Object, name: string}>} providerConfigs
   * @returns {Object} Multi-provider communication service
   */
  static createMultiProviderService(providerConfigs) {
    const providers = new Map();

    // Initialize all providers
    for (const { type, config, name } of providerConfigs) {
      try {
        const provider = this.createProvider(type, config);
        providers.set(name, provider);
        logger.info(`Initialized communication provider: ${name} (${type})`);
      } catch (error) {
        logger.error(`Failed to initialize communication provider ${name}:`, error);
        throw error;
      }
    }

    return {
      /**
       * Get a specific provider by name
       */
      getProvider(name) {
        if (!providers.has(name)) {
          throw new Error(`Communication provider '${name}' not found`);
        }
        return providers.get(name);
      },

      /**
       * Get all provider names
       */
      getProviderNames() {
        return Array.from(providers.keys());
      },

      /**
       * Send message using specified provider
       */
      async sendMessage(providerName, message) {
        const provider = this.getProvider(providerName);
        return await provider.sendMessage(message);
      },

      /**
       * Send bulk messages using specified provider
       */
      async sendBulkMessages(providerName, messages) {
        const provider = this.getProvider(providerName);
        return await provider.sendBulkMessages(messages);
      },

      /**
       * Get message status using specified provider
       */
      async getMessageStatus(providerName, messageId) {
        const provider = this.getProvider(providerName);
        return await provider.getMessageStatus(messageId);
      },

      /**
       * Get statistics from specified provider
       */
      async getStatistics(providerName, options) {
        const provider = this.getProvider(providerName);
        return await provider.getStatistics(options);
      },

      /**
       * Validate recipient using specified provider
       */
      validateRecipient(providerName, recipient) {
        const provider = this.getProvider(providerName);
        return provider.validateRecipient(recipient);
      },

      /**
       * Get supported message types from specified provider
       */
      getSupportedMessageTypes(providerName) {
        const provider = this.getProvider(providerName);
        return provider.getSupportedMessageTypes();
      },

      /**
       * Get rate limits from specified provider
       */
      getRateLimits(providerName) {
        const provider = this.getProvider(providerName);
        return provider.getRateLimits();
      },

      /**
       * Test all providers
       */
      async testAllProviders() {
        const results = {};

        for (const [name, provider] of providers.entries()) {
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
      },

      /**
       * Get statistics from all providers
       */
      async getAllStatistics(options = {}) {
        const stats = {};

        for (const [name, provider] of providers.entries()) {
          try {
            stats[name] = await provider.getStatistics(options);
          } catch (error) {
            stats[name] = { error: error.message };
          }
        }

        return stats;
      },

      /**
       * Send message with automatic failover
       */
      async sendMessageWithFailover(message, providerPriority = []) {
        const providersToTry =
          providerPriority.length > 0 ? providerPriority : Array.from(providers.keys());

        let lastError;

        for (const providerName of providersToTry) {
          try {
            if (providers.has(providerName)) {
              const result = await this.sendMessage(providerName, message);
              if (result.success) {
                logger.info(`Message sent successfully using provider: ${providerName}`);
                return { ...result, usedProvider: providerName };
              }
              lastError = result.error;
            }
          } catch (error) {
            lastError = error.message;
            logger.warn(`Provider ${providerName} failed, trying next provider:`, error.message);
          }
        }

        throw new Error(`All communication providers failed. Last error: ${lastError}`);
      },
    };
  }

  /**
   * Get providers by category (email, sms, push, etc.)
   * @param {string} category - Provider category
   * @returns {Object[]} Array of providers in the category
   */
  static getProvidersByCategory(category) {
    return this.getProviderTypeInfo().filter(provider => provider.category === category);
  }

  /**
   * Get email providers specifically
   * @returns {Object[]} Array of email providers
   */
  static getEmailProviders() {
    return this.getProvidersByCategory('email');
  }

  /**
   * Get push notification providers specifically
   * @returns {Object[]} Array of push providers
   */
  static getPushProviders() {
    return this.getProvidersByCategory('push');
  }

  /**
   * Generate VAPID keys for Web Push
   * @returns {Object} VAPID key pair
   */
  static generateVAPIDKeys() {
    const WebPushProvider = require('./providers/WebPushProvider');
    return WebPushProvider.generateVAPIDKeys();
  }
}

module.exports = CommunicationProviderFactory;
