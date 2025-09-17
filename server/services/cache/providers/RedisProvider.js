const ICacheProvider = require('../ICacheProvider');
const { logger } = require('../../../utils/logger');

/**
 * Redis Cache Provider
 * Enhanced Redis caching with comprehensive features and monitoring
 */
class RedisProvider extends ICacheProvider {
  constructor(config = {}) {
    super(config);
    this.client = null;
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password,
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'cache:',
      connectTimeout: config.connectTimeout || 60000,
      commandTimeout: config.commandTimeout || 5000,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      enableOfflineQueue: config.enableOfflineQueue || false,
      lazyConnect: config.lazyConnect || true,
      ...config,
    };
  }

  async connect() {
    try {
      // Import redis dynamically to handle missing dependency gracefully
      let Redis;
      try {
        Redis = require('ioredis');
      } catch (error) {
        throw new Error('ioredis package is required. Run: npm install ioredis');
      }

      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        connectTimeout: this.config.connectTimeout,
        commandTimeout: this.config.commandTimeout,
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        enableOfflineQueue: this.config.enableOfflineQueue,
        lazyConnect: this.config.lazyConnect,
      });

      // Set up event handlers
      this.client.on('connect', () => {
        this.connected = true;
        logger.info('Redis cache provider connected', {
          host: this.config.host,
          port: this.config.port,
          db: this.config.db,
        });
      });

      this.client.on('error', error => {
        logger.error('Redis cache provider error', {
          error: error.message,
          host: this.config.host,
          port: this.config.port,
        });
        this.connected = false;
        this.stats.errors++;
      });

      this.client.on('close', () => {
        this.connected = false;
        logger.warn('Redis cache provider connection closed');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis cache provider reconnecting');
      });

      // Test connection if not lazy
      if (!this.config.lazyConnect) {
        await this.client.ping();
      }

      this.connected = true;
    } catch (error) {
      logger.error('Failed to connect to Redis cache provider', {
        error: error.message,
        host: this.config.host,
        port: this.config.port,
      });
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
      logger.info('Redis cache provider disconnected');
    }
  }

  async testConnection() {
    try {
      if (!this.client) {
        return {
          success: false,
          message: 'Redis client not initialized',
          timestamp: new Date(),
        };
      }

      const start = Date.now();
      const result = await this.client.ping();
      const responseTime = Date.now() - start;

      return {
        success: result === 'PONG',
        message:
          result === 'PONG' ? 'Redis connection test successful' : 'Unexpected ping response',
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Redis connection test failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  async get(key) {
    try {
      if (!this.client) {
        this.stats.errors++;
        return null;
      }

      const value = await this.client.get(key);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;

      // Try to parse JSON, return as-is if not valid JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.warn('Redis get error', { key, error: error.message });
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (!this.client) {
        this.stats.errors++;
        return false;
      }

      // Serialize value if it's an object
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      let result;
      if (ttl > 0) {
        result = await this.client.setex(key, ttl, serializedValue);
      } else {
        result = await this.client.set(key, serializedValue);
      }

      if (result === 'OK') {
        this.stats.sets++;
        return true;
      }

      return false;
    } catch (error) {
      logger.warn('Redis set error', { key, error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  async delete(key) {
    try {
      if (!this.client) {
        this.stats.errors++;
        return false;
      }

      const result = await this.client.del(key);

      if (result > 0) {
        this.stats.deletes++;
        return true;
      }

      return false;
    } catch (error) {
      logger.warn('Redis delete error', { key, error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.client) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.warn('Redis exists error', { key, error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  async mget(keys) {
    try {
      if (!this.client || keys.length === 0) {
        return {};
      }

      const values = await this.client.mget(keys);
      const result = {};

      keys.forEach((key, index) => {
        const value = values[index];
        if (value !== null) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
      });

      return result;
    } catch (error) {
      logger.warn('Redis mget error', { keys, error: error.message });
      this.stats.errors++;
      return {};
    }
  }

  async mset(pairs, ttl = 3600) {
    try {
      if (!this.client || Object.keys(pairs).length === 0) {
        return false;
      }

      // Prepare pipeline for atomic operation
      const pipeline = this.client.pipeline();

      Object.entries(pairs).forEach(([key, value]) => {
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        if (ttl > 0) {
          pipeline.setex(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      });

      const results = await pipeline.exec();
      const success = results.every(([err, result]) => !err && result === 'OK');

      if (success) {
        this.stats.sets += Object.keys(pairs).length;
      }

      return success;
    } catch (error) {
      logger.warn('Redis mset error', { error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  async clear() {
    try {
      if (!this.client) {
        return false;
      }

      // Clear all keys with the configured prefix
      const pattern = this.config.keyPrefix ? `${this.config.keyPrefix}*` : '*';
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }

      logger.info('Redis cache cleared', { keysDeleted: keys.length });
      return true;
    } catch (error) {
      logger.error('Redis clear error', { error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  async increment(key, delta = 1) {
    try {
      if (!this.client) {
        this.stats.errors++;
        return 0;
      }

      return await this.client.incrby(key, delta);
    } catch (error) {
      logger.warn('Redis increment error', { key, error: error.message });
      this.stats.errors++;
      return 0;
    }
  }

  async decrement(key, delta = 1) {
    try {
      if (!this.client) {
        this.stats.errors++;
        return 0;
      }

      return await this.client.decrby(key, delta);
    } catch (error) {
      logger.warn('Redis decrement error', { key, error: error.message });
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Redis-specific method: Get TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds, -1 if no TTL, -2 if key doesn't exist
   */
  async getTTL(key) {
    try {
      if (!this.client) {
        return -2;
      }

      return await this.client.ttl(key);
    } catch (error) {
      logger.warn('Redis TTL error', { key, error: error.message });
      return -2;
    }
  }

  /**
   * Redis-specific method: Set TTL for existing key
   * @param {string} key - Cache key
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<boolean>} Success status
   */
  async setTTL(key, ttl) {
    try {
      if (!this.client) {
        return false;
      }

      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.warn('Redis set TTL error', { key, error: error.message });
      return false;
    }
  }

  static getProviderInfo() {
    return {
      name: 'Redis',
      type: 'REDIS',
      description: 'Advanced in-memory data structure store with persistence options',
      category: 'cache',
      features: [
        'In-memory storage',
        'Data persistence',
        'Data structures support',
        'Pub/Sub messaging',
        'Lua scripting',
        'Clustering support',
        'Replication support',
        'Transactions',
        'TTL support',
        'Bulk operations',
        'Atomic operations',
        'Pattern matching',
      ],
      requirements: ['ioredis package'],
      defaultPort: 6379,
    };
  }

  static getConfigurationValidation() {
    return {
      host: {
        required: false,
        type: 'string',
        default: 'localhost',
        description: 'Redis server hostname',
      },
      port: {
        required: false,
        type: 'number',
        default: 6379,
        description: 'Redis server port',
      },
      password: {
        required: false,
        type: 'string',
        description: 'Redis server password',
      },
      db: {
        required: false,
        type: 'number',
        default: 0,
        description: 'Redis database number',
      },
      keyPrefix: {
        required: false,
        type: 'string',
        default: 'cache:',
        description: 'Prefix for all cache keys',
      },
      connectTimeout: {
        required: false,
        type: 'number',
        default: 60000,
        description: 'Connection timeout in milliseconds',
      },
      commandTimeout: {
        required: false,
        type: 'number',
        default: 5000,
        description: 'Command timeout in milliseconds',
      },
    };
  }
}

module.exports = RedisProvider;
