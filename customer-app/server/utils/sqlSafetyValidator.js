/**
 * SQL Safety Validator
 * Simple SQL safety validation to replace the removed MCP validator
 */

class SQLSafetyValidator {
  static validateQuery(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Block dangerous SQL operations
    const dangerousPatterns = [
      /\bdrop\s+table\b/i,
      /\bdrop\s+database\b/i,
      /\bdelete\s+from\b.*\bwhere\s+1\s*=\s*1\b/i,
      /\btruncate\s+table\b/i,
      /\balter\s+table\b/i,
      /\bcreate\s+table\b/i,
      /\binsert\s+into\b/i,
      /\bupdate\s+.*\bset\b/i,
      /\bdelete\s+from\b/i,
      /\bexec\s*\(/i,
      /\bexecute\s*\(/i,
      /\bsp_\w+/i,
      /\bxp_\w+/i,
      /--;/,
      /\/\*/,
      /\*\//,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedQuery)) {
        throw new Error(`Query contains potentially dangerous SQL operations: ${pattern.source}`);
      }
    }

    // Ensure it's a SELECT query for safety
    if (!normalizedQuery.startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }

    return true;
  }

  static validateProcedureName(procedureName) {
    if (!procedureName || typeof procedureName !== 'string') {
      return null;
    }

    // Remove any potentially dangerous characters from procedure names
    // Allow only alphanumeric, underscore, and hyphen
    const cleaned = procedureName.replace(/[^a-zA-Z0-9_-]/g, '');

    // Ensure it's not empty after cleaning
    if (!cleaned) {
      return null;
    }

    // Limit length to prevent buffer overflow attacks
    if (cleaned.length > 100) {
      return null;
    }

    return cleaned;
  }

  static validateIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      return null;
    }

    // Remove any potentially dangerous characters from identifiers
    // Allow only alphanumeric, underscore (common for SQL identifiers)
    const cleaned = identifier.replace(/[^a-zA-Z0-9_]/g, '');

    // Ensure it's not empty after cleaning
    if (!cleaned) {
      return null;
    }

    // Ensure it starts with a letter or underscore (SQL identifier rule)
    if (!/^[a-zA-Z_]/.test(cleaned)) {
      return null;
    }

    // Limit length to prevent buffer overflow attacks
    if (cleaned.length > 64) {
      return null;
    }

    return cleaned;
  }

  static validateParameters(params) {
    return this.sanitizeParameters(params);
  }

  static sanitizeParameters(params) {
    if (!params || typeof params !== 'object') {
      return {};
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(params)) {
      // Basic parameter validation
      if (typeof value === 'string') {
        // Remove potential SQL injection attempts
        sanitized[key] = value.replace(/['";\\]/g, '');
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = null;
      } else {
        // Convert other types to string and sanitize
        sanitized[key] = String(value).replace(/['";\\]/g, '');
      }
    }

    return sanitized;
  }
}

module.exports = SQLSafetyValidator;
