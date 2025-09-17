const S3StorageProvider = require('./providers/S3StorageProvider');
const LocalStorageProvider = require('./providers/LocalStorageProvider');
const AzureBlobStorageProvider = require('./providers/AzureBlobStorageProvider');
const GoogleCloudStorageProvider = require('./providers/GoogleCloudStorageProvider');
const { logger } = require('../../utils/logger');

/**
 * Storage Provider Factory
 * Creates appropriate storage provider instances based on provider type
 */
class StorageProviderFactory {
  static providers = new Map([
    ['S3', S3StorageProvider],
    ['LOCAL', LocalStorageProvider],
    ['AZURE_BLOB', AzureBlobStorageProvider],
    ['GCS', GoogleCloudStorageProvider],
  ]);

  /**
   * Create a storage provider instance
   * @param {string} providerType - Type of storage provider (S3, LOCAL, etc.)
   * @param {Object} config - Storage provider configuration
   * @returns {IStorageProvider} Storage provider instance
   */
  static createProvider(providerType, config) {
    const normalizedType = providerType.toUpperCase();

    if (!this.providers.has(normalizedType)) {
      throw new Error(
        `Unsupported storage provider: ${providerType}. Supported providers: ${Array.from(this.providers.keys()).join(', ')}`
      );
    }

    const ProviderClass = this.providers.get(normalizedType);
    return new ProviderClass(config);
  }

  /**
   * Register a new storage provider
   * @param {string} providerType - Storage provider type identifier
   * @param {class} ProviderClass - Provider class that extends IStorageProvider
   */
  static registerProvider(providerType, ProviderClass) {
    const normalizedType = providerType.toUpperCase();

    // Validate that the provider extends IStorageProvider
    const IStorageProvider = require('./interfaces/IStorageProvider');
    const testInstance = new ProviderClass({});
    if (!(testInstance instanceof IStorageProvider)) {
      throw new Error(`Provider for ${providerType} must extend IStorageProvider`);
    }

    this.providers.set(normalizedType, ProviderClass);
    logger.info(`Registered storage provider: ${normalizedType}`);
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
      throw new Error(`Unsupported storage provider: ${providerType}`);
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
   * Test a storage provider configuration
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
      logger.error('Provider test failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a unified storage service with multiple providers
   * @param {Array<{type: string, config: Object, name: string}>} providerConfigs
   * @returns {Object} Multi-provider storage service
   */
  static createMultiProviderService(providerConfigs) {
    const providers = new Map();

    // Initialize all providers
    for (const { type, config, name } of providerConfigs) {
      try {
        const provider = this.createProvider(type, config);
        providers.set(name, provider);
        logger.info(`Initialized storage provider: ${name} (${type})`);
      } catch (error) {
        logger.error(`Failed to initialize storage provider ${name}:`, error);
        throw error;
      }
    }

    return {
      /**
       * Get a specific provider by name
       */
      getProvider(name) {
        if (!providers.has(name)) {
          throw new Error(`Storage provider '${name}' not found`);
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
       * Upload file using specified provider
       */
      async uploadFile(providerName, buffer, key, metadata) {
        const provider = this.getProvider(providerName);
        return await provider.uploadFile(buffer, key, metadata);
      },

      /**
       * Download file using specified provider
       */
      async downloadFile(providerName, key) {
        const provider = this.getProvider(providerName);
        return await provider.downloadFile(key);
      },

      /**
       * Delete file using specified provider
       */
      async deleteFile(providerName, key) {
        const provider = this.getProvider(providerName);
        return await provider.deleteFile(key);
      },

      /**
       * List files using specified provider
       */
      async listFiles(providerName, prefix, limit) {
        const provider = this.getProvider(providerName);
        return await provider.listFiles(prefix, limit);
      },

      /**
       * Generate presigned URL using specified provider
       */
      async generatePresignedUrl(providerName, key, operation, expiresIn) {
        const provider = this.getProvider(providerName);
        return await provider.generatePresignedUrl(key, operation, expiresIn);
      },

      /**
       * Copy file within a provider
       */
      async copyFile(providerName, sourceKey, destinationKey) {
        const provider = this.getProvider(providerName);
        return await provider.copyFile(sourceKey, destinationKey);
      },

      /**
       * Move file within a provider
       */
      async moveFile(providerName, sourceKey, destinationKey) {
        const provider = this.getProvider(providerName);
        return await provider.moveFile(sourceKey, destinationKey);
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
      async getStats() {
        const stats = {};

        for (const [name, provider] of providers.entries()) {
          try {
            if (typeof provider.getStats === 'function') {
              stats[name] = await provider.getStats();
            } else {
              stats[name] = { message: 'Stats not supported by this provider' };
            }
          } catch (error) {
            stats[name] = { error: error.message };
          }
        }

        return stats;
      },
    };
  }
}

module.exports = StorageProviderFactory;
