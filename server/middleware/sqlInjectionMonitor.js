/**
 * Lightweight SQL Injection Detection Middleware
 *
 * PRACTICAL SECURITY IMPLEMENTATION
 * - Focuses on the most dangerous patterns only
 * - Non-blocking monitoring and logging
 * - Minimal performance impact
 * - Allows legitimate data to pass through
 */

const { logger } = require('../utils/logger');

/**
 * Lightweight SQL Injection Monitor
 * Focus on actual threats, not false positives
 */
class SQLInjectionMonitor {
  constructor() {
    // Only the most critical SQL injection patterns
    // These are patterns that are almost never legitimate
    this.criticalPatterns = [
      // Classic injection with quotes and operators
      /['"]\s*(or|and)\s+['"]/i,

      // Union-based attacks
      /union\s+select/i,

      // Comment-based attacks (very suspicious in web forms)
      /(--|\#|\/\*)\s*$/,

      // Multiple statements (stacked queries)
      /;\s*(drop|delete|update|insert|create|alter)\s+/i,

      // Information schema probing
      /information_schema\./i,

      // Administrative functions
      /(xp_|sp_)\w+/i,
    ];

    // Track suspicious IPs for rate limiting integration
    this.suspiciousIPs = new Map();
    this.cleanupInterval = 10 * 60 * 1000; // 10 minutes

    // Start cleanup timer asynchronously
    this.startCleanupTimer();
  }

  /**
   * Lightweight middleware - fail open, monitor only
   */
  middleware() {
    return (req, res, next) => {
      // Always call next first - never block requests
      next();

      // Process detection asynchronously for monitoring only
      setImmediate(() => {
        this.processRequest(req);
      });
    };
  }

  /**
   * Async processing of requests for monitoring
   */
  async processRequest(req) {
    try {
      // Quick check - only scan small string values
      const suspicious = this.scanRequestData(req);

      if (suspicious.length > 0) {
        this.logSuspiciousActivity(req, suspicious);
        this.trackSuspiciousIP(req.ip);
      }
    } catch (error) {
      // Silent failure - don't impact user experience
      logger.debug('SQL injection scan error:', {
        error: error.message,
        path: req.path,
      });
    }
  }

  /**
   * Scan only the most likely injection points
   */
  scanRequestData(req) {
    const suspicious = [];

    // Check query parameters (most common injection point)
    if (req.query && typeof req.query === 'object') {
      this.scanObject(req.query, 'query', suspicious);
    }

    // Check POST body (second most common)
    if (req.body && typeof req.body === 'object') {
      this.scanObject(req.body, 'body', suspicious);
    }

    // Skip URL params - they're usually controlled by the application

    return suspicious;
  }

  /**
   * Lightweight object scanning
   */
  scanObject(obj, source, suspicious, depth = 0) {
    // Prevent deep recursion (performance protection)
    if (depth > 3) return;

    for (const [key, value] of Object.entries(obj)) {
      // Only scan string values under 1000 chars (performance protection)
      if (typeof value === 'string' && value.length < 1000) {
        const matches = this.checkForCriticalPatterns(value);
        if (matches.length > 0) {
          suspicious.push({
            source,
            field: key,
            value: this.sanitizeForLogging(value),
            patterns: matches,
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        this.scanObject(value, source, suspicious, depth + 1);
      }
    }
  }

  /**
   * Check against critical patterns only
   */
  checkForCriticalPatterns(value) {
    const matches = [];

    // Quick length check - very long strings are suspicious
    if (value.length > 500) {
      matches.push('excessive_length');
    }

    // Check critical patterns
    for (let i = 0; i < this.criticalPatterns.length; i++) {
      if (this.criticalPatterns[i].test(value)) {
        matches.push(`pattern_${i}`);
        break; // Stop at first match for performance
      }
    }

    return matches;
  }

  /**
   * Log suspicious activity (minimal logging)
   */
  logSuspiciousActivity(req, suspicious) {
    logger.warn('SQL injection pattern detected', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent']?.substring(0, 200),
      userId: req.user?.userId,
      patternCount: suspicious.length,
      fields: suspicious.map(s => s.field),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track suspicious IPs for integration with rate limiting
   */
  trackSuspiciousIP(ip) {
    const now = Date.now();
    const record = this.suspiciousIPs.get(ip) || { count: 0, firstSeen: now };

    record.count++;
    record.lastSeen = now;

    this.suspiciousIPs.set(ip, record);
  }

  /**
   * Get suspicious IP data for rate limiting integration
   */
  getSuspiciousIPData(ip) {
    return this.suspiciousIPs.get(ip) || null;
  }

  /**
   * Sanitize value for safe logging
   */
  sanitizeForLogging(value) {
    if (typeof value !== 'string') return String(value);

    // Truncate and remove sensitive data
    let sanitized = value.length > 100 ? value.substring(0, 100) + '...' : value;
    sanitized = sanitized.replace(/password[=:]\s*[^\s&]+/gi, 'password=***');
    sanitized = sanitized.replace(/token[=:]\s*[^\s&]+/gi, 'token=***');

    return sanitized;
  }

  /**
   * Cleanup old tracking data
   */
  cleanup() {
    const now = Date.now();
    const expiry = now - this.cleanupInterval;

    for (const [ip, record] of this.suspiciousIPs.entries()) {
      if (record.lastSeen < expiry) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  /**
   * Start cleanup timer asynchronously
   */
  startCleanupTimer() {
    setImmediate(() => {
      setInterval(() => {
        try {
          this.cleanup();
        } catch (error) {
          logger.debug('SQL injection monitor cleanup error:', error);
        }
      }, this.cleanupInterval);
    });
  }
}

// Create singleton instance
const sqlInjectionMonitor = new SQLInjectionMonitor();

module.exports = {
  sqlInjectionMonitor: sqlInjectionMonitor.middleware.bind(sqlInjectionMonitor),
  getSuspiciousIPData: ip => sqlInjectionMonitor.getSuspiciousIPData(ip),
  SQLInjectionMonitor,
};
