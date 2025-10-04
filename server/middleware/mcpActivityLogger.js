/**
 * MCP Activity Logger - Lightweight, Non-Blocking Edition
 *
 * SAFETY: This logger is designed to NEVER interfere with request/response flow
 * - Logs AFTER response is sent (truly asynchronous)
 * - Never blocks the response
 * - Comprehensive error handling
 * - No database writes during request handling
 */

const { v4: uuidv4 } = require('uuid');
const prismaService = require('../services/prismaService');
const { logger } = require('../utils/logger');

class MCPActivityLogger {
  constructor() {
    this.logQueue = [];
    this.isProcessing = false;
    this.maxQueueSize = 1000; // Prevent memory overflow

    // Start background processor
    this.startProcessor();
  }

  /**
   * Middleware - Captures request/response data WITHOUT blocking
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const requestId = uuidv4();

      req.requestId = requestId;
      req.mcpStartTime = startTime;

      // Capture response data safely
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      let captured = false;
      let responseData = null;

      res.json = function (data) {
        if (!captured) {
          responseData = data;
          captured = true;
        }
        return originalJson(data);
      };

      res.send = function (data) {
        if (!captured) {
          responseData = data;
          captured = true;
        }
        return originalSend(data);
      };

      // CRITICAL: Use setImmediate to queue logging AFTER response is sent
      res.on('finish', () => {
        setImmediate(() => {
          this.queueLog({
            requestId,
            startTime,
            endTime: Date.now(),
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            userAgent: req.headers['user-agent'],
            ipAddress: this.extractClientIP(req),

            // MCP-specific fields
            serverId: req.params.serverId,
            toolName: req.params.toolName,
            parameters: req.body?.parameters,

            // User context (safe - already authenticated by mcpApiKeyAuth)
            organizationId: req.user?.organizationId,
            userId: req.user?.userId,
            applicationId: req.user?.application?.id,
            applicationName: req.user?.application?.name,

            // Response data
            responseData: this.sanitizeResponse(responseData),

            // Metadata
            metadata: {
              roleId: req.user?.role?.id,
              roleName: req.user?.role?.name,
              authType: req.user?.authType,
              isMCPAuth: req.user?.isMCPAuth,
            },
          });
        });
      });

      next();
    };
  }

  /**
   * Queue log entry for background processing
   */
  queueLog(logEntry) {
    // Prevent memory overflow
    if (this.logQueue.length >= this.maxQueueSize) {
      logger.warn('MCP activity log queue full, dropping oldest entries', {
        queueSize: this.logQueue.length,
      });
      this.logQueue = this.logQueue.slice(-this.maxQueueSize / 2);
    }

    this.logQueue.push(logEntry);
  }

  /**
   * Background processor - Batches writes to database
   */
  startProcessor() {
    setInterval(() => {
      if (!this.isProcessing && this.logQueue.length > 0) {
        this.processQueue();
      }
    }, 2000); // Process every 2 seconds
  }

  /**
   * Process queued logs in batches
   */
  async processQueue() {
    if (this.isProcessing || this.logQueue.length === 0) return;

    this.isProcessing = true;
    const batch = this.logQueue.splice(0, 50); // Process 50 at a time

    try {
      const prisma = prismaService.getClient();

      // Batch insert for performance
      const logEntries = batch
        .filter(entry => entry.organizationId) // CRITICAL: Skip if no org (prevents anonymous org creation)
        .map(entry => ({
          timestamp: new Date(entry.startTime),
          requestId: entry.requestId,
          method: entry.method,
          url: entry.url,
          endpoint: this.formatMCPEndpoint(entry),
          statusCode: entry.statusCode,
          responseTime: entry.endTime - entry.startTime,
          userAgent: entry.userAgent,
          ipAddress: entry.ipAddress,

          // User context
          userId: entry.userId || null,
          organizationId: entry.organizationId,

          // Classification
          category: 'mcp',
          endpointType: 'agent',
          importance: 'high',

          // Error tracking
          error: entry.statusCode >= 400 ? this.extractError(entry.responseData) : null,

          // MCP-specific metadata
          metadata: {
            mcpServer: entry.serverId,
            mcpTool: entry.toolName,
            mcpParameters: this.sanitizeParameters(entry.parameters),
            mcpResult: entry.responseData,
            applicationId: entry.applicationId,
            applicationName: entry.applicationName,
            executionTime: entry.endTime - entry.startTime,
            success: entry.statusCode < 400,
            ...entry.metadata,
          },
        }));

      if (logEntries.length > 0) {
        await prisma.apiActivityLog.createMany({
          data: logEntries,
          skipDuplicates: true,
        });

        logger.info('MCP activity logs saved', {
          count: logEntries.length,
          queueRemaining: this.logQueue.length,
        });
      }
    } catch (error) {
      // CRITICAL: Never let logging errors break the app
      logger.error('Failed to save MCP activity logs (non-fatal)', {
        error: error.message,
        batchSize: batch.length,
        queueSize: this.logQueue.length,
      });

      // Re-queue failed entries (with limit)
      if (this.logQueue.length < this.maxQueueSize / 2) {
        this.logQueue.unshift(...batch.slice(0, 10)); // Only re-queue first 10
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Format MCP endpoint for display
   */
  formatMCPEndpoint(entry) {
    if (entry.toolName) {
      return `MCP Tool: ${entry.toolName}`;
    }

    const path = entry.url.split('?')[0];
    if (path.includes('/discover')) return 'MCP Discovery';
    if (path.includes('/health')) return 'MCP Health Check';
    if (path.includes('/servers')) return 'MCP Server List';
    if (path.includes('/tools')) return 'MCP Tools List';

    return 'MCP Operation';
  }

  /**
   * Extract client IP
   */
  extractClientIP(req) {
    return (
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Sanitize response data
   */
  sanitizeResponse(data) {
    if (!data) return null;

    const str = typeof data === 'string' ? data : JSON.stringify(data);

    // Limit size
    if (str.length > 10000) {
      return {
        truncated: true,
        size: str.length,
        preview: str.substring(0, 1000) + '...',
      };
    }

    return data;
  }

  /**
   * Sanitize parameters
   */
  sanitizeParameters(params) {
    if (!params) return null;

    // Remove sensitive data patterns
    const sanitized = JSON.parse(JSON.stringify(params));

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey'];

    const sanitizeObj = obj => {
      if (typeof obj !== 'object' || obj === null) return obj;

      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObj(obj[key]);
        }
      }
      return obj;
    };

    return sanitizeObj(sanitized);
  }

  /**
   * Extract error message from response
   */
  extractError(responseData) {
    if (!responseData) return null;

    if (typeof responseData === 'object') {
      return responseData.message || responseData.error || 'Unknown error';
    }

    return String(responseData).substring(0, 500);
  }

  /**
   * Get queue status (for monitoring)
   */
  getStatus() {
    return {
      queueSize: this.logQueue.length,
      isProcessing: this.isProcessing,
      maxQueueSize: this.maxQueueSize,
    };
  }

  /**
   * Flush queue immediately (for shutdown)
   */
  async flush() {
    logger.info('Flushing MCP activity log queue', {
      queueSize: this.logQueue.length,
    });

    await this.processQueue();

    // Wait for any remaining items
    let retries = 0;
    while (this.logQueue.length > 0 && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.processQueue();
      retries++;
    }

    logger.info('MCP activity log queue flushed', {
      remaining: this.logQueue.length,
    });
  }
}

// Export singleton instance
module.exports = new MCPActivityLogger();
