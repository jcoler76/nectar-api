const { body, param, query } = require('express-validator');

// Common validation rules that can be reused across routes
const validationRules = {
  // User validation rules
  user: {
    create: [
      body('email')
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail({ gmail_remove_dots: false })
        .trim(),
      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter'),
      body('firstName')
        .isString()
        .withMessage('First name must be a string')
        .trim()
        .notEmpty()
        .withMessage('First name is required'),
      body('lastName')
        .isString()
        .withMessage('Last name must be a string')
        .trim()
        .notEmpty()
        .withMessage('Last name is required'),
      body('roles').optional().isArray().withMessage('Roles must be an array'),
    ],
    update: [
      param('id').isMongoId().withMessage('Invalid user ID format'),
      body('email')
        .optional()
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail({ gmail_remove_dots: false })
        .trim(),
      body('firstName').optional().isString().withMessage('First name must be a string').trim(),
      body('lastName').optional().isString().withMessage('Last name must be a string').trim(),
      body('roles').optional().isArray().withMessage('Roles must be an array'),
      body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    ],
    getById: [param('id').isMongoId().withMessage('Invalid user ID format')],
  },

  // Authentication validation rules
  auth: {
    login: [
      body('email')
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail({ gmail_remove_dots: false })
        .trim(),
      body('password').notEmpty().withMessage('Password is required'),
    ],
  },

  // Pagination validation rules for any paginated route
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
  ],

  // SQL Injection prevention for any user input that might go into a SQL query
  sqlSafeString: fieldName => {
    return body(fieldName).custom(value => {
      // Check for common SQL injection patterns
      const sqlPattern =
        /('|"|;|--|\/\*|\*\/|@@|@|char|nchar|varchar|nvarchar|alter|begin|cast|create|cursor|declare|delete|drop|end|exec|execute|fetch|insert|kill|open|select|sys|sysobjects|syscolumns|table|update|xp_)/i;
      if (value && sqlPattern.test(value)) {
        throw new Error('Input contains potentially malicious SQL characters');
      }
      return true;
    });
  },

  // Application validation rules
  application: {
    create: [
      body('name')
        .isString()
        .withMessage('Application name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Application name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9_\-\s]+$/)
        .withMessage(
          'Application name can only contain letters, numbers, spaces, hyphens, and underscores'
        ),
      body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
      body('apiKey').optional().isString().withMessage('API key must be a string').trim(),
      body('defaultRole').isMongoId().withMessage('Default role must be a valid ID'),
    ],
    update: [
      param('id').isMongoId().withMessage('Invalid application ID format'),
      body('name')
        .optional()
        .isString()
        .withMessage('Application name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Application name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9_\-\s]+$/)
        .withMessage(
          'Application name can only contain letters, numbers, spaces, hyphens, and underscores'
        ),
      body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
      body('defaultRole').optional().isMongoId().withMessage('Default role must be a valid ID'),
      body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    ],
  },

  // Role validation rules
  role: {
    create: [
      body('name')
        .isString()
        .withMessage('Role name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Role name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9_\-\s]+$/)
        .withMessage(
          'Role name can only contain letters, numbers, spaces, hyphens, and underscores'
        ),
      body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
      body('serviceId').isMongoId().withMessage('Service ID must be valid'),
      body('permissions')
        .isArray()
        .withMessage('Permissions must be an array')
        .custom(permissions => {
          if (!Array.isArray(permissions)) return false;
          return permissions.every(
            perm => perm.serviceId && perm.objectName && typeof perm.actions === 'object'
          );
        })
        .withMessage('Invalid permissions format'),
      body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    ],
    update: [
      param('id').isMongoId().withMessage('Invalid role ID format'),
      body('name')
        .optional()
        .isString()
        .withMessage('Role name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Role name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9_\-\s]+$/)
        .withMessage(
          'Role name can only contain letters, numbers, spaces, hyphens, and underscores'
        ),
      body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
      body('serviceId').optional().isMongoId().withMessage('Service ID must be valid'),
      body('permissions').optional().isArray().withMessage('Permissions must be an array'),
      body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    ],
  },

  // Service validation rules
  service: {
    create: [
      body('name')
        .isString()
        .withMessage('Service name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Service name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9_\-\s]+$/)
        .withMessage(
          'Service name can only contain letters, numbers, spaces, hyphens, and underscores'
        ),
      body('label')
        .optional()
        .isString()
        .withMessage('Label must be a string')
        .trim()
        .isLength({ max: 100 })
        .withMessage('Label must be less than 100 characters'),
      body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
      body('database')
        .isString()
        .withMessage('Database name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Database name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9_\-]+$/)
        .withMessage('Database name can only contain letters, numbers, hyphens, and underscores'),
      body('connectionId').isMongoId().withMessage('Connection ID must be valid'),
      // Explicitly reject fields that don't belong to service creation
      body('host')
        .not()
        .exists()
        .withMessage(
          'Host field should not be provided directly. It will be inherited from the connection.'
        ),
      body('port')
        .not()
        .exists()
        .withMessage(
          'Port field should not be provided directly. It will be inherited from the connection.'
        ),
      body('username')
        .not()
        .exists()
        .withMessage(
          'Username field should not be provided directly. It will be inherited from the connection.'
        ),
      body('password')
        .not()
        .exists()
        .withMessage(
          'Password field should not be provided directly. It will be inherited from the connection.'
        ),
    ],
    update: [
      param('id').isMongoId().withMessage('Invalid service ID format'),
      body('name')
        .optional()
        .isString()
        .withMessage('Service name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Service name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9_\-\s]+$/)
        .withMessage(
          'Service name can only contain letters, numbers, spaces, hyphens, and underscores'
        ),
      body('label')
        .optional()
        .isString()
        .withMessage('Label must be a string')
        .trim()
        .isLength({ max: 100 })
        .withMessage('Label must be less than 100 characters'),
      body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
      body('host')
        .optional()
        .isString()
        .withMessage('Host must be a string')
        .trim()
        .isLength({ max: 255 })
        .withMessage('Host must be less than 255 characters'),
      body('port')
        .optional()
        .isInt({ min: 1, max: 65535 })
        .withMessage('Port must be between 1 and 65535'),
      body('database')
        .optional()
        .isString()
        .withMessage('Database name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Database name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9_\-]+$/)
        .withMessage('Database name can only contain letters, numbers, hyphens, and underscores'),
      body('username')
        .optional()
        .isString()
        .withMessage('Username must be a string')
        .trim()
        .isLength({ max: 100 })
        .withMessage('Username must be less than 100 characters'),
      body('password')
        .optional()
        .isString()
        .withMessage('Password must be a string')
        .isLength({ max: 255 })
        .withMessage('Password must be less than 255 characters'),
      body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    ],
  },

  // Common validation for MongoDB ObjectIDs
  mongoId: [param('id').isMongoId().withMessage('Invalid ID format')],

  // Common validation for pagination and search
  search: [
    query('q')
      .optional()
      .isString()
      .withMessage('Search query must be a string')
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search query must be less than 100 characters')
      .escape(), // Escape HTML entities
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sort')
      .optional()
      .isString()
      .withMessage('Sort must be a string')
      .isIn(['name', 'createdAt', 'updatedAt', '-name', '-createdAt', '-updatedAt'])
      .withMessage('Invalid sort field'),
  ],
};

module.exports = validationRules;
