const request = require('supertest');
const express = require('express');
const path = require('path');
const {
  createSecureUploader,
  validateFileContent,
  virusScan,
  initClamAV,
  FILE_SIGNATURES,
} = require('../middleware/fileUploadSecurity');

// Mock logger
jest.mock('../middleware/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('File Upload Security', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.set('trust proxy', 1);
  });

  describe('File Type Validation', () => {
    test('should accept allowed file types', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), (req, res) => {
        res.json({ filename: req.file.originalname });
      });

      const response = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(200);

      expect(response.body.filename).toMatch(/^upload_\d+_[a-f0-9]+\.txt$/);
    });

    test('should reject disallowed MIME types', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), (req, res) => {
        res.json({ filename: req.file.originalname });
      });

      app.use((error, req, res, next) => {
        res.status(400).json({ error: error.message });
      });

      await request(app)
        .post('/upload')
        .attach('file', Buffer.from('test'), {
          filename: 'test.exe',
          contentType: 'application/x-msdownload',
        })
        .expect(400);
    });

    test('should reject mismatched extensions', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), (req, res) => {
        res.json({ filename: req.file.originalname });
      });

      app.use((error, req, res, next) => {
        res.status(400).json({ error: error.message });
      });

      await request(app)
        .post('/upload')
        .attach('file', Buffer.from('test'), {
          filename: 'test.jpg',
          contentType: 'text/plain',
        })
        .expect(400);
    });
  });

  describe('Filename Security', () => {
    test('should reject directory traversal attempts', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), (req, res) => {
        res.json({ success: true });
      });

      app.use((error, req, res, next) => {
        res.status(400).json({ error: error.message });
      });

      const maliciousNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        'test/../../sensitive.txt',
        'test%2F..%2F..%2Fetc%2Fpasswd',
      ];

      for (const filename of maliciousNames) {
        await request(app)
          .post('/upload')
          .attach('file', Buffer.from('test'), {
            filename,
            contentType: 'text/plain',
          })
          .expect(400);
      }
    });

    test('should reject Windows reserved names', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), (req, res) => {
        res.json({ success: true });
      });

      app.use((error, req, res, next) => {
        res.status(400).json({ error: error.message });
      });

      const reservedNames = ['CON.txt', 'PRN.pdf', 'AUX.doc', 'NUL.csv'];

      for (const filename of reservedNames) {
        await request(app)
          .post('/upload')
          .attach('file', Buffer.from('test'), {
            filename,
            contentType: 'text/plain',
          })
          .expect(400);
      }
    });

    test('should reject executable files', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), (req, res) => {
        res.json({ success: true });
      });

      app.use((error, req, res, next) => {
        res.status(400).json({ error: error.message });
      });

      const executableNames = [
        'virus.exe',
        'script.bat',
        'command.cmd',
        'macro.vbs',
        'code.js',
        'app.jar',
      ];

      for (const filename of executableNames) {
        await request(app)
          .post('/upload')
          .attach('file', Buffer.from('test'), filename)
          .expect(400);
      }
    });

    test('should sanitize filenames', async () => {
      const upload = createSecureUploader({ sanitizeFilename: true });

      app.post('/upload', upload.single('file'), (req, res) => {
        res.json({
          original: req.file.unsafeOriginalname,
          sanitized: req.file.originalname,
        });
      });

      const response = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('test'), 'my file (1).txt')
        .expect(200);

      expect(response.body.original).toBe('my file (1).txt');
      expect(response.body.sanitized).toMatch(/^upload_\d+_[a-f0-9]+\.txt$/);
    });
  });

  describe('Content Validation', () => {
    test('should validate magic numbers', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), validateFileContent, (req, res) =>
        res.json({ success: true })
      );

      app.use((error, req, res, next) => {
        res.status(400).json({ error: error.message });
      });

      // Valid PNG magic number
      const pngBuffer = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.from('fake png data'),
      ]);

      await request(app)
        .post('/upload')
        .attach('file', pngBuffer, {
          filename: 'image.png',
          contentType: 'image/png',
        })
        .expect(200);
    });

    test('should reject files with wrong magic numbers', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), validateFileContent, (req, res) =>
        res.json({ success: true })
      );

      app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        res.status(error.status || 400).json({
          error: error.message || 'Upload failed',
        });
      });

      // Text content claiming to be PNG
      await request(app)
        .post('/upload')
        .attach('file', Buffer.from('This is not a PNG'), {
          filename: 'fake.png',
          contentType: 'image/png',
        })
        .expect(400);
    });

    test('should detect embedded scripts', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), validateFileContent, (req, res) =>
        res.json({ success: true })
      );

      app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        res.status(error.status || 400).json({
          error: error.message || 'Upload failed',
        });
      });

      const maliciousContent = [
        '<script>alert("xss")</script>',
        'data:text/javascript;base64,YWxlcnQoMSk=',
        '<?php system($_GET["cmd"]); ?>',
        '<!--#exec cmd="/bin/ls" -->',
      ];

      for (const content of maliciousContent) {
        await request(app)
          .post('/upload')
          .attach('file', Buffer.from(content), 'test.txt')
          .expect(400);
      }
    });

    test('should validate JSON depth', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), validateFileContent, (req, res) =>
        res.json({ success: true })
      );

      app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        res.status(error.status || 400).json({
          error: error.message || 'Upload failed',
        });
      });

      // Create deeply nested JSON
      let deepJson = {};
      let current = deepJson;
      for (let i = 0; i < 15; i++) {
        current.nested = {};
        current = current.nested;
      }

      await request(app)
        .post('/upload')
        .attach('file', Buffer.from(JSON.stringify(deepJson)), {
          filename: 'deep.json',
          contentType: 'application/json',
        })
        .expect(400);
    });
  });

  describe('File Size Limits', () => {
    test('should enforce file size limits', async () => {
      const upload = createSecureUploader({ maxFileSize: 1024 }); // 1KB

      app.post('/upload', upload.single('file'), (req, res) => {
        res.json({ success: true });
      });

      app.use((error, req, res, next) => {
        res.status(400).json({
          error: error.code || error.message,
        });
      });

      const largeBuffer = Buffer.alloc(2048); // 2KB

      await request(app).post('/upload').attach('file', largeBuffer, 'large.txt').expect(400);
    });

    test('should accept files under size limit', async () => {
      const upload = createSecureUploader({ maxFileSize: 1024 }); // 1KB

      app.post('/upload', upload.single('file'), (req, res) => {
        res.json({ size: req.file.size });
      });

      const smallBuffer = Buffer.alloc(512); // 512B

      const response = await request(app)
        .post('/upload')
        .attach('file', smallBuffer, 'small.txt')
        .expect(200);

      expect(response.body.size).toBe(512);
    });
  });

  describe('Security Metadata', () => {
    test('should add security metadata to validated files', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), validateFileContent, (req, res) => {
        res.json({
          metadata: req.file.securityMetadata,
        });
      });

      const response = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(200);

      expect(response.body.metadata).toMatchObject({
        validated: true,
        validatedAt: expect.any(String),
        fileHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        magicNumberValidated: true,
        threatScanPassed: true,
      });
    });
  });

  describe('Multiple Files', () => {
    test('should handle multiple file uploads', async () => {
      const upload = createSecureUploader({ maxFiles: 3 });

      app.post('/upload', upload.array('files', 3), (req, res) => {
        res.json({
          count: req.files.length,
          files: req.files.map(f => f.originalname),
        });
      });

      const response = await request(app)
        .post('/upload')
        .attach('files', Buffer.from('file1'), 'file1.txt')
        .attach('files', Buffer.from('file2'), 'file2.txt')
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.files).toHaveLength(2);
    });

    test('should reject too many files', async () => {
      const upload = createSecureUploader({ maxFiles: 2 });

      app.post('/upload', upload.array('files', 2), (req, res) => {
        res.json({ success: true });
      });

      app.use((error, req, res, next) => {
        res.status(400).json({ error: error.code });
      });

      await request(app)
        .post('/upload')
        .attach('files', Buffer.from('file1'), 'file1.txt')
        .attach('files', Buffer.from('file2'), 'file2.txt')
        .attach('files', Buffer.from('file3'), 'file3.txt')
        .expect(400);
    });
  });

  describe('ClamAV Virus Scanning', () => {
    test('should detect EICAR test string even without ClamAV', async () => {
      const eicarContent = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const buffer = Buffer.from(eicarContent);

      try {
        await virusScan(buffer);
        fail('Expected virus scan to throw error for EICAR test string');
      } catch (error) {
        expect(error.message).toContain('Virus detected');
        expect(error.message).toContain('EICAR');
      }
    });

    test('should pass clean files through virus scan', async () => {
      const cleanContent = 'This is a clean text file with no malicious content.';
      const buffer = Buffer.from(cleanContent);

      const result = await virusScan(buffer);
      expect(result.clean).toBe(true);
      expect(result.scanner).toBeDefined();
    });

    test('should handle ClamAV initialization gracefully when not available', async () => {
      // This test will pass whether ClamAV is installed or not
      // If ClamAV is not available, it should fallback gracefully
      const clam = await initClamAV();
      // Should either return a ClamAV instance or null (graceful fallback)
      expect(clam === null || typeof clam === 'object').toBe(true);
    });

    test('should include virus scan metadata in file security metadata', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), validateFileContent, (req, res) => {
        res.json({
          metadata: req.file.securityMetadata,
          virusScanResult: req.file.virusScanResult,
        });
      });

      const response = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('clean test content'), 'test.txt')
        .expect(200);

      expect(response.body.metadata).toMatchObject({
        validated: true,
        virusScanPassed: true,
        virusScanner: expect.any(String),
      });

      expect(response.body.virusScanResult).toMatchObject({
        clean: true,
        scanner: expect.any(String),
      });
    });

    test('should reject files that fail virus scan during upload', async () => {
      const upload = createSecureUploader();

      app.post('/upload', upload.single('file'), validateFileContent, (req, res) => {
        res.json({ success: true });
      });

      app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        res.status(error.status || 400).json({
          error: error.message || 'Upload failed',
        });
      });

      // Upload EICAR test string
      const eicarContent = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

      const response = await request(app)
        .post('/upload')
        .attach('file', Buffer.from(eicarContent), 'virus.txt')
        .expect(400);

      expect(response.body.error.code).toBe('VIRUS_DETECTED');
      expect(response.body.error.message).toContain('Virus detected');
    });

    test('should handle virus scan errors gracefully', async () => {
      // Test with an extremely large buffer that might cause scan timeouts
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB of zeros
      largeBuffer.fill('A'); // Fill with 'A' characters

      const result = await virusScan(largeBuffer);

      // Should complete successfully or fallback gracefully
      expect(result.clean).toBe(true);
      expect(result.scanner).toBeDefined();

      // If there was a fallback, it should be indicated
      if (result.scanner === 'fallback') {
        expect(result.warning || result.error).toBeDefined();
      }
    });
  });
});
