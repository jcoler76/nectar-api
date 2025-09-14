const request = require('supertest');
const express = require('express');
const helmet = require('helmet');

describe('XSS (Cross-Site Scripting) Prevention Tests', () => {
  let app;

  beforeEach(() => {
    app = express();

    // Apply security headers (same as production)
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        xssFilter: true,
      })
    );

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Mock endpoints that might be vulnerable to XSS
    app.post('/api/test/comment', (req, res) => {
      const { comment, author } = req.body;

      // Simulate storing and returning user content (should be escaped)
      const response = {
        id: 1,
        comment: comment,
        author: author,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    });

    app.post('/api/test/search', (req, res) => {
      const { query } = req.body;

      // Return search results including the query (potential reflection)
      res.json({
        query: query,
        results: [],
        message: `Search results for: ${query}`,
      });
    });

    app.get('/api/test/profile/:username', (req, res) => {
      const { username } = req.params;

      res.json({
        username: username,
        profile: `Profile for ${username}`,
      });
    });

    // Endpoint that might render HTML (should have proper escaping)
    app.post('/api/test/render', (req, res) => {
      const { content } = req.body;

      // This should escape HTML content
      const escapedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

      res.json({
        originalContent: content,
        escapedContent: escapedContent,
      });
    });
  });

  describe('Reflected XSS Prevention', () => {
    test('should prevent script injection in search queries', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/test/search')
        .send({ query: xssPayload })
        .expect(200);

      // Response should contain the payload but headers should prevent execution
      expect(response.body.query).toBe(xssPayload);
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    });

    test('should prevent iframe injection attacks', async () => {
      const iframePayload = '<iframe src="javascript:alert(\'XSS\')"></iframe>';

      const response = await request(app)
        .post('/api/test/comment')
        .send({ comment: iframePayload, author: 'testuser' })
        .expect(200);

      expect(response.body.comment).toBe(iframePayload);
      expect(response.headers['content-security-policy']).toContain("frame-src 'none'");
    });

    test('should prevent img tag XSS attacks', async () => {
      const imgPayload = '<img src="x" onerror="alert(\'XSS\')">';

      const response = await request(app)
        .post('/api/test/comment')
        .send({ comment: imgPayload, author: 'testuser' })
        .expect(200);

      expect(response.body.comment).toBe(imgPayload);
      expect(response.headers['content-security-policy']).toContain("img-src 'self' data: https:");
    });

    test('should prevent javascript: URL schemes', async () => {
      const jsPayload = 'javascript:alert("XSS")';

      const response = await request(app)
        .get(`/api/test/profile/${encodeURIComponent(jsPayload)}`)
        .expect(200);

      expect(response.body.username).toBe(jsPayload);
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('should prevent data: URL XSS attacks', async () => {
      const dataPayload = 'data:text/html,<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/test/comment')
        .send({ comment: dataPayload, author: 'testuser' })
        .expect(200);

      expect(response.body.comment).toBe(dataPayload);
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Stored XSS Prevention', () => {
    test('should escape HTML entities in user content', async () => {
      const htmlPayload = '<div>Hello <b>World</b></div>';

      const response = await request(app)
        .post('/api/test/render')
        .send({ content: htmlPayload })
        .expect(200);

      expect(response.body.escapedContent).toBe(
        '&lt;div&gt;Hello &lt;b&gt;World&lt;/b&gt;&lt;/div&gt;'
      );
      expect(response.body.escapedContent).not.toContain('<');
      expect(response.body.escapedContent).not.toContain('>');
    });

    test('should escape script tags in comments', async () => {
      const scriptPayload = 'Hello <script>steal_cookies()</script> World';

      const response = await request(app)
        .post('/api/test/render')
        .send({ content: scriptPayload })
        .expect(200);

      expect(response.body.escapedContent).toContain('&lt;script&gt;');
      expect(response.body.escapedContent).toContain('&lt;/script&gt;');
      expect(response.body.escapedContent).not.toContain('<script>');
    });

    test('should escape quotes and apostrophes', async () => {
      const quotePayload = 'He said "Hello" and she said \'Hi\'';

      const response = await request(app)
        .post('/api/test/render')
        .send({ content: quotePayload })
        .expect(200);

      expect(response.body.escapedContent).toContain('&quot;');
      expect(response.body.escapedContent).toContain('&#x27;');
      expect(response.body.escapedContent).not.toContain('"Hello"');
    });

    test('should handle event handlers in attributes', async () => {
      const eventPayload = '<div onclick="malicious()">Click me</div>';

      const response = await request(app)
        .post('/api/test/render')
        .send({ content: eventPayload })
        .expect(200);

      expect(response.body.escapedContent).not.toContain('onclick');
      expect(response.body.escapedContent).toContain('&lt;div');
      expect(response.body.escapedContent).toContain('&gt;');
    });
  });

  describe('DOM-based XSS Prevention', () => {
    test('should prevent hash-based XSS attacks', async () => {
      const hashPayload = '#<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/test/search')
        .send({ query: hashPayload })
        .expect(200);

      expect(response.headers['content-security-policy']).toContain("script-src 'self'");
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('should prevent document.write XSS vectors', async () => {
      const writePayload = '<script>document.write("<script src=evil.com></script>")</script>';

      const response = await request(app)
        .post('/api/test/comment')
        .send({ comment: writePayload, author: 'testuser' })
        .expect(200);

      expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    });

    test('should prevent innerHTML XSS vectors', async () => {
      const innerHtmlPayload =
        '<img src="x" onerror="document.getElementById(\'target\').innerHTML=\'<script>alert(1)</script>\'">';

      const response = await request(app)
        .post('/api/test/comment')
        .send({ comment: innerHtmlPayload, author: 'testuser' })
        .expect(200);

      expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    });
  });

  describe('Content Security Policy Tests', () => {
    test('should set restrictive CSP headers', async () => {
      const response = await request(app)
        .post('/api/test/comment')
        .send({ comment: 'test', author: 'testuser' })
        .expect(200);

      const csp = response.headers['content-security-policy'];

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain('upgrade-insecure-requests');
    });

    test('should prevent inline script execution', async () => {
      const response = await request(app)
        .post('/api/test/comment')
        .send({ comment: '<script>alert("inline")</script>', author: 'testuser' })
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("'unsafe-inline'");
    });

    test('should prevent eval() and similar functions', async () => {
      const response = await request(app)
        .post('/api/test/comment')
        .send({ comment: 'eval("alert(1)")', author: 'testuser' })
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("'unsafe-eval'");
    });
  });

  describe('Special Characters and Encoding', () => {
    test('should handle Unicode XSS attempts', async () => {
      const unicodePayload = '\u003cscript\u003ealert("XSS")\u003c/script\u003e';

      const response = await request(app)
        .post('/api/test/render')
        .send({ content: unicodePayload })
        .expect(200);

      expect(response.body.escapedContent).toContain('&lt;');
      expect(response.body.escapedContent).toContain('&gt;');
    });

    test('should handle HTML entity XSS attempts', async () => {
      const entityPayload = '&lt;script&gt;alert("XSS")&lt;/script&gt;';

      const response = await request(app)
        .post('/api/test/comment')
        .send({ comment: entityPayload, author: 'testuser' })
        .expect(200);

      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should handle URL encoded XSS attempts', async () => {
      const encodedPayload = '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E';

      const response = await request(app)
        .post('/api/test/search')
        .send({ query: decodeURIComponent(encodedPayload) })
        .expect(200);

      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });
});
