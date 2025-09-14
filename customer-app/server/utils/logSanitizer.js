const crypto = require('crypto');

// List of sensitive field names to sanitize
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'apiKeyHash',
  'refreshToken',
  'accessToken',
  'authorization',
  'secret',
  'credit_card',
  'ssn',
  'email', // Partial masking for emails
  'phone',
  'address',
  'jwt',
  'bearer',
  'otp',
  'twoFactorSecret',
  'privateKey',
  'publicKey',
  'salt',
  'hash',
];

// Patterns to detect sensitive data in strings
const SENSITIVE_PATTERNS = [
  { pattern: /Bearer\s+[\w\-._~+\/]+=*/gi, replacement: 'Bearer [REDACTED]' },
  { pattern: /mapi_[a-zA-Z0-9]{64}/g, replacement: 'mapi_[REDACTED]' },
  { pattern: /sk-[a-zA-Z0-9]{48,}/g, replacement: 'sk-[REDACTED]' },
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: email => maskEmail(email),
  },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '****-****-****-****' },
  { pattern: /mongodb:\/\/[^:]+:[^@]+@/g, replacement: 'mongodb://[USER]:[PASS]@' },
];

/**
 * Mask email addresses to show only first 2 and last 2 characters before @
 */
function maskEmail(email) {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 4) {
    return '***@' + domain;
  }
  const masked = localPart.substring(0, 2) + '***' + localPart.substring(localPart.length - 2);
  return masked + '@' + domain;
}

/**
 * Deep clone an object to avoid modifying the original
 */
function deepClone(obj, visited = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') return obj;

  // Check for circular reference
  if (visited.has(obj)) {
    return '[Circular Reference]';
  }

  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj);

  // Add object to visited set
  visited.add(obj);

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item, visited));
  }

  // Handle Mongoose documents - convert to plain object
  if (obj.constructor && obj.constructor.name === 'model' && typeof obj.toObject === 'function') {
    return deepClone(obj.toObject(), visited);
  }

  const clonedObj = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key], visited);
    }
  }
  return clonedObj;
}

/**
 * Sanitize an object by redacting sensitive fields
 */
function sanitizeObject(obj, depth = 0, maxDepth = 10, visited = new WeakSet()) {
  if (depth > maxDepth) return '[MAX_DEPTH_REACHED]';
  if (!obj || typeof obj !== 'object') return obj;

  // Check for circular reference
  if (visited.has(obj)) {
    return '[Circular Reference]';
  }

  // Add object to visited set
  visited.add(obj);

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1, maxDepth, visited));
  }

  // Handle Mongoose documents - convert to plain object first
  if (obj.constructor && obj.constructor.name === 'model' && typeof obj.toObject === 'function') {
    obj = obj.toObject();
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if field name indicates sensitive data
    const isSensitiveField = SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()));

    if (isSensitiveField) {
      if (typeof value === 'string' && value.length > 0) {
        // For emails, show partial
        if (lowerKey.includes('email') && value.includes('@')) {
          sanitized[key] = maskEmail(value);
        } else {
          // For other sensitive fields, show length and first few chars
          const hint =
            value.length > 8
              ? `${value.substring(0, 4)}...[REDACTED ${value.length} chars]`
              : '[REDACTED]';
          sanitized[key] = hint;
        }
      } else if (value !== null && value !== undefined) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, depth + 1, maxDepth, visited);
    } else if (typeof value === 'string') {
      // Check for sensitive patterns in string values
      let sanitizedValue = value;
      for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
        if (typeof replacement === 'function') {
          sanitizedValue = sanitizedValue.replace(pattern, replacement);
        } else {
          sanitizedValue = sanitizedValue.replace(pattern, replacement);
        }
      }
      sanitized[key] = sanitizedValue;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize log arguments before logging
 */
function sanitizeLogArgs(...args) {
  return args.map(arg => {
    if (typeof arg === 'string') {
      // Apply pattern-based sanitization to strings
      let sanitized = arg;
      for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
        if (typeof replacement === 'function') {
          sanitized = sanitized.replace(pattern, replacement);
        } else {
          sanitized = sanitized.replace(pattern, replacement);
        }
      }
      return sanitized;
    } else if (typeof arg === 'object' && arg !== null) {
      // Deep clone and sanitize objects
      return sanitizeObject(deepClone(arg));
    }
    return arg;
  });
}

/**
 * Create a sanitized logger wrapper
 */
function createSanitizedLogger(logger) {
  const sanitizedLogger = {};

  // Wrap common log methods
  ['error', 'warn', 'info', 'debug', 'verbose', 'silly'].forEach(level => {
    sanitizedLogger[level] = (...args) => {
      const sanitizedArgs = sanitizeLogArgs(...args);
      return logger[level](...sanitizedArgs);
    };
  });

  // Wrap the log method itself
  sanitizedLogger.log = (level, ...args) => {
    const sanitizedArgs = sanitizeLogArgs(...args);
    return logger.log(level, ...sanitizedArgs);
  };

  // Expose the original logger for cases where sanitization is not needed
  sanitizedLogger.unsafe = logger;

  return sanitizedLogger;
}

module.exports = {
  sanitizeObject,
  sanitizeLogArgs,
  createSanitizedLogger,
  maskEmail,
  SENSITIVE_FIELDS,
  SENSITIVE_PATTERNS,
};
