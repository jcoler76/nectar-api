/**
 * Shared Database Utilities
 *
 * Provides common database functionality to avoid code duplication
 * across different database drivers and services.
 */

const { logger } = require('./logger');

/**
 * Database connection string builders
 */
class ConnectionStringBuilder {
  /**
   * Build PostgreSQL connection string
   */
  static buildPostgreSQL(config) {
    const { host, port = 5432, database, username, password, sslEnabled = false } = config;

    let connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;

    if (sslEnabled) {
      connectionString += '?sslmode=require';
    }

    return connectionString;
  }

  /**
   * Build MySQL connection string
   */
  static buildMySQL(config) {
    const { host, port = 3306, database, username, password, sslEnabled = false } = config;

    let connectionString = `mysql://${username}:${password}@${host}:${port}/${database}`;

    if (sslEnabled) {
      connectionString += '?ssl=true';
    }

    return connectionString;
  }

  /**
   * Build SQL Server connection string
   */
  static buildMSSQL(config) {
    const { host, port = 1433, database, username, password, sslEnabled = true } = config;

    return {
      server: host,
      port,
      database,
      user: username,
      password,
      options: {
        encrypt: sslEnabled,
        trustServerCertificate: process.env.NODE_ENV === 'development',
      },
    };
  }

  /**
   * Build MongoDB connection string
   */
  static buildMongoDB(config) {
    const { host, port = 27017, database, username, password, sslEnabled = false } = config;

    let connectionString = 'mongodb://';

    if (username && password) {
      connectionString += `${username}:${password}@`;
    }

    connectionString += `${host}:${port}/${database}`;

    if (sslEnabled) {
      connectionString += '?ssl=true';
    }

    return connectionString;
  }
}

/**
 * Query parameter sanitization utilities
 */
class QuerySanitizer {
  /**
   * Validate SQL identifier (table name, column name, etc.)
   */
  static validateSQLIdentifier(identifier) {
    if (typeof identifier !== 'string') {
      throw new Error('SQL identifier must be a string');
    }

    // Allow alphanumeric, underscore, and dot (for schema.table)
    const sqlIdentifierPattern = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

    if (!sqlIdentifierPattern.test(identifier)) {
      throw new Error(`Invalid SQL identifier: ${identifier}`);
    }

    // Check for SQL injection keywords
    const dangerousKeywords = [
      'DROP',
      'DELETE',
      'INSERT',
      'UPDATE',
      'CREATE',
      'ALTER',
      'EXEC',
      'EXECUTE',
      'UNION',
      'SCRIPT',
      'JAVASCRIPT',
      'VBSCRIPT',
      'ONLOAD',
      'ONERROR',
    ];

    const upperIdentifier = identifier.toUpperCase();
    for (const keyword of dangerousKeywords) {
      if (upperIdentifier.includes(keyword)) {
        throw new Error(`SQL identifier contains dangerous keyword: ${keyword}`);
      }
    }

    return true;
  }

  /**
   * Sanitize query parameters
   */
  static sanitizeParameters(parameters) {
    if (!parameters || typeof parameters !== 'object') {
      return {};
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(parameters)) {
      // Validate parameter name
      this.validateSQLIdentifier(key);

      // Sanitize string values
      if (typeof value === 'string') {
        // Escape single quotes in string values
        sanitized[key] = value.replace(/'/g, "''");
      } else if (value === null || value === undefined) {
        sanitized[key] = null;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize SQL query
   */
  static sanitizeQuery(query) {
    if (typeof query !== 'string') {
      throw new Error('Query must be a string');
    }

    // Remove potentially dangerous SQL commands
    const dangerousPatterns = [
      /;\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE)\s+/gi,
      /--.*$/gm, // SQL comments
      /\/\*.*?\*\//gs, // Multi-line comments
      /<script/gi, // XSS attempts
    ];

    let sanitizedQuery = query;

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitizedQuery)) {
        throw new Error('Query contains potentially dangerous SQL commands');
      }
    }

    return sanitizedQuery.trim();
  }
}

/**
 * Result set normalization utilities
 */
class ResultNormalizer {
  /**
   * Normalize database results to a consistent format
   */
  static normalizeResults(results, databaseType) {
    if (!results) {
      return {
        success: true,
        data: [],
        rowCount: 0,
        columns: [],
      };
    }

    switch (databaseType?.toLowerCase()) {
      case 'mssql':
      case 'sqlserver':
        return this.normalizeMSSQLResults(results);

      case 'postgresql':
      case 'postgres':
        return this.normalizePostgreSQLResults(results);

      case 'mysql':
      case 'mariadb':
        return this.normalizeMySQLResults(results);

      case 'mongodb':
        return this.normalizeMongoDBResults(results);

      default:
        // Generic normalization
        return {
          success: true,
          data: Array.isArray(results) ? results : [results],
          rowCount: Array.isArray(results) ? results.length : 1,
          columns: this.extractColumns(results),
        };
    }
  }

  /**
   * Normalize SQL Server results
   */
  static normalizeMSSQLResults(results) {
    return {
      success: true,
      data: results.recordset || [],
      rowCount: results.rowsAffected?.[0] || results.recordset?.length || 0,
      columns: this.extractColumns(results.recordset),
    };
  }

  /**
   * Normalize PostgreSQL results
   */
  static normalizePostgreSQLResults(results) {
    return {
      success: true,
      data: results.rows || [],
      rowCount: results.rowCount || 0,
      columns: results.fields?.map(field => field.name) || [],
    };
  }

  /**
   * Normalize MySQL results
   */
  static normalizeMySQLResults(results) {
    const data = Array.isArray(results) ? results[0] : results;
    return {
      success: true,
      data: Array.isArray(data) ? data : [data],
      rowCount: Array.isArray(data) ? data.length : 1,
      columns: this.extractColumns(data),
    };
  }

  /**
   * Normalize MongoDB results
   */
  static normalizeMongoDBResults(results) {
    const data = Array.isArray(results) ? results : [results];
    return {
      success: true,
      data,
      rowCount: data.length,
      columns: this.extractColumns(data),
    };
  }

  /**
   * Extract column names from result data
   */
  static extractColumns(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    const firstRow = data[0];
    if (typeof firstRow === 'object' && firstRow !== null) {
      return Object.keys(firstRow);
    }

    return [];
  }
}

/**
 * Database error standardization
 */
class DatabaseErrorHandler {
  /**
   * Standardize database errors
   */
  static standardizeError(error, databaseType, operation = 'query') {
    const baseError = {
      success: false,
      operation,
      timestamp: new Date().toISOString(),
      databaseType,
    };

    // Handle common error types
    if (error.code) {
      switch (error.code) {
        case 'ECONNREFUSED':
          return {
            ...baseError,
            error: 'CONNECTION_REFUSED',
            message: 'Unable to connect to database server',
            suggestion: 'Check if database server is running and accessible',
          };

        case 'ENOTFOUND':
          return {
            ...baseError,
            error: 'HOST_NOT_FOUND',
            message: 'Database host not found',
            suggestion: 'Check the host address and network connectivity',
          };

        case 'ETIMEDOUT':
          return {
            ...baseError,
            error: 'CONNECTION_TIMEOUT',
            message: 'Database connection timed out',
            suggestion: 'Check network connectivity or increase timeout settings',
          };

        default:
          break;
      }
    }

    // Handle database-specific errors
    if (databaseType?.toLowerCase() === 'mssql') {
      return this.handleMSSQLError(error, baseError);
    }

    if (databaseType?.toLowerCase() === 'postgresql') {
      return this.handlePostgreSQLError(error, baseError);
    }

    // Generic error handling
    return {
      ...baseError,
      error: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown database error occurred',
      originalError: error.message,
    };
  }

  /**
   * Handle SQL Server specific errors
   */
  static handleMSSQLError(error, baseError) {
    if (error.number) {
      switch (error.number) {
        case 2:
          return {
            ...baseError,
            error: 'MSSQL_SERVER_NOT_FOUND',
            message: 'SQL Server not found or not accessible',
            suggestion: 'Check server name, port, and network connectivity',
          };

        case 18456:
          return {
            ...baseError,
            error: 'MSSQL_LOGIN_FAILED',
            message: 'Login failed for user',
            suggestion: 'Check username and password',
          };

        case 208:
          return {
            ...baseError,
            error: 'MSSQL_OBJECT_NOT_FOUND',
            message: 'Invalid object name',
            suggestion: 'Check if table or view exists',
          };

        default:
          break;
      }
    }

    return {
      ...baseError,
      error: 'MSSQL_ERROR',
      message: error.message,
      sqlState: error.state,
      sqlNumber: error.number,
    };
  }

  /**
   * Handle PostgreSQL specific errors
   */
  static handlePostgreSQLError(error, baseError) {
    if (error.code) {
      switch (error.code) {
        case '28P01':
          return {
            ...baseError,
            error: 'POSTGRESQL_AUTH_FAILED',
            message: 'Password authentication failed',
            suggestion: 'Check username and password',
          };

        case '3D000':
          return {
            ...baseError,
            error: 'POSTGRESQL_DATABASE_NOT_FOUND',
            message: 'Database does not exist',
            suggestion: 'Check database name',
          };

        case '42P01':
          return {
            ...baseError,
            error: 'POSTGRESQL_TABLE_NOT_FOUND',
            message: 'Relation does not exist',
            suggestion: 'Check if table or view exists',
          };

        default:
          break;
      }
    }

    return {
      ...baseError,
      error: 'POSTGRESQL_ERROR',
      message: error.message,
      sqlState: error.code,
    };
  }
}

/**
 * Connection timeout utilities
 */
class ConnectionTimeoutHandler {
  /**
   * Create a timeout promise
   */
  static createTimeout(milliseconds, operation = 'operation') {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${milliseconds}ms`));
      }, milliseconds);
    });
  }

  /**
   * Wrap a promise with timeout
   */
  static withTimeout(promise, timeoutMs, operation = 'operation') {
    return Promise.race([promise, this.createTimeout(timeoutMs, operation)]);
  }

  /**
   * Get default timeout for database type
   */
  static getDefaultTimeout(databaseType) {
    const timeouts = {
      mssql: 30000,
      postgresql: 30000,
      mysql: 30000,
      mongodb: 30000,
      oracle: 60000,
      sqlite: 10000,
      redis: 10000,
    };

    return timeouts[databaseType?.toLowerCase()] || 30000;
  }
}

module.exports = {
  ConnectionStringBuilder,
  QuerySanitizer,
  ResultNormalizer,
  DatabaseErrorHandler,
  ConnectionTimeoutHandler,
  logger,
};
