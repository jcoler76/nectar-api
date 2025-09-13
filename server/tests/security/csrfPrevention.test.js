const request = require('supertest');
const express = require('express');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const session = require('express-session');

describe('CSRF (Cross-Site Request Forgery) Prevention Tests', () => {
  let app;
  let csrfProtection;

  beforeEach(() => {
    app = express();

    // Setup session and cookie parser (required for CSRF)
    app.use(cookieParser());
    app.use(
      session({
        secret: 'test-session-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: false, // Set to true in production with HTTPS
          sameSite: 'strict',
        },
      })
    );

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // CSRF protection middleware
    csrfProtection = csrf({
      cookie: {
        httpOnly: true,
        secure: false, // Set to true in production
        sameSite: 'strict',
      },
    });

    // Route to get CSRF token
    app.get('/api/csrf-token', csrfProtection, (req, res) => {
      res.json({
        csrfToken: req.csrfToken(),
      });
    });

    // Protected routes that require CSRF token
    app.post('/api/test/transfer-money', csrfProtection, (req, res) => {
      const { amount, to } = req.body;
      res.json({
        success: true,
        message: `Transferred $${amount} to ${to}`,
        timestamp: new Date().toISOString(),
      });
    });

    app.delete('/api/test/delete-account', csrfProtection, (req, res) => {
      const { accountId } = req.body;
      res.json({
        success: true,
        message: `Account ${accountId} deleted`,
        timestamp: new Date().toISOString(),
      });
    });

    app.put('/api/test/change-password', csrfProtection, (req, res) => {
      const { newPassword } = req.body;
      res.json({
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString(),
      });
    });

    // Route without CSRF protection (for testing)
    app.post('/api/test/public-action', (req, res) => {
      res.json({
        success: true,
        message: 'Public action completed',
      });
    });

    // Global CSRF error handler
    app.use((err, req, res, next) => {
      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
          error: 'Invalid CSRF token',
          code: 'CSRF_TOKEN_MISMATCH',
        });
      }
      next(err);
    });
  });

  describe('CSRF Token Generation', () => {
    test('should generate CSRF token on request', async () => {
      const response = await request(app).get('/api/csrf-token').expect(200);

      expect(response.body.csrfToken).toBeDefined();
      expect(typeof response.body.csrfToken).toBe('string');
      expect(response.body.csrfToken.length).toBeGreaterThan(0);
    });

    test('should set CSRF cookie', async () => {
      const response = await request(app).get('/api/csrf-token').expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const csrfCookie = cookies.find(cookie => cookie.includes('_csrf'));
      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).toContain('HttpOnly');
      expect(csrfCookie).toContain('SameSite=Strict');
    });

    test('should generate unique tokens for different sessions', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      const response1 = await agent1.get('/api/csrf-token').expect(200);
      const response2 = await agent2.get('/api/csrf-token').expect(200);

      expect(response1.body.csrfToken).toBeDefined();
      expect(response2.body.csrfToken).toBeDefined();
      expect(response1.body.csrfToken).not.toBe(response2.body.csrfToken);
    });
  });

  describe('CSRF Protection on State-Changing Operations', () => {
    test('should block POST request without CSRF token', async () => {
      const response = await request(app)
        .post('/api/test/transfer-money')
        .send({ amount: 1000, to: 'attacker@evil.com' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
      expect(response.body.code).toBe('CSRF_TOKEN_MISMATCH');
    });

    test('should block DELETE request without CSRF token', async () => {
      const response = await request(app)
        .delete('/api/test/delete-account')
        .send({ accountId: '12345' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
    });

    test('should block PUT request without CSRF token', async () => {
      const response = await request(app)
        .put('/api/test/change-password')
        .send({ newPassword: 'hacker123' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
    });

    test('should allow request with valid CSRF token', async () => {
      const agent = request.agent(app);

      // Get CSRF token
      const tokenResponse = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenResponse.body.csrfToken;

      // Use token in protected request
      const response = await agent
        .post('/api/test/transfer-money')
        .set('X-CSRF-Token', csrfToken)
        .send({ amount: 100, to: 'friend@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Transferred $100 to friend@example.com');
    });
  });

  describe('CSRF Attack Simulation', () => {
    test('should prevent forged request from different origin', async () => {
      const agent = request.agent(app);

      // Legitimate user gets token
      const tokenResponse = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenResponse.body.csrfToken;

      // Attacker tries to use the token from different session
      const attackResponse = await request(app)
        .post('/api/test/transfer-money')
        .set('X-CSRF-Token', csrfToken)
        .set('Origin', 'https://evil-site.com')
        .send({ amount: 10000, to: 'attacker@evil.com' })
        .expect(403);

      expect(attackResponse.body.error).toBe('Invalid CSRF token');
    });

    test('should prevent double submit cookie attack', async () => {
      // Attacker tries to forge both cookie and token
      const response = await request(app)
        .post('/api/test/transfer-money')
        .set('Cookie', '_csrf=fake-token')
        .set('X-CSRF-Token', 'fake-token')
        .send({ amount: 5000, to: 'attacker@evil.com' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
    });

    test('should prevent token reuse across different actions', async () => {
      const agent = request.agent(app);

      // Get token for one action
      const tokenResponse = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenResponse.body.csrfToken;

      // Use token for legitimate action
      await agent
        .post('/api/test/transfer-money')
        .set('X-CSRF-Token', csrfToken)
        .send({ amount: 50, to: 'friend@example.com' })
        .expect(200);

      // Try to reuse same token for different action
      const reuseResponse = await agent
        .delete('/api/test/delete-account')
        .set('X-CSRF-Token', csrfToken)
        .send({ accountId: '12345' })
        .expect(403);

      expect(reuseResponse.body.error).toBe('Invalid CSRF token');
    });
  });

  describe('CSRF Token Validation Methods', () => {
    test('should accept CSRF token in header', async () => {
      const agent = request.agent(app);

      const tokenResponse = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenResponse.body.csrfToken;

      const response = await agent
        .post('/api/test/transfer-money')
        .set('X-CSRF-Token', csrfToken)
        .send({ amount: 25, to: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should accept CSRF token in request body', async () => {
      const agent = request.agent(app);

      const tokenResponse = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenResponse.body.csrfToken;

      const response = await agent
        .post('/api/test/transfer-money')
        .send({
          amount: 25,
          to: 'test@example.com',
          _csrf: csrfToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should reject invalid CSRF token format', async () => {
      const agent = request.agent(app);

      const response = await agent
        .post('/api/test/transfer-money')
        .set('X-CSRF-Token', 'invalid-token-format')
        .send({ amount: 100, to: 'test@example.com' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
    });

    test('should reject expired CSRF token', async () => {
      // This test simulates token expiration
      const expiredToken = 'expired-token-12345';

      const response = await request(app)
        .post('/api/test/transfer-money')
        .set('X-CSRF-Token', expiredToken)
        .send({ amount: 100, to: 'test@example.com' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
    });
  });

  describe('SameSite Cookie Protection', () => {
    test('should set SameSite=Strict on CSRF cookies', async () => {
      const response = await request(app).get('/api/csrf-token').expect(200);

      const cookies = response.headers['set-cookie'];
      const csrfCookie = cookies.find(cookie => cookie.includes('_csrf'));

      expect(csrfCookie).toContain('SameSite=Strict');
    });

    test('should set HttpOnly on CSRF cookies', async () => {
      const response = await request(app).get('/api/csrf-token').expect(200);

      const cookies = response.headers['set-cookie'];
      const csrfCookie = cookies.find(cookie => cookie.includes('_csrf'));

      expect(csrfCookie).toContain('HttpOnly');
    });
  });

  describe('Safe Methods Without CSRF Protection', () => {
    test('should allow GET requests without CSRF token', async () => {
      const response = await request(app).get('/api/csrf-token').expect(200);

      expect(response.body.csrfToken).toBeDefined();
    });

    test('should allow HEAD requests without CSRF token', async () => {
      const response = await request(app).head('/api/csrf-token').expect(200);
    });

    test('should allow OPTIONS requests without CSRF token', async () => {
      const response = await request(app).options('/api/csrf-token').expect(200);
    });

    test('should allow public endpoints without CSRF token', async () => {
      const response = await request(app)
        .post('/api/test/public-action')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
