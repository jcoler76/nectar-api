const { logger } = require('./logger');

// Error codes for client-safe error messages
const ERROR_CODES = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'AUTH001',
  TOKEN_EXPIRED: 'AUTH002',
  INSUFFICIENT_PERMISSIONS: 'AUTH003',
  ACCOUNT_LOCKED: 'AUTH004',
  TWO_FACTOR_REQUIRED: 'AUTH005',
  INVALID_2FA_TOKEN: 'AUTH006',

  // Validation
  VALIDATION_FAILED: 'VAL001',
  INVALID_INPUT: 'VAL002',
  MISSING_REQUIRED_FIELD: 'VAL003',
  INVALID_FORMAT: 'VAL004',

  // Database
  RECORD_NOT_FOUND: 'DB001',
  DUPLICATE_RECORD: 'DB002',
  DATABASE_ERROR: 'DB003',
  CONNECTION_FAILED: 'DB004',

  // Business Logic
  OPERATION_FAILED: 'BUS001',
  INVALID_STATE: 'BUS002',
  LIMIT_EXCEEDED: 'BUS003',

  // External Services
  SERVICE_UNAVAILABLE: 'EXT001',
  API_ERROR: 'EXT002',
  TIMEOUT: 'EXT003',

  // General
  INTERNAL_ERROR: 'INT001',
  NOT_IMPLEMENTED: 'INT002',
  CONFIGURATION_ERROR: 'INT003',
};

// Map of error patterns to safe messages and codes
const ERROR_MAPPINGS = [
  // MongoDB errors
  {
    pattern: /duplicate key error/i,
    code: ERROR_CODES.DUPLICATE_RECORD,
    message: 'A record with this information already exists',
  },
  {
    pattern: /validation failed/i,
    code: ERROR_CODES.VALIDATION_FAILED,
    message: 'The provided data is invalid',
  },
  {
    pattern: /cast to objectid failed/i,
    code: ERROR_CODES.INVALID_INPUT,
    message: 'Invalid identifier format',
  },
  {
    pattern: /cannot read prop.*undefined/i,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
  },

  // SQL errors
  {
    pattern: /ER_DUP_ENTRY/i,
    code: ERROR_CODES.DUPLICATE_RECORD,
    message: 'A record with this information already exists',
  },
  {
    pattern: /ER_NO_REFERENCED_ROW/i,
    code: ERROR_CODES.INVALID_INPUT,
    message: 'Referenced data does not exist',
  },
  {
    pattern: /ECONNREFUSED/i,
    code: ERROR_CODES.CONNECTION_FAILED,
    message: 'Database connection failed',
  },
  {
    pattern: /Invalid column name/i,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'An error occurred processing your request',
  },

  // Authentication errors
  {
    pattern: /jwt expired/i,
    code: ERROR_CODES.TOKEN_EXPIRED,
    message: 'Your session has expired. Please log in again',
  },
  {
    pattern: /jwt malformed/i,
    code: ERROR_CODES.INVALID_CREDENTIALS,
    message: 'Invalid authentication token',
  },
  {
    pattern: /invalid signature/i,
    code: ERROR_CODES.INVALID_CREDENTIALS,
    message: 'Invalid authentication token',
  },

  // Network errors
  {
    pattern: /ETIMEDOUT/i,
    code: ERROR_CODES.TIMEOUT,
    message: 'The operation timed out. Please try again',
  },
  {
    pattern: /ENOTFOUND/i,
    code: ERROR_CODES.SERVICE_UNAVAILABLE,
    message: 'Service temporarily unavailable',
  },

  // File system errors
  {
    pattern: /ENOENT/i,
    code: ERROR_CODES.RECORD_NOT_FOUND,
    message: 'The requested resource was not found',
  },
  { pattern: /EACCES/i, code: ERROR_CODES.INSUFFICIENT_PERMISSIONS, message: 'Permission denied' },

  // Default
  {
    pattern: /.*/,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'An error occurred processing your request',
  },
];

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, code, statusCode = 500, isOperational = true) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a safe error response for clients
 * @param {Error} error - The original error
 * @param {Object} options - Additional options
 * @returns {Object} Safe error object for client response
 */
function createSafeError(error, options = {}) {
  // Log the full error details server-side
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    ...options,
  });

  // If it's already an AppError, use its safe properties
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        timestamp: error.timestamp,
      },
    };
  }

  // Map the error to a safe message
  const errorMapping = ERROR_MAPPINGS.find(mapping => mapping.pattern.test(error.message));

  // In development, include more details (but still sanitized)
  if (process.env.NODE_ENV === 'development') {
    return {
      error: {
        code: errorMapping.code,
        message: errorMapping.message,
        debug: {
          originalMessage: error.message.substring(0, 200), // Truncate long messages
          type: error.constructor.name,
        },
      },
    };
  }

  // In production, return only safe information
  return {
    error: {
      code: errorMapping.code,
      message: errorMapping.message,
    },
  };
}

/**
 * Express error handling middleware
 */
function errorMiddleware(err, req, res, next) {
  // Import BigInt serializer
  const { serializeBigInt } = require('./bigintSerializer');

  // Default to 500 if no status code
  const statusCode = err.statusCode || err.status || 500;

  // Log error with request context
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    statusCode,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?.userId,
  });

  // Create safe error response
  const safeError = createSafeError(err, {
    method: req.method,
    url: req.url,
    userId: req.user?.userId,
  });

  // Send response with BigInt serialization
  res.status(statusCode).json(serializeBigInt(safeError));
}

/**
 * Async error handler wrapper for route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create standard error responses
 */
const errorResponses = {
  badRequest: (res, message = 'Bad request') => {
    res.status(400).json(createSafeError(new AppError(message, ERROR_CODES.INVALID_INPUT, 400)));
  },

  unauthorized: (res, message = 'Unauthorized') => {
    res
      .status(401)
      .json(createSafeError(new AppError(message, ERROR_CODES.INVALID_CREDENTIALS, 401)));
  },

  forbidden: (res, message = 'Forbidden') => {
    res
      .status(403)
      .json(createSafeError(new AppError(message, ERROR_CODES.INSUFFICIENT_PERMISSIONS, 403)));
  },

  notFound: (res, message = 'Resource not found') => {
    res.status(404).json(createSafeError(new AppError(message, ERROR_CODES.RECORD_NOT_FOUND, 404)));
  },

  conflict: (res, message = 'Conflict') => {
    res.status(409).json(createSafeError(new AppError(message, ERROR_CODES.DUPLICATE_RECORD, 409)));
  },

  validationError: (res, errors) => {
    res.status(422).json({
      error: {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
        details: errors, // Should be sanitized field errors
      },
    });
  },

  serverError: (res, error) => {
    const safeError = createSafeError(error);
    res.status(500).json(safeError);
  },
};

module.exports = {
  AppError,
  ERROR_CODES,
  createSafeError,
  errorMiddleware,
  asyncHandler,
  errorResponses,
};

// Backwards-compatible named exports for direct function access
// so that callers using `require('../utils/errorHandler').serverError(...)` keep working
module.exports.serverError = errorResponses.serverError;
module.exports.badRequest = errorResponses.badRequest;
module.exports.unauthorized = errorResponses.unauthorized;
module.exports.forbidden = errorResponses.forbidden;
module.exports.notFound = errorResponses.notFound;
module.exports.conflict = errorResponses.conflict;
module.exports.validationError = errorResponses.validationError;
