const NodeCache = require('node-cache');
const { getRedisService } = require('./redisService');
const { logger } = require('../utils/logger');

// Simple cache service with Redis-first, NodeCache fallback
class CacheService {
  constructor() {
    this.fallback = new NodeCache({ stdTTL: 0, checkperiod: 60, useClones: false });
    this.redis = null;
    this.connected = false;
    this.namespace = 'api-cache:';
    this.maxValueBytes = 5 * 1024 * 1024; // 5MB guard
    this._init();
  }

  async _init() {
    try {
      const redisService = await getRedisService();
      if (redisService && redisService.isConnected) {
        this.redis = redisService.getClient();
        this.connected = true;
        logger.info('CacheService: using Redis backend');
      } else {
        logger.info('CacheService: using in-memory cache');
      }
    } catch (e) {
      logger.warn('CacheService: Redis unavailable, falling back to memory');
      this.connected = false;
    }
  }

  _key(key) {
    return `${this.namespace}${key}`;
  }

  async get(key) {
    try {
      if (this.connected) {
        const raw = await this.redis.get(this._key(key));
        return raw ? JSON.parse(raw) : null;
      }
      return this.fallback.get(key) ?? null;
    } catch (e) {
      logger.warn('CacheService.get error', { error: e.message });
      return null;
    }
  }

  async set(key, value, ttlSeconds = 30) {
    try {
      const str = JSON.stringify(value);
      if (Buffer.byteLength(str, 'utf8') > this.maxValueBytes) {
        logger.warn('CacheService: value too large, skip caching', { key });
        return false;
      }
      if (this.connected) {
        if (ttlSeconds > 0) {
          await this.redis.set(this._key(key), str, 'EX', ttlSeconds);
        } else {
          await this.redis.set(this._key(key), str);
        }
        return true;
      }
      return this.fallback.set(key, value, ttlSeconds);
    } catch (e) {
      logger.warn('CacheService.set error', { error: e.message });
      return false;
    }
  }

  async del(key) {
    try {
      if (this.connected) {
        await this.redis.del(this._key(key));
        return true;
      }
      this.fallback.del(key);
      return true;
    } catch (e) {
      logger.warn('CacheService.del error', { error: e.message });
      return false;
    }
  }

  async flushNamespace() {
    try {
      if (this.connected) {
        const keys = await this.redis.keys(`${this.namespace}*`);
        if (keys.length) await this.redis.del(keys);
      } else {
        this.fallback.flushAll();
      }
      return true;
    } catch (e) {
      logger.warn('CacheService.flushNamespace error', { error: e.message });
      return false;
    }
  }
}

let singleton;
const getCacheService = () => {
  if (!singleton) singleton = new CacheService();
  return singleton;
};

module.exports = { getCacheService };
