/**
 * Interface for Cache Provider implementations
 * Standardizes cache operations across different providers
 */
class ICacheProvider {
  constructor(config = {}) {
    this.config = config;
    this.connected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Connect to the cache provider
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() method must be implemented');
  }

  /**
   * Disconnect from the cache provider
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() method must be implemented');
  }

  /**
   * Test connection to the cache provider
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    throw new Error('testConnection() method must be implemented');
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    throw new Error('get() method must be implemented');
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 3600) {
    throw new Error('set() method must be implemented');
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    throw new Error('delete() method must be implemented');
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Existence status
   */
  async exists(key) {
    throw new Error('exists() method must be implemented');
  }

  /**
   * Get multiple values from cache
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} Key-value pairs
   */
  async mget(keys) {
    throw new Error('mget() method must be implemented');
  }

  /**
   * Set multiple values in cache
   * @param {Object} pairs - Key-value pairs to set
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async mset(pairs, ttl = 3600) {
    throw new Error('mset() method must be implemented');
  }

  /**
   * Clear all cached data
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    throw new Error('clear() method must be implemented');
  }

  /**
   * Increment numeric value in cache
   * @param {string} key - Cache key
   * @param {number} delta - Increment amount
   * @returns {Promise<number>} New value
   */
  async increment(key, delta = 1) {
    throw new Error('increment() method must be implemented');
  }

  /**
   * Decrement numeric value in cache
   * @param {string} key - Cache key
   * @param {number} delta - Decrement amount
   * @returns {Promise<number>} New value
   */
  async decrement(key, delta = 1) {
    throw new Error('decrement() method must be implemented');
  }

  /**
   * Get cache statistics
   * @returns {Object} Performance statistics
   */
  getStats() {
    return {
      ...this.stats,
      connected: this.connected,
      hitRatio: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  /**
   * Get provider information
   * @returns {Object} Provider details
   */
  static getProviderInfo() {
    throw new Error('getProviderInfo() static method must be implemented');
  }

  /**
   * Get configuration validation rules
   * @returns {Object} Validation rules
   */
  static getConfigurationValidation() {
    throw new Error('getConfigurationValidation() static method must be implemented');
  }

  /**
   * Get status information
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      connected: this.connected,
      provider: this.constructor.name,
      config: {
        host: this.config.host || 'localhost',
        port: this.config.port || 'default',
      },
      stats: this.getStats(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }
}

module.exports = ICacheProvider;
