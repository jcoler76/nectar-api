const Redis = require('ioredis');
const { logger } = require('../utils/logger');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
  }

  async connect() {
    try {
      // Skip Redis in development if REDIS_DISABLED is set
      if (
        process.env.REDIS_DISABLED === 'true' ||
        (process.env.NODE_ENV === 'development' && process.env.REDIS_HOST === undefined)
      ) {
        logger.info('Redis disabled or not configured, skipping connection');
        this.isConnected = false;
        return null;
      }

      // Redis configuration with fallback to in-memory if not available
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryStrategy: times => {
          if (times > this.maxRetries) {
            logger.error('Redis connection failed after maximum retries');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          logger.info(`Retrying Redis connection in ${delay}ms...`);
          return delay;
        },
        enableOfflineQueue: false,
      };

      this.client = new Redis(redisConfig);

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.client.on('error', error => {
        logger.error('Redis connection error', { error: error.message });
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.info('Redis connection closed');
      });

      // Test connection
      await this.client.ping();
      this.isConnected = true;
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis', { error: error.message });
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  getClient() {
    if (!this.isConnected) {
      throw new Error('Redis is not connected');
    }
    return this.client;
  }

  // Session Management Methods
  async createSession(sessionId, userId, data, ttl = 86400) {
    // 24 hours default
    try {
      const sessionData = {
        userId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        ...data,
      };

      await this.client.set(`session:${sessionId}`, JSON.stringify(sessionData), 'EX', ttl);

      // Track user sessions
      await this.client.sadd(`user:${userId}:sessions`, sessionId);

      return sessionData;
    } catch (error) {
      logger.error('Error creating session', { error: error.message });
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const data = await this.client.get(`session:${sessionId}`);
      if (!data) return null;

      const session = JSON.parse(data);

      // Update last activity
      session.lastActivity = Date.now();
      await this.client.set(`session:${sessionId}`, JSON.stringify(session), 'KEEPTTL');

      return session;
    } catch (error) {
      logger.error('Error getting session', { error: error.message });
      throw error;
    }
  }

  async destroySession(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      // Remove from user's session list
      await this.client.srem(`user:${session.userId}:sessions`, sessionId);

      // Delete session
      await this.client.del(`session:${sessionId}`);

      return true;
    } catch (error) {
      logger.error('Error destroying session', { error: error.message });
      throw error;
    }
  }

  async getUserSessions(userId) {
    try {
      const sessionIds = await this.client.smembers(`user:${userId}:sessions`);
      const sessions = [];

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push({ sessionId, ...session });
        } else {
          // Clean up orphaned session reference
          await this.client.srem(`user:${userId}:sessions`, sessionId);
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Error getting user sessions', { error: error.message });
      throw error;
    }
  }

  async destroyAllUserSessions(userId) {
    try {
      const sessionIds = await this.client.smembers(`user:${userId}:sessions`);

      for (const sessionId of sessionIds) {
        await this.client.del(`session:${sessionId}`);
      }

      await this.client.del(`user:${userId}:sessions`);

      return sessionIds.length;
    } catch (error) {
      logger.error('Error destroying all user sessions', { error: error.message });
      throw error;
    }
  }

  // Session timeout management
  async setSessionTimeout(sessionId, seconds) {
    try {
      return await this.client.expire(`session:${sessionId}`, seconds);
    } catch (error) {
      logger.error('Error setting session timeout', { error: error.message });
      throw error;
    }
  }

  // Rate limiting for sessions
  async checkSessionRateLimit(sessionId, action, limit = 100, window = 3600) {
    try {
      const key = `ratelimit:${sessionId}:${action}`;
      const current = await this.client.incr(key);

      if (current === 1) {
        await this.client.expire(key, window);
      }

      return {
        allowed: current <= limit,
        current,
        limit,
        remaining: Math.max(0, limit - current),
      };
    } catch (error) {
      logger.error('Error checking session rate limit', { error: error.message });
      throw error;
    }
  }
}

// Singleton instance
let redisService = null;

const getRedisService = async () => {
  if (!redisService) {
    redisService = new RedisService();
    try {
      await redisService.connect();
    } catch (error) {
      logger.warn('Redis not available, falling back to in-memory session storage');
      // Return null to indicate Redis is not available
      return null;
    }
  }
  return redisService;
};

module.exports = {
  RedisService,
  getRedisService,
};
