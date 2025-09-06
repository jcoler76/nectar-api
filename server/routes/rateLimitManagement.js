const express = require('express');
const router = express.Router();
const { getRedisService } = require('../services/redisService');
const { logger } = require('../middleware/logger');
const { adminOnly } = require('../middleware/auth');

/**
 * Rate limit management endpoints for monitoring and control
 */

// Get rate limit status for a specific key or IP
router.get('/status/:key', adminOnly, async (req, res) => {
  try {
    const { key } = req.params;
    const prefix = req.query.prefix || 'rl:api:';
    const fullKey = `${prefix}${key}`;

    const redisService = await getRedisService();
    if (!redisService || !redisService.isConnected) {
      return res.status(503).json({
        error: {
          code: 'REDIS_UNAVAILABLE',
          message: 'Rate limit data unavailable (Redis not connected)',
        },
      });
    }

    const client = redisService.getClient();
    const [count, ttl] = await Promise.all([client.get(fullKey), client.ttl(fullKey)]);

    if (!count) {
      return res.json({
        key: fullKey,
        count: 0,
        ttl: 0,
        resetTime: null,
        blocked: false,
      });
    }

    // Check if blocked
    const blockedKey = `${fullKey}:blocked`;
    const [isBlocked, blockTtl] = await Promise.all([
      client.get(blockedKey),
      client.ttl(blockedKey),
    ]);

    res.json({
      key: fullKey,
      count: parseInt(count),
      ttl,
      resetTime: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null,
      blocked: !!isBlocked,
      blockTtl: isBlocked ? blockTtl : 0,
    });
  } catch (error) {
    logger.error('Error getting rate limit status', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve rate limit status',
      },
    });
  }
});

// Reset rate limit for a specific key
router.post('/reset/:key', adminOnly, async (req, res) => {
  try {
    const { key } = req.params;
    const prefix = req.query.prefix || 'rl:api:';
    const fullKey = `${prefix}${key}`;

    const redisService = await getRedisService();
    if (!redisService || !redisService.isConnected) {
      return res.status(503).json({
        error: {
          code: 'REDIS_UNAVAILABLE',
          message: 'Cannot reset rate limit (Redis not connected)',
        },
      });
    }

    const client = redisService.getClient();

    // Delete both the rate limit key and any block key
    const deletedCount = await client.del(fullKey, `${fullKey}:blocked`);

    logger.info('Rate limit reset', { key: fullKey, deletedCount });

    res.json({
      message: 'Rate limit reset successfully',
      key: fullKey,
      deletedCount,
    });
  } catch (error) {
    logger.error('Error resetting rate limit', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reset rate limit',
      },
    });
  }
});

// Get all active rate limits
router.get('/active', adminOnly, async (req, res) => {
  try {
    const { prefix = 'rl:*' } = req.query;

    const redisService = await getRedisService();
    if (!redisService || !redisService.isConnected) {
      return res.status(503).json({
        error: {
          code: 'REDIS_UNAVAILABLE',
          message: 'Rate limit data unavailable (Redis not connected)',
        },
      });
    }

    const client = redisService.getClient();

    // Scan for all rate limit keys
    const keys = [];
    const stream = client.scanStream({
      match: prefix,
      count: 100,
    });

    stream.on('data', resultKeys => {
      keys.push(...resultKeys);
    });

    stream.on('end', async () => {
      // Get details for each key
      const rateLimits = [];

      for (const key of keys) {
        // Skip blocked keys and distributed keys
        if (key.includes(':blocked') || key.includes(':distributed')) continue;

        const [count, ttl] = await Promise.all([client.get(key), client.ttl(key)]);

        if (count) {
          rateLimits.push({
            key,
            count: parseInt(count),
            ttl,
            resetTime: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null,
          });
        }
      }

      // Sort by count descending
      rateLimits.sort((a, b) => b.count - a.count);

      res.json({
        total: rateLimits.length,
        rateLimits: rateLimits.slice(0, 100), // Limit to top 100
      });
    });

    stream.on('error', error => {
      logger.error('Error scanning rate limits', { error: error.message });
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve active rate limits',
        },
      });
    });
  } catch (error) {
    logger.error('Error getting active rate limits', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve active rate limits',
      },
    });
  }
});

// Get rate limit statistics
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const redisService = await getRedisService();
    if (!redisService || !redisService.isConnected) {
      return res.status(503).json({
        error: {
          code: 'REDIS_UNAVAILABLE',
          message: 'Rate limit statistics unavailable (Redis not connected)',
        },
      });
    }

    const client = redisService.getClient();

    // Count different types of rate limits
    const prefixes = ['rl:api:', 'rl:auth:', 'rl:upload:', 'rl:graphql:', 'rl:user:', 'rl:ws:'];
    const stats = {};

    for (const prefix of prefixes) {
      const keys = await client.keys(`${prefix}*`);
      const activeKeys = keys.filter(k => !k.includes(':blocked') && !k.includes(':distributed'));
      const blockedKeys = keys.filter(k => k.includes(':blocked'));

      stats[prefix.replace('rl:', '').replace(':', '')] = {
        active: activeKeys.length,
        blocked: blockedKeys.length,
      };
    }

    // Get Redis info
    const info = await client.info('memory');
    const memoryUsed = info.match(/used_memory_human:(.+)/)?.[1];

    res.json({
      stats,
      redis: {
        connected: true,
        memoryUsed,
        totalKeys: await client.dbsize(),
      },
    });
  } catch (error) {
    logger.error('Error getting rate limit stats', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve rate limit statistics',
      },
    });
  }
});

// Block a specific IP or key
router.post('/block', adminOnly, async (req, res) => {
  try {
    const { key, duration = 3600, reason = 'Manual block' } = req.body;

    if (!key) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Key is required',
        },
      });
    }

    const redisService = await getRedisService();
    if (!redisService || !redisService.isConnected) {
      return res.status(503).json({
        error: {
          code: 'REDIS_UNAVAILABLE',
          message: 'Cannot block key (Redis not connected)',
        },
      });
    }

    const client = redisService.getClient();
    const blockedKey = `rl:blocked:${key}`;

    await client.set(
      blockedKey,
      JSON.stringify({
        reason,
        blockedAt: new Date(),
        blockedBy: req.user.email,
      }),
      'EX',
      duration
    );

    logger.warn('IP/Key manually blocked', {
      key,
      duration,
      reason,
      blockedBy: req.user.email,
    });

    res.json({
      message: 'Key blocked successfully',
      key,
      duration,
      unblockAt: new Date(Date.now() + duration * 1000),
    });
  } catch (error) {
    logger.error('Error blocking key', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to block key',
      },
    });
  }
});

// Unblock a specific IP or key
router.post('/unblock', adminOnly, async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Key is required',
        },
      });
    }

    const redisService = await getRedisService();
    if (!redisService || !redisService.isConnected) {
      return res.status(503).json({
        error: {
          code: 'REDIS_UNAVAILABLE',
          message: 'Cannot unblock key (Redis not connected)',
        },
      });
    }

    const client = redisService.getClient();
    const blockedKey = `rl:blocked:${key}`;

    const deleted = await client.del(blockedKey);

    logger.info('IP/Key manually unblocked', {
      key,
      unblockedBy: req.user.email,
      wasBlocked: deleted > 0,
    });

    res.json({
      message: deleted > 0 ? 'Key unblocked successfully' : 'Key was not blocked',
      key,
    });
  } catch (error) {
    logger.error('Error unblocking key', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to unblock key',
      },
    });
  }
});

module.exports = router;
