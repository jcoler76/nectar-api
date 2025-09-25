const prismaService = require('../services/prismaService');
const { getRedisService } = require('./redisService');

class RateLimitService {
  constructor() {
    this.configCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = 0;
  }

  /**
   * Get rate limit configuration from database with caching
   */
  async getRateLimitConfigs() {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheTimeout) {
      try {
        // TODO: Implement rate limit configs with Prisma
        // For now, return empty configs to avoid breaking the server
        const configs = [];

        this.configCache.clear();
        configs.forEach(config => {
          this.configCache.set(config.name, config);
        });

        this.lastCacheUpdate = now;
      } catch (error) {
        console.error('Error loading rate limit configs:', error);
      }
    }

    return this.configCache;
  }

  /**
   * Generate rate limit key based on configuration strategy
   */
  async generateRateLimitKey(config, req) {
    const { keyStrategy } = config;

    switch (keyStrategy) {
      case 'organization':
        // Multi-tenant rate limiting by organization
        return req.organizationId
          ? `org:${req.organizationId}`
          : req.user?.organizationId
            ? `org:${req.user.organizationId}`
            : `ip:${req.ip}`;

      case 'application':
        return req.application ? `app:${req.application._id}` : `ip:${req.ip}`;

      case 'role':
        return req.role ? `role:${req.role._id}` : `ip:${req.ip}`;

      case 'component':
        if (req.service && req.procedureName) {
          return `comp:${req.service._id}:${req.procedureName}`;
        }
        return `ip:${req.ip}`;

      case 'custom':
        if (config.customKeyGenerator) {
          try {
            // Safely evaluate custom key generator
            const keyGenFunction = new Function('req', `return ${config.customKeyGenerator}`);
            return keyGenFunction(req);
          } catch (error) {
            console.error('Error in custom key generator:', error);
            return `ip:${req.ip}`;
          }
        }
        return `ip:${req.ip}`;

      case 'ip':
      default:
        return `ip:${req.ip}`;
    }
  }

  /**
   * Get effective rate limit for a request based on priority
   */
  async getEffectiveRateLimit(config, req) {
    let effectiveLimit = {
      max: config.max,
      windowMs: config.windowMs,
      source: 'default',
    };

    // Priority 1: Organization-specific limits (highest priority for multi-tenant isolation)
    const organizationId = req.organizationId || req.user?.organizationId;
    if (organizationId && config.organizationLimits?.length > 0) {
      const orgLimit = config.organizationLimits.find(
        limit => limit.organizationId.toString() === organizationId.toString()
      );
      if (orgLimit) {
        effectiveLimit = {
          max: orgLimit.max,
          windowMs: orgLimit.windowMs || config.windowMs,
          source: `organization:${organizationId}`,
        };
      }
    }

    // Priority 2: Application-specific limits
    if (req.application && config.applicationLimits?.length > 0) {
      const appLimit = config.applicationLimits.find(
        limit => limit.applicationId._id.toString() === req.application._id.toString()
      );
      if (appLimit) {
        effectiveLimit = {
          max: appLimit.max,
          windowMs: appLimit.windowMs || config.windowMs,
          source: `application:${req.application.name}`,
        };
      }
    }

    // Priority 3: Service+Component specific limits (for expensive operations)
    if (req.service && req.procedureName && config.componentLimits.length > 0) {
      const componentLimit = config.componentLimits.find(
        limit =>
          limit.serviceId._id.toString() === req.service._id.toString() &&
          limit.procedureName === req.procedureName
      );
      if (componentLimit) {
        effectiveLimit = {
          max: componentLimit.max,
          windowMs: componentLimit.windowMs || config.windowMs,
          source: `component:${req.service.name}:${req.procedureName}`,
        };
      }
    }

    // Priority 3: Role-based limits
    if (req.role && config.roleLimits.length > 0) {
      const roleLimit = config.roleLimits.find(
        limit => limit.roleId._id.toString() === req.role._id.toString()
      );
      if (roleLimit && effectiveLimit.source === 'default') {
        effectiveLimit = {
          max: roleLimit.max,
          windowMs: roleLimit.windowMs || config.windowMs,
          source: `role:${req.role.name}`,
        };
      }
    }

    // Apply environment overrides
    if (config.environmentOverrides && config.environmentOverrides[process.env.NODE_ENV]) {
      const envOverride = config.environmentOverrides[process.env.NODE_ENV];
      if (envOverride.max !== undefined) {
        effectiveLimit.max = envOverride.max;
      }
      if (envOverride.windowMs !== undefined) {
        effectiveLimit.windowMs = envOverride.windowMs;
      }
    }

    return effectiveLimit;
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(configName, req) {
    try {
      const configs = await this.getRateLimitConfigs();
      const config = configs.get(configName);

      if (!config) {
        return { allowed: true, reason: 'No config found' };
      }

      const key = await this.generateRateLimitKey(config, req);
      const effectiveLimit = await this.getEffectiveRateLimit(config, req);
      const redisKey = `${config.prefix}${key}`;

      // Try Redis first, fallback to in-memory
      let currentCount = 0;
      let ttl = effectiveLimit.windowMs;

      const redisService = await getRedisService();

      if (redisService && redisService.isConnected) {
        try {
          const redis = redisService.getClient();
          currentCount = await redis.incr(redisKey);

          if (currentCount === 1) {
            await redis.pexpire(redisKey, effectiveLimit.windowMs);
          } else {
            ttl = await redis.pttl(redisKey);
          }
        } catch (redisError) {
          console.error('Redis rate limit error:', redisError);
          // Fallback to allowing request if Redis fails
          return { allowed: true, reason: 'Redis error' };
        }
      } else {
        // In-memory fallback (basic implementation)
        const memoryKey = `${configName}:${key}`;
        if (!this.memoryStore) {
          this.memoryStore = new Map();
        }

        const now = Date.now();
        const entry = this.memoryStore.get(memoryKey);

        if (!entry || now - entry.resetTime > effectiveLimit.windowMs) {
          this.memoryStore.set(memoryKey, {
            count: 1,
            resetTime: now,
          });
          currentCount = 1;
        } else {
          entry.count++;
          currentCount = entry.count;
          ttl = effectiveLimit.windowMs - (now - entry.resetTime);
        }
      }

      const allowed = currentCount <= effectiveLimit.max;

      return {
        allowed,
        currentCount,
        maxAllowed: effectiveLimit.max,
        windowMs: effectiveLimit.windowMs,
        resetTime: Date.now() + ttl,
        key,
        source: effectiveLimit.source,
        configName,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if there's an error
      return { allowed: true, reason: 'Error occurred' };
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(configName, key) {
    try {
      const configs = await this.getRateLimitConfigs();
      const config = configs.get(configName);

      if (!config) {
        return false;
      }

      const redisKey = `${config.prefix}${key}`;

      const redisService = await getRedisService();

      if (redisService && redisService.isConnected) {
        const redis = redisService.getClient();
        await redis.del(redisKey);
      }

      // Also clear from memory store
      if (this.memoryStore) {
        const memoryKey = `${configName}:${key}`;
        this.memoryStore.delete(memoryKey);
      }

      return true;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return false;
    }
  }

  /**
   * Get current rate limit status for a key
   */
  async getRateLimitStatus(configName, key) {
    try {
      const configs = await this.getRateLimitConfigs();
      const config = configs.get(configName);

      if (!config) {
        return null;
      }

      const redisKey = `${config.prefix}${key}`;

      const redisService = await getRedisService();

      if (redisService && redisService.isConnected) {
        const redis = redisService.getClient();
        const [count, ttl] = await Promise.all([redis.get(redisKey), redis.pttl(redisKey)]);

        return {
          currentCount: parseInt(count) || 0,
          maxAllowed: config.max,
          resetTime: ttl > 0 ? Date.now() + ttl : null,
          key,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }

  /**
   * Get all active rate limits
   */
  async getActiveRateLimits() {
    try {
      const redisService = await getRedisService();

      if (!redisService || !redisService.isConnected) {
        return [];
      }

      const redis = redisService.getClient();
      const configs = await this.getRateLimitConfigs();
      const allLimits = [];

      for (const [configName, config] of configs) {
        const pattern = `${config.prefix}*`;
        const keys = await redis.keys(pattern);

        for (const redisKey of keys) {
          const [count, ttl] = await Promise.all([redis.get(redisKey), redis.pttl(redisKey)]);

          const key = redisKey.replace(config.prefix, '');
          allLimits.push({
            configName,
            key,
            currentCount: parseInt(count) || 0,
            maxAllowed: config.max,
            resetTime: ttl > 0 ? Date.now() + ttl : null,
          });
        }
      }

      return allLimits;
    } catch (error) {
      console.error('Error getting active rate limits:', error);
      return [];
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache() {
    this.configCache.clear();
    this.lastCacheUpdate = 0;
  }
}

module.exports = new RateLimitService();
