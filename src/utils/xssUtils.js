import DOMPurify from 'dompurify';

/**
 * XSS Protection Utilities
 * Provides sanitization functions to prevent Cross-Site Scripting attacks
 */

/**
 * Default DOMPurify configuration for different contexts
 */
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [], // No HTML tags allowed by default
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true, // Keep text content, just remove tags
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
};

const STRICT_CONFIG = {
  ...DEFAULT_CONFIG,
  KEEP_CONTENT: false, // Remove everything potentially dangerous
};

// Configuration that allows basic text formatting but strips dangerous content
const TEXT_FORMATTING_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
};

// Configuration for content that may contain links
const SAFE_LINKS_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'a'],
  ALLOWED_ATTR: ['href', 'title'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  ADD_ATTR: { target: '_blank', rel: 'noopener noreferrer' }, // Safe link handling
};

/**
 * Sanitize a string value to prevent XSS
 * @param {string} value - The string to sanitize
 * @param {Object} config - DOMPurify configuration options
 * @returns {string} - Sanitized string
 */
export const sanitizeString = (value, config = DEFAULT_CONFIG) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return DOMPurify.sanitize(value, config);
  } catch (error) {
    console.error('XSS Protection: Error sanitizing string:', error);
    // In case of error, return empty string for safety
    return '';
  }
};

/**
 * Smart sanitization that chooses appropriate config based on content
 * @param {string} value - The string to sanitize
 * @param {string} context - Context hint: 'strict', 'text', 'links', 'default'
 * @returns {string} - Sanitized string
 */
export const smartSanitize = (value, context = 'default') => {
  if (typeof value !== 'string') {
    return value;
  }

  let config;
  switch (context) {
    case 'strict':
      config = STRICT_CONFIG;
      break;
    case 'text':
      config = TEXT_FORMATTING_CONFIG;
      break;
    case 'links':
      config = SAFE_LINKS_CONFIG;
      break;
    default:
      // Auto-detect based on content
      if (/<script|javascript:|data:|on\w+\s*=/.test(value.toLowerCase())) {
        config = STRICT_CONFIG; // Use strict for dangerous content
      } else if (/https?:\/\//.test(value)) {
        config = SAFE_LINKS_CONFIG; // Allow links for URL content
      } else if (/<[bi]>|<em>|<strong>/.test(value.toLowerCase())) {
        config = TEXT_FORMATTING_CONFIG; // Allow basic formatting
      } else {
        config = DEFAULT_CONFIG; // Default safe config
      }
  }

  return sanitizeString(value, config);
};

// Export configurations for advanced usage
export { DEFAULT_CONFIG, STRICT_CONFIG, TEXT_FORMATTING_CONFIG, SAFE_LINKS_CONFIG };

/**
 * Recursively sanitize an object's string properties
 * @param {any} data - The data to sanitize
 * @param {Object} options - Sanitization options
 * @returns {any} - Sanitized data
 */
export const sanitizeData = (data, options = {}) => {
  const {
    maxDepth = 10,
    maxStringLength = 10000,
    currentDepth = 0,
    config = DEFAULT_CONFIG,
    preserveTypes = true,
  } = options;

  // Prevent infinite recursion
  if (currentDepth >= maxDepth) {
    return '[Max depth reached]';
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle strings
  if (typeof data === 'string') {
    // Truncate very long strings to prevent DoS
    const truncated =
      data.length > maxStringLength ? data.substring(0, maxStringLength) + '...[truncated]' : data;

    return sanitizeString(truncated, config);
  }

  // Handle primitives
  if (typeof data !== 'object') {
    return preserveTypes ? data : String(data);
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item =>
      sanitizeData(item, {
        ...options,
        currentDepth: currentDepth + 1,
      })
    );
  }

  // Handle objects
  const sanitizedObject = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // Sanitize the key itself
      const sanitizedKey = sanitizeString(key, STRICT_CONFIG);

      // Skip if key becomes empty after sanitization
      if (!sanitizedKey) continue;

      // Recursively sanitize the value
      sanitizedObject[sanitizedKey] = sanitizeData(data[key], {
        ...options,
        currentDepth: currentDepth + 1,
      });
    }
  }

  return sanitizedObject;
};

/**
 * Sanitize workflow execution data for display
 * This is specifically designed for workflow run data that might contain user input
 * @param {Object} executionData - Workflow execution data
 * @returns {Object} - Sanitized execution data
 */
export const sanitizeWorkflowData = executionData => {
  if (!executionData) return executionData;

  // Use stricter sanitization for workflow data as it's often user-controlled
  return sanitizeData(executionData, {
    maxDepth: 8,
    maxStringLength: 5000,
    config: STRICT_CONFIG,
    preserveTypes: false, // Convert everything to strings for safety
  });
};

/**
 * Sanitize node configuration data
 * @param {Object} nodeConfig - Node configuration data
 * @returns {Object} - Sanitized configuration
 */
export const sanitizeNodeConfig = nodeConfig => {
  if (!nodeConfig) return nodeConfig;

  return sanitizeData(nodeConfig, {
    maxDepth: 6,
    maxStringLength: 2000,
    config: DEFAULT_CONFIG,
    preserveTypes: true,
  });
};

/**
 * Create a safe display version of error messages
 * @param {string} errorMessage - Original error message
 * @returns {string} - Safe error message for display
 */
export const sanitizeErrorMessage = errorMessage => {
  if (!errorMessage) return '';

  // Sanitize the message
  let sanitized = sanitizeString(errorMessage, STRICT_CONFIG);

  // Remove potentially sensitive information
  sanitized = sanitized
    .replace(/password[^a-z]/gi, '***')
    .replace(/token[^a-z]/gi, '***')
    .replace(/secret[^a-z]/gi, '***')
    .replace(/key[^a-z]/gi, '***')
    .replace(/api[_-]?key[^a-z]/gi, '***')
    .replace(/authorization[^a-z]/gi, '***')
    .replace(/bearer[^a-z]/gi, '***');

  // Limit length
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500) + '...[truncated]';
  }

  return sanitized;
};

/**
 * Validate that a component prop is safe for rendering
 * @param {any} prop - The prop value to validate
 * @param {string} propName - Name of the prop for error messages
 * @returns {any} - Validated prop or safe fallback
 */
export const validateProp = (prop, propName = 'prop') => {
  try {
    // Sanitize string props using smart detection
    if (typeof prop === 'string') {
      // Check for potentially dangerous content
      if (/<script|javascript:|data:|on\w+\s*=/.test(prop.toLowerCase())) {
        console.warn(
          `XSS Protection: Potentially dangerous content detected in ${propName}, applying smart sanitization`
        );
        return smartSanitize(prop, 'strict');
      }

      // For other string content, use smart sanitization
      const sanitized = smartSanitize(prop);

      // Only log if content was actually changed (indicating sanitization occurred)
      if (sanitized !== prop) {
        // eslint-disable-next-line no-console
        console.info(`XSS Protection: Content sanitized for ${propName}`, {
          original: prop.substring(0, 100) + (prop.length > 100 ? '...' : ''),
          sanitized: sanitized.substring(0, 100) + (sanitized.length > 100 ? '...' : ''),
        });
      }

      return sanitized;
    }

    return prop;
  } catch (error) {
    console.error(`XSS Protection: Error validating ${propName}:`, error);
    // Instead of returning a generic message, try to sanitize the original prop
    // If prop is a string, attempt sanitization, otherwise return safe default
    if (typeof prop === 'string') {
      try {
        return smartSanitize(prop, 'strict');
      } catch (sanitizeError) {
        console.error(
          `XSS Protection: Smart sanitization also failed for ${propName}:`,
          sanitizeError
        );
        return ''; // Return empty string as safest fallback
      }
    }
    return prop; // Return original prop if it's not a string (likely safe)
  }
};

const xssUtils = {
  sanitizeString,
  sanitizeData,
  sanitizeWorkflowData,
  sanitizeNodeConfig,
  sanitizeErrorMessage,
  validateProp,
  smartSanitize,
};

export default xssUtils;
