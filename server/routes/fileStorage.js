/**
 * File Storage API Routes
 * Provides comprehensive BaaS file storage endpoints
 */

const express = require('express');
const multer = require('multer');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const { apiRateLimiter, uploadRateLimiter } = require('../middleware/rateLimiter');
const trackApiUsage = require('../middleware/apiUsageTracker');
const { validateFileContent } = require('../middleware/fileUploadSecurity');
const EnhancedFileStorageService = require('../services/enhancedFileStorageService');
const { logger } = require('../utils/logger');

// Initialize file storage service
const fileStorageService = new EnhancedFileStorageService();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation - detailed validation in service
    const allowedTypes =
      /jpeg|jpg|png|gif|pdf|txt|csv|json|xml|zip|xlsx|xls|docx|doc|mp4|mov|mp3|wav/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Validation middleware
const uploadValidation = [
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('generateThumbnails')
    .optional()
    .isBoolean()
    .withMessage('generateThumbnails must be a boolean'),
];

const presignedUrlValidation = [
  body('filename').notEmpty().withMessage('Filename is required'),
  body('maxFileSize')
    .optional()
    .isInt({ min: 1 })
    .withMessage('maxFileSize must be a positive integer'),
  body('expiresIn')
    .optional()
    .isInt({ min: 60, max: 3600 })
    .withMessage('expiresIn must be between 60 and 3600 seconds'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
];

const listFilesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('mimeType').optional().isString().withMessage('mimeType must be a string'),
  query('tags').optional().isString().withMessage('Tags must be a comma-separated string'),
  query('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  query('sortBy')
    .optional()
    .isIn(['uploadedAt', 'filename', 'fileSize'])
    .withMessage('Invalid sortBy field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * POST /api/files/upload
 * Upload single or multiple files
 */
router.post(
  '/upload',
  uploadRateLimiter,
  trackApiUsage,
  authMiddleware,
  upload.array('files', 10),
  validateFileContent,
  uploadValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files provided',
        });
      }

      const {
        tags = [],
        description = null,
        isPublic = false,
        generateThumbnails = true,
        metadata = {},
      } = req.body;

      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      // Process all files
      const uploadPromises = req.files.map(file =>
        fileStorageService.uploadFile(file.buffer, file.originalname, organizationId, req.user.id, {
          tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
          description,
          isPublic: isPublic === true || isPublic === 'true',
          generateThumbnails: generateThumbnails === true || generateThumbnails === 'true',
          metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
        })
      );

      const uploadResults = await Promise.all(uploadPromises);

      logger.info('Files uploaded successfully', {
        fileCount: uploadResults.length,
        organizationId,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: `${uploadResults.length} file(s) uploaded successfully`,
        files: uploadResults,
      });
    } catch (error) {
      logger.error('File upload failed', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'File upload failed',
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/files/presigned-url
 * Generate presigned URL for direct client uploads
 */
router.post(
  '/presigned-url',
  apiRateLimiter,
  trackApiUsage,
  authMiddleware,
  presignedUrlValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { filename, maxFileSize, expiresIn = 300, isPublic = false } = req.body;

      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const result = await fileStorageService.generatePresignedUploadUrl(
        filename,
        organizationId,
        req.user.id,
        {
          expiresIn,
          maxFileSize,
          isPublic: isPublic === true || isPublic === 'true',
        }
      );

      logger.info('Presigned URL generated', {
        filename,
        organizationId,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Presigned URL generated successfully',
        upload: result,
      });
    } catch (error) {
      logger.error('Presigned URL generation failed', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to generate presigned URL',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/files
 * List files with filtering and pagination
 */
router.get(
  '/',
  apiRateLimiter,
  trackApiUsage,
  authMiddleware,
  listFilesValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        mimeType,
        tags,
        isPublic,
        sortBy = 'uploadedAt',
        sortOrder = 'desc',
      } = req.query;

      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        mimeType,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : null,
        isPublic: isPublic !== undefined ? isPublic === 'true' : null,
        sortBy,
        sortOrder,
      };

      const result = await fileStorageService.listFiles(organizationId, options);

      res.json({
        success: true,
        message: 'Files retrieved successfully',
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list files', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve files',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/files/:fileId
 * Get file metadata and download URL
 */
router.get(
  '/:fileId',
  apiRateLimiter,
  trackApiUsage,
  authMiddleware,
  param('fileId').isUUID().withMessage('Invalid file ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const { download = false, expiresIn = 3600 } = req.query;

      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      // Get file metadata from database
      const { getPrismaClient } = require('../config/prisma');
      const prisma = getPrismaClient();

      const file = await prisma.fileStorage.findFirst({
        where: { id: fileId, organizationId },
        include: {
          uploader: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          thumbnails: true,
          versions: {
            take: 5,
            orderBy: { versionNumber: 'desc' },
          },
        },
      });

      if (!file || !file.isActive) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      let downloadUrl = null;
      if (download === 'true') {
        downloadUrl = await fileStorageService.getFileUrl(fileId, parseInt(expiresIn));
      }

      res.json({
        success: true,
        message: 'File retrieved successfully',
        file: {
          ...file,
          fileSize: file.fileSize.toString(),
          metadata: file.metadata ? JSON.parse(file.metadata) : null,
          downloadUrl,
        },
      });
    } catch (error) {
      logger.error('Failed to get file', { error: error.message, fileId: req.params.fileId });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve file',
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/files/:fileId
 * Delete file from storage and database
 */
router.delete(
  '/:fileId',
  apiRateLimiter,
  trackApiUsage,
  authMiddleware,
  param('fileId').isUUID().withMessage('Invalid file ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { fileId } = req.params;

      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      await fileStorageService.deleteFile(fileId, organizationId);

      logger.info('File deleted successfully', {
        fileId,
        organizationId,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete file', { error: error.message, fileId: req.params.fileId });
      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/files/:fileId/share
 * Create shareable link for file
 */
router.post(
  '/:fileId/share',
  apiRateLimiter,
  trackApiUsage,
  authMiddleware,
  param('fileId').isUUID().withMessage('Invalid file ID'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('allowDownload').optional().isBoolean().withMessage('allowDownload must be a boolean'),
  body('allowPreview').optional().isBoolean().withMessage('allowPreview must be a boolean'),
  body('expiresIn')
    .optional()
    .isInt({ min: 3600 })
    .withMessage('expiresIn must be at least 1 hour'),
  body('maxDownloads').optional().isInt({ min: 1 }).withMessage('maxDownloads must be positive'),
  body('password').optional().isString().withMessage('password must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const {
        isPublic = false,
        allowDownload = true,
        allowPreview = true,
        expiresIn,
        maxDownloads,
        password,
      } = req.body;

      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      // Verify file exists and belongs to organization
      const { getPrismaClient } = require('../config/prisma');
      const prisma = getPrismaClient();

      const file = await prisma.fileStorage.findFirst({
        where: { id: fileId, organizationId },
      });

      if (!file || !file.isActive) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      // Generate share token
      const crypto = require('crypto');
      const shareToken = crypto.randomBytes(32).toString('hex');

      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        const bcrypt = require('bcryptjs');
        hashedPassword = await bcrypt.hash(password, 10);
      }

      // Create share record
      const share = await prisma.fileShare.create({
        data: {
          fileId,
          shareToken,
          isPublic,
          allowDownload,
          allowPreview,
          expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
          maxDownloads,
          password: hashedPassword,
          createdBy: req.user.id,
        },
      });

      const shareUrl = `${req.protocol}://${req.get('host')}/api/files/shared/${shareToken}`;

      logger.info('File share created', {
        fileId,
        shareToken,
        organizationId,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Share link created successfully',
        share: {
          id: share.id,
          shareToken,
          shareUrl,
          isPublic,
          allowDownload,
          allowPreview,
          expiresAt: share.expiresAt,
          maxDownloads,
          createdAt: share.createdAt,
        },
      });
    } catch (error) {
      logger.error('Failed to create file share', {
        error: error.message,
        fileId: req.params.fileId,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to create share link',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/files/shared/:shareToken
 * Access shared file
 */
router.get('/shared/:shareToken', apiRateLimiter, async (req, res) => {
  try {
    const { shareToken } = req.params;
    const { password, download = false } = req.query;

    const { getPrismaClient } = require('../config/prisma');
    const prisma = getPrismaClient();

    // Get share record with file info
    const share = await prisma.fileShare.findUnique({
      where: { shareToken },
      include: {
        file: {
          include: {
            thumbnails: true,
          },
        },
      },
    });

    if (!share || !share.file.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Shared file not found or expired',
      });
    }

    // Check expiration
    if (share.expiresAt && share.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'Share link has expired',
      });
    }

    // Check download limit
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      return res.status(410).json({
        success: false,
        message: 'Download limit exceeded',
      });
    }

    // Check password if required
    if (share.password) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: 'Password required',
          requiresPassword: true,
        });
      }

      const bcrypt = require('bcryptjs');
      const passwordValid = await bcrypt.compare(password, share.password);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password',
        });
      }
    }

    // Check permissions
    if (download === 'true' && !share.allowDownload) {
      return res.status(403).json({
        success: false,
        message: 'Download not allowed for this share',
      });
    }

    // Get file URL if downloading
    let fileUrl = null;
    if (download === 'true') {
      fileUrl = await fileStorageService.getFileUrl(share.file.id, 3600);

      // Increment download count
      await prisma.fileShare.update({
        where: { id: share.id },
        data: { downloadCount: { increment: 1 } },
      });
    }

    res.json({
      success: true,
      message: 'Shared file accessed successfully',
      file: {
        id: share.file.id,
        filename: share.file.filename,
        mimeType: share.file.mimeType,
        fileSize: share.file.fileSize.toString(),
        uploadedAt: share.file.uploadedAt,
        thumbnails: share.file.thumbnails,
        allowDownload: share.allowDownload,
        allowPreview: share.allowPreview,
      },
      downloadUrl: fileUrl,
    });
  } catch (error) {
    logger.error('Failed to access shared file', {
      error: error.message,
      shareToken: req.params.shareToken,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to access shared file',
      error: error.message,
    });
  }
});

module.exports = router;
