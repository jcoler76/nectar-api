const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

describe('Rate Limiting & DoS Attack Prevention Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json({ limit: '1mb' }));

    // Configure different rate limits for different endpoints
    const loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 requests per windowMs
      message: {
        error: 'Too many login attempts, please try again later',
        retryAfter: 900, // 15 minutes in seconds
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      keyGenerator: req => {
        // Use IP + email for more granular limiting
        return `${req.ip}-${req.body?.email || 'unknown'}`;
      },
    });

    const apiLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // Limit each IP to 100 requests per minute
      message: {
        error: 'Too many API requests, please try again later',
        retryAfter: 60,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    const strictLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // Very strict limit for sensitive operations
      message: {
        error: 'Rate limit exceeded for sensitive operation',
        retryAfter: 60,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    const passwordResetLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Only 3 password reset attempts per hour
      message: {
        error: 'Too many password reset attempts, please try again later',
        retryAfter: 3600,
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: req => {
        return `${req.ip}-${req.body?.email || 'unknown'}`;
      },
    });

    // Apply rate limiting to specific routes
    app.post('/api/auth/login', loginLimiter, (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Simulate authentication logic
      if (email === 'admin@example.com' && password === 'admin123') {
        res.json({ success: true, token: 'mock-jwt-token' });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    });

    app.post('/api/auth/forgot-password', passwordResetLimiter, (req, res) => {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      res.json({
        success: true,
        message: 'Password reset email sent',
      });
    });

    app.get('/api/data', apiLimiter, (req, res) => {
      res.json({
        success: true,
        data: 'Some API data',
        timestamp: new Date().toISOString(),
      });
    });

    app.post('/api/sensitive/delete', strictLimiter, (req, res) => {
      res.json({
        success: true,
        message: 'Sensitive operation completed',
      });
    });

    app.post('/api/search', apiLimiter, (req, res) => {
      const { query } = req.body;

      // Simulate expensive search operation
      setTimeout(() => {
        res.json({
          success: true,
          results: [],
          query: query,
        });
      }, 100); // 100ms delay to simulate work
    });

    // Endpoint without rate limiting (for comparison)
    app.get('/api/public/info', (req, res) => {
      res.json({
        success: true,
        message: 'Public information',
      });
    });

    // Endpoint that simulates resource-intensive operations
    app.post('/api/process/heavy', apiLimiter, (req, res) => {
      const { iterations } = req.body;

      if (iterations > 1000000) {
        return res.status(400).json({
          error: 'Iterations limit exceeded',
        });
      }

      // Simulate CPU-intensive work
      let result = 0;
      for (let i = 0; i < (iterations || 1000); i++) {
        result += Math.sqrt(i);
      }

      res.json({
        success: true,
        result: result,
        iterations: iterations || 1000,
      });
    });
  });

  describe('Login Brute Force Protection', () => {
    test('should allow normal login attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.headers['ratelimit-limit']).toBe('5');
      expect(response.headers['ratelimit-remaining']).toBe('4');
    });

    test('should block after exceeding login rate limit', async () => {
      const invalidCredentials = {
        email: 'admin@example.com',
        password: 'wrongpassword',
      };

      // Make 5 failed attempts (the limit)
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send(invalidCredentials).expect(401);
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect(429);

      expect(response.body.error).toContain('Too many login attempts');
      expect(response.body.retryAfter).toBe(900);
      expect(response.headers['ratelimit-limit']).toBe('5');
      expect(response.headers['ratelimit-remaining']).toBe('0');
    });

    test('should differentiate rate limits by email', async () => {
      // Use up attempts for one email
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'user1@example.com',
            password: 'wrong',
          })
          .expect(401);
      }

      // Should be blocked for user1
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'wrong',
        })
        .expect(429);

      // Should still work for user2
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user2@example.com',
          password: 'wrong',
        })
        .expect(401); // Wrong password, but not rate limited

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('API Rate Limiting', () => {
    test('should allow requests within rate limit', async () => {
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get('/api/data').expect(200);

        expect(response.body.success).toBe(true);
        expect(parseInt(response.headers['ratelimit-remaining'])).toBe(100 - i - 1);
      }
    });

    test('should block requests after exceeding API rate limit', async () => {
      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/data').expect(200);
      }

      // 101st request should be rate limited
      const response = await request(app).get('/api/data').expect(429);

      expect(response.body.error).toContain('Too many API requests');
      expect(response.body.retryAfter).toBe(60);
      expect(response.headers['ratelimit-limit']).toBe('100');
      expect(response.headers['ratelimit-remaining']).toBe('0');
    });

    test('should handle concurrent requests properly', async () => {
      // Send 20 concurrent requests
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(request(app).get('/api/data'));
      }

      const responses = await Promise.all(promises);

      // All should succeed (within 100 request limit)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Check that rate limit headers are consistent
      const lastResponse = responses[responses.length - 1];
      expect(parseInt(lastResponse.headers['ratelimit-remaining'])).toBe(80); // 100 - 20
    });
  });

  describe('Password Reset Rate Limiting', () => {
    test('should allow password reset requests within limit', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'user@example.com' })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should block excessive password reset attempts', async () => {
      const email = 'user@example.com';

      // Make 3 requests (the limit)
      for (let i = 0; i < 3; i++) {
        await request(app).post('/api/auth/forgot-password').send({ email }).expect(200);
      }

      // 4th request should be rate limited
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(429);

      expect(response.body.error).toContain('Too many password reset attempts');
      expect(response.body.retryAfter).toBe(3600); // 1 hour
    });
  });

  describe('DoS Attack Prevention', () => {
    test('should prevent rapid fire requests', async () => {
      const promises = [];

      // Send 150 rapid requests (exceeding 100/minute limit)
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app)
            .get('/api/data')
            .catch(err => ({ status: err.response?.status, body: err.response?.body }))
        );
      }

      const responses = await Promise.all(promises);

      // Some should succeed, others should be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBe(100); // Only 100 should succeed
      expect(rateLimitedCount).toBe(50); // Remaining 50 should be rate limited
    });

    test('should prevent resource exhaustion through CPU-intensive requests', async () => {
      // Try to make CPU-intensive request
      const response = await request(app)
        .post('/api/process/heavy')
        .send({ iterations: 500000 })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Try to exceed processing limit
      const heavyResponse = await request(app)
        .post('/api/process/heavy')
        .send({ iterations: 2000000 }) // Over 1M limit
        .expect(400);

      expect(heavyResponse.body.error).toBe('Iterations limit exceeded');
    });

    test('should prevent payload size attacks', async () => {
      const largePayload = {
        data: 'A'.repeat(2 * 1024 * 1024), // 2MB payload (over 1MB limit)
      };

      const response = await request(app).post('/api/search').send(largePayload).expect(413); // Payload Too Large

      expect(response.status).toBe(413);
    });

    test('should handle slowloris-style attacks', async () => {
      // Simulate multiple slow connections
      const slowPromises = [];

      for (let i = 0; i < 10; i++) {
        slowPromises.push(
          new Promise(resolve => {
            setTimeout(() => {
              request(app)
                .post('/api/search')
                .send({ query: `slow-query-${i}` })
                .then(resolve)
                .catch(resolve);
            }, i * 50); // Staggered requests
          })
        );
      }

      const responses = await Promise.all(slowPromises);

      // All should eventually complete (within rate limits)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Sensitive Operations Protection', () => {
    test('should strictly limit sensitive operations', async () => {
      // Make 10 requests (the strict limit)
      for (let i = 0; i < 10; i++) {
        await request(app).post('/api/sensitive/delete').expect(200);
      }

      // 11th request should be rate limited
      const response = await request(app).post('/api/sensitive/delete').expect(429);

      expect(response.body.error).toContain('Rate limit exceeded for sensitive operation');
    });

    test('should not rate limit public endpoints', async () => {
      // Make many requests to public endpoint
      for (let i = 0; i < 200; i++) {
        const response = await request(app).get('/api/public/info').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.headers['ratelimit-limit']).toBeUndefined();
      }
    });
  });

  describe('Rate Limit Headers and Information Disclosure', () => {
    test('should include proper rate limit headers', async () => {
      const response = await request(app).get('/api/data').expect(200);

      expect(response.headers['ratelimit-limit']).toBe('100');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    test('should not leak sensitive information in rate limit responses', async () => {
      // Exceed login rate limit
      for (let i = 0; i < 6; i++) {
        await request(app).post('/api/auth/login').send({
          email: 'admin@example.com',
          password: 'wrong',
        });
      }

      const rateLimitedResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'wrong',
        })
        .expect(429);

      // Should not expose internal details
      const responseText = JSON.stringify(rateLimitedResponse.body);
      expect(responseText).not.toContain('database');
      expect(responseText).not.toContain('redis');
      expect(responseText).not.toContain('memory');
      expect(responseText).not.toContain('server');
    });

    test('should handle rate limit bypass attempts', async () => {
      // Try to bypass with different user agents
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'curl/7.68.0',
        'PostmanRuntime/7.26.8',
      ];

      let totalRequests = 0;

      for (const userAgent of userAgents) {
        for (let i = 0; i < 30; i++) {
          const response = await request(app).get('/api/data').set('User-Agent', userAgent);

          totalRequests++;

          if (totalRequests > 100) {
            expect(response.status).toBe(429);
            break;
          }
        }
      }
    });

    test('should handle X-Forwarded-For header manipulation', async () => {
      const fakeIPs = ['192.168.1.1', '10.0.0.1', '127.0.0.1', '172.16.0.1'];

      let totalRequests = 0;

      for (const ip of fakeIPs) {
        for (let i = 0; i < 30; i++) {
          const response = await request(app).get('/api/data').set('X-Forwarded-For', ip);

          totalRequests++;

          if (totalRequests > 100) {
            expect(response.status).toBe(429);
            break;
          }
        }
      }
    });
  });

  describe('Distributed DoS Protection', () => {
    test('should handle requests from multiple IPs', async () => {
      // This test simulates multiple IPs but in reality they would come from the same IP
      // In a real application, you'd want distributed rate limiting (Redis, etc.)

      const mockIPs = ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4'];

      for (const ip of mockIPs) {
        // Each "IP" can make up to the rate limit
        for (let i = 0; i < 25; i++) {
          const response = await request(app)
            .get('/api/data')
            .set('X-Forwarded-For', ip)
            .expect(200);

          expect(response.body.success).toBe(true);
        }
      }

      // Total requests: 4 * 25 = 100, should hit rate limit
      const response = await request(app).get('/api/data').expect(429);

      expect(response.body.error).toContain('Too many API requests');
    });
  });
});
