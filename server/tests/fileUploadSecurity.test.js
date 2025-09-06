const request = require('supertest');
const express = require('express');
const path = require('path');
const {
  createSecureUploader,
  validateFileContent,
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
});
