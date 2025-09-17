const ICacheProvider = require('../ICacheProvider');
const { logger } = require('../../../utils/logger');

/**
 * Memcached Cache Provider
 * Provides high-performance distributed caching using Memcached
 */
class MemcachedProvider extends ICacheProvider {
  constructor(config = {}) {
    super(config);
    this.client = null;
    this.config = {
      servers: config.servers || ['localhost:11211'],
      options: {
        maxKeySize: config.maxKeySize || 250,
        maxExpiration: config.maxExpiration || 2592000, // 30 days
        maxValue: config.maxValue || 1048576, // 1MB
        poolSize: config.poolSize || 10,
        algorithm: config.algorithm || 'md5',
        reconnect: config.reconnect || 18000000, // 5 hours
        timeout: config.timeout || 5000, // 5 seconds
        retries: config.retries || 5,
        failures: config.failures || 5,
        retry: config.retry || 30000, // 30 seconds
        remove: config.remove || false,
        failuresTimeout: config.failuresTimeout || 600000, // 10 minutes
        ...config.options,
      },
      ...config,
    };
  }

  async connect() {
    try {
      // Import memcached dynamically to handle missing dependency gracefully
      let Memcached;
      try {
        Memcached = require('memcached');
      } catch (error) {
        throw new Error('memcached package is required. Run: npm install memcached');
      }

      this.client = new Memcached(this.config.servers, this.config.options);

      // Set up event handlers
      this.client.on('issue', details => {
        logger.warn('Memcached issue detected', { details });
        this.stats.errors++;
      });

      this.client.on('failure', details => {
        logger.error('Memcached failure', { details });
        this.connected = false;
        this.stats.errors++;
      });

      this.client.on('reconnecting', details => {
        logger.info('Memcached reconnecting', { details });
      });

      this.client.on('reconnect', details => {
        logger.info('Memcached reconnected', { details });
        this.connected = true;
      });

      this.connected = true;
      logger.info('Memcached connected successfully', {
        servers: this.config.servers,
      });
    } catch (error) {
      logger.error('Failed to connect to Memcached', {
        error: error.message,
        servers: this.config.servers,
      });
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
      logger.info('Memcached disconnected');
    }
  }

  async testConnection() {
    return new Promise(resolve => {
      if (!this.client) {
        resolve({
          success: false,
          message: 'Memcached client not initialized',
          timestamp: new Date(),
        });
        return;
      }

      const testKey = `test:${Date.now()}`;
      const testValue = 'connection-test';

      this.client.set(testKey, testValue, 60, err => {
        if (err) {
          resolve({
            success: false,
            message: `Connection test failed: ${err.message}`,
            timestamp: new Date(),
          });
          return;
        }

        this.client.get(testKey, (getErr, data) => {
          this.client.del(testKey, () => {}); // Clean up test key

          if (getErr || data !== testValue) {
            resolve({
              success: false,
              message: 'Connection test failed: get operation failed',
              timestamp: new Date(),
            });
            return;
          }

          resolve({
            success: true,
            message: 'Memcached connection test successful',
            responseTime: Date.now(),
            timestamp: new Date(),
          });
        });
      });
    });
  }

  async get(key) {
    return new Promise(resolve => {
      if (!this.client) {
        this.stats.errors++;
        resolve(null);
        return;
      }

      this.client.get(key, (err, data) => {
        if (err) {
          logger.warn('Memcached get error', { key, error: err.message });
          this.stats.errors++;
          this.stats.misses++;
          resolve(null);
          return;
        }

        if (data === undefined) {
          this.stats.misses++;
          resolve(null);
        } else {
          this.stats.hits++;
          resolve(data);
        }
      });
    });
  }

  async set(key, value, ttl = 3600) {
    return new Promise(resolve => {
      if (!this.client) {
        this.stats.errors++;
        resolve(false);
        return;
      }

      this.client.set(key, value, ttl, err => {
        if (err) {
          logger.warn('Memcached set error', { key, error: err.message });
          this.stats.errors++;
          resolve(false);
          return;
        }

        this.stats.sets++;
        resolve(true);
      });
    });
  }

  async delete(key) {
    return new Promise(resolve => {
      if (!this.client) {
        this.stats.errors++;
        resolve(false);
        return;
      }

      this.client.del(key, err => {
        if (err) {
          logger.warn('Memcached delete error', { key, error: err.message });
          this.stats.errors++;
          resolve(false);
          return;
        }

        this.stats.deletes++;
        resolve(true);
      });
    });
  }

  async exists(key) {
    const value = await this.get(key);
    return value !== null;
  }

  async mget(keys) {
    return new Promise(resolve => {
      if (!this.client || keys.length === 0) {
        resolve({});
        return;
      }

      this.client.getMulti(keys, (err, data) => {
        if (err) {
          logger.warn('Memcached mget error', { keys, error: err.message });
          this.stats.errors++;
          resolve({});
          return;
        }

        // Update stats
        const foundKeys = Object.keys(data || {});
        this.stats.hits += foundKeys.length;
        this.stats.misses += keys.length - foundKeys.length;

        resolve(data || {});
      });
    });
  }

  async mset(pairs, ttl = 3600) {
    const promises = Object.entries(pairs).map(([key, value]) => this.set(key, value, ttl));

    const results = await Promise.all(promises);
    return results.every(result => result === true);
  }

  async clear() {
    return new Promise(resolve => {
      if (!this.client) {
        resolve(false);
        return;
      }

      this.client.flush(err => {
        if (err) {
          logger.error('Memcached flush error', { error: err.message });
          this.stats.errors++;
          resolve(false);
          return;
        }

        logger.info('Memcached cache cleared');
        resolve(true);
      });
    });
  }

  async increment(key, delta = 1) {
    return new Promise(resolve => {
      if (!this.client) {
        this.stats.errors++;
        resolve(0);
        return;
      }

      this.client.incr(key, delta, (err, result) => {
        if (err) {
          logger.warn('Memcached increment error', { key, error: err.message });
          this.stats.errors++;
          resolve(0);
          return;
        }

        resolve(result || 0);
      });
    });
  }

  async decrement(key, delta = 1) {
    return new Promise(resolve => {
      if (!this.client) {
        this.stats.errors++;
        resolve(0);
        return;
      }

      this.client.decr(key, delta, (err, result) => {
        if (err) {
          logger.warn('Memcached decrement error', { key, error: err.message });
          this.stats.errors++;
          resolve(0);
          return;
        }

        resolve(result || 0);
      });
    });
  }

  static getProviderInfo() {
    return {
      name: 'Memcached',
      type: 'MEMCACHED',
      description: 'High-performance distributed memory caching system',
      category: 'cache',
      features: [
        'Distributed caching',
        'High performance',
        'Memory-based storage',
        'Multi-server support',
        'Automatic failover',
        'Connection pooling',
        'Statistics tracking',
        'TTL support',
        'Bulk operations',
        'Increment/decrement operations',
      ],
      requirements: ['memcached package'],
      defaultPort: 11211,
    };
  }

  static getConfigurationValidation() {
    return {
      servers: {
        required: false,
        type: 'array',
        default: ['localhost:11211'],
        description: 'Array of Memcached server addresses',
      },
      maxKeySize: {
        required: false,
        type: 'number',
        default: 250,
        description: 'Maximum key size in bytes',
      },
      maxValue: {
        required: false,
        type: 'number',
        default: 1048576,
        description: 'Maximum value size in bytes',
      },
      poolSize: {
        required: false,
        type: 'number',
        default: 10,
        description: 'Connection pool size',
      },
      timeout: {
        required: false,
        type: 'number',
        default: 5000,
        description: 'Connection timeout in milliseconds',
      },
      retries: {
        required: false,
        type: 'number',
        default: 5,
        description: 'Number of retry attempts',
      },
    };
  }
}

module.exports = MemcachedProvider;
