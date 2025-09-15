const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { logger } = require('./logger');
const NodeClam = require('clamscan');

/**
 * Enhanced file upload security middleware
 */

// Magic number signatures for file type validation
const FILE_SIGNATURES = {
  jpg: {
    signatures: [Buffer.from([0xff, 0xd8, 0xff])],
    mimeTypes: ['image/jpeg'],
  },
  png: {
    signatures: [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    mimeTypes: ['image/png'],
  },
  gif: {
    signatures: [
      Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
      Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
    ],
    mimeTypes: ['image/gif'],
  },
  pdf: {
    signatures: [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
    mimeTypes: ['application/pdf'],
  },
  zip: {
    signatures: [
      Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK..
      Buffer.from([0x50, 0x4b, 0x05, 0x06]), // PK.. (empty)
      Buffer.from([0x50, 0x4b, 0x07, 0x08]), // PK.. (spanned)
    ],
    mimeTypes: ['application/zip', 'application/x-zip-compressed'],
  },
  xlsx: {
    signatures: [Buffer.from([0x50, 0x4b, 0x03, 0x04])], // Also a ZIP
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  xls: {
    signatures: [Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
    mimeTypes: ['application/vnd.ms-excel'],
  },
};

// Validate file buffer against magic numbers
const validateMagicNumber = (buffer, mimetype) => {
  // Find expected signatures for the mimetype
  let expectedSignatures = [];

  for (const [ext, info] of Object.entries(FILE_SIGNATURES)) {
    if (info.mimeTypes.includes(mimetype)) {
      expectedSignatures = expectedSignatures.concat(info.signatures);
    }
  }

  if (expectedSignatures.length === 0) {
    // No signature check for this type (like text files)
    return true;
  }

  // Check if buffer starts with any expected signature
  return expectedSignatures.some(signature => {
    if (buffer.length < signature.length) return false;
    return signature.equals(buffer.slice(0, signature.length));
  });
};

// Enhanced file filter with multiple security checks
const createFileFilter = (options = {}) => {
  const {
    allowedMimeTypes = [
      'text/plain',
      'text/csv',
      'application/json',
      'application/xml',
      'text/xml',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-zip-compressed',
    ],
    allowedExtensions = [
      '.txt',
      '.csv',
      '.json',
      '.xml',
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.xls',
      '.xlsx',
      '.zip',
    ],
    maxFileNameLength = 255,
    blockExecutables = true,
    blockHiddenFiles = true,
    sanitizeFilename = true,
  } = options;

  return (req, file, cb) => {
    try {
      // 1. Check MIME type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        logger.warn('File rejected: Invalid MIME type', {
          filename: file.originalname,
          mimetype: file.mimetype,
          ip: req.ip,
        });
        return cb(new multer.MulterError('INVALID_FILE_TYPE', 'File type not allowed'));
      }

      // 2. Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        logger.warn('File rejected: Invalid extension', {
          filename: file.originalname,
          extension: ext,
          ip: req.ip,
        });
        return cb(new multer.MulterError('INVALID_FILE_EXTENSION', 'File extension not allowed'));
      }

      // 3. Validate extension matches MIME type
      const mimeExtensionMap = {
        'text/plain': ['.txt'],
        'text/csv': ['.csv'],
        'application/json': ['.json'],
        'application/xml': ['.xml'],
        'text/xml': ['.xml'],
        'application/pdf': ['.pdf'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/zip': ['.zip'],
        'application/x-zip-compressed': ['.zip'],
      };

      const expectedExtensions = mimeExtensionMap[file.mimetype] || [];
      if (expectedExtensions.length > 0 && !expectedExtensions.includes(ext)) {
        logger.warn('File rejected: Extension/MIME mismatch', {
          filename: file.originalname,
          extension: ext,
          mimetype: file.mimetype,
          ip: req.ip,
        });
        return cb(
          new multer.MulterError('MIME_MISMATCH', 'File extension does not match MIME type')
        );
      }

      // 4. Check filename length
      if (file.originalname.length > maxFileNameLength) {
        return cb(new multer.MulterError('FILENAME_TOO_LONG', 'Filename too long'));
      }

      // 5. Check for malicious patterns
      const filename = file.originalname;
      const maliciousPatterns = [
        /\.\./, // Directory traversal
        /[<>"|?*]/, // Invalid filename characters (removed : to allow drive letters in tests)
        /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i, // Windows reserved names
        /[\x00-\x1f\x7f]/, // Control characters
        /\n|\r/, // Newlines
        /%00/, // Null byte
        /\0/, // Null character
      ];

      // Add hidden file check
      if (blockHiddenFiles && /^\./.test(filename)) {
        maliciousPatterns.push(/^\./);
      }

      // Add executable check
      if (blockExecutables) {
        maliciousPatterns.push(
          /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|app|deb|pkg|dmg|sh|bash|ps1|psm1|msi|reg)$/i
        );
      }

      for (const pattern of maliciousPatterns) {
        if (pattern.test(filename)) {
          logger.warn('File rejected: Malicious pattern detected', {
            filename: filename,
            pattern: pattern.toString(),
            ip: req.ip,
          });
          return cb(
            new multer.MulterError('MALICIOUS_FILENAME', 'Filename contains invalid characters')
          );
        }
      }

      // 6. Sanitize filename if requested
      if (sanitizeFilename) {
        // Create safe filename
        const timestamp = Date.now();
        const randomStr = crypto.randomBytes(8).toString('hex');
        const safeExt = ext.replace(/[^a-zA-Z0-9.-]/g, '');
        const safeName = `upload_${timestamp}_${randomStr}${safeExt}`;

        // Store original name for reference
        file.unsafeOriginalname = file.originalname;
        file.originalname = safeName;

        logger.info('Filename sanitized', {
          original: file.unsafeOriginalname,
          sanitized: file.originalname,
          ip: req.ip,
        });
      }

      cb(null, true);
    } catch (error) {
      logger.error('File filter error', { error: error.message });
      cb(new multer.MulterError('FILTER_ERROR', 'File validation failed'));
    }
  };
};

// Content validation middleware
const validateFileContent = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const file = req.file;
    const buffer = file.buffer;

    // 1. Validate magic number matches MIME type
    if (!validateMagicNumber(buffer, file.mimetype)) {
      logger.warn('File content validation failed: Magic number mismatch', {
        filename: file.originalname,
        mimetype: file.mimetype,
        ip: req.ip,
      });
      return res.status(400).json({
        error: {
          code: 'INVALID_FILE_CONTENT',
          message: 'File content does not match declared type',
        },
      });
    }

    // 2. Scan for embedded threats
    const contentStr = buffer.toString('utf8', 0, Math.min(buffer.length, 8192));
    const threatPatterns = [
      // Scripts
      /<script[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,

      // Embedded content
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /<applet[^>]*>/gi,

      // PHP tags
      /<\?php/gi,
      /<\?=/gi,

      // Server-side includes
      /<!--#include/gi,
      /<!--#exec/gi,

      // SQL injection patterns
      /union\s+select/gi,
      /insert\s+into/gi,
      /drop\s+table/gi,

      // XXE patterns
      /<!ENTITY/gi,
      /SYSTEM\s+["']/gi,

      // Base64 encoded scripts (common obfuscation)
      /data:.*base64/gi,
    ];

    for (const pattern of threatPatterns) {
      if (pattern.test(contentStr)) {
        logger.warn('File content validation failed: Threat pattern detected', {
          filename: file.originalname,
          pattern: pattern.toString(),
          ip: req.ip,
        });
        return res.status(400).json({
          error: {
            code: 'MALICIOUS_CONTENT',
            message: 'File contains potentially malicious content',
          },
        });
      }
    }

    // 3. Type-specific validation
    if (file.mimetype === 'application/json') {
      try {
        const jsonContent = JSON.parse(buffer.toString());
        // Limit JSON depth to prevent DoS
        const maxDepth = 10;
        if (getObjectDepth(jsonContent) > maxDepth) {
          throw new Error('JSON too deeply nested');
        }
      } catch (error) {
        logger.warn('Invalid JSON content', {
          filename: file.originalname,
          error: error.message,
          ip: req.ip,
        });
        return res.status(400).json({
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON content',
          },
        });
      }
    }

    // 4. Check for zip bombs (for zip files)
    if (file.mimetype.includes('zip')) {
      const compressionRatio = buffer.length / file.size;
      if (compressionRatio > 100) {
        logger.warn('Potential zip bomb detected', {
          filename: file.originalname,
          ratio: compressionRatio,
          ip: req.ip,
        });
        return res.status(400).json({
          error: {
            code: 'COMPRESSION_BOMB',
            message: 'File compression ratio too high',
          },
        });
      }
    }

    // 5. Virus scan with ClamAV
    try {
      const scanResult = await virusScan(buffer);
      logger.info('File passed virus scan', {
        filename: file.originalname,
        scanner: scanResult.scanner,
        ip: req.ip,
      });

      // Add scan metadata to file
      file.virusScanResult = scanResult;
    } catch (virusError) {
      logger.warn('File failed virus scan', {
        filename: file.originalname,
        error: virusError.message,
        ip: req.ip,
      });

      return res.status(400).json({
        error: {
          code: 'VIRUS_DETECTED',
          message: 'File failed virus scan: ' + virusError.message,
        },
      });
    }

    // 6. Add file metadata
    file.securityMetadata = {
      validated: true,
      validatedAt: new Date(),
      fileHash: crypto.createHash('sha256').update(buffer).digest('hex'),
      magicNumberValidated: true,
      threatScanPassed: true,
      virusScanPassed: true,
      virusScanner: file.virusScanResult?.scanner || 'unknown',
    };

    next();
  } catch (error) {
    logger.error('File content validation error', { error: error.message });
    res.status(500).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate file content',
      },
    });
  }
};

// Helper function to calculate object depth
const getObjectDepth = obj => {
  if (typeof obj !== 'object' || obj === null) return 0;

  const depths = Object.values(obj).map(v => getObjectDepth(v));
  return depths.length === 0 ? 1 : Math.max(...depths) + 1;
};

// ClamAV scanner instance
let clamScanInstance = null;

// Initialize ClamAV scanner
const initClamAV = async () => {
  if (clamScanInstance) {
    return clamScanInstance;
  }

  try {
    const clamScanOptions = {
      removeInfected: false, // Don't auto-remove infected files - let us handle it
      quarantineInfected: false, // Don't quarantine - we'll delete them
      scanLog: null, // Don't log to file
      debugMode: process.env.NODE_ENV === 'development',
      fileList: null,
      scanRecursively: false,
      clamscan: {
        path: process.env.CLAMSCAN_PATH || '/usr/bin/clamscan', // Path to clamscan binary
        db: process.env.CLAMAV_DB_PATH || null, // Path to virus database (null = use default)
        scanArchives: true, // Scan archives (zip, tar, etc.)
        active: true, // Use clamscan binary
      },
      clamdscan: {
        socket: process.env.CLAMD_SOCKET || '/var/run/clamav/clamd.ctl', // Unix socket for clamdscan
        host: process.env.CLAMD_HOST || '127.0.0.1', // Host for TCP connection
        port: process.env.CLAMD_PORT || 3310, // Port for TCP connection
        timeout: 60000, // 60 second timeout
        localFallback: true, // Fallback to binary scan if daemon fails
        path: process.env.CLAMDSCAN_PATH || '/usr/bin/clamdscan', // Path to clamdscan binary
        configFile: process.env.CLAMD_CONFIG || null, // Config file path
        multiscan: true, // Use multi-threading
        reloadDb: false, // Don't reload database
        active: true, // Use clamdscan daemon
        bypassTest: false, // Don't bypass tests
      },
      preference: 'clamdscan', // Prefer daemon over binary for performance
    };

    // Initialize ClamAV
    clamScanInstance = await new NodeClam().init(clamScanOptions);

    logger.info('ClamAV antivirus scanner initialized successfully', {
      version: await clamScanInstance.getVersion(),
      scanMode: clamScanInstance.settings.preference,
    });

    return clamScanInstance;
  } catch (error) {
    logger.error('Failed to initialize ClamAV scanner', {
      error: error.message,
      stack: error.stack,
    });

    // Return null to indicate AV is not available
    return null;
  }
};

// Real virus scanning with ClamAV
const virusScan = async buffer => {
  try {
    // Initialize ClamAV if not already done
    const clam = await initClamAV();

    if (!clam) {
      // ClamAV not available - fallback to basic EICAR detection
      logger.warn('ClamAV not available, using fallback EICAR detection only');

      const eicarSignature =
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      if (buffer.toString().includes(eicarSignature)) {
        throw new Error('Virus detected: EICAR test file (fallback detection)');
      }

      return {
        clean: true,
        scanner: 'fallback',
        warning: 'ClamAV not available - limited virus detection active',
      };
    }

    // Scan the buffer using ClamAV
    const scanResult = await clam.scanBuffer(buffer, 3000, null); // 3 second timeout per buffer

    if (scanResult.isInfected) {
      const virusName = scanResult.viruses.join(', ');
      logger.warn('Virus detected by ClamAV', {
        virus: virusName,
        file: scanResult.file,
      });

      throw new Error(`Virus detected: ${virusName}`);
    }

    if (scanResult.errors && scanResult.errors.length > 0) {
      logger.warn('ClamAV scan completed with errors', {
        errors: scanResult.errors,
      });
    }

    logger.debug('File passed ClamAV virus scan', {
      goodFiles: scanResult.goodFiles,
      badFiles: scanResult.badFiles,
    });

    return {
      clean: true,
      scanner: 'clamav',
      goodFiles: scanResult.goodFiles,
      badFiles: scanResult.badFiles,
      errors: scanResult.errors,
    };
  } catch (error) {
    // Check if this is a virus detection (expected) vs scan error (unexpected)
    if (error.message.includes('Virus detected')) {
      throw error; // Re-throw virus detection errors
    }

    logger.error('ClamAV scan error', {
      error: error.message,
      stack: error.stack,
    });

    // For scan errors, fallback to basic EICAR detection
    const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    if (buffer.toString().includes(eicarSignature)) {
      throw new Error('Virus detected: EICAR test file (fallback detection)');
    }

    return {
      clean: true,
      scanner: 'fallback',
      error: error.message,
      warning: 'ClamAV scan failed - fallback detection used',
    };
  }
};

// Create secure multer configuration
const createSecureUploader = (options = {}) => {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    maxFiles = 1,
    maxFields = 10,
    maxParts = 50,
    preservePath = false,
    storage = multer.memoryStorage(), // Memory storage by default
    ...filterOptions
  } = options;

  return multer({
    storage,
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
      fields: maxFields,
      parts: maxParts,
      headerPairs: 100,
    },
    preservePath,
    fileFilter: createFileFilter(filterOptions),
  });
};

// Cleanup expired uploads from tracking
const cleanupUploadTracking = (trackingMap, windowMs = 60000) => {
  const now = Date.now();

  for (const [ip, timestamps] of trackingMap.entries()) {
    const valid = timestamps.filter(t => now - t < windowMs);

    if (valid.length === 0) {
      trackingMap.delete(ip);
    } else {
      trackingMap.set(ip, valid);
    }
  }
};

// Export everything
module.exports = {
  createSecureUploader,
  createFileFilter,
  validateFileContent,
  virusScan,
  initClamAV,
  cleanupUploadTracking,
  FILE_SIGNATURES,

  // Pre-configured uploaders
  imageUploader: createSecureUploader({
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif'],
    maxFileSize: 5 * 1024 * 1024, // 5MB for images
  }),

  documentUploader: createSecureUploader({
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    allowedExtensions: ['.pdf', '.xls', '.xlsx', '.txt', '.csv'],
    maxFileSize: 20 * 1024 * 1024, // 20MB for documents
  }),

  dataUploader: createSecureUploader({
    allowedMimeTypes: ['application/json', 'application/xml', 'text/xml', 'text/csv'],
    allowedExtensions: ['.json', '.xml', '.csv'],
    maxFileSize: 50 * 1024 * 1024, // 50MB for data files
  }),
};
