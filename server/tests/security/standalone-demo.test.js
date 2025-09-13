const request = require('supertest');
const express = require('express');
const helmet = require('helmet');

describe('Standalone Security Test Demo', () => {
  let app;

  beforeEach(() => {
    app = express();

    // Apply security middleware
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
          },
        },
        xssFilter: true,
      })
    );

    app.use(express.json());

    // XSS Protection Test Endpoint
    app.post('/api/test/xss', (req, res) => {
      const { content } = req.body;

      // Escape HTML to prevent XSS
      const escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

      res.json({
        success: true,
        original: content,
        escaped: escaped,
      });
    });

    // SQL Injection Prevention Test Endpoint
    app.post('/api/test/sql', (req, res) => {
      const { email } = req.body;

      // Simulate parameterized query protection
      const dangerousPatterns = [
        /drop\s+table/i,
        /union\s+select/i,
        /;\s*--/,
        /'\s*or\s+1=1/i,
        /'\s*or\s+'1'='1/i,
      ];

      const isDangerous = dangerousPatterns.some(pattern => pattern.test(email));

      if (isDangerous) {
        return res.status(400).json({
          error: 'Invalid input detected',
          safe: false,
        });
      }

      res.json({
        success: true,
        message: 'Query would execute safely',
        safe: true,
      });
    });

    // Input Validation Test Endpoint
    app.post('/api/test/validate', (req, res) => {
      const { username, age } = req.body;

      const errors = [];

      // Validate username
      if (!username || username.length < 2) {
        errors.push('Username must be at least 2 characters');
      }
      if (username && username.length > 50) {
        errors.push('Username must be less than 50 characters');
      }
      if (username && /[<>'"&]/.test(username)) {
        errors.push('Username contains invalid characters');
      }

      // Validate age
      if (!age || isNaN(age) || age < 13 || age > 120) {
        errors.push('Age must be a number between 13 and 120');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          errors: errors,
        });
      }

      res.json({
        success: true,
        message: 'Input validation passed',
        data: { username, age },
      });
    });
  });

  describe('XSS Prevention', () => {
    test('should prevent script tag injection', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/test/xss')
        .send({ content: xssPayload })
        .expect(200);

      expect(response.body.escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(response.body.escaped).not.toContain('<script>');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('should prevent img onerror injection', async () => {
      const imgPayload = '<img src="x" onerror="alert(\'XSS\')">';

      const response = await request(app)
        .post('/api/test/xss')
        .send({ content: imgPayload })
        .expect(200);

      expect(response.body.escaped).not.toContain('onerror');
      expect(response.body.escaped).toContain('&lt;img');
    });

    test('should set CSP headers', async () => {
      const response = await request(app)
        .post('/api/test/xss')
        .send({ content: 'safe content' })
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should detect DROP TABLE attempts', async () => {
      const sqlPayload = "user@test.com'; DROP TABLE users; --";

      const response = await request(app)
        .post('/api/test/sql')
        .send({ email: sqlPayload })
        .expect(400);

      expect(response.body.safe).toBe(false);
      expect(response.body.error).toBe('Invalid input detected');
    });

    test('should detect UNION SELECT attempts', async () => {
      const unionPayload = "user@test.com' UNION SELECT * FROM passwords --";

      const response = await request(app)
        .post('/api/test/sql')
        .send({ email: unionPayload })
        .expect(400);

      expect(response.body.safe).toBe(false);
    });

    test('should detect boolean-based injection', async () => {
      const boolPayload = "user@test.com' OR 1=1 --";

      const response = await request(app)
        .post('/api/test/sql')
        .send({ email: boolPayload })
        .expect(400);

      expect(response.body.safe).toBe(false);
    });

    test('should allow safe email addresses', async () => {
      const safeEmail = 'user@example.com';

      const response = await request(app)
        .post('/api/test/sql')
        .send({ email: safeEmail })
        .expect(200);

      expect(response.body.safe).toBe(true);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should reject usernames that are too short', async () => {
      const response = await request(app)
        .post('/api/test/validate')
        .send({ username: 'a', age: 25 })
        .expect(400);

      expect(response.body.errors).toContain('Username must be at least 2 characters');
    });

    test('should reject usernames with dangerous characters', async () => {
      const response = await request(app)
        .post('/api/test/validate')
        .send({ username: 'user<script>', age: 25 })
        .expect(400);

      expect(response.body.errors).toContain('Username contains invalid characters');
    });

    test('should reject invalid ages', async () => {
      const response = await request(app)
        .post('/api/test/validate')
        .send({ username: 'validuser', age: 200 })
        .expect(400);

      expect(response.body.errors).toContain('Age must be a number between 13 and 120');
    });

    test('should accept valid input', async () => {
      const response = await request(app)
        .post('/api/test/validate')
        .send({ username: 'validuser', age: 25 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('validuser');
      expect(response.body.data.age).toBe(25);
    });
  });

  describe('Security Headers', () => {
    test('should set security headers', async () => {
      const response = await request(app)
        .post('/api/test/xss')
        .send({ content: 'test' })
        .expect(200);

      // Check for important security headers
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });
});
