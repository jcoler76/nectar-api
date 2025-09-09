/**
 * Comprehensive Input Validation Utility
 * Prevents SQL injection, XSS, and other input-based attacks
 */

const validator = require('validator');

class InputValidator {
  /**
   * Validate UUID (used in PostgreSQL)
   * @param {string} id - The ID to validate
   * @returns {boolean} - True if valid UUID
   */
  static isValidUUID(id) {
    if (!id || typeof id !== 'string') {
      return false;
    }

    // Check if it's a valid UUID format (v4)
    return validator.isUUID(id);
  }

  /**
   * Validate and sanitize UUID parameter
   * @param {string} id - The ID to validate
   * @param {string} paramName - Name of the parameter for error messages
   * @returns {string} - Valid UUID or throws error
   */
  static validateUUID(id, paramName = 'id') {
    if (!this.isValidUUID(id)) {
      throw new Error(`Invalid ${paramName} format`);
    }
    return id;
  }

  /**
   * Legacy alias for backwards compatibility
   * @deprecated Use validateUUID instead
   */
  static isValidObjectId(id) {
    return this.isValidUUID(id);
  }

  /**
   * Legacy alias for backwards compatibility
   * @deprecated Use validateUUID instead
   */
  static validateObjectId(id, paramName = 'id') {
    return this.validateUUID(id, paramName);
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} - True if valid email
   */
  static isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    return (
      validator.isEmail(email) &&
      email.length <= 254 && // RFC 5321 limit
      !/[<>]/.test(email)
    ); // Prevent XSS in email
  }

  /**
   * Validate and sanitize string input
   * @param {string} input - String to validate
   * @param {object} options - Validation options
   * @returns {string} - Sanitized string
   */
  static validateString(input, options = {}) {
    const {
      minLength = 0,
      maxLength = 1000,
      allowEmpty = false,
      trim = true,
      allowHtml = false,
      fieldName = 'field',
    } = options;

    if (input === null || input === undefined) {
      if (allowEmpty) return '';
      throw new Error(`${fieldName} is required`);
    }

    if (typeof input !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }

    let sanitized = trim ? input.trim() : input;

    if (!allowEmpty && sanitized.length === 0) {
      throw new Error(`${fieldName} cannot be empty`);
    }

    if (sanitized.length < minLength) {
      throw new Error(`${fieldName} must be at least ${minLength} characters`);
    }

    if (sanitized.length > maxLength) {
      throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
    }

    // Check for potential XSS
    if (!allowHtml && this.containsHtml(sanitized)) {
      throw new Error(`${fieldName} contains invalid HTML content`);
    }

    // Check for potential SQL injection
    if (this.containsSQLInjection(sanitized)) {
      throw new Error(`${fieldName} contains invalid characters`);
    }

    return sanitized;
  }

  /**
   * Validate numeric input
   * @param {any} input - Number to validate
   * @param {object} options - Validation options
   * @returns {number} - Valid number
   */
  static validateNumber(input, options = {}) {
    const {
      min = Number.MIN_SAFE_INTEGER,
      max = Number.MAX_SAFE_INTEGER,
      integer = false,
      fieldName = 'field',
    } = options;

    if (input === null || input === undefined) {
      throw new Error(`${fieldName} is required`);
    }

    const num = Number(input);

    if (isNaN(num)) {
      throw new Error(`${fieldName} must be a valid number`);
    }

    if (integer && !Number.isInteger(num)) {
      throw new Error(`${fieldName} must be an integer`);
    }

    if (num < min) {
      throw new Error(`${fieldName} must be at least ${min}`);
    }

    if (num > max) {
      throw new Error(`${fieldName} cannot exceed ${max}`);
    }

    return num;
  }

  /**
   * Validate boolean input
   * @param {any} input - Boolean to validate
   * @param {string} fieldName - Field name for error messages
   * @returns {boolean} - Valid boolean
   */
  static validateBoolean(input, fieldName = 'field') {
    if (input === null || input === undefined || input === '') {
      return undefined;
    }

    if (typeof input === 'boolean') {
      return input;
    }

    if (typeof input === 'string') {
      const lower = input.toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
    }

    if (typeof input === 'number') {
      if (input === 1) return true;
      if (input === 0) return false;
    }

    throw new Error(`${fieldName} must be a boolean value`);
  }

  /**
   * Validate positive integer input
   * @param {any} input - Number to validate
   * @param {string} fieldName - Field name for error messages
   * @returns {number} - Valid positive integer
   */
  static validatePositiveInteger(input, fieldName = 'field') {
    if (input === null || input === undefined || input === '') {
      return undefined;
    }
    return this.validateNumber(input, {
      min: 1,
      integer: true,
      fieldName,
    });
  }

  /**
   * Validate enum value
   * @param {any} input - Value to validate
   * @param {array} allowedValues - Array of allowed values
   * @param {string} fieldName - Field name for error messages
   * @returns {any} - Valid enum value
   */
  static validateEnum(input, allowedValues, fieldName = 'field') {
    if (input === null || input === undefined || input === '') {
      return undefined;
    }

    if (!allowedValues.includes(input)) {
      throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
    }

    return input;
  }

  /**
   * Validate array input
   * @param {any} input - Array to validate
   * @param {object} options - Validation options
   * @returns {array} - Valid array
   */
  static validateArray(input, options = {}) {
    const { minLength = 0, maxLength = 100, allowEmpty = true, fieldName = 'field' } = options;

    if (input === null || input === undefined) {
      if (allowEmpty) return [];
      throw new Error(`${fieldName} is required`);
    }

    if (!Array.isArray(input)) {
      throw new Error(`${fieldName} must be an array`);
    }

    if (input.length < minLength) {
      throw new Error(`${fieldName} must have at least ${minLength} items`);
    }

    if (input.length > maxLength) {
      throw new Error(`${fieldName} cannot have more than ${maxLength} items`);
    }

    return input;
  }

  /**
   * Validate pagination parameters
   * @param {object} query - Query parameters
   * @returns {object} - Valid pagination parameters
   */
  static validatePagination(query) {
    const page = query.page
      ? this.validateNumber(query.page, {
          min: 1,
          max: 10000,
          integer: true,
          fieldName: 'page',
        })
      : 1;

    const limit = query.limit
      ? this.validateNumber(query.limit, {
          min: 1,
          max: 100,
          integer: true,
          fieldName: 'limit',
        })
      : 20;

    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Check if string contains HTML
   * @param {string} str - String to check
   * @returns {boolean} - True if contains HTML
   */
  static containsHtml(str) {
    const htmlPattern = /<[^>]*>/;
    return htmlPattern.test(str);
  }

  /**
   * Check if string contains potential SQL injection
   * @param {string} str - String to check
   * @returns {boolean} - True if potentially malicious
   */
  static containsSQLInjection(str) {
    // Check for SQL injection patterns
    const sqlPatterns = [
      /(union|select|insert|delete|drop|create|alter|exec|execute|sp_|xp_)/i,
      /(\b(and|or)\b\s*\d+\s*=\s*\d+)/i,
      /(\b(and|or)\b\s*['"])/i,
      /(script|javascript|vbscript|onload|onerror)/i,
      /(<|%3C)(script|iframe|object|embed)/i,
      /('|(\\'))|(;|(%3B))/i,
      /((-|(%2D)){2})|(\+|(%2B))/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Legacy alias for backwards compatibility
   * @deprecated Use containsSQLInjection instead
   */
  static containsMongoInjection(str) {
    return this.containsSQLInjection(str);
  }

  /**
   * Sanitize object for SQL queries
   * @param {object} obj - Object to sanitize
   * @returns {object} - Sanitized object
   */
  static sanitizeSQLQuery(obj) {
    if (!obj || typeof obj !== 'object') {
      return {};
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      // Validate key - must be alphanumeric with underscores only
      if (
        !key ||
        typeof key !== 'string' ||
        key.length > 100 ||
        !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
      ) {
        continue;
      }

      // Sanitize value based on type
      if (typeof value === 'string') {
        if (!this.containsSQLInjection(value)) {
          sanitized[key] = value;
        }
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null) {
        sanitized[key] = null;
      }
      // Skip arrays, objects, and other complex types for safety
    }

    return sanitized;
  }

  /**
   * Legacy alias for backwards compatibility
   * @deprecated Use sanitizeSQLQuery instead
   */
  static sanitizeMongoQuery(obj) {
    return this.sanitizeSQLQuery(obj);
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @param {object} options - Validation options
   * @returns {string} - Valid URL
   */
  static validateUrl(url, options = {}) {
    const {
      allowedProtocols = ['http', 'https'],
      allowedDomains = [],
      fieldName = 'url',
    } = options;

    if (!url || typeof url !== 'string') {
      throw new Error(`${fieldName} is required`);
    }

    if (!validator.isURL(url)) {
      throw new Error(`${fieldName} must be a valid URL`);
    }

    try {
      const urlObj = new URL(url);

      // Check protocol
      const protocol = urlObj.protocol.slice(0, -1); // Remove trailing ':'
      if (!allowedProtocols.includes(protocol)) {
        throw new Error(`${fieldName} protocol not allowed`);
      }

      // Check domain if specified
      if (allowedDomains.length > 0 && !allowedDomains.includes(urlObj.hostname)) {
        throw new Error(`${fieldName} domain not allowed`);
      }

      return url;
    } catch (error) {
      throw new Error(`${fieldName} is not a valid URL`);
    }
  }

  /**
   * Validate IP address
   * @param {string} ip - IP address to validate
   * @param {string} fieldName - Field name for error messages
   * @returns {string} - Valid IP address
   */
  static validateIpAddress(ip, fieldName = 'ip') {
    if (!ip || typeof ip !== 'string') {
      throw new Error(`${fieldName} is required`);
    }

    if (!validator.isIP(ip)) {
      throw new Error(`${fieldName} must be a valid IP address`);
    }

    return ip;
  }

  /**
   * Create validation middleware for Express routes
   * @param {object} validationSchema - Validation schema
   * @returns {function} - Express middleware
   */
  static createValidationMiddleware(validationSchema) {
    return (req, res, next) => {
      try {
        // Validate params
        if (validationSchema.params) {
          for (const [key, validator] of Object.entries(validationSchema.params)) {
            if (req.params[key] !== undefined) {
              req.params[key] = validator(req.params[key], key);
            }
          }
        }

        // Validate query
        if (validationSchema.query) {
          for (const [key, validator] of Object.entries(validationSchema.query)) {
            if (req.query[key] !== undefined) {
              req.query[key] = validator(req.query[key], key);
            }
          }
        }

        // Validate body
        if (validationSchema.body) {
          for (const [key, validator] of Object.entries(validationSchema.body)) {
            if (req.body[key] !== undefined) {
              req.body[key] = validator(req.body[key], key);
            }
          }
        }

        next();
      } catch (error) {
        res.status(400).json({
          message: 'Validation failed',
          error: error.message,
        });
      }
    };
  }
}

module.exports = InputValidator;
