// Code Node Security Configuration
// This file defines what environment variables and modules are safe to expose to user code

const { logger } = require('../utils/logger');

/**
 * Environment variables that are safe to expose to code nodes
 * These are filtered to exclude sensitive security-related variables
 */
const ALLOWED_ENV_VARS = [
  // Database connection (read-only operations should be safe)
  'MONGODB_URI',
  'DB_NAME',

  // Email configuration (for sending notifications)
  'EMAIL_USER',
  'EMAIL_PASSWORD', // Note: Consider using app passwords

  // AI Services
  'OPENAI_API_KEY',

  // AWS S3 (for file operations)
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',

  // Feature flags
  'ENABLE_2FA',
  'ENABLE_AUDIT_LOGGING',

  // Public configuration
  'PUBLIC_URL',
  'NODE_ENV',

  // Custom project variables (add as needed)
  // 'CUSTOM_PROJECT_VAR_1',
  // 'CUSTOM_PROJECT_VAR_2',
];

/**
 * Environment variables that should NEVER be exposed to user code
 * These contain sensitive security information
 */
const BLOCKED_ENV_VARS = [
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'SESSION_SECRET',
  'REDIS_PASSWORD',
  'MCP_DEVELOPER_KEY',
  'ADMIN_EMAIL',
  'AUTH_RATE_LIMIT_MAX',
  'API_RATE_LIMIT_MAX',
];

/**
 * Safe modules that can be imported in the sandbox
 * These are pre-approved modules with known security characteristics
 */
const ALLOWED_MODULES = {
  // HTTP client for API calls
  axios: () => require('axios'),

  // Email sending
  nodemailer: () => require('nodemailer'),

  // Database (MongoDB only - SQL connections handled separately)
  MongoClient: () => require('mongodb').MongoClient,

  // Utilities
  moment: () => require('moment-timezone'),
  crypto: () => require('crypto-js'), // Safer crypto library

  // File processing (limited)
  path: () => require('path'), // Only path utilities, not file system access
};

/**
 * Functions that are safe to expose to user code
 * These are wrapped versions of potentially dangerous functions
 */
const SAFE_FUNCTIONS = {
  /**
   * Safe setTimeout with maximum duration limit
   */
  setTimeout: timeout => (fn, ms) => {
    if (ms > timeout) {
      throw new Error(`setTimeout delay (${ms}ms) exceeds maximum allowed (${timeout}ms)`);
    }
    return setTimeout(fn, ms);
  },

  /**
   * Safe console that logs through our logger system
   */
  console: {
    log: (...args) => logger.info('Code Node Log:', ...args),
    error: (...args) => logger.error('Code Node Error:', ...args),
    warn: (...args) => logger.warn('Code Node Warning:', ...args),
    info: (...args) => logger.info('Code Node Info:', ...args),
    debug: (...args) => logger.debug('Code Node Debug:', ...args),
  },

  /**
   * Safe JSON methods
   */
  JSON: {
    parse: JSON.parse,
    stringify: JSON.stringify,
  },
};

/**
 * Code complexity and security validation rules
 */
const VALIDATION_RULES = {
  MAX_CODE_LENGTH: 10000, // Maximum characters in code
  MAX_EXECUTION_TIME: 30000, // Maximum execution time in ms
  MAX_MEMORY_MB: 64, // Maximum memory usage in MB

  // Blocked patterns in user code
  BLOCKED_PATTERNS: [
    /require\s*\(/gi, // No direct require calls
    /import\s+/gi, // No ES6 imports
    /eval\s*\(/gi, // No eval
    /Function\s*\(/gi, // No Function constructor
    /process\./gi, // No process access
    /global\./gi, // No global access
    /__dirname/gi, // No directory access
    /__filename/gi, // No filename access
    /fs\./gi, // No file system access
    /child_process/gi, // No child process spawning
    /vm\./gi, // No VM module access
  ],

  // Required patterns (code must contain return or result assignment)
  REQUIRED_PATTERNS: [/(return\s+|result\s*=)/i],
};

/**
 * Get filtered environment variables for code execution
 */
const getFilteredEnv = () => {
  const filtered = {};

  // Only include allowed variables that exist
  for (const key of ALLOWED_ENV_VARS) {
    if (process.env[key] !== undefined) {
      filtered[key] = process.env[key];
    }
  }

  // Log any blocked variables that might be requested
  for (const key of BLOCKED_ENV_VARS) {
    if (process.env[key] !== undefined) {
      logger.debug(`Code Node Security: Blocked access to ${key}`);
    }
  }

  return filtered;
};

/**
 * Validate user code for security issues
 */
const validateCode = code => {
  const errors = [];

  // Check code length
  if (code.length > VALIDATION_RULES.MAX_CODE_LENGTH) {
    errors.push(`Code exceeds maximum length of ${VALIDATION_RULES.MAX_CODE_LENGTH} characters`);
  }

  // Check for blocked patterns
  for (const pattern of VALIDATION_RULES.BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      errors.push(`Code contains blocked pattern: ${pattern.source}`);
    }
  }

  // Check for required patterns
  const hasRequiredPattern = VALIDATION_RULES.REQUIRED_PATTERNS.some(pattern => pattern.test(code));
  if (!hasRequiredPattern) {
    errors.push('Code must contain a return statement or assign to result variable');
  }

  return errors;
};

/**
 * Get safe modules for the sandbox
 */
const getSafeModules = () => {
  const modules = {};

  for (const [name, moduleLoader] of Object.entries(ALLOWED_MODULES)) {
    try {
      modules[name] = moduleLoader();
    } catch (error) {
      logger.warn(`Code Node Security: Could not load module ${name}:`, error.message);
    }
  }

  return modules;
};

module.exports = {
  ALLOWED_ENV_VARS,
  BLOCKED_ENV_VARS,
  ALLOWED_MODULES,
  SAFE_FUNCTIONS,
  VALIDATION_RULES,
  getFilteredEnv,
  validateCode,
  getSafeModules,
};
