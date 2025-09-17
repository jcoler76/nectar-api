const ICacheProvider = require('../ICacheProvider');
const { logger } = require('../../../utils/logger');

/**
 * In-Memory Cache Provider
 * High-performance local caching using native JavaScript Maps
 */
class MemoryProvider extends ICacheProvider {
  constructor(config = {}) {
    super(config);
    this.cache = new Map();
    this.timers = new Map(); // For TTL management
    this.config = {
      maxSize: config.maxSize || 10000, // Maximum number of items
      maxMemory: config.maxMemory || 100 * 1024 * 1024, // 100MB default
      defaultTTL: config.defaultTTL || 3600, // 1 hour default
      checkInterval: config.checkInterval || 300000, // 5 minutes cleanup interval
      evictionPolicy: config.evictionPolicy || 'LRU', // LRU, FIFO, LFU
      ...config,
    };

    // Track access patterns for LRU/LFU
    this.accessOrder = new Map(); // For LRU
    this.accessCount = new Map(); // For LFU
    this.currentMemoryUsage = 0;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this._cleanup();
    }, this.config.checkInterval);

    this.connected = true; // Memory provider is always "connected"
    logger.info('Memory cache provider initialized', {
      maxSize: this.config.maxSize,
      maxMemory: this.config.maxMemory,
      evictionPolicy: this.config.evictionPolicy,
    });
  }

  async connect() {
    // Memory provider doesn't need connection
    this.connected = true;
    logger.info('Memory cache provider connected');
  }

  async disconnect() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear cache
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCount.clear();
    this.currentMemoryUsage = 0;

    this.connected = false;
    logger.info('Memory cache provider disconnected');
  }

  async testConnection() {
    return {
      success: this.connected,
      message: this.connected
        ? 'Memory cache provider is ready'
        : 'Memory cache provider is not connected',
      responseTime: 0, // Instant for memory operations
      timestamp: new Date(),
      cacheSize: this.cache.size,
      memoryUsage: this.currentMemoryUsage,
    };
  }

  async get(key) {
    try {
      const item = this.cache.get(key);

      if (!item) {
        this.stats.misses++;
        return null;
      }

      // Check if expired
      if (item.expiry && Date.now() > item.expiry) {
        this._removeItem(key);
        this.stats.misses++;
        return null;
      }

      // Update access patterns
      this._updateAccessPatterns(key);

      this.stats.hits++;
      return item.value;
    } catch (error) {
      logger.warn('Memory cache get error', { key, error: error.message });
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      // Use default TTL if not specified
      if (ttl === null) {
        ttl = this.config.defaultTTL;
      }

      // Calculate memory usage
      const valueSize = this._calculateMemoryUsage(value);

      // Check if we need to evict items
      if (
        this.cache.size >= this.config.maxSize ||
        this.currentMemoryUsage + valueSize > this.config.maxMemory
      ) {
        this._evictItems(valueSize);
      }

      // Remove existing item if it exists
      if (this.cache.has(key)) {
        this._removeItem(key);
      }

      // Create cache item
      const expiry = ttl > 0 ? Date.now() + ttl * 1000 : null;
      const item = {
        value,
        expiry,
        size: valueSize,
        createdAt: Date.now(),
      };

      // Set in cache
      this.cache.set(key, item);
      this.currentMemoryUsage += valueSize;

      // Set TTL timer if needed
      if (expiry) {
        const timer = setTimeout(() => {
          this._removeItem(key);
        }, ttl * 1000);
        this.timers.set(key, timer);
      }

      // Update access patterns
      this._updateAccessPatterns(key);

      this.stats.sets++;
      return true;
    } catch (error) {
      logger.warn('Memory cache set error', { key, error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  async delete(key) {
    try {
      if (this.cache.has(key)) {
        this._removeItem(key);
        this.stats.deletes++;
        return true;
      }
      return false;
    } catch (error) {
      logger.warn('Memory cache delete error', { key, error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  async exists(key) {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this._removeItem(key);
      return false;
    }

    return true;
  }

  async mget(keys) {
    const result = {};

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  async mset(pairs, ttl = null) {
    try {
      let success = true;

      for (const [key, value] of Object.entries(pairs)) {
        const result = await this.set(key, value, ttl);
        if (!result) {
          success = false;
        }
      }

      return success;
    } catch (error) {
      logger.warn('Memory cache mset error', { error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  async clear() {
    try {
      // Clear all timers
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      this.timers.clear();

      // Clear all caches
      this.cache.clear();
      this.accessOrder.clear();
      this.accessCount.clear();
      this.currentMemoryUsage = 0;

      logger.info('Memory cache cleared');
      return true;
    } catch (error) {
      logger.error('Memory cache clear error', { error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  async increment(key, delta = 1) {
    try {
      const current = await this.get(key);
      const value = (typeof current === 'number' ? current : 0) + delta;
      await this.set(key, value);
      return value;
    } catch (error) {
      logger.warn('Memory cache increment error', { key, error: error.message });
      this.stats.errors++;
      return 0;
    }
  }

  async decrement(key, delta = 1) {
    return this.increment(key, -delta);
  }

  /**
   * Get detailed cache statistics
   * @returns {Object} Extended statistics
   */
  getDetailedStats() {
    return {
      ...this.getStats(),
      cacheSize: this.cache.size,
      maxSize: this.config.maxSize,
      memoryUsage: this.currentMemoryUsage,
      maxMemory: this.config.maxMemory,
      memoryUtilization: this.currentMemoryUsage / this.config.maxMemory,
      evictionPolicy: this.config.evictionPolicy,
    };
  }

  /**
   * Remove an item from cache and clean up associated data
   * @private
   */
  _removeItem(key) {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.currentMemoryUsage -= item.size;

      // Clear timer if exists
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }

      // Clean up access patterns
      this.accessOrder.delete(key);
      this.accessCount.delete(key);
    }
  }

  /**
   * Update access patterns for eviction policies
   * @private
   */
  _updateAccessPatterns(key) {
    const now = Date.now();

    // Update access order for LRU
    this.accessOrder.set(key, now);

    // Update access count for LFU
    const count = this.accessCount.get(key) || 0;
    this.accessCount.set(key, count + 1);
  }

  /**
   * Evict items based on configured policy
   * @private
   */
  _evictItems(requiredSpace = 0) {
    const targetSize = Math.max(
      this.config.maxSize * 0.8, // Keep 80% of max size
      this.cache.size - 10 // Remove at least 10 items
    );

    const targetMemory = Math.max(
      this.config.maxMemory * 0.8, // Keep 80% of max memory
      this.currentMemoryUsage - requiredSpace
    );

    let evicted = 0;

    while (
      (this.cache.size > targetSize || this.currentMemoryUsage > targetMemory) &&
      this.cache.size > 0
    ) {
      let keyToEvict;

      switch (this.config.evictionPolicy) {
        case 'LRU':
          keyToEvict = this._findLRUKey();
          break;
        case 'LFU':
          keyToEvict = this._findLFUKey();
          break;
        case 'FIFO':
        default:
          keyToEvict = this.cache.keys().next().value;
          break;
      }

      if (keyToEvict) {
        this._removeItem(keyToEvict);
        evicted++;
      } else {
        break; // Safety break
      }
    }

    if (evicted > 0) {
      logger.debug('Memory cache evicted items', {
        evicted,
        policy: this.config.evictionPolicy,
        cacheSize: this.cache.size,
        memoryUsage: this.currentMemoryUsage,
      });
    }
  }

  /**
   * Find least recently used key
   * @private
   */
  _findLRUKey() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Find least frequently used key
   * @private
   */
  _findLFUKey() {
    let leastUsedKey = null;
    let leastCount = Infinity;

    for (const [key, count] of this.accessCount.entries()) {
      if (count < leastCount) {
        leastCount = count;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  /**
   * Calculate memory usage of a value
   * @private
   */
  _calculateMemoryUsage(value) {
    if (value === null || value === undefined) {
      return 8; // Rough estimate
    }

    if (typeof value === 'string') {
      return value.length * 2; // Unicode characters
    }

    if (typeof value === 'number') {
      return 8;
    }

    if (typeof value === 'boolean') {
      return 4;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value).length * 2; // Rough estimate
    }

    return 64; // Default estimate
  }

  /**
   * Clean up expired items
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && now > item.expiry) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this._removeItem(key);
    }

    if (expiredKeys.length > 0) {
      logger.debug('Memory cache cleanup completed', {
        expiredItems: expiredKeys.length,
        cacheSize: this.cache.size,
      });
    }
  }

  static getProviderInfo() {
    return {
      name: 'Memory',
      type: 'MEMORY',
      description: 'High-performance in-memory caching with advanced eviction policies',
      category: 'cache',
      features: [
        'In-memory storage',
        'LRU/LFU/FIFO eviction',
        'TTL support',
        'Memory management',
        'Size limits',
        'Bulk operations',
        'Statistics tracking',
        'Cleanup automation',
        'Access pattern tracking',
        'Zero dependencies',
      ],
      requirements: [],
      defaultPort: null,
    };
  }

  static getConfigurationValidation() {
    return {
      maxSize: {
        required: false,
        type: 'number',
        default: 10000,
        description: 'Maximum number of cache items',
      },
      maxMemory: {
        required: false,
        type: 'number',
        default: 104857600, // 100MB
        description: 'Maximum memory usage in bytes',
      },
      defaultTTL: {
        required: false,
        type: 'number',
        default: 3600,
        description: 'Default TTL in seconds',
      },
      evictionPolicy: {
        required: false,
        type: 'string',
        enum: ['LRU', 'LFU', 'FIFO'],
        default: 'LRU',
        description: 'Eviction policy when cache is full',
      },
      checkInterval: {
        required: false,
        type: 'number',
        default: 300000,
        description: 'Cleanup interval in milliseconds',
      },
    };
  }
}

module.exports = MemoryProvider;
