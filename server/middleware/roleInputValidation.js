/**
 * Role Input Validation and Sanitization Middleware
 *
 * CRITICAL SECURITY IMPLEMENTATION
 * - Prevents injection attacks through role names and object paths
 * - Implements whitelist-based sanitization
 * - Validates all role management inputs
 * - Blocks malicious payloads at input level
 */

const { logger } = require('../utils/logger');
const validator = require('validator');
const { body, param, query, validationResult } = require('express-validator');

/**
 * CRITICAL: Role name validation and sanitization
 * Prevents injection attacks and ensures valid role names
 */
const validateRoleName = () => {
  return [
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Role name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9_\-\s\.]+$/)
      .withMessage(
        'Role name can only contain letters, numbers, spaces, hyphens, underscores, and periods'
      )
      .trim()
      .escape()
      .customSanitizer(value => {
        // Additional sanitization to prevent injection
        return value.replace(/[<>\"'`]/g, '');
      })
      .custom(value => {
        // Block common SQL injection patterns
        const sqlInjectionPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
          /(UNION|OR|AND)\s+\d+\s*=\s*\d+/i,
          /['"]\s*(OR|AND)\s*['"]/i,
          /--/,
          /\/\*/,
          /\*\//,
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
        ];

        for (const pattern of sqlInjectionPatterns) {
          if (pattern.test(value)) {
            throw new Error('Role name contains invalid characters or patterns');
          }
        }
        return true;
      }),
  ];
};

/**
 * CRITICAL: Role description validation and sanitization
 */
const validateRoleDescription = () => {
  return [
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Role description cannot exceed 500 characters')
      .trim()
      .escape()
      .customSanitizer(value => {
        if (!value) return value;
        // Remove potentially dangerous characters
        return value.replace(/[<>\"'`]/g, '');
      })
      .custom(value => {
        if (!value) return true;

        // Block script injection patterns
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /data:/i,
          /vbscript:/i,
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            throw new Error('Role description contains invalid content');
          }
        }
        return true;
      }),
  ];
};

/**
 * CRITICAL: Service ID validation
 */
const validateServiceId = () => {
  return [
    body('serviceId')
      .isUUID(4)
      .withMessage('Service ID must be a valid UUID')
      .customSanitizer(value => {
        // Ensure it's a clean UUID
        return validator.isUUID(value) ? value : '';
      }),
  ];
};

/**
 * CRITICAL: Object name validation for role permissions
 * Prevents path traversal and injection attacks
 */
const validateObjectName = () => {
  return [
    body('permissions.*.objectName')
      .custom((value, { req }) => {
        if (!value) return true;

        // Whitelist-based validation for object names
        const validObjectNamePattern = /^\/?(table|view|proc)\/[a-zA-Z0-9_\-\.]+$/;

        if (!validObjectNamePattern.test(value)) {
          throw new Error('Object name must follow format: /table/name, /view/name, or /proc/name');
        }

        // Block path traversal attempts
        const pathTraversalPatterns = [
          /\.\./,
          /\.\//,
          /\\.\\/,
          /\\\.\./,
          /%2e%2e/i,
          /%2f/i,
          /%5c/i,
          /\x00/,
          /\n/,
          /\r/,
        ];

        for (const pattern of pathTraversalPatterns) {
          if (pattern.test(value)) {
            throw new Error('Object name contains invalid path characters');
          }
        }

        // Block SQL injection in object names
        const sqlPatterns = [
          /('|"|\[|\]|;|--|\/*|\*\/)/,
          /\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|sp_|xp_)\b/i,
        ];

        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            throw new Error('Object name contains restricted characters or keywords');
          }
        }

        return true;
      })
      .customSanitizer(value => {
        if (!value) return value;
        // Clean the object name
        return value.trim().toLowerCase();
      }),
  ];
};

/**
 * CRITICAL: HTTP actions validation
 */
const validateHttpActions = () => {
  return [
    body('permissions.*.actions').custom((value, { req }) => {
      if (!value || typeof value !== 'object') {
        throw new Error('Actions must be an object');
      }

      const validActions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      const providedActions = Object.keys(value);

      // Check that only valid HTTP methods are provided
      for (const action of providedActions) {
        if (!validActions.includes(action)) {
          throw new Error(`Invalid HTTP action: ${action}. Allowed: ${validActions.join(', ')}`);
        }

        // Ensure action values are boolean
        if (typeof value[action] !== 'boolean') {
          throw new Error(`Action ${action} must be a boolean value`);
        }
      }

      return true;
    }),
  ];
};

/**
 * CRITICAL: Role ID parameter validation
 */
const validateRoleId = () => {
  return [
    param('id')
      .isUUID(4)
      .withMessage('Role ID must be a valid UUID')
      .customSanitizer(value => {
        return validator.isUUID(value) ? value : '';
      }),
  ];
};

/**
 * CRITICAL: Batch operation validation
 */
const validateBatchOperation = () => {
  return [
    body('operation')
      .isIn(['activate', 'deactivate', 'delete'])
      .withMessage('Operation must be one of: activate, deactivate, delete'),

    body('ids')
      .isArray({ min: 1, max: 50 })
      .withMessage('IDs must be an array with 1-50 items')
      .custom(ids => {
        // Validate each ID is a UUID
        for (const id of ids) {
          if (!validator.isUUID(id)) {
            throw new Error(`Invalid UUID in batch operation: ${id}`);
          }
        }
        return true;
      }),
  ];
};

/**
 * CRITICAL: Permission query parameter validation
 */
const validatePermissionQuery = () => {
  return [
    query('serviceId').optional().isUUID(4).withMessage('Service ID must be a valid UUID'),

    query('objectName')
      .optional()
      .matches(/^\/?(table|view|proc)\/[a-zA-Z0-9_\-\.]+$/)
      .withMessage('Object name must follow valid format'),
  ];
};

/**
 * CRITICAL: Validation result handler
 * Blocks requests with validation errors
 */
const handleValidationErrors = () => {
  return (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value,
      }));

      logger.warn('Input validation failed', {
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
        organizationId: req.user?.organizationId,
        errors: errorDetails,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(400).json({
        success: false,
        message: 'Input validation failed',
        code: 'VALIDATION_ERROR',
        errors: errorDetails,
      });
    }

    next();
  };
};

/**
 * CRITICAL: Complete role creation validation stack
 */
const validateRoleCreation = () => {
  return [
    ...validateRoleName(),
    ...validateRoleDescription(),
    ...validateServiceId(),
    ...validateObjectName(),
    ...validateHttpActions(),
    handleValidationErrors(),
  ];
};

/**
 * CRITICAL: Complete role update validation stack
 */
const validateRoleUpdate = () => {
  return [
    ...validateRoleId(),
    ...validateRoleName(),
    ...validateRoleDescription(),
    body('serviceId').optional().isUUID(4).withMessage('Service ID must be a valid UUID'),
    ...validateObjectName(),
    ...validateHttpActions(),
    handleValidationErrors(),
  ];
};

/**
 * CRITICAL: Role access validation
 */
const validateRoleAccess = () => {
  return [...validateRoleId(), handleValidationErrors()];
};

/**
 * CRITICAL: Service schema request validation
 */
const validateServiceSchema = () => {
  return [
    param('serviceId').isUUID(4).withMessage('Service ID must be a valid UUID'),
    handleValidationErrors(),
  ];
};

/**
 * CRITICAL: Comprehensive sanitization middleware
 * Applies additional sanitization after validation
 */
const sanitizeRoleInputs = () => {
  return (req, res, next) => {
    try {
      // Sanitize role data
      if (req.body.name) {
        req.body.name = req.body.name.trim();
      }

      if (req.body.description) {
        req.body.description = req.body.description.trim();
      }

      // Sanitize permissions array
      if (req.body.permissions && Array.isArray(req.body.permissions)) {
        req.body.permissions = req.body.permissions.map(permission => ({
          serviceId: permission.serviceId?.trim(),
          objectName: permission.objectName?.trim()?.toLowerCase(),
          actions: permission.actions || {},
        }));
      }

      // Log successful sanitization
      logger.debug('Input sanitization completed', {
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
        hasName: !!req.body.name,
        hasDescription: !!req.body.description,
        permissionsCount: req.body.permissions?.length || 0,
      });

      next();
    } catch (error) {
      logger.error('Input sanitization error', {
        error: error.message,
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
      });

      res.status(400).json({
        success: false,
        message: 'Input sanitization failed',
        code: 'SANITIZATION_ERROR',
      });
    }
  };
};

module.exports = {
  validateRoleCreation,
  validateRoleUpdate,
  validateRoleAccess,
  validateServiceSchema,
  validateBatchOperation,
  validatePermissionQuery,
  sanitizeRoleInputs,
  handleValidationErrors,
};
