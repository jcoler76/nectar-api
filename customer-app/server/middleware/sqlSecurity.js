const { Parser } = require('node-sql-parser');
const { logger } = require('../utils/logger');

/**
 * SQL Security Middleware - Prevents SQL injection attacks
 * Provides safe SQL execution and validation for workflow nodes
 */

// Initialize SQL parser for validation
const sqlParser = new Parser();

/**
 * SQL operations allowed in workflow nodes
 */
const ALLOWED_SQL_OPERATIONS = [
  // Read operations
  'SELECT',

  // Limited write operations for workflow automation
  'INSERT',
  'UPDATE',

  // Database administration (restricted to admin nodes)
  'BACKUP',
  'RESTORE',
  'CREATE',
  'ALTER',
  'DROP',

  // Transaction control
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
];

/**
 * SQL keywords/functions that should be blocked in user-provided SQL
 */
const BLOCKED_SQL_PATTERNS = [
  // System functions that could expose sensitive data
  /xp_cmdshell/gi,
  /sp_configure/gi,
  /openrowset/gi,
  /opendatasource/gi,
  /bulk\s+insert/gi,

  // Dynamic SQL that could allow injection
  /exec\s*\(/gi,
  /execute\s*\(/gi,
  /sp_executesql/gi,

  // Potentially dangerous SQL Server functions
  /sys\./gi,
  /information_schema\./gi,
  /master\./gi,
  /msdb\./gi,
  /tempdb\./gi,

  // SQL injection common patterns
  /union\s+all\s+select/gi,
  /union\s+select/gi,
  /'.*or.*'/gi,
  /'.*and.*'/gi,
  /';.*--/gi,
  /\/\*.*\*\//gi,
];

/**
 * Validate SQL identifier (database names, table names, column names)
 * More secure than the original weak regex
 */
const validateSqlIdentifier = (identifier, allowDots = false) => {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('SQL identifier cannot be empty');
  }

  // Remove square brackets for validation
  const cleanIdentifier = identifier.replace(/^\[|\]$/g, '');

  // SQL identifiers should only contain alphanumeric, underscore, and optionally dots
  const pattern = allowDots ? /^[a-zA-Z_][a-zA-Z0-9_\.]*$/ : /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  if (!pattern.test(cleanIdentifier)) {
    throw new Error(
      `Invalid SQL identifier: ${identifier}. Only alphanumeric characters and underscores allowed.`
    );
  }

  // Check length
  if (cleanIdentifier.length > 128) {
    throw new Error(`SQL identifier too long: ${identifier}. Maximum 128 characters allowed.`);
  }

  // Check for SQL reserved words (basic list)
  const reservedWords = [
    'SELECT',
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'TABLE',
    'DATABASE',
    'INDEX',
    'VIEW',
    'PROCEDURE',
    'FUNCTION',
    'TRIGGER',
    'FROM',
    'WHERE',
    'JOIN',
    'UNION',
    'ORDER',
    'GROUP',
    'HAVING',
    'GRANT',
    'REVOKE',
    'EXEC',
    'EXECUTE',
  ];

  if (reservedWords.includes(cleanIdentifier.toUpperCase())) {
    throw new Error(`SQL identifier cannot be a reserved word: ${identifier}`);
  }

  return cleanIdentifier;
};

/**
 * Validate SQL query for security issues
 */
const validateSqlQuery = (sql, options = {}) => {
  const {
    allowedOperations = ALLOWED_SQL_OPERATIONS,
    isAdminQuery = false,
    maxLength = 10000,
  } = options;

  if (!sql || typeof sql !== 'string') {
    return { isValid: false, error: 'SQL query is required and must be a string' };
  }

  // Check length
  if (sql.length > maxLength) {
    return { isValid: false, error: `SQL query exceeds maximum length of ${maxLength} characters` };
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_SQL_PATTERNS) {
    if (pattern.test(sql)) {
      return {
        isValid: false,
        error: `SQL query contains blocked pattern: ${pattern.source}`,
      };
    }
  }

  try {
    // Parse SQL to validate syntax and extract operations
    const parsed = sqlParser.parse(sql);
    const queries = Array.isArray(parsed) ? parsed : [parsed];

    for (const query of queries) {
      // Check if operation is allowed
      const operation = query.type?.toUpperCase();
      if (!allowedOperations.includes(operation)) {
        return {
          isValid: false,
          error: `SQL operation '${operation}' is not allowed in this context`,
        };
      }

      // Additional restrictions for non-admin queries
      if (!isAdminQuery && ['DROP', 'CREATE', 'ALTER', 'BACKUP', 'RESTORE'].includes(operation)) {
        return {
          isValid: false,
          error: `Administrative SQL operation '${operation}' requires admin privileges`,
        };
      }
    }

    return {
      isValid: true,
      parsedQueries: queries,
      operations: queries.map(q => q.type?.toUpperCase()),
    };
  } catch (parseError) {
    return {
      isValid: false,
      error: `SQL syntax error: ${parseError.message}`,
    };
  }
};

/**
 * Create safe SQL parameters from interpolated values
 * This prevents SQL injection by ensuring all dynamic values are parameterized
 */
const createSafeParameters = (sql, context) => {
  const parameters = {};
  let paramCounter = 0;
  let safeSql = sql;

  // Find all template interpolations that weren't caught by the workflow engine
  const interpolationPattern = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = interpolationPattern.exec(sql)) !== null) {
    const placeholder = match[0];
    const contextPath = match[1].trim();

    // Create a safe parameter name
    const paramName = `param_${paramCounter++}`;

    // Get value from context using safe path traversal
    const value = getNestedValue(context, contextPath);

    // Replace placeholder with parameter
    safeSql = safeSql.replace(placeholder, `@${paramName}`);
    parameters[paramName] = value;
  }

  return { safeSql, parameters };
};

/**
 * Safely get nested value from object using dot notation
 */
const getNestedValue = (obj, path) => {
  if (!obj || !path) return null;

  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : null;
  }, obj);
};

/**
 * Safe SQL execution wrapper that enforces security policies
 */
const executeSafeSql = async (dbManager, connection, sql, parameters = {}, options = {}) => {
  const {
    isAdminQuery = false,
    allowedOperations = ALLOWED_SQL_OPERATIONS,
    timeout = 30000,
  } = options;

  logger.info('Executing SQL with security validation', {
    sqlLength: sql.length,
    parameterCount: Object.keys(parameters).length,
    isAdminQuery,
  });

  // Validate the SQL query
  const validation = validateSqlQuery(sql, { allowedOperations, isAdminQuery });
  if (!validation.isValid) {
    throw new Error(`SQL Security Error: ${validation.error}`);
  }

  // Log the operations being performed
  logger.info('SQL operations validated:', validation.operations);

  try {
    // Execute with timeout
    const result = await Promise.race([
      dbManager.executeQuery(connection, sql, parameters),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SQL execution timeout')), timeout)
      ),
    ]);

    logger.info('SQL executed successfully', {
      rowsAffected: result.rowsAffected,
      recordCount: result.recordset?.length || 0,
    });

    return result;
  } catch (error) {
    logger.error('SQL execution failed', {
      error: error.message,
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      parameters: Object.keys(parameters),
    });

    // Sanitize error message to prevent information disclosure
    if (error.message.includes('Login failed') || error.message.includes('password')) {
      throw new Error('Database authentication failed');
    } else if (error.message.includes('timeout')) {
      throw new Error('SQL execution timeout exceeded');
    } else if (error.message.includes('permission')) {
      throw new Error('Insufficient database permissions');
    } else {
      throw new Error('SQL execution failed');
    }
  }
};

/**
 * Express middleware for SQL injection protection in API endpoints
 */
const sqlInjectionProtectionMiddleware = (sqlFields = ['sql', 'query']) => {
  return (req, res, next) => {
    for (const field of sqlFields) {
      const sqlValue = req.body[field];
      if (sqlValue) {
        const validation = validateSqlQuery(sqlValue);
        if (!validation.isValid) {
          logger.warn('SQL injection attempt blocked', {
            field,
            error: validation.error,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
          });

          return res.status(400).json({
            error: {
              code: 'INVALID_SQL',
              message: validation.error,
            },
          });
        }
      }
    }
    next();
  };
};

module.exports = {
  validateSqlIdentifier,
  validateSqlQuery,
  createSafeParameters,
  executeSafeSql,
  sqlInjectionProtectionMiddleware,
  ALLOWED_SQL_OPERATIONS,
  BLOCKED_SQL_PATTERNS,
};
