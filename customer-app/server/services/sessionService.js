const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { getRedisService } = require('./redisService');

// In-memory session store fallback
class InMemorySessionStore {
  constructor() {
    this.sessions = new Map();
    this.userSessions = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  async createSession(sessionId, userId, data, ttl = 86400) {
    const expiresAt = Date.now() + ttl * 1000;
    const sessionData = {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt,
      ...data,
    };

    this.sessions.set(`session:${sessionId}`, sessionData);

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId).add(sessionId);

    return sessionData;
  }

  async getSession(sessionId) {
    const session = this.sessions.get(`session:${sessionId}`);
    if (!session) return null;

    // Check if expired
    if (session.expiresAt < Date.now()) {
      await this.destroySession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = Date.now();
    return session;
  }

  async destroySession(sessionId) {
    const session = this.sessions.get(`session:${sessionId}`);
    if (!session) return false;

    // Remove from user's session list
    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    // Delete session
    this.sessions.delete(`session:${sessionId}`);
    return true;
  }

  async getUserSessions(userId) {
    const sessionIds = this.userSessions.get(userId) || new Set();
    const sessions = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push({ sessionId, ...session });
      }
    }

    return sessions;
  }

  async destroyAllUserSessions(userId) {
    const sessionIds = this.userSessions.get(userId) || new Set();

    for (const sessionId of sessionIds) {
      this.sessions.delete(`session:${sessionId}`);
    }

    this.userSessions.delete(userId);
    return sessionIds.size;
  }

  async setSessionTimeout(sessionId, seconds) {
    const session = this.sessions.get(`session:${sessionId}`);
    if (!session) return false;

    session.expiresAt = Date.now() + seconds * 1000;
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, session] of this.sessions) {
      if (session.expiresAt < now) {
        const sessionId = key.replace('session:', '');
        this.destroySession(sessionId);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    this.userSessions.clear();
  }
}

// Session Service with Redis/InMemory fallback
class SessionService {
  constructor() {
    this.store = null;
    this.isRedis = false;
  }

  async initialize() {
    try {
      const redisService = await getRedisService();
      if (redisService && redisService.isConnected) {
        this.store = redisService;
        this.isRedis = true;
        logger.info('Session service using Redis store');
      } else {
        throw new Error('Redis not available');
      }
    } catch (error) {
      this.store = new InMemorySessionStore();
      this.isRedis = false;
      logger.warn('Session service using in-memory store (not suitable for production)');
    }
  }

  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  async createSession(userId, data = {}, ttl = 86400) {
    const sessionId = this.generateSessionId();
    const sessionData = await this.store.createSession(sessionId, userId, data, ttl);
    return { sessionId, ...sessionData };
  }

  async getSession(sessionId) {
    if (!sessionId) return null;
    return await this.store.getSession(sessionId);
  }

  async updateSession(sessionId, data) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const updatedSession = { ...session, ...data, lastActivity: Date.now() };

    if (this.isRedis) {
      await this.store.client.set(
        `session:${sessionId}`,
        JSON.stringify(updatedSession),
        'KEEPTTL'
      );
    } else {
      // For in-memory, we're already updating the reference
    }

    return updatedSession;
  }

  async destroySession(sessionId) {
    return await this.store.destroySession(sessionId);
  }

  async getUserSessions(userId) {
    return await this.store.getUserSessions(userId);
  }

  async destroyAllUserSessions(userId) {
    return await this.store.destroyAllUserSessions(userId);
  }

  async setSessionTimeout(sessionId, seconds) {
    return await this.store.setSessionTimeout(sessionId, seconds);
  }

  // Session-based rate limiting
  async checkRateLimit(sessionId, action, limit = 100, window = 3600) {
    if (this.isRedis) {
      return await this.store.checkSessionRateLimit(sessionId, action, limit, window);
    } else {
      // Simple in-memory rate limiting
      const key = `ratelimit:${sessionId}:${action}`;
      const now = Date.now();
      const windowStart = now - window * 1000;

      if (!this.rateLimits) {
        this.rateLimits = new Map();
      }

      if (!this.rateLimits.has(key)) {
        this.rateLimits.set(key, []);
      }

      const requests = this.rateLimits.get(key);
      const validRequests = requests.filter(time => time > windowStart);
      validRequests.push(now);
      this.rateLimits.set(key, validRequests);

      return {
        allowed: validRequests.length <= limit,
        current: validRequests.length,
        limit,
        remaining: Math.max(0, limit - validRequests.length),
      };
    }
  }

  // Middleware for Express
  middleware() {
    return async (req, res, next) => {
      const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

      if (sessionId) {
        try {
          const session = await this.getSession(sessionId);
          if (session) {
            req.session = session;
            req.sessionId = sessionId;

            // Add session methods to request
            req.destroySession = async () => {
              return await this.destroySession(sessionId);
            };

            req.updateSession = async data => {
              return await this.updateSession(sessionId, data);
            };
          }
        } catch (error) {
          logger.error('Session middleware error', { error: error.message });
        }
      }

      next();
    };
  }
}

// Singleton instance
let sessionService = null;

const getSessionService = async () => {
  if (!sessionService) {
    sessionService = new SessionService();
    await sessionService.initialize();
  }
  return sessionService;
};

module.exports = {
  SessionService,
  getSessionService,
  InMemorySessionStore,
};
