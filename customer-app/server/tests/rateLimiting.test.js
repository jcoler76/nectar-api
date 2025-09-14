const request = require('supertest');
const express = require('express');
const {
  createRateLimiter,
  rateLimiters,
  resetRateLimit,
} = require('../middleware/advancedRateLimiter');
const { getRedisService } = require('../services/redisService');

// Mock Redis service
jest.mock('../services/redisService', () => ({
  getRedisService: jest.fn(),
}));

// Mock logger
jest.mock('../middleware/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Advanced Rate Limiting', () => {
  let app;
  let mockRedisClient;

  beforeEach(() => {
    app = express();
    app.set('trust proxy', 1);

    // Mock Redis client
    mockRedisClient = {
      multi: jest.fn().mockReturnThis(),
      incr: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn().mockResolvedValue([[null, 1]]),
      ttl: jest.fn().mockResolvedValue(900),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      scard: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      dbsize: jest.fn().mockResolvedValue(100),
      info: jest.fn().mockResolvedValue('used_memory_human:10M'),
    };

    // Mock Redis service
    getRedisService.mockResolvedValue({
      isConnected: true,
      getClient: () => mockRedisClient,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rate Limiting', () => {
    test('should allow requests under the limit', async () => {
      const limiter = createRateLimiter({ max: 5, windowMs: 60000 });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/test').expect(200);

        expect(response.headers['ratelimit-limit']).toBe('5');
        expect(response.headers['ratelimit-remaining']).toBe(String(4 - i));
      }
    });

    test('should block requests over the limit', async () => {
      mockRedisClient.exec.mockResolvedValue([[null, 6]]);

      const limiter = createRateLimiter({ max: 5, windowMs: 60000 });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test').expect(429);

      expect(response.body).toEqual({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
          retryAfter: expect.any(Number),
          limit: 5,
          current: 6,
        },
      });
    });

    test('should use in-memory fallback when Redis is unavailable', async () => {
      getRedisService.mockResolvedValue(null);

      const limiter = createRateLimiter({ max: 2, windowMs: 60000 });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // First two requests should succeed
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Third request should be blocked
      await request(app).get('/test').expect(429);
    });
  });

  describe('Authentication Rate Limiting', () => {
    test('should have stricter limits for auth endpoints', async () => {
      app.use('/auth', rateLimiters.auth);
      app.post('/auth/login', (req, res) => res.json({ success: true }));

      // Simulate 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        mockRedisClient.exec.mockResolvedValueOnce([[null, i + 1]]);
        await request(app).post('/auth/login').expect(200);
      }

      // 6th request should be blocked
      mockRedisClient.exec.mockResolvedValueOnce([[null, 6]]);
      const response = await request(app).post('/auth/login').expect(429);

      expect(response.body.error.message).toContain('authentication attempts');
    });

    test('should block IP after limit with blockDuration', async () => {
      mockRedisClient.exec.mockResolvedValue([[null, 6]]);

      app.use('/auth', rateLimiters.auth);
      app.post('/auth/login', (req, res) => res.json({ success: true }));

      await request(app).post('/auth/login').expect(429);

      // Verify block key was set
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining(':blocked'),
        '1',
        'EX',
        3600
      );
    });
  });

  describe('Dynamic Rate Limiting', () => {
    test('should apply different limits based on user tier', async () => {
      const userLimiter = createRateLimiter({
        keyGenerator: req => req.user?.id || req.ip,
        dynamicRateLimit: async req => {
          const tier = req.user?.tier || 'free';
          const limits = { free: 10, premium: 100 };
          return { max: limits[tier] || 10, windowMs: 3600000 };
        },
      });

      app.use((req, res, next) => {
        req.user = { id: 'user123', tier: 'premium' };
        next();
      });
      app.use(userLimiter);
      app.get('/api', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/api').expect(200);

      expect(response.headers['ratelimit-limit']).toBe('100');
    });
  });

  describe('GraphQL Rate Limiting', () => {
    test('should adjust limits based on query complexity', async () => {
      app.use(express.json());
      app.use('/graphql', rateLimiters.graphql);
      app.post('/graphql', (req, res) => res.json({ data: {} }));

      // Simple query
      const simpleResponse = await request(app)
        .post('/graphql')
        .send({ query: '{ user { id } }' })
        .expect(200);

      expect(simpleResponse.headers['ratelimit-limit']).toBe('200');

      // Complex query (> 1000 chars)
      const complexQuery = '{ ' + 'user { id name email profile { ' + 'a'.repeat(1000) + ' } } }';

      const complexResponse = await request(app)
        .post('/graphql')
        .send({ query: complexQuery })
        .expect(200);

      expect(complexResponse.headers['ratelimit-limit']).toBe('50');
    });
  });

  describe('Upload Rate Limiting', () => {
    test('should limit file uploads', async () => {
      app.use('/upload', rateLimiters.upload);
      app.post('/upload', (req, res) => res.json({ success: true }));

      const response = await request(app).post('/upload').expect(200);

      expect(response.headers['ratelimit-limit']).toBe('20');
      expect(response.headers['ratelimit-policy']).toContain('w=3600');
    });
  });

  describe('Distributed Rate Limiting', () => {
    test('should handle distributed rate limiting', async () => {
      mockRedisClient.scard.mockResolvedValue(3); // 3 nodes

      const limiter = createRateLimiter({
        max: 300,
        enableDistributed: true,
        nodeId: 'node1',
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Should be limited to 100 per node (300/3)
      mockRedisClient.exec.mockResolvedValue([[null, 101]]);

      const response = await request(app).get('/test').expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Skip Options', () => {
    test('should skip successful requests when configured', async () => {
      const limiter = createRateLimiter({
        max: 5,
        skipSuccessfulRequests: true,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.status(200).json({ success: true }));

      // Multiple successful requests should not count
      for (let i = 0; i < 10; i++) {
        mockRedisClient.exec.mockResolvedValueOnce([[null, 1]]);
        await request(app).get('/test').expect(200);

        // Verify count was reset
        expect(mockRedisClient.del).toHaveBeenCalled();
      }
    });

    test('should skip failed requests when configured', async () => {
      const limiter = createRateLimiter({
        max: 5,
        skipFailedRequests: true,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.status(400).json({ error: true }));

      // Multiple failed requests should not count
      for (let i = 0; i < 10; i++) {
        mockRedisClient.exec.mockResolvedValueOnce([[null, 1]]);
        await request(app).get('/test').expect(400);

        // Verify count was reset
        expect(mockRedisClient.del).toHaveBeenCalled();
      }
    });
  });

  describe('Headers', () => {
    test('should set standard headers', async () => {
      const limiter = createRateLimiter({
        max: 100,
        windowMs: 3600000,
        standardHeaders: true,
        legacyHeaders: false,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test').expect(200);

      expect(response.headers['ratelimit-limit']).toBe('100');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
      expect(response.headers['ratelimit-policy']).toBe('100;w=3600');
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
    });

    test('should set legacy headers when enabled', async () => {
      const limiter = createRateLimiter({
        max: 100,
        standardHeaders: false,
        legacyHeaders: true,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe('100');
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should fail open on Redis errors', async () => {
      mockRedisClient.exec.mockRejectedValue(new Error('Redis connection error'));

      const limiter = createRateLimiter({ max: 5 });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Should allow request despite Redis error
      const response = await request(app).get('/test').expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
