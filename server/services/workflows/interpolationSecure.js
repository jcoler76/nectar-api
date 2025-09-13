const { get } = require('../../utils/objectUtils');
const { logger } = require('../../utils/logger');

/**
 * Secure Interpolation System
 * Handles template interpolation while preventing injection attacks
 */

/**
 * Context types that require special security handling
 */
const SECURITY_CONTEXTS = {
  SQL: 'sql',
  HTML: 'html',
  JAVASCRIPT: 'javascript',
  URL: 'url',
  COMMAND: 'command',
  EMAIL: 'email',
  GENERAL: 'general',
};

/**
 * Sanitization functions for different contexts
 */
const sanitizers = {
  [SECURITY_CONTEXTS.SQL]: value => {
    // SQL values should be parameterized, not string-interpolated
    // This is a fallback that escapes dangerous characters
    if (typeof value === 'string') {
      return value
        .replace(/'/g, "''")
        .replace(/;/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '');
    }
    return value;
  },

  [SECURITY_CONTEXTS.HTML]: value => {
    // HTML entity encoding
    if (typeof value === 'string') {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    return value;
  },

  [SECURITY_CONTEXTS.JAVASCRIPT]: value => {
    // JavaScript string escaping
    if (typeof value === 'string') {
      return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E');
    }
    return value;
  },

  [SECURITY_CONTEXTS.URL]: value => {
    // URL encoding
    if (typeof value === 'string') {
      return encodeURIComponent(value);
    }
    return value;
  },

  [SECURITY_CONTEXTS.EMAIL]: value => {
    // Basic email sanitization
    if (typeof value === 'string') {
      return value.replace(/[\r\n]/g, '').replace(/[<>]/g, '');
    }
    return value;
  },

  [SECURITY_CONTEXTS.GENERAL]: value => {
    // General sanitization for most contexts
    if (typeof value === 'string') {
      // Remove null bytes and control characters except common whitespace
      return value.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    }
    return value;
  },
};

/**
 * Detect the security context based on the configuration key or content
 */
const detectSecurityContext = (key, value, configPart) => {
  const keyLower = key ? key.toLowerCase() : '';
  const valueLower = typeof value === 'string' ? value.toLowerCase() : '';

  // SQL context detection
  if (keyLower.includes('sql') || keyLower.includes('query') || keyLower.includes('database')) {
    return SECURITY_CONTEXTS.SQL;
  }

  if (typeof value === 'string') {
    // Check if value looks like SQL
    if (/\b(select|insert|update|delete|create|alter|drop|backup|restore)\b/i.test(valueLower)) {
      return SECURITY_CONTEXTS.SQL;
    }

    // Check if value looks like HTML
    if (/<[^>]+>/i.test(value) || keyLower.includes('html') || keyLower.includes('body')) {
      return SECURITY_CONTEXTS.HTML;
    }

    // Check if value looks like JavaScript
    if (
      keyLower.includes('script') ||
      keyLower.includes('js') ||
      /function\s*\(/.test(valueLower)
    ) {
      return SECURITY_CONTEXTS.JAVASCRIPT;
    }

    // Check if it's a URL
    if (
      keyLower.includes('url') ||
      keyLower.includes('endpoint') ||
      /^https?:\/\//.test(valueLower)
    ) {
      return SECURITY_CONTEXTS.URL;
    }

    // Check if it's email-related
    if (
      keyLower.includes('email') ||
      keyLower.includes('subject') ||
      keyLower.includes('recipient')
    ) {
      return SECURITY_CONTEXTS.EMAIL;
    }
  }

  return SECURITY_CONTEXTS.GENERAL;
};

/**
 * Secure interpolation that prevents injection attacks
 * @param {any} configPart - The piece of configuration to process
 * @param {object} context - The workflow execution context
 * @param {string} securityContext - Optional explicit security context
 * @returns {any} - The config part with placeholders securely replaced
 */
const interpolateSecure = (configPart, context, securityContext = null) => {
  if (typeof configPart === 'string') {
    // Find all {{...}} placeholders
    return configPart.replace(/\{\{(.*?)\}\}/g, (match, path) => {
      try {
        // Use lodash.get for safe deep-property access
        const value = get(context, path.trim());

        if (value === undefined || value === null) {
          logger.warn('Interpolation path not found:', path);
          return match; // Keep the placeholder if data not found
        }

        // Detect security context if not explicitly provided
        const detectedContext = securityContext || detectSecurityContext(null, configPart, null);

        // Apply appropriate sanitization
        const sanitizer = sanitizers[detectedContext] || sanitizers[SECURITY_CONTEXTS.GENERAL];
        let sanitizedValue;

        if (typeof value === 'object') {
          // For objects, stringify then sanitize if in HTML context
          const stringified = JSON.stringify(value, null, 2);
          sanitizedValue =
            detectedContext === SECURITY_CONTEXTS.HTML ? sanitizer(stringified) : stringified;
        } else {
          sanitizedValue = sanitizer(value);
        }

        logger.debug('Secure interpolation applied', {
          path,
          securityContext: detectedContext,
          originalType: typeof value,
          sanitized: sanitizedValue !== value,
        });

        return sanitizedValue;
      } catch (error) {
        logger.error('Interpolation error:', error);
        return match; // Keep placeholder on error
      }
    });
  }

  if (Array.isArray(configPart)) {
    return configPart.map(item => interpolateSecure(item, context, securityContext));
  }

  if (typeof configPart === 'object' && configPart !== null) {
    return Object.keys(configPart).reduce((acc, key) => {
      // Detect security context for this specific key
      const keyContext = securityContext || detectSecurityContext(key, configPart[key], configPart);
      acc[key] = interpolateSecure(configPart[key], context, keyContext);
      return acc;
    }, {});
  }

  return configPart;
};

/**
 * SQL-specific interpolation that creates parameterized queries
 * This should be used instead of regular interpolation for SQL contexts
 */
const interpolateSql = (sqlTemplate, context) => {
  const parameters = {};
  let paramCounter = 0;

  // Replace {{path}} with @param_N and collect parameters
  const parameterizedSql = sqlTemplate.replace(/\{\{(.*?)\}\}/g, (match, path) => {
    try {
      const value = get(context, path.trim());

      if (value === undefined || value === null) {
        logger.warn('SQL interpolation path not found:', path);
        return 'NULL';
      }

      const paramName = `param_${paramCounter++}`;
      parameters[paramName] = value;

      return `@${paramName}`;
    } catch (error) {
      logger.error('SQL interpolation error:', error);
      return 'NULL';
    }
  });

  logger.info('SQL interpolation created parameterized query', {
    parameterCount: Object.keys(parameters).length,
    sqlLength: parameterizedSql.length,
  });

  return { sql: parameterizedSql, parameters };
};

/**
 * Legacy interpolation wrapper for backward compatibility
 * Redirects to secure interpolation with warnings
 */
const interpolate = (configPart, context) => {
  logger.warn(
    'Using legacy interpolation - consider upgrading to interpolateSecure for better security'
  );
  return interpolateSecure(configPart, context);
};

/**
 * Validate interpolation context for security
 */
const validateInterpolationContext = context => {
  if (!context || typeof context !== 'object') {
    throw new Error('Interpolation context must be a valid object');
  }

  // Check for potentially dangerous context properties
  const dangerousKeys = [
    'require',
    'process',
    'global',
    '__dirname',
    '__filename',
    'eval',
    'Function',
  ];

  for (const key of dangerousKeys) {
    if (context.hasOwnProperty(key)) {
      throw new Error(`Dangerous property '${key}' found in interpolation context`);
    }
  }

  return true;
};

module.exports = {
  interpolate, // Legacy - redirects to secure
  interpolateSecure,
  interpolateSql,
  validateInterpolationContext,
  SECURITY_CONTEXTS,
  sanitizers,
};
