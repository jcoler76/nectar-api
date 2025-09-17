const RedisProvider = require('./providers/RedisProvider');
const MemcachedProvider = require('./providers/MemcachedProvider');
const MemoryProvider = require('./providers/MemoryProvider');
const { logger } = require('../../utils/logger');

/**
 * Cache Provider Factory
 * Creates and manages cache provider instances with distributed management
 */
class CacheProviderFactory {
  static providers = new Map([
    ['REDIS', RedisProvider],
    ['MEMCACHED', MemcachedProvider],
    ['MEMORY', MemoryProvider],
  ]);

  /**
   * Create a cache provider instance
   * @param {string} providerType - Type of cache provider (REDIS, MEMCACHED, MEMORY)
   * @param {Object} configuration - Provider configuration
   * @returns {ICacheProvider} Cache provider instance
   */
  static createProvider(providerType, configuration) {
    const normalizedType = providerType.toUpperCase();

    if (!this.providers.has(normalizedType)) {
      throw new Error(
        `Unsupported cache provider type: ${providerType}. Supported types: ${Array.from(this.providers.keys()).join(', ')}`
      );
    }

    const ProviderClass = this.providers.get(normalizedType);
    return new ProviderClass(configuration);
  }

  /**
   * Register a new cache provider
   * @param {string} providerType - Provider type identifier
   * @param {class} ProviderClass - Provider class
   */
  static registerProvider(providerType, ProviderClass) {
    const normalizedType = providerType.toUpperCase();
    this.providers.set(normalizedType, ProviderClass);
    logger.info(`Registered cache provider: ${normalizedType}`);
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
   * Get validation rules for a provider type
   * @param {string} providerType - Provider type
   * @returns {Object} Validation rules
   */
  static getValidationRules(providerType) {
    const normalizedType = providerType.toUpperCase();

    if (!this.providers.has(normalizedType)) {
      throw new Error(`Unsupported cache provider type: ${providerType}`);
    }

    const ProviderClass = this.providers.get(normalizedType);
    return ProviderClass.getConfigurationValidation();
  }

  /**
   * Get provider type information with display names and descriptions
   * @returns {Object[]} Array of provider type information
   */
  static getProviderTypeInfo() {
    const providerTypes = [];

    for (const [type, ProviderClass] of this.providers.entries()) {
      try {
        const providerInfo = ProviderClass.getProviderInfo();
        providerTypes.push({
          type,
          displayName: providerInfo.name,
          description: providerInfo.description,
          category: providerInfo.category || 'cache',
          features: providerInfo.features || [],
          requirements: providerInfo.requirements || [],
          defaultPort: providerInfo.defaultPort,
          icon: this._getIconForType(type),
        });
      } catch (error) {
        // Fallback for providers without getProviderInfo
        providerTypes.push({
          type,
          displayName: type,
          description: `${type} cache provider`,
          category: 'cache',
          features: [],
          requirements: [],
          icon: this._getIconForType(type),
        });
      }
    }

    return providerTypes;
  }

  /**
   * Get icon for provider type
   * @private
   */
  static _getIconForType(type) {
    const icons = {
      REDIS: '🔴',
      MEMCACHED: '💾',
      MEMORY: '🧠',
    };
    return icons[type] || '💿';
  }

  /**
   * Create multiple cache provider instances from configuration array
   * @param {Array} configurations - Array of provider configurations
   * @returns {Map} Map of provider instances keyed by name
   */
  static createMultipleProviders(configurations) {
    const providers = new Map();

    for (const config of configurations) {
      try {
        const provider = this.createProvider(config.type, config);
        const providerName = config.name || `${config.type}_${providers.size}`;
        providers.set(providerName, provider);

        logger.info('Cache provider created', {
          name: providerName,
          type: config.type,
        });
      } catch (error) {
        logger.error('Failed to create cache provider', {
          type: config.type,
          name: config.name,
          error: error.message,
        });
      }
    }

    return providers;
  }

  /**
   * Test connection for multiple providers
   * @param {Map} providers - Map of provider instances
   * @returns {Object} Test results for each provider
   */
  static async testMultipleConnections(providers) {
    const results = {};

    for (const [name, provider] of providers) {
      try {
        results[name] = await provider.testConnection();
        logger.debug('Cache provider connection tested', {
          name,
          success: results[name].success,
        });
      } catch (error) {
        results[name] = {
          success: false,
          error: error.message,
          timestamp: new Date(),
        };
        logger.error('Cache provider connection test failed', {
          name,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Connect multiple providers
   * @param {Map} providers - Map of provider instances
   * @returns {Object} Connection results for each provider
   */
  static async connectMultipleProviders(providers) {
    const results = {};

    for (const [name, provider] of providers) {
      try {
        await provider.connect();
        results[name] = { success: true, timestamp: new Date() };

        logger.info('Cache provider connected', { name });
      } catch (error) {
        results[name] = {
          success: false,
          error: error.message,
          timestamp: new Date(),
        };

        logger.error('Cache provider connection failed', {
          name,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Disconnect multiple providers
   * @param {Map} providers - Map of provider instances
   */
  static async disconnectMultipleProviders(providers) {
    const promises = [];

    for (const [name, provider] of providers) {
      promises.push(
        provider.disconnect().catch(error => {
          logger.warn('Failed to disconnect cache provider', {
            name,
            error: error.message,
          });
        })
      );
    }

    await Promise.allSettled(promises);
    logger.info('All cache providers disconnected');
  }

  /**
   * Get status for multiple providers
   * @param {Map} providers - Map of provider instances
   * @returns {Object} Status for each provider
   */
  static getMultipleProviderStatus(providers) {
    const statuses = {};

    for (const [name, provider] of providers) {
      try {
        statuses[name] = provider.getStatus();
      } catch (error) {
        statuses[name] = {
          error: error.message,
        };
      }
    }

    return statuses;
  }

  /**
   * Get combined statistics from multiple providers
   * @param {Map} providers - Map of provider instances
   * @returns {Object} Combined statistics
   */
  static getCombinedStats(providers) {
    const combinedStats = {
      totalHits: 0,
      totalMisses: 0,
      totalSets: 0,
      totalDeletes: 0,
      totalErrors: 0,
      providers: {},
    };

    for (const [name, provider] of providers) {
      try {
        const stats = provider.getStats();
        combinedStats.providers[name] = stats;

        combinedStats.totalHits += stats.hits || 0;
        combinedStats.totalMisses += stats.misses || 0;
        combinedStats.totalSets += stats.sets || 0;
        combinedStats.totalDeletes += stats.deletes || 0;
        combinedStats.totalErrors += stats.errors || 0;
      } catch (error) {
        logger.warn('Failed to get stats from cache provider', {
          name,
          error: error.message,
        });
      }
    }

    combinedStats.totalOperations = combinedStats.totalHits + combinedStats.totalMisses;
    combinedStats.overallHitRatio =
      combinedStats.totalOperations > 0
        ? combinedStats.totalHits / combinedStats.totalOperations
        : 0;

    return combinedStats;
  }

  /**
   * Create provider configuration template
   * @param {string} providerType - Provider type
   * @returns {Object} Configuration template
   */
  static createConfigurationTemplate(providerType) {
    const normalizedType = providerType.toUpperCase();

    if (!this.providers.has(normalizedType)) {
      throw new Error(`Unsupported cache provider type: ${providerType}`);
    }

    const ProviderClass = this.providers.get(normalizedType);
    const validation = ProviderClass.getConfigurationValidation();
    const template = {};

    for (const [key, rules] of Object.entries(validation)) {
      template[key] = rules.default || (rules.required ? '' : null);
    }

    return {
      type: providerType,
      name: `${providerType.toLowerCase()}_cache`,
      ...template,
    };
  }

  /**
   * Validate provider configuration
   * @param {Object} config - Provider configuration
   * @returns {Object} Validation result
   */
  static validateConfiguration(config) {
    if (!config.type) {
      return {
        valid: false,
        errors: ['Provider type is required'],
      };
    }

    try {
      const validation = this.getValidationRules(config.type);
      const errors = [];

      for (const [key, rules] of Object.entries(validation)) {
        if (rules.required && !config[key]) {
          errors.push(`${key} is required for ${config.type} provider`);
        }

        if (config[key] && rules.type) {
          const actualType = typeof config[key];
          if (actualType !== rules.type) {
            errors.push(`${key} should be of type ${rules.type}, got ${actualType}`);
          }
        }

        if (config[key] && rules.enum && !rules.enum.includes(config[key])) {
          errors.push(`${key} should be one of: ${rules.enum.join(', ')}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Create distributed cache with multiple providers and failover
   * @param {Array} configurations - Array of provider configurations (in priority order)
   * @returns {DistributedCacheManager} Distributed cache manager
   */
  static createDistributedCache(configurations) {
    return new DistributedCacheManager(configurations);
  }
}

/**
 * Distributed Cache Manager
 * Manages multiple cache providers with failover and load balancing
 */
class DistributedCacheManager {
  constructor(configurations) {
    this.providers = CacheProviderFactory.createMultipleProviders(configurations);
    this.primaryProvider = null;
    this.fallbackProviders = [];
    this.stats = {
      operations: 0,
      failovers: 0,
      errors: 0,
    };

    this._initializeProviderHierarchy();
  }

  _initializeProviderHierarchy() {
    const providerArray = Array.from(this.providers.values());

    if (providerArray.length > 0) {
      this.primaryProvider = providerArray[0];
      this.fallbackProviders = providerArray.slice(1);
    }
  }

  async connect() {
    return CacheProviderFactory.connectMultipleProviders(this.providers);
  }

  async disconnect() {
    return CacheProviderFactory.disconnectMultipleProviders(this.providers);
  }

  async get(key) {
    this.stats.operations++;

    // Try primary provider first
    if (this.primaryProvider) {
      try {
        const result = await this.primaryProvider.get(key);
        if (result !== null) {
          return result;
        }
      } catch (error) {
        logger.warn('Primary cache provider failed for get operation', {
          error: error.message,
        });
        this.stats.errors++;
      }
    }

    // Try fallback providers
    for (const provider of this.fallbackProviders) {
      try {
        const result = await provider.get(key);
        if (result !== null) {
          this.stats.failovers++;

          // Try to populate primary cache
          if (this.primaryProvider) {
            this.primaryProvider.set(key, result).catch(() => {});
          }

          return result;
        }
      } catch (error) {
        logger.debug('Fallback cache provider failed for get operation', {
          error: error.message,
        });
      }
    }

    return null;
  }

  async set(key, value, ttl = 3600) {
    this.stats.operations++;
    let success = false;

    // Write to all providers
    const promises = Array.from(this.providers.values()).map(async provider => {
      try {
        const result = await provider.set(key, value, ttl);
        if (result) {
          success = true;
        }
        return result;
      } catch (error) {
        logger.debug('Cache provider failed for set operation', {
          error: error.message,
        });
        return false;
      }
    });

    await Promise.allSettled(promises);
    return success;
  }

  async delete(key) {
    this.stats.operations++;

    // Delete from all providers
    const promises = Array.from(this.providers.values()).map(provider =>
      provider.delete(key).catch(() => false)
    );

    const results = await Promise.allSettled(promises);
    return results.some(result => result.status === 'fulfilled' && result.value === true);
  }

  getStats() {
    const providerStats = CacheProviderFactory.getCombinedStats(this.providers);

    return {
      ...this.stats,
      ...providerStats,
      providersCount: this.providers.size,
    };
  }

  getStatus() {
    return {
      distributed: true,
      providers: CacheProviderFactory.getMultipleProviderStatus(this.providers),
      stats: this.getStats(),
    };
  }
}

module.exports = {
  CacheProviderFactory,
  DistributedCacheManager,
};
