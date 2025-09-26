/**
 * SQL Injection Detection and Monitoring Middleware
 *
 * CRITICAL SECURITY IMPLEMENTATION
 * - Detects common SQL injection patterns in request data
 * - Logs suspicious requests for security analysis
 * - Blocks obvious attacks while allowing legitimate data
 * - Tracks repeat offenders for rate limiting
 */

const { logger } = require('../utils/logger');

/**
 * SQL Injection Pattern Detection
 */
class SQLInjectionMonitor {
  constructor() {
    // Common SQL injection patterns (case-insensitive)
    this.sqlPatterns = [
      // Classic SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|TRUNCATE)\b.*\b(FROM|INTO|WHERE|SET)\b)/i,

      // Union-based attacks
      /(\bunion\b.*\bselect\b)/i,
      /(\bselect\b.*\bunion\b)/i,

      // Boolean-based blind injection
      /(\b(OR|AND)\s+[\d\w'"]*\s*=\s*[\d\w'"]*\s*(--|\#|\/\*))/i,
      /(\b(OR|AND)\s+['"][^'"]*['"]\s*=\s*['"][^'"]*['"])/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+true\b)/i,
      /(\b(OR|AND)\s+false\b)/i,

      // Time-based blind injection
      /(sleep\s*\(|waitfor\s+delay|benchmark\s*\()/i,
      /(pg_sleep\s*\(|dbms_lock\.sleep)/i,

      // Comment-based attacks
      /(--|\#|\/\*|\*\/)/,

      // Stacked queries
      /(;\s*(select|insert|update|delete|drop|create|alter|exec))/i,

      // Function-based attacks
      /(\b(user|database|version|@@version|information_schema|sys\.)\b)/i,
      /(\b(concat|substring|ascii|char|hex|unhex|md5|sha1|load_file|into\s+outfile)\s*\()/i,

      // XPath injection patterns
      /(\band\b.*\bor\b.*[\[\]])/i,

      // LDAP injection patterns
      /(\(\s*\|\s*\(|\)\s*\(\s*\|)/,

      // NoSQL injection patterns (for completeness)
      /(\$where|\$regex|\$ne|\$gt|\$lt)/i,

      // Encoded attacks
      /(%27|%22|%2d%2d|%23|%2f%2a)/i,

      // Hex encoded
      /(0x[0-9a-f]+)/i,

      // Common payloads
      /('.*'.*=.*'.*'|".*".*=.*".*")/,
      /(admin'--|admin"--|'or'1'='1|"or"1"="1)/i,
    ];

    // Suspicious keywords that might indicate probing
    this.suspiciousKeywords = [
      'information_schema',
      'sys.tables',
      'sysobjects',
      'mysql.user',
      'pg_tables',
      'sqlite_master',
      'dual',
      'sysusers',
      'syscolumns',
      'msysaccessobjects',
      'msysqueries',
      'pg_user',
      'all_tables',
      'user_tables',
      'dba_tables',
      'schema_name',
    ];

    // Track suspicious activity
    this.suspiciousActivity = new Map();
    this.blockThreshold = 5; // Block after 5 suspicious requests in 10 minutes
    this.windowMs = 10 * 60 * 1000; // 10 minute window
  }

  /**
   * Main middleware function
   */
  middleware() {
    return (req, res, next) => {
      try {
        const suspiciousData = this.detectSQLInjection(req);

        if (suspiciousData.length > 0) {
          this.logSuspiciousActivity(req, suspiciousData);

          // Check if IP should be blocked
          if (this.shouldBlockRequest(req.ip)) {
            this.blockRequest(req, res, suspiciousData);
            return;
          }
        }

        next();
      } catch (error) {
        logger.error('SQL injection monitoring error:', {
          error: error.message,
          stack: error.stack,
          path: req.path,
          ip: req.ip,
        });

        // Continue processing on error (fail-open)
        next();
      }
    };
  }

  /**
   * Detect SQL injection patterns in request data
   */
  detectSQLInjection(req) {
    const suspicious = [];
    const targets = [
      { type: 'query', data: req.query },
      { type: 'body', data: req.body },
      { type: 'params', data: req.params },
    ];

    for (const target of targets) {
      if (target.data && typeof target.data === 'object') {
        this.checkObjectForSQLI(target.data, target.type, '', suspicious);
      }
    }

    return suspicious;
  }

  /**
   * Recursively check object properties for SQL injection
   */
  checkObjectForSQLI(obj, sourceType, path, suspicious, depth = 0) {
    // Prevent deep recursion attacks
    if (depth > 10) return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        const patterns = this.findMatchingPatterns(value);
        const keywords = this.findSuspiciousKeywords(value);

        if (patterns.length > 0 || keywords.length > 0) {
          suspicious.push({
            source: sourceType,
            field: currentPath,
            value: this.sanitizeValue(value),
            patterns: patterns,
            keywords: keywords,
            severity: this.calculateSeverity(patterns, keywords, value),
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        this.checkObjectForSQLI(value, sourceType, currentPath, suspicious, depth + 1);
      }
    }
  }

  /**
   * Find matching SQL injection patterns
   */
  findMatchingPatterns(value) {
    const matches = [];
    for (let i = 0; i < this.sqlPatterns.length; i++) {
      if (this.sqlPatterns[i].test(value)) {
        matches.push({
          index: i,
          pattern: this.sqlPatterns[i].source,
          match: value.match(this.sqlPatterns[i])?.[0],
        });
      }
    }
    return matches;
  }

  /**
   * Find suspicious keywords
   */
  findSuspiciousKeywords(value) {
    const found = [];
    const lowerValue = value.toLowerCase();

    for (const keyword of this.suspiciousKeywords) {
      if (lowerValue.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }

    return found;
  }

  /**
   * Calculate severity score
   */
  calculateSeverity(patterns, keywords, value) {
    let severity = 0;

    // Pattern severity
    severity += patterns.length * 3;

    // Keyword severity
    severity += keywords.length * 2;

    // Length penalty for very long strings (potential obfuscation)
    if (value.length > 1000) {
      severity += 2;
    }

    // Multiple SQL keywords increase severity
    const sqlKeywordCount = (
      value.match(/\b(select|insert|update|delete|drop|union|where|from|into|exec|execute)\b/gi) ||
      []
    ).length;
    severity += Math.min(sqlKeywordCount * 2, 10);

    // Classify severity
    if (severity >= 10) return 'CRITICAL';
    if (severity >= 6) return 'HIGH';
    if (severity >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(req, suspiciousData) {
    const maxSeverity = suspiciousData.reduce((max, item) => {
      const severityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      return Math.max(max, severityLevels[item.severity] || 0);
    }, 0);

    const severityNames = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH', 4: 'CRITICAL' };
    const severity = severityNames[maxSeverity] || 'LOW';

    // Log based on severity
    const logMethod = severity === 'CRITICAL' ? 'error' : severity === 'HIGH' ? 'warn' : 'info';

    logger[logMethod]('SQL injection attempt detected', {
      severity,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      organizationId: req.user?.organizationId,
      suspiciousData: suspiciousData.map(item => ({
        source: item.source,
        field: item.field,
        severity: item.severity,
        patternCount: item.patterns.length,
        keywordCount: item.keywords.length,
        value: item.value, // Already sanitized
      })),
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });

    // Track for rate limiting
    this.updateSuspiciousActivity(req.ip, severity);
  }

  /**
   * Update suspicious activity tracking
   */
  updateSuspiciousActivity(ip, severity) {
    const now = Date.now();
    const activityRecord = this.suspiciousActivity.get(ip) || {
      count: 0,
      firstSeen: now,
      lastSeen: now,
      severities: [],
    };

    // Clean old records
    if (now - activityRecord.firstSeen > this.windowMs) {
      activityRecord.count = 0;
      activityRecord.firstSeen = now;
      activityRecord.severities = [];
    }

    activityRecord.count++;
    activityRecord.lastSeen = now;
    activityRecord.severities.push({ severity, timestamp: now });

    this.suspiciousActivity.set(ip, activityRecord);
  }

  /**
   * Check if request should be blocked
   */
  shouldBlockRequest(ip) {
    const activity = this.suspiciousActivity.get(ip);

    if (!activity) return false;

    // Block if too many attempts
    if (activity.count >= this.blockThreshold) {
      return true;
    }

    // Block immediately for critical attempts
    const recentCritical = activity.severities.filter(
      s => s.severity === 'CRITICAL' && Date.now() - s.timestamp < this.windowMs
    );

    return recentCritical.length >= 2;
  }

  /**
   * Block suspicious request
   */
  blockRequest(req, res, suspiciousData) {
    logger.error('Request blocked due to SQL injection patterns', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      userId: req.user?.userId,
      suspiciousData: suspiciousData.length,
      timestamp: new Date().toISOString(),
    });

    res.status(403).json({
      success: false,
      message: 'Request blocked due to security policy violation',
      code: 'SECURITY_VIOLATION',
      requestId: req.requestId,
    });
  }

  /**
   * Sanitize value for logging (truncate and remove sensitive patterns)
   */
  sanitizeValue(value) {
    if (typeof value !== 'string') return String(value);

    // Truncate long strings
    let sanitized = value.length > 200 ? value.substring(0, 200) + '...' : value;

    // Remove potential passwords or sensitive data patterns
    sanitized = sanitized.replace(/password[=:]\s*[^\s&]+/gi, 'password=***');
    sanitized = sanitized.replace(/token[=:]\s*[^\s&]+/gi, 'token=***');

    return sanitized;
  }

  /**
   * Clean up old tracking data (call periodically)
   */
  cleanup() {
    const now = Date.now();
    for (const [ip, activity] of this.suspiciousActivity.entries()) {
      if (now - activity.lastSeen > this.windowMs * 2) {
        this.suspiciousActivity.delete(ip);
      }
    }
  }
}

// Create singleton instance
const sqlInjectionMonitor = new SQLInjectionMonitor();

// Cleanup old data every 5 minutes
setInterval(
  () => {
    sqlInjectionMonitor.cleanup();
  },
  5 * 60 * 1000
);

module.exports = {
  sqlInjectionMonitor: sqlInjectionMonitor.middleware.bind(sqlInjectionMonitor),
  SQLInjectionMonitor,
};
