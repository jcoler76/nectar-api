const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

describe('Directory Traversal & Path Injection Prevention Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Safe file serving with proper validation
    const SAFE_DIRECTORY = path.join(__dirname, 'test-files');
    const ALLOWED_EXTENSIONS = ['.txt', '.jpg', '.png', '.pdf'];

    // Ensure test directory exists
    if (!fs.existsSync(SAFE_DIRECTORY)) {
      fs.mkdirSync(SAFE_DIRECTORY, { recursive: true });
    }

    // Create test files
    const testFiles = {
      'public.txt': 'This is a public file',
      'image.jpg': 'fake-jpeg-content',
      'document.pdf': 'fake-pdf-content',
    };

    Object.entries(testFiles).forEach(([filename, content]) => {
      const filepath = path.join(SAFE_DIRECTORY, filename);
      if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, content);
      }
    });

    // Secure file download endpoint
    app.get('/api/files/download/:filename', (req, res) => {
      try {
        const { filename } = req.params;

        // Input validation
        if (!filename || typeof filename !== 'string') {
          return res.status(400).json({ error: 'Invalid filename' });
        }

        // Sanitize filename - remove path traversal attempts
        const sanitizedFilename = path.basename(filename);

        // Check file extension
        const extension = path.extname(sanitizedFilename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
          return res.status(400).json({
            error: 'File type not allowed',
            allowed: ALLOWED_EXTENSIONS,
          });
        }

        // Construct safe path
        const safePath = path.resolve(SAFE_DIRECTORY, sanitizedFilename);

        // Ensure the resolved path is still within the safe directory
        if (!safePath.startsWith(path.resolve(SAFE_DIRECTORY))) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Check if file exists
        if (!fs.existsSync(safePath)) {
          return res.status(404).json({ error: 'File not found' });
        }

        // Serve file
        const content = fs.readFileSync(safePath, 'utf8');
        res.json({
          success: true,
          filename: sanitizedFilename,
          content: content,
        });
      } catch (error) {
        res.status(500).json({ error: 'Server error' });
      }
    });

    // Vulnerable file upload endpoint (for testing)
    app.post('/api/files/upload', (req, res) => {
      const { filename, content } = req.body;

      if (!filename || !content) {
        return res.status(400).json({ error: 'Filename and content required' });
      }

      // Basic path traversal prevention
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename - path traversal detected' });
      }

      // Check for dangerous file types
      const dangerousExtensions = ['.exe', '.bat', '.sh', '.php', '.js', '.html', '.htm'];
      const extension = path.extname(filename).toLowerCase();

      if (dangerousExtensions.includes(extension)) {
        return res.status(400).json({ error: 'Dangerous file type not allowed' });
      }

      res.json({
        success: true,
        message: `File ${filename} would be uploaded`,
        filename: filename,
      });
    });

    // Template/view rendering endpoint with path injection protection
    app.get('/api/template/:templateName', (req, res) => {
      const { templateName } = req.params;

      // Whitelist allowed templates
      const allowedTemplates = ['user-profile', 'dashboard', 'settings', 'report'];

      if (!allowedTemplates.includes(templateName)) {
        return res.status(400).json({
          error: 'Template not found',
          allowed: allowedTemplates,
        });
      }

      res.json({
        success: true,
        template: templateName,
        content: `Rendered template: ${templateName}`,
      });
    });

    // Configuration file access endpoint
    app.get('/api/config/:configFile', (req, res) => {
      const { configFile } = req.params;

      // Only allow specific config files
      const allowedConfigs = ['app.json', 'features.json', 'public-settings.json'];

      if (!allowedConfigs.includes(configFile)) {
        return res.status(403).json({ error: 'Configuration file access denied' });
      }

      res.json({
        success: true,
        config: configFile,
        data: { setting: 'public-value' },
      });
    });

    // Image proxy endpoint with URL validation
    app.get('/api/proxy/image', (req, res) => {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({ error: 'URL parameter required' });
      }

      // Validate URL format
      try {
        const parsedUrl = new URL(url);

        // Only allow HTTP/HTTPS protocols
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          return res.status(400).json({ error: 'Invalid protocol. Only HTTP and HTTPS allowed' });
        }

        // Block internal network access
        const hostname = parsedUrl.hostname;
        const blockedHosts = [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          '::1',
          'metadata.google.internal', // GCP metadata
          '169.254.169.254', // AWS metadata
        ];

        if (
          blockedHosts.includes(hostname) ||
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)
        ) {
          return res.status(403).json({ error: 'Access to internal resources denied' });
        }

        res.json({
          success: true,
          message: `Would proxy image from: ${url}`,
          hostname: hostname,
        });
      } catch (error) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
    });
  });

  describe('Basic Path Traversal Prevention', () => {
    test('should block classic path traversal attempts', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//etc/passwd',
        '..%2f..%2f..%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      ];

      for (const attempt of pathTraversalAttempts) {
        const response = await request(app)
          .get(`/api/files/download/${encodeURIComponent(attempt)}`)
          .expect(400);

        expect(response.body.error).toContain('File type not allowed');
      }
    });

    test('should block null byte injection', async () => {
      const nullByteAttempts = [
        'public.txt%00.jpg',
        '../../../etc/passwd%00.txt',
        'config.php%00.png',
      ];

      for (const attempt of nullByteAttempts) {
        const response = await request(app).get(`/api/files/download/${attempt}`).expect(400);

        expect([400, 403]).toContain(response.status);
      }
    });

    test('should block Unicode path traversal attempts', async () => {
      const unicodeAttempts = [
        '\u002e\u002e\u002f\u002e\u002e\u002f\u002e\u002e\u002fetc\u002fpasswd',
        'public.txt\u0000.jpg',
        '\uff0e\uff0e\uff0fpublic.txt',
      ];

      for (const attempt of unicodeAttempts) {
        const response = await request(app).get(
          `/api/files/download/${encodeURIComponent(attempt)}`
        );

        expect([400, 403, 404]).toContain(response.status);
      }
    });

    test('should allow legitimate file access', async () => {
      const legitimateFiles = ['public.txt', 'image.jpg', 'document.pdf'];

      for (const filename of legitimateFiles) {
        const response = await request(app).get(`/api/files/download/${filename}`).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.filename).toBe(filename);
      }
    });
  });

  describe('File Upload Path Traversal Prevention', () => {
    test('should block path traversal in file uploads', async () => {
      const maliciousFilenames = [
        '../../../malware.exe',
        '..\\..\\..\\backdoor.bat',
        '../../../../etc/crontab',
        'normal.txt/../../../evil.sh',
      ];

      for (const filename of maliciousFilenames) {
        const response = await request(app)
          .post('/api/files/upload')
          .send({
            filename: filename,
            content: 'malicious content',
          })
          .expect(400);

        expect(response.body.error).toBe('Invalid filename - path traversal detected');
      }
    });

    test('should block dangerous file types', async () => {
      const dangerousFiles = [
        'virus.exe',
        'script.bat',
        'backdoor.sh',
        'webshell.php',
        'malicious.js',
        'phishing.html',
      ];

      for (const filename of dangerousFiles) {
        const response = await request(app)
          .post('/api/files/upload')
          .send({
            filename: filename,
            content: 'dangerous content',
          })
          .expect(400);

        expect(response.body.error).toBe('Dangerous file type not allowed');
      }
    });

    test('should allow safe file uploads', async () => {
      const safeFiles = ['document.txt', 'image.png', 'report.pdf', 'data.csv'];

      for (const filename of safeFiles) {
        const response = await request(app)
          .post('/api/files/upload')
          .send({
            filename: filename,
            content: 'safe content',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Template Path Injection Prevention', () => {
    test('should block template path traversal', async () => {
      const maliciousTemplates = [
        '../../../etc/passwd',
        '..\\..\\..\\config.ini',
        '../config/database.yml',
        'user-profile/../../../secrets.json',
      ];

      for (const template of maliciousTemplates) {
        const response = await request(app)
          .get(`/api/template/${encodeURIComponent(template)}`)
          .expect(400);

        expect(response.body.error).toBe('Template not found');
        expect(response.body.allowed).toBeDefined();
      }
    });

    test('should only allow whitelisted templates', async () => {
      const validTemplates = ['user-profile', 'dashboard', 'settings', 'report'];

      for (const template of validTemplates) {
        const response = await request(app).get(`/api/template/${template}`).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.template).toBe(template);
      }
    });

    test('should reject non-whitelisted templates', async () => {
      const invalidTemplates = ['admin-panel', 'secret-page', 'config-editor', '../admin-template'];

      for (const template of invalidTemplates) {
        const response = await request(app).get(`/api/template/${template}`).expect(400);

        expect(response.body.error).toBe('Template not found');
      }
    });
  });

  describe('Configuration File Access Prevention', () => {
    test('should block access to sensitive config files', async () => {
      const sensitiveConfigs = [
        'database.json',
        'secrets.json',
        'private-keys.json',
        '../../../etc/passwd',
        'config.ini',
        '.env',
      ];

      for (const config of sensitiveConfigs) {
        const response = await request(app)
          .get(`/api/config/${encodeURIComponent(config)}`)
          .expect(403);

        expect(response.body.error).toBe('Configuration file access denied');
      }
    });

    test('should allow access to public config files', async () => {
      const publicConfigs = ['app.json', 'features.json', 'public-settings.json'];

      for (const config of publicConfigs) {
        const response = await request(app).get(`/api/config/${config}`).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.config).toBe(config);
      }
    });
  });

  describe('URL/SSRF Prevention in Proxy Endpoints', () => {
    test('should block file:// protocol access', async () => {
      const fileUrls = [
        'file:///etc/passwd',
        'file://C:/Windows/System32/config/sam',
        'file:///proc/self/environ',
      ];

      for (const url of fileUrls) {
        const response = await request(app).get('/api/proxy/image').query({ url: url }).expect(400);

        expect(response.body.error).toBe('Invalid protocol. Only HTTP and HTTPS allowed');
      }
    });

    test('should block localhost and internal network access', async () => {
      const internalUrls = [
        'http://localhost:3000/admin',
        'http://127.0.0.1:8080/internal',
        'http://169.254.169.254/latest/meta-data/', // AWS metadata
        'http://metadata.google.internal/computeMetadata/v1/', // GCP metadata
        'http://192.168.1.1/admin',
        'http://10.0.0.1/config',
        'http://172.16.0.1/secrets',
      ];

      for (const url of internalUrls) {
        const response = await request(app).get('/api/proxy/image').query({ url: url }).expect(403);

        expect(response.body.error).toBe('Access to internal resources denied');
      }
    });

    test('should block non-HTTP protocols', async () => {
      const maliciousProtocols = [
        'ftp://example.com/file.txt',
        'gopher://evil.com:70/exploit',
        'ldap://internal.company.com/search',
        'dict://localhost:2628/SHOW:DB',
        'sftp://internal.server.com/config',
      ];

      for (const url of maliciousProtocols) {
        const response = await request(app).get('/api/proxy/image').query({ url: url }).expect(400);

        expect(response.body.error).toBe('Invalid protocol. Only HTTP and HTTPS allowed');
      }
    });

    test('should allow legitimate external URLs', async () => {
      const legitimateUrls = [
        'https://example.com/image.jpg',
        'http://cdn.example.org/photo.png',
        'https://api.external-service.com/avatar.gif',
      ];

      for (const url of legitimateUrls) {
        const response = await request(app).get('/api/proxy/image').query({ url: url }).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Would proxy image from:');
      }
    });

    test('should reject malformed URLs', async () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https:///',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
      ];

      for (const url of malformedUrls) {
        const response = await request(app).get('/api/proxy/image').query({ url: url });

        expect([400, 403]).toContain(response.status);
      }
    });
  });

  describe('Advanced Path Traversal Techniques', () => {
    test('should block double URL encoding', async () => {
      const doubleEncodedPaths = [
        '%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd', // ../../../etc/passwd double encoded
        '%252e%252e%255c%252e%252e%255c%252e%252e%255cwindows%255csystem32', // Windows path double encoded
      ];

      for (const path of doubleEncodedPaths) {
        const response = await request(app).get(`/api/files/download/${path}`);

        expect([400, 403, 404]).toContain(response.status);
      }
    });

    test('should block 16-bit Unicode encoding', async () => {
      const unicodePaths = [
        '\uff0e\uff0e\uff0f\uff0e\uff0e\uff0f\uff0e\uff0e\uff0fetc\uff0fpasswd', // Fullwidth Unicode
        'public.txt\u0000.jpg', // Null byte in Unicode
      ];

      for (const path of unicodePaths) {
        const response = await request(app).get(`/api/files/download/${encodeURIComponent(path)}`);

        expect([400, 403, 404]).toContain(response.status);
      }
    });

    test('should block overlong UTF-8 sequences', async () => {
      // These would represent normal characters but using overlong encoding
      const overlongPaths = [
        '%c0%ae%c0%ae%c0%af', // Overlong encoding of ../
        '%e0%80%ae%e0%80%ae%e0%80%af', // Even longer overlong encoding
      ];

      for (const path of overlongPaths) {
        const response = await request(app).get(`/api/files/download/${path}`);

        expect([400, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Operating System Specific Attacks', () => {
    test('should block Windows-specific path traversal', async () => {
      const windowsPaths = [
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....\\\\....\\\\windows\\\\system32',
        'public.txt\\..\\..\\..\\config.ini',
      ];

      for (const path of windowsPaths) {
        const response = await request(app).get(`/api/files/download/${encodeURIComponent(path)}`);

        expect([400, 403, 404]).toContain(response.status);
      }
    });

    test('should block Unix-specific sensitive files', async () => {
      const unixPaths = [
        '../../../etc/shadow',
        '../../../root/.ssh/id_rsa',
        '../../../proc/self/environ',
        '../../../var/log/auth.log',
      ];

      for (const path of unixPaths) {
        const response = await request(app).get(`/api/files/download/${encodeURIComponent(path)}`);

        expect([400, 403, 404]).toContain(response.status);
      }
    });
  });

  // Clean up test files after all tests
  afterAll(() => {
    const testDir = path.join(__dirname, 'test-files');
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
    }
  });
});
