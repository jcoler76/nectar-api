/**
 * Security Monitoring Service
 *
 * CRITICAL SECURITY IMPLEMENTATION
 * - Tracks authentication failures and suspicious patterns
 * - Detects credential stuffing and brute force attacks
 * - Monitors for geographic anomalies and unusual access patterns
 * - Provides risk scoring and automated response recommendations
 */

const { logger } = require('../utils/logger');
const prismaService = require('./prismaService');

/**
 * Security Event Types
 */
const SECURITY_EVENTS = {
  // Authentication events
  AUTH_FAILURE: 'AUTH_FAILURE',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  PASSWORD_RESET: 'PASSWORD_RESET',

  // Suspicious behavior
  RAPID_REQUESTS: 'RAPID_REQUESTS',
  GEOGRAPHIC_ANOMALY: 'GEOGRAPHIC_ANOMALY',
  USER_AGENT_CHANGE: 'USER_AGENT_CHANGE',
  PRIVILEGE_ESCALATION: 'PRIVILEGE_ESCALATION',

  // Attack patterns
  CREDENTIAL_STUFFING: 'CREDENTIAL_STUFFING',
  BRUTE_FORCE: 'BRUTE_FORCE',
  SESSION_HIJACKING: 'SESSION_HIJACKING',
  API_ABUSE: 'API_ABUSE',

  // Data access
  UNUSUAL_DATA_ACCESS: 'UNUSUAL_DATA_ACCESS',
  BULK_DATA_EXPORT: 'BULK_DATA_EXPORT',
  SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS',
};

/**
 * Risk Levels
 */
const RISK_LEVELS = {
  LOW: { score: 1, threshold: 10 },
  MEDIUM: { score: 3, threshold: 25 },
  HIGH: { score: 5, threshold: 50 },
  CRITICAL: { score: 10, threshold: 100 },
};

class SecurityMonitoringService {
  constructor() {
    // In-memory caches for performance (could be moved to Redis)
    this.userSessions = new Map(); // userId -> session info
    this.ipActivity = new Map(); // ip -> activity info
    this.userActivity = new Map(); // userId -> activity info

    // Configuration
    this.config = {
      // Failure thresholds
      maxFailuresPerIP: 10,
      maxFailuresPerUser: 5,
      failureWindow: 15 * 60 * 1000, // 15 minutes

      // Rapid request detection
      maxRequestsPerMinute: 100,
      rapidRequestThreshold: 200,

      // Geographic anomaly detection
      enableGeoAnomalyDetection: true,
      maxDistanceKm: 500, // Alert if user location changes by more than 500km

      // Token refresh monitoring
      maxTokenRefreshesPerHour: 50,

      // Data access patterns
      bulkDataThreshold: 1000, // Records accessed in single request
      sensitiveEndpoints: ['/api/users', '/api/admin', '/api/keys', '/api/billing'],
    };

    // Start cleanup interval
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Track authentication failure
   */
  async trackAuthFailure(data) {
    const { ip, email, userAgent, reason, path } = data;
    const timestamp = Date.now();

    // Update IP activity
    this.updateIPActivity(ip, {
      type: SECURITY_EVENTS.AUTH_FAILURE,
      email,
      timestamp,
      userAgent,
      reason,
      path,
    });

    // Check for brute force patterns
    const ipActivity = this.ipActivity.get(ip);
    const recentFailures = this.getRecentEvents(ipActivity.events, this.config.failureWindow);
    const authFailures = recentFailures.filter(e => e.type === SECURITY_EVENTS.AUTH_FAILURE);

    let riskScore = 0;
    const alerts = [];

    // Brute force detection
    if (authFailures.length >= this.config.maxFailuresPerIP) {
      riskScore += RISK_LEVELS.HIGH.score;
      alerts.push({
        type: SECURITY_EVENTS.BRUTE_FORCE,
        severity: 'HIGH',
        message: `${authFailures.length} authentication failures from IP ${ip}`,
        recommendations: ['Block IP temporarily', 'Increase rate limiting', 'Alert security team'],
      });
    }

    // Credential stuffing detection (multiple different emails from same IP)
    const uniqueEmails = new Set(authFailures.map(f => f.email).filter(Boolean));
    if (uniqueEmails.size >= 5) {
      riskScore += RISK_LEVELS.HIGH.score;
      alerts.push({
        type: SECURITY_EVENTS.CREDENTIAL_STUFFING,
        severity: 'HIGH',
        message: `Credential stuffing attempt detected: ${uniqueEmails.size} different emails from IP ${ip}`,
        recommendations: ['Block IP', 'Enable CAPTCHA', 'Alert security team'],
      });
    }

    // Log security event
    await this.logSecurityEvent({
      type: SECURITY_EVENTS.AUTH_FAILURE,
      ip,
      email,
      userAgent,
      reason,
      path,
      riskScore,
      alerts,
      metadata: {
        recentFailures: authFailures.length,
        uniqueEmails: uniqueEmails.size,
      },
    });

    return { riskScore, alerts };
  }

  /**
   * Track successful authentication
   */
  async trackAuthSuccess(data) {
    const { userId, ip, userAgent, email, location } = data;
    const timestamp = Date.now();

    // Update user activity
    this.updateUserActivity(userId, {
      type: SECURITY_EVENTS.AUTH_SUCCESS,
      ip,
      userAgent,
      email,
      location,
      timestamp,
    });

    const userActivity = this.userActivity.get(userId);
    const userSessions = userActivity.sessions || [];

    let riskScore = 0;
    const alerts = [];

    // Geographic anomaly detection
    if (this.config.enableGeoAnomalyDetection && location && userSessions.length > 0) {
      const lastLocation = userSessions[userSessions.length - 1]?.location;
      if (lastLocation) {
        const distance = this.calculateDistance(lastLocation, location);
        const timeDiff = timestamp - userSessions[userSessions.length - 1].timestamp;

        // Check for impossible travel (too far, too fast)
        if (distance > this.config.maxDistanceKm && timeDiff < 4 * 60 * 60 * 1000) {
          // 4 hours
          riskScore += RISK_LEVELS.MEDIUM.score;
          alerts.push({
            type: SECURITY_EVENTS.GEOGRAPHIC_ANOMALY,
            severity: 'MEDIUM',
            message: `Possible impossible travel: ${distance}km in ${Math.round(timeDiff / (60 * 1000))} minutes`,
            recommendations: ['Verify user identity', 'Force 2FA', 'Monitor closely'],
          });
        }
      }
    }

    // User agent change detection
    const recentSessions = this.getRecentEvents(userSessions, 24 * 60 * 60 * 1000); // 24 hours
    const userAgents = new Set(recentSessions.map(s => s.userAgent));
    if (userAgents.size > 3) {
      riskScore += RISK_LEVELS.LOW.score;
      alerts.push({
        type: SECURITY_EVENTS.USER_AGENT_CHANGE,
        severity: 'LOW',
        message: `Multiple user agents detected for user ${userId}`,
        recommendations: ['Monitor user activity', 'Consider additional verification'],
      });
    }

    // Store current session info
    userActivity.sessions = userActivity.sessions || [];
    userActivity.sessions.push({
      ip,
      userAgent,
      location,
      timestamp,
      sessionId: Math.random().toString(36).substring(7),
    });

    // Keep only recent sessions
    userActivity.sessions = this.getRecentEvents(userActivity.sessions, 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.logSecurityEvent({
      type: SECURITY_EVENTS.AUTH_SUCCESS,
      userId,
      ip,
      userAgent,
      email,
      riskScore,
      alerts,
      metadata: {
        location,
        userAgentCount: userAgents.size,
      },
    });

    return { riskScore, alerts };
  }

  /**
   * Track rapid requests
   */
  async trackRapidRequests(data) {
    const { ip, userId, requestCount, timeWindow, userAgent, paths } = data;
    const timestamp = Date.now();

    let riskScore = 0;
    const alerts = [];

    // Check thresholds
    if (requestCount > this.config.rapidRequestThreshold) {
      riskScore += RISK_LEVELS.HIGH.score;
      alerts.push({
        type: SECURITY_EVENTS.RAPID_REQUESTS,
        severity: 'HIGH',
        message: `${requestCount} requests in ${timeWindow}ms from ${ip}`,
        recommendations: ['Apply rate limiting', 'Block suspicious IP', 'Monitor for DDoS'],
      });
    } else if (requestCount > this.config.maxRequestsPerMinute) {
      riskScore += RISK_LEVELS.MEDIUM.score;
      alerts.push({
        type: SECURITY_EVENTS.RAPID_REQUESTS,
        severity: 'MEDIUM',
        message: `High request rate: ${requestCount} requests from ${ip}`,
        recommendations: ['Monitor closely', 'Consider rate limiting'],
      });
    }

    await this.logSecurityEvent({
      type: SECURITY_EVENTS.RAPID_REQUESTS,
      ip,
      userId,
      userAgent,
      riskScore,
      alerts,
      metadata: {
        requestCount,
        timeWindow,
        paths: paths?.slice(0, 10), // Limit logged paths
      },
    });

    return { riskScore, alerts };
  }

  /**
   * Track bulk data access
   */
  async trackBulkDataAccess(data) {
    const { userId, ip, endpoint, recordCount, userAgent } = data;
    const timestamp = Date.now();

    let riskScore = 0;
    const alerts = [];

    if (recordCount > this.config.bulkDataThreshold) {
      riskScore += RISK_LEVELS.MEDIUM.score;
      alerts.push({
        type: SECURITY_EVENTS.BULK_DATA_EXPORT,
        severity: 'MEDIUM',
        message: `Bulk data access: ${recordCount} records from ${endpoint}`,
        recommendations: [
          'Verify legitimate business need',
          'Monitor for data exfiltration',
          'Log details',
        ],
      });
    }

    // Check if accessing sensitive endpoints
    if (this.config.sensitiveEndpoints.some(ep => endpoint.includes(ep))) {
      riskScore += RISK_LEVELS.LOW.score;
      alerts.push({
        type: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
        severity: 'LOW',
        message: `Sensitive endpoint accessed: ${endpoint}`,
        recommendations: ['Log access details', 'Monitor user behavior'],
      });
    }

    await this.logSecurityEvent({
      type: SECURITY_EVENTS.BULK_DATA_EXPORT,
      userId,
      ip,
      userAgent,
      riskScore,
      alerts,
      metadata: {
        endpoint,
        recordCount,
      },
    });

    return { riskScore, alerts };
  }

  /**
   * Update IP activity tracking
   */
  updateIPActivity(ip, event) {
    const activity = this.ipActivity.get(ip) || {
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      events: [],
      riskScore: 0,
    };

    activity.lastSeen = Date.now();
    activity.events.push(event);

    // Keep only recent events
    activity.events = this.getRecentEvents(activity.events, 24 * 60 * 60 * 1000); // 24 hours

    this.ipActivity.set(ip, activity);
  }

  /**
   * Update user activity tracking
   */
  updateUserActivity(userId, event) {
    const activity = this.userActivity.get(userId) || {
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      events: [],
      sessions: [],
      riskScore: 0,
    };

    activity.lastSeen = Date.now();
    activity.events.push(event);

    // Keep only recent events
    activity.events = this.getRecentEvents(activity.events, 7 * 24 * 60 * 60 * 1000); // 7 days

    this.userActivity.set(userId, activity);
  }

  /**
   * Log security event to database and logger
   */
  async logSecurityEvent(event) {
    try {
      // Log to Winston logger
      const logLevel = event.alerts?.some(a => a.severity === 'CRITICAL' || a.severity === 'HIGH')
        ? 'error'
        : 'warn';

      logger[logLevel]('Security event detected', {
        type: event.type,
        userId: event.userId,
        ip: event.ip,
        riskScore: event.riskScore,
        alertCount: event.alerts?.length || 0,
        alerts: event.alerts,
        metadata: event.metadata,
        timestamp: new Date().toISOString(),
        userAgent: event.userAgent?.substring(0, 200), // Truncate long user agents
      });

      // Store authentication events in the existing LoginActivityLog table
      if (event.type === 'AUTH_SUCCESS' || event.type === 'AUTH_FAILURE') {
        const systemPrisma = prismaService.getSystemClient();
        await systemPrisma.loginActivityLog
          .create({
            data: {
              userId: event.userId || null,
              organizationId: event.metadata?.organizationId || null,
              email: event.metadata?.email || null,
              loginType: event.type === 'AUTH_SUCCESS' ? 'success' : 'failure',
              ipAddress: event.ip?.substring(0, 45) || null, // IP addresses max 45 chars
              userAgent: event.userAgent?.substring(0, 500) || null,
              failureReason:
                event.type === 'AUTH_FAILURE' ? event.metadata?.reason || 'Unknown' : null,
              metadata: {
                riskScore: event.riskScore || 0,
                alerts: event.alerts || [],
                ...event.metadata,
              },
              timestamp: new Date(),
            },
          })
          .catch(error => {
            // If table doesn't exist yet, just log to Winston
            if (!error.message.includes('does not exist')) {
              logger.error('Failed to store login activity in database', {
                error: error.message,
                event: event.type,
              });
            }
          });
      }
    } catch (error) {
      logger.error('Error logging security event', {
        error: error.message,
        stack: error.stack,
        event: event.type,
      });
    }
  }

  /**
   * Get recent events within time window
   */
  getRecentEvents(events, windowMs) {
    const cutoff = Date.now() - windowMs;
    return events.filter(event => event.timestamp > cutoff);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2 || !coord1.lat || !coord1.lon || !coord2.lat || !coord2.lon) {
      return 0;
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lon - coord1.lon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coord1.lat)) *
        Math.cos(this.toRad(coord2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Convert degrees to radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get risk assessment for IP or user
   */
  getRiskAssessment(type, identifier) {
    const activity =
      type === 'ip' ? this.ipActivity.get(identifier) : this.userActivity.get(identifier);

    if (!activity) {
      return { level: 'LOW', score: 0, recommendations: [] };
    }

    const score = activity.riskScore || 0;
    let level = 'LOW';
    const recommendations = [];

    if (score >= RISK_LEVELS.CRITICAL.threshold) {
      level = 'CRITICAL';
      recommendations.push('Block immediately', 'Alert security team', 'Investigate thoroughly');
    } else if (score >= RISK_LEVELS.HIGH.threshold) {
      level = 'HIGH';
      recommendations.push(
        'Apply strict rate limiting',
        'Require additional authentication',
        'Monitor closely'
      );
    } else if (score >= RISK_LEVELS.MEDIUM.threshold) {
      level = 'MEDIUM';
      recommendations.push(
        'Monitor activity',
        'Consider additional verification',
        'Log all actions'
      );
    }

    return { level, score, recommendations, lastActivity: activity.lastSeen };
  }

  /**
   * Cleanup old tracking data
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Cleanup IP activity
    for (const [ip, activity] of this.ipActivity.entries()) {
      if (now - activity.lastSeen > maxAge) {
        this.ipActivity.delete(ip);
      }
    }

    // Cleanup user activity (keep longer for analysis)
    const userMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    for (const [userId, activity] of this.userActivity.entries()) {
      if (now - activity.lastSeen > userMaxAge) {
        this.userActivity.delete(userId);
      }
    }

    logger.debug('Security monitoring cleanup completed', {
      ipEntries: this.ipActivity.size,
      userEntries: this.userActivity.size,
    });
  }

  /**
   * Get security statistics
   */
  getStatistics() {
    return {
      tracking: {
        ipAddresses: this.ipActivity.size,
        users: this.userActivity.size,
      },
      activity: {
        highRiskIPs: Array.from(this.ipActivity.entries()).filter(
          ([ip, activity]) => activity.riskScore >= RISK_LEVELS.HIGH.score
        ).length,
        highRiskUsers: Array.from(this.userActivity.entries()).filter(
          ([userId, activity]) => activity.riskScore >= RISK_LEVELS.HIGH.score
        ).length,
      },
    };
  }
}

// Export singleton instance
const securityMonitoring = new SecurityMonitoringService();

module.exports = {
  securityMonitoring,
  SECURITY_EVENTS,
  RISK_LEVELS,
  SecurityMonitoringService,
};
