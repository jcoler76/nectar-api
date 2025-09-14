const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Workflow } = require('../models/workflowModels');
const { executeWorkflow } = require('../services/workflows/engine');
const { logger } = require('../utils/logger');
const { errorResponses } = require('../utils/errorHandler');
const {
  createSecureUploader,
  validateFileContent,
  virusScan,
  cleanupUploadTracking,
} = require('../middleware/fileUploadSecurity');
const { uploadRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Create secure uploader with enhanced validation
const upload = createSecureUploader({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 1,
  sanitizeFilename: true,
  blockExecutables: true,
  blockHiddenFiles: true,
  allowedMimeTypes: [
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
  allowedExtensions: [
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
});

// Enhanced security middleware for file uploads
const fileUploadSecurity = async (req, res, next) => {
  try {
    // Check upload token early (before file processing)
    const uploadToken =
      req.header('X-Upload-Token') || req.body?.uploadToken || req.query?.uploadToken;

    if (!uploadToken) {
      logger.warn('Missing upload token', {
        ip: req.ip,
        workflowId: req.params.workflowId,
      });
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Upload token required',
        },
      });
    }

    // Store token for later validation
    req.uploadToken = uploadToken;

    // Cleanup old tracking data periodically
    if (Math.random() < 0.1) {
      // 10% chance
      if (req.app.locals.uploadTracking) {
        cleanupUploadTracking(req.app.locals.uploadTracking);
      }
    }

    next();
  } catch (error) {
    logger.error('File upload security error', { error: error.message });
    errorResponses.serverError(res, error);
  }
};

// Validate MongoDB ObjectId
const validateObjectId = id => {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // MongoDB ObjectId is 24 character hex string
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
};

// POST /api/files/trigger/:workflowId
router.post(
  '/trigger/:workflowId',
  uploadRateLimiter, // Use Redis-backed rate limiting
  fileUploadSecurity,
  upload.single('file'),
  validateFileContent, // Enhanced content validation
  async (req, res) => {
    try {
      const { workflowId } = req.params;

      // Validate workflow ID
      if (!validateObjectId(workflowId)) {
        logger.warn('Invalid workflow ID in file upload', {
          workflowId,
          ip: req.ip,
        });
        return res
          .status(400)
          .json({ error: { code: 'BAD_REQUEST', message: 'Invalid workflow ID format' } });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded',
          },
        });
      }

      // Virus scan (if available)
      try {
        await virusScan(req.file.buffer);
      } catch (scanError) {
        logger.warn('Virus scan failed', {
          filename: req.file.originalname,
          error: scanError.message,
          ip: req.ip,
        });
        return res.status(400).json({
          error: {
            code: 'VIRUS_DETECTED',
            message: 'File failed security scan',
          },
        });
      }

      // Find workflow with security check
      const workflow = await Workflow.findById(workflowId);

      if (!workflow) {
        logger.warn('Workflow not found for file upload', {
          workflowId,
          ip: req.ip,
        });
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Workflow not found' } });
      }

      if (!workflow.active) {
        logger.warn('Inactive workflow accessed for file upload', {
          workflowId,
          ip: req.ip,
        });
        return res
          .status(400)
          .json({ error: { code: 'BAD_REQUEST', message: 'Workflow is not active' } });
      }

      // Check for file trigger node
      const triggerNode = workflow.nodes.find(node => node.data?.nodeType === 'trigger:file');

      if (!triggerNode) {
        logger.warn('No file trigger configured for workflow', {
          workflowId,
          ip: req.ip,
        });
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'No file trigger configured for this workflow' },
        });
      }

      // Require upload token for authentication
      const { uploadToken } = triggerNode.data;
      if (!uploadToken) {
        return res.status(500).json({
          message: 'File upload authentication not configured. Upload token is required.',
        });
      }

      // Validate upload token with timing-safe comparison
      const tokenValid = crypto.timingSafeEqual(
        Buffer.from(req.uploadToken),
        Buffer.from(uploadToken)
      );

      if (!tokenValid) {
        logger.warn('Invalid upload token', {
          workflowId,
          workflowName: workflow.name,
          ip: req.ip,
        });
        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid upload token',
          },
        });
      }

      // Create secure file data object
      const secureFileData = {
        originalname: req.file.unsafeOriginalname || req.file.originalname,
        filename: req.file.originalname, // Sanitized name
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
        uploadedAt: new Date(),
        uploadedBy: req.ip,
        fileHash:
          req.file.securityMetadata?.fileHash ||
          crypto.createHash('sha256').update(req.file.buffer).digest('hex'),
        securityMetadata: req.file.securityMetadata,
      };

      // Log successful file upload
      logger.info('File uploaded successfully for workflow', {
        workflowId,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        fileHash: secureFileData.fileHash,
        ip: req.ip,
      });

      // Respond immediately
      res.status(200).json({
        message: 'File received and workflow triggered',
        fileInfo: {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          hash: secureFileData.fileHash,
        },
      });

      // Execute workflow asynchronously
      setImmediate(() => {
        executeWorkflow(workflow, secureFileData).catch(error => {
          logger.error('Workflow execution failed after file upload', {
            workflowId,
            filename: req.file.originalname,
            error: error.message,
            ip: req.ip,
          });
        });
      });
    } catch (error) {
      logger.error('File upload error:', {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        workflowId: req.params.workflowId,
      });

      // Generic error response to prevent information disclosure
      res.status(500).json({
        message: 'An error occurred while processing the file upload',
      });
    }
  }
);

// GET /api/files/upload-info/:workflowId
// Secure endpoint to get upload requirements for a workflow
router.get('/upload-info/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;

    if (!validateObjectId(workflowId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_WORKFLOW_ID',
          message: 'Invalid workflow ID format',
        },
      });
    }

    const workflow = await Workflow.findById(workflowId).select('active nodes name').lean();

    if (!workflow) {
      return res.status(404).json({
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found',
        },
      });
    }

    const triggerNode = workflow.nodes.find(node => node.data?.nodeType === 'trigger:file');

    if (!triggerNode) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE_TRIGGER',
          message: 'Workflow does not accept file uploads',
        },
      });
    }

    // Return upload requirements (without sensitive data)
    res.json({
      workflowId,
      workflowName: workflow.name,
      active: workflow.active,
      uploadRequirements: {
        maxFileSize: triggerNode.data.maxFileSize || 10 * 1024 * 1024,
        allowedFileTypes: triggerNode.data.allowedFileTypes || [
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
        requiresToken: true,
        endpoint: `/api/files/trigger/${workflowId}`,
      },
    });
  } catch (error) {
    logger.error('Error getting upload info', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Error handling middleware for multer and file upload errors
router.use((error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File too large. Maximum size is 10MB.',
      },
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: {
        code: 'TOO_MANY_FILES',
        message: 'Too many files. Only one file allowed.',
      },
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: {
        code: 'UNEXPECTED_FIELD',
        message: 'Unexpected file field.',
      },
    });
  }

  if (
    error.code === 'INVALID_FILE_TYPE' ||
    error.code === 'INVALID_FILE_EXTENSION' ||
    error.code === 'MIME_MISMATCH' ||
    error.code === 'MALICIOUS_FILENAME'
  ) {
    return res.status(400).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  logger.error('Unexpected file upload error', {
    error: error.message,
    code: error.code,
    stack: error.stack,
    ip: req.ip,
  });

  errorResponses.serverError(res, error);
});

module.exports = router;
