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

// Create secure uploader instance
const upload = createSecureUploader({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 1,
  sanitizeFilename: true,
  blockExecutables: true,
  blockHiddenFiles: true,
});

// Validate MongoDB ObjectId
const validateObjectId = id => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
};

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
      cleanupUploadTracking(req.app.locals.uploadTracking);
    }

    next();
  } catch (error) {
    logger.error('File upload security error', { error: error.message });
    errorResponses.serverError(res, error);
  }
};

// POST /api/files/trigger/:workflowId
router.post(
  '/trigger/:workflowId',
  uploadRateLimiter, // Use Redis-backed rate limiting
  fileUploadSecurity,
  upload.single('file'),
  validateFileContent,
  async (req, res) => {
    try {
      const { workflowId } = req.params;

      // Validate workflow ID
      if (!validateObjectId(workflowId)) {
        logger.warn('Invalid workflow ID', {
          workflowId,
          ip: req.ip,
        });
        return res.status(400).json({
          error: {
            code: 'INVALID_WORKFLOW_ID',
            message: 'Invalid workflow ID format',
          },
        });
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

      // Find workflow
      const workflow = await Workflow.findById(workflowId).select('active nodes name').lean();

      if (!workflow) {
        logger.warn('Workflow not found', {
          workflowId,
          ip: req.ip,
        });
        return res.status(404).json({
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow not found',
          },
        });
      }

      if (!workflow.active) {
        logger.warn('Inactive workflow accessed', {
          workflowId,
          workflowName: workflow.name,
          ip: req.ip,
        });
        return res.status(400).json({
          error: {
            code: 'WORKFLOW_INACTIVE',
            message: 'Workflow is not active',
          },
        });
      }

      // Find file trigger node
      const triggerNode = workflow.nodes.find(node => node.data?.nodeType === 'trigger:file');

      if (!triggerNode) {
        logger.warn('No file trigger in workflow', {
          workflowId,
          workflowName: workflow.name,
          ip: req.ip,
        });
        return res.status(400).json({
          error: {
            code: 'NO_FILE_TRIGGER',
            message: 'Workflow does not accept file uploads',
          },
        });
      }

      // Validate upload token
      const { uploadToken } = triggerNode.data;
      if (!uploadToken) {
        logger.error('File trigger missing upload token', {
          workflowId,
          workflowName: workflow.name,
        });
        return res.status(500).json({
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'File upload not properly configured',
          },
        });
      }

      // Constant-time comparison to prevent timing attacks
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

      // Check file type restrictions if configured
      const allowedTypes = triggerNode.data.allowedFileTypes;
      if (allowedTypes && allowedTypes.length > 0) {
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (!allowedTypes.includes(ext)) {
          logger.warn('File type not allowed by workflow', {
            workflowId,
            workflowName: workflow.name,
            filename: req.file.originalname,
            extension: ext,
            allowedTypes,
            ip: req.ip,
          });
          return res.status(400).json({
            error: {
              code: 'FILE_TYPE_NOT_ALLOWED',
              message: `File type not allowed. Accepted types: ${allowedTypes.join(', ')}`,
            },
          });
        }
      }

      // Check file size restrictions if configured
      const maxFileSize = triggerNode.data.maxFileSize;
      if (maxFileSize && req.file.size > maxFileSize) {
        logger.warn('File too large for workflow', {
          workflowId,
          workflowName: workflow.name,
          filename: req.file.originalname,
          size: req.file.size,
          maxSize: maxFileSize,
          ip: req.ip,
        });
        return res.status(400).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File too large. Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`,
          },
        });
      }

      // Create secure file data object
      const fileData = {
        originalname: req.file.unsafeOriginalname || req.file.originalname,
        filename: req.file.originalname, // Sanitized name
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
        uploadedAt: new Date(),
        uploadedBy: req.ip,
        fileHash: req.file.securityMetadata.fileHash,
        securityMetadata: req.file.securityMetadata,
      };

      // Log successful upload
      logger.info('File uploaded successfully', {
        workflowId,
        workflowName: workflow.name,
        filename: fileData.originalname,
        sanitizedName: fileData.filename,
        size: fileData.size,
        mimetype: fileData.mimetype,
        hash: fileData.fileHash,
        ip: req.ip,
      });

      // Send response immediately
      res.status(200).json({
        message: 'File received and workflow triggered',
        fileInfo: {
          originalname: fileData.originalname,
          size: fileData.size,
          mimetype: fileData.mimetype,
          hash: fileData.fileHash,
          uploadedAt: fileData.uploadedAt,
        },
        workflowId,
        workflowName: workflow.name,
      });

      // Execute workflow asynchronously
      setImmediate(async () => {
        try {
          // Convert back to full workflow object for execution
          const fullWorkflow = await Workflow.findById(workflowId);
          await executeWorkflow(fullWorkflow, fileData);

          logger.info('Workflow execution completed', {
            workflowId,
            workflowName: workflow.name,
            filename: fileData.originalname,
          });
        } catch (error) {
          logger.error('Workflow execution failed', {
            workflowId,
            workflowName: workflow.name,
            filename: fileData.originalname,
            error: error.message,
            stack: error.stack,
          });
        }
      });
    } catch (error) {
      logger.error('File upload error', {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        workflowId: req.params.workflowId,
      });

      errorResponses.serverError(res, error);
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

// Error handling middleware for multer
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
  });

  errorResponses.serverError(res, error);
});

module.exports = router;
