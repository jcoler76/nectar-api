const { v4: uuidv4 } = require('uuid');

// MongoDB models replaced with Prisma for PostgreSQL migration
// const ApiActivityLog = require('../models/ApiActivityLog');

const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
const { sanitizeObject } = require('../utils/logSanitizer');

const { logger } = require('./logger');

/**
 * Enhanced API Activity Logger Middleware
 * Captures comprehensive API activity including requests, responses, errors, and performance metrics
 */
class ActivityLogger {
  constructor() {
    this.maxBodySize = 10 * 1024; // 10KB max for request/response body logging
    this.sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    this.excludedEndpoints = ['/health', '/ping', '/favicon.ico'];
  }

  /**
   * Main middleware function
   */
  middleware() {
    return async (req, res, next) => {
      // Skip logging for excluded endpoints
      if (this.shouldSkipLogging(req.path)) {
        return next();
      }

      const startTime = Date.now();
      const requestId = uuidv4();

      // Attach request ID to request for correlation
      req.requestId = requestId;
      req.startTime = startTime;

      // Capture original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;

      let responseBody = null;
      let responseSize = 0;

      // Override response methods to capture response data
      res.send = function (body) {
        responseBody = body;
        responseSize = Buffer.byteLength(body || '', 'utf8');
        return originalSend.call(this, body);
      };

      res.json = function (body) {
        responseBody = body;
        responseSize = Buffer.byteLength(JSON.stringify(body || {}), 'utf8');
        return originalJson.call(this, body);
      };

      res.end = function (chunk, encoding) {
        if (chunk && !responseBody) {
          responseBody = chunk;
          responseSize = Buffer.byteLength(chunk || '', encoding || 'utf8');
        }
        return originalEnd.call(this, chunk, encoding);
      };

      // Handle response completion
      res.on('finish', async () => {
        await this.logActivity(req, res, responseBody, responseSize, startTime);
      });

      // Handle response errors
      res.on('error', async error => {
        await this.logActivity(req, res, null, 0, startTime, error);
      });

      next();
    };
  }

  /**
   * Log API activity to database
   */
  async logActivity(req, res, responseBody, responseSize, startTime, error = null) {
    try {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const success = !error && res.statusCode < 400;

      // Extract user context
      const userContext = this.extractUserContext(req);

      // Classify the endpoint using the full URL path
      const classification = this.classifyEndpoint(req.originalUrl || req.url, req.method);

      // Prepare sanitized request/response data
      const sanitizedRequestBody = this.sanitizeBody(req.body);
      const sanitizedResponseBody = this.sanitizeBody(responseBody);
      const sanitizedHeaders = this.sanitizeHeaders(req.headers);
      const sanitizedResponseHeaders = this.sanitizeHeaders(res.getHeaders());

      // Determine error details
      const errorDetails = this.extractErrorDetails(error, res, responseBody);

      // TODO: Replace with Prisma query for PostgreSQL migration
      // Create activity log entry using Prisma
      const activityLogData = {
        timestamp: new Date(startTime),
        requestId: req.requestId,

        // Request Details
        method: req.method,
        url: req.originalUrl || req.url,
        endpoint: this.getDisplayEndpoint(req),
        procedureName: this.extractProcedureName(req),
        normalizedEndpoint: this.normalizeEndpoint(req.route?.path || req.path),
        userAgent: req.headers['user-agent'],
        ipAddress: this.extractClientIP(req),

        // User Context
        ...userContext,

        // Classification
        category: classification.category,
        endpointType: classification.endpointType,
        importance: classification.importance,

        // Request/Response Data
        requestHeaders: sanitizedHeaders,
        requestBody: sanitizedRequestBody,
        requestSize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0,
        responseStatus: res.statusCode,
        responseHeaders: sanitizedResponseHeaders,
        responseBody: sanitizedResponseBody,
        responseSize,

        // Performance & Errors
        duration,
        success,
        ...errorDetails,

        // Workflow Context (if applicable)
        workflowId: req.workflowId || req.headers['x-workflow-id'],
        workflowRunId: req.workflowRunId || req.headers['x-workflow-run-id'],
        nodeType: req.nodeType || req.headers['x-workflow-node-type'],

        // Additional Context
        referer: req.headers.referer,
        sessionId: req.sessionID,
        correlationId:
          req.headers['x-workflow-correlation-id'] ||
          req.headers['x-correlation-id'] ||
          req.requestId,
        metadata: {
          query: req.query,
          params: req.params,
          protocol: req.protocol,
          secure: req.secure,
        },
      };

      // await prisma.apiActivityLog.create({ data: activityLogData });

      // Log errors for immediate attention
      if (!success) {
        logger.warn('API request failed', {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration,
          error: errorDetails.errorMessage,
          userEmail: userContext.userEmail,
        });
      }
    } catch (logError) {
      // Don't let logging errors break the application
      logger.error('Failed to log API activity', {
        error: logError.message,
        requestId: req.requestId,
        url: req.originalUrl,
      });
    }
  }

  /**
   * Extract user context from request
   */
  extractUserContext(req) {
    const context = {};

    if (req.user) {
      context.userId = req.user._id || req.user.id;
      context.userEmail = req.user.email;
      context.role = req.user.role;
    }

    if (req.application) {
      context.application = req.application.name || req.application.id;
    }

    return context;
  }

  /**
   * Classify endpoint type and category
   */
  classifyEndpoint(path, method) {
    // Extract just the path portion (remove query parameters)
    const cleanPath = path.split('?')[0];

    // Define classification rules with importance levels
    const rules = [
      { pattern: /^\/api\/auth/, category: 'auth', endpointType: 'client', importance: 'critical' },
      {
        pattern: /^\/api\/admin/,
        category: 'admin',
        endpointType: 'developer',
        importance: 'high',
      },
      {
        pattern: /^\/api\/workflows/,
        category: 'workflow',
        endpointType: 'client',
        importance: 'high',
      },
      { pattern: /^\/api\/public/, category: 'api', endpointType: 'public', importance: 'high' },
      {
        pattern: /^\/api\/v[0-9]+\/.*\/_proc/,
        category: 'api',
        endpointType: 'public',
        importance: 'critical',
      }, // Public API procedures
      { pattern: /^\/webhooks/, category: 'webhook', endpointType: 'public', importance: 'high' },
      { pattern: /^\/graphql/, category: 'api', endpointType: 'client', importance: 'medium' },
      { pattern: /^\/api\/reports/, category: 'api', endpointType: 'client', importance: 'low' },
      {
        pattern: /^\/api\/activity-logs/,
        category: 'api',
        endpointType: 'internal',
        importance: 'low',
      },
      {
        pattern: /^\/api\/notifications/,
        category: 'api',
        endpointType: 'internal',
        importance: 'low',
      },
      {
        pattern: /^\/api\/dashboard/,
        category: 'api',
        endpointType: 'internal',
        importance: 'low',
      },
      { pattern: /^\/api/, category: 'api', endpointType: 'client', importance: 'medium' },
    ];

    for (const rule of rules) {
      if (rule.pattern.test(cleanPath)) {
        return {
          category: rule.category,
          endpointType: rule.endpointType,
          importance: rule.importance,
        };
      }
    }

    return { category: 'api', endpointType: 'internal', importance: 'low' };
  }

  /**
   * Extract error details from error object or response
   */
  extractErrorDetails(error, res, responseBody) {
    if (!error && res.statusCode < 400) {
      return {};
    }

    const details = {};

    // Determine error type based on status code
    if (res.statusCode >= 400) {
      details.errorType = this.categorizeErrorByStatus(res.statusCode);
    }

    // Extract error message
    if (error) {
      details.errorMessage = error.message;
      details.errorStack = sanitizeObject(error.stack);
      details.errorCode = error.code;
    } else if (responseBody && typeof responseBody === 'object') {
      details.errorMessage = responseBody.message || responseBody.error || 'Unknown error';
      details.errorCode = responseBody.code;
    } else if (typeof responseBody === 'string') {
      details.errorMessage = responseBody.substring(0, 500); // Limit length
    }

    return details;
  }

  /**
   * Categorize error by HTTP status code
   */
  categorizeErrorByStatus(statusCode) {
    if (statusCode === 401 || statusCode === 403) return 'auth';
    if (statusCode === 400 || statusCode === 422) return 'validation';
    if (statusCode === 429) return 'rate_limit';
    if (statusCode === 404) return 'not_found';
    if (statusCode >= 500) return 'server';
    return 'client';
  }

  /**
   * Extract just the procedure name from the URL
   */
  extractProcedureName(req) {
    const path = req.originalUrl || req.url;
    if (!path) return null;

    // For Template20 procedure calls, extract the actual procedure name
    const procMatch = path.match(/\/([^\/]+)\/_proc\/([^\/\?]+)/);
    if (procMatch) {
      return procMatch[2]; // Return just the procedure name
    }

    return null;
  }

  /**
   * Get endpoint for display purposes (shows actual procedure names and workflow names)
   */
  getDisplayEndpoint(req) {
    const path = req.originalUrl || req.url;
    if (!path) return 'unknown';

    // For Template20 procedure calls, extract the actual procedure name
    const procMatch = path.match(/\/([^\/]+)\/_proc\/([^\/\?]+)/);
    if (procMatch) {
      const serviceName = procMatch[1];
      const procedureName = procMatch[2];
      return `${serviceName}: ${procedureName}`;
    }

    // For workflow executions, try to extract workflow name from request body or response
    const workflowMatch = path.match(/\/api\/workflows\/([0-9a-fA-F]{24})\/(execute|test)/);
    if (workflowMatch) {
      const workflowId = workflowMatch[1];
      const action = workflowMatch[2];

      // Try to get workflow name from response body or request context
      if (req.workflowName) {
        return `Workflow: ${req.workflowName} (${action})`;
      } else {
        return `Workflow: ${workflowId} (${action})`;
      }
    }

    // For workflow management endpoints
    if (path.includes('/api/workflows/')) {
      const workflowOpMatch = path.match(/\/api\/workflows\/([0-9a-fA-F]{24})(?:\/(.+))?/);
      if (workflowOpMatch) {
        const workflowId = workflowOpMatch[1];
        const operation = workflowOpMatch[2] || 'view';

        if (req.workflowName) {
          return `Workflow: ${req.workflowName} (${operation})`;
        } else {
          return `Workflow: ${workflowId} (${operation})`;
        }
      }
    }

    // For other endpoints, return the path with IDs normalized for readability
    return path
      .split('?')[0] // Remove query parameters
      .replace(/\/[0-9a-fA-F]{24}/g, '/:id') // MongoDB ObjectIds
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[0-9a-fA-F-]{36}/g, '/:uuid'); // UUIDs
  }

  /**
   * Normalize endpoint path for grouping
   */
  normalizeEndpoint(path) {
    if (!path) return 'unknown';

    // Replace IDs with placeholders for grouping
    return path
      .replace(/\/[0-9a-fA-F]{24}/g, '/:id') // MongoDB ObjectIds
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[0-9a-fA-F-]{36}/g, '/:uuid'); // UUIDs
  }

  /**
   * Extract client IP address
   */
  extractClientIP(req) {
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      'unknown'
    );
  }

  /**
   * Sanitize request/response body
   */
  sanitizeBody(body) {
    if (!body) return null;

    // Limit size to prevent large payloads
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    if (bodyString.length > this.maxBodySize) {
      return {
        truncated: true,
        size: bodyString.length,
        preview: bodyString.substring(0, this.maxBodySize) + '...',
      };
    }

    return sanitizeObject(body);
  }

  /**
   * Sanitize headers
   */
  sanitizeHeaders(headers) {
    if (!headers) return {};

    const sanitized = { ...headers };
    this.sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Check if endpoint should be excluded from logging
   */
  shouldSkipLogging(path) {
    return this.excludedEndpoints.some(excluded => path.startsWith(excluded));
  }
}

module.exports = new ActivityLogger();
