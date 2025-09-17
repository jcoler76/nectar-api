const PromptSecurityService = require('../services/promptSecurityService');
const rateLimit = require('express-rate-limit');
const { logger } = require('./logger');

/**
 * AI Security Middleware
 * Protects AI endpoints from prompt injection and abuse
 */
class AISecurityMiddleware {
  constructor() {
    this.promptSecurity = new PromptSecurityService();
    this.aiRateLimiter = this.createAIRateLimit();
  }

  /**
   * Create AI-specific rate limiter
   */
  createAIRateLimit() {
    return rateLimit({
      windowMs: parseInt(process.env.AI_RATE_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.AI_RATE_MAX_REQUESTS) || 50, // 50 requests per window
      message: {
        error: 'Too many AI requests',
        code: 'AI_RATE_LIMIT_EXCEEDED',
        retryAfter: 900, // seconds
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: req => {
        // Rate limit by user and organization for better granularity
        const userId = req.user?.id || req.ip;
        const orgId = req.user?.organizationId || 'anonymous';
        return `ai_${userId}_${orgId}`;
      },
      skip: req => {
        // Skip rate limiting for admin users in development
        return process.env.NODE_ENV === 'development' && req.user?.role === 'admin';
      },
    });
  }

  /**
   * Main AI security middleware function
   */
  middleware(options = {}) {
    const {
      context = 'GENERAL',
      enableRateLimit = true,
      enablePromptValidation = true,
      enableResponseValidation = true,
      blockThreats = true,
    } = options;

    return async (req, res, next) => {
      try {
        // 1. Apply rate limiting first
        if (enableRateLimit) {
          await new Promise((resolve, reject) => {
            this.aiRateLimiter(req, res, error => {
              if (error) reject(error);
              else resolve();
            });
          });
        }

        // 2. Extract and validate prompts from request
        if (enablePromptValidation) {
          const promptValidation = await this.validatePrompts(req, context, blockThreats);
          if (!promptValidation.isSecure && blockThreats) {
            return this.blockRequest(res, promptValidation);
          }

          // Store validation results for logging
          req.aiSecurity = {
            promptValidation,
            context,
            timestamp: new Date().toISOString(),
          };
        }

        // 3. Set up response validation if enabled
        if (enableResponseValidation) {
          this.setupResponseValidation(req, res, context);
        }

        // 4. Add security headers
        this.addSecurityHeaders(res);

        // 5. Log AI access
        this.logAIAccess(req);

        next();
      } catch (error) {
        logger.error('AI Security middleware error:', {
          error: error.message,
          path: req.path,
          method: req.method,
          userId: req.user?.id,
          organizationId: req.user?.organizationId,
        });

        return res.status(500).json({
          error: 'AI security validation failed',
          code: 'AI_SECURITY_ERROR',
        });
      }
    };
  }

  /**
   * Validate prompts in request body
   */
  async validatePrompts(req, context, blockThreats) {
    const prompts = this.extractPrompts(req);
    const validationResults = [];
    let overallSecure = true;
    let highestSeverity = 'LOW';

    for (const promptData of prompts) {
      const analysis = this.promptSecurity.analyzePrompt(promptData.content, context);

      if (!analysis.isSecure) {
        overallSecure = false;

        // Track highest severity
        const severityLevels = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        for (const threat of analysis.threats) {
          if (severityLevels[threat.severity] > severityLevels[highestSeverity]) {
            highestSeverity = threat.severity;
          }
        }

        // Apply sanitization to request if not blocking
        if (!blockThreats && analysis.sanitizedPrompt) {
          this.applySanitization(req, promptData.path, analysis.sanitizedPrompt);
        }
      }

      validationResults.push({
        field: promptData.field,
        path: promptData.path,
        originalLength: promptData.content.length,
        analysis: analysis,
      });
    }

    return {
      isSecure: overallSecure,
      highestSeverity,
      totalPrompts: prompts.length,
      threatsFound: validationResults.filter(r => !r.analysis.isSecure).length,
      results: validationResults,
    };
  }

  /**
   * Extract prompts from request body
   */
  extractPrompts(req) {
    const prompts = [];
    const body = req.body || {};

    // Common prompt field names
    const promptFields = [
      'prompt',
      'message',
      'query',
      'question',
      'input',
      'content',
      'text',
      'userPrompt',
      'systemPrompt',
      'instruction',
      'businessQuestion',
    ];

    // Extract direct prompt fields
    for (const field of promptFields) {
      if (body[field] && typeof body[field] === 'string') {
        prompts.push({
          field: field,
          path: field,
          content: body[field],
        });
      }
    }

    // Extract nested prompts (e.g., messages array for chat)
    if (Array.isArray(body.messages)) {
      body.messages.forEach((msg, index) => {
        if (msg.content && typeof msg.content === 'string') {
          prompts.push({
            field: 'messages',
            path: `messages[${index}].content`,
            content: msg.content,
          });
        }
      });
    }

    // Extract prompts from workflow configs
    if (body.config && body.config.prompt) {
      prompts.push({
        field: 'config.prompt',
        path: 'config.prompt',
        content: body.config.prompt,
      });
    }

    return prompts;
  }

  /**
   * Apply sanitization to request body
   */
  applySanitization(req, path, sanitizedContent) {
    const pathParts = path.split('.');
    let current = req.body;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];

      // Handle array notation like messages[0]
      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        current = current[arrayMatch[1]][parseInt(arrayMatch[2])];
      } else {
        current = current[part];
      }
    }

    const finalKey = pathParts[pathParts.length - 1];
    current[finalKey] = sanitizedContent;
  }

  /**
   * Block request with detailed security information
   */
  blockRequest(res, validation) {
    const highestSeverityThreats = validation.results
      .filter(r => !r.analysis.isSecure)
      .map(r => r.analysis.threats)
      .flat()
      .filter(t => t.severity === validation.highestSeverity);

    logger.warn('AI request blocked due to security threats:', {
      totalThreats: validation.threatsFound,
      highestSeverity: validation.highestSeverity,
      threatCategories: [...new Set(highestSeverityThreats.map(t => t.category))],
      timestamp: new Date().toISOString(),
    });

    return res.status(400).json({
      error: 'Request blocked by AI security filters',
      code: 'AI_SECURITY_THREAT_DETECTED',
      details: {
        severity: validation.highestSeverity,
        categories: [...new Set(highestSeverityThreats.map(t => t.category))],
        message:
          'Your request contains patterns that may be harmful or inappropriate for AI processing',
      },
    });
  }

  /**
   * Setup response validation
   */
  setupResponseValidation(req, res, context) {
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function (data) {
      if (typeof data === 'string' || (data && typeof data === 'object')) {
        const validatedData = this.validateAIResponse(data, req);
        return originalSend.call(this, validatedData);
      }
      return originalSend.call(this, data);
    }.bind(this);

    res.json = function (data) {
      if (data && typeof data === 'object') {
        const validatedData = this.validateAIResponse(data, req);
        return originalJson.call(this, validatedData);
      }
      return originalJson.call(this, data);
    }.bind(this);
  }

  /**
   * Validate AI response for sensitive data leakage
   */
  validateAIResponse(data, req) {
    try {
      const responseText = typeof data === 'string' ? data : JSON.stringify(data);
      const validation = this.promptSecurity.validateResponse(responseText);

      if (!validation.isSecure) {
        logger.warn('AI response contains sensitive data:', {
          path: req.path,
          userId: req.user?.id,
          organizationId: req.user?.organizationId,
          issues: validation.issues.map(i => ({ category: i.category, severity: i.severity })),
          timestamp: new Date().toISOString(),
        });

        // Return sanitized response
        if (typeof data === 'string') {
          return validation.sanitizedResponse;
        } else {
          try {
            return JSON.parse(validation.sanitizedResponse);
          } catch {
            // If JSON parsing fails, return safe error response
            return {
              error: 'Response sanitized due to security concerns',
              code: 'AI_RESPONSE_SANITIZED',
            };
          }
        }
      }

      return data;
    } catch (error) {
      logger.error('Error validating AI response:', error);
      return data; // Return original on validation error
    }
  }

  /**
   * Add AI-specific security headers
   */
  addSecurityHeaders(res) {
    res.setHeader('X-AI-Security-Enabled', 'true');
    res.setHeader('X-AI-Content-Filter', 'active');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // Add CSP for AI responses
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'none'; object-src 'none';"
    );
  }

  /**
   * Log AI access for security monitoring
   */
  logAIAccess(req) {
    logger.info('AI endpoint accessed:', {
      path: req.path,
      method: req.method,
      userId: req.user?.id || 'anonymous',
      organizationId: req.user?.organizationId || 'none',
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
      hasPromptThreats: req.aiSecurity?.promptValidation?.threatsFound > 0,
    });
  }

  /**
   * Create middleware for specific AI contexts
   */
  static forWorkflows(options = {}) {
    const middleware = new AISecurityMiddleware();
    return middleware.middleware({
      context: 'WORKFLOW',
      enableRateLimit: true,
      enablePromptValidation: true,
      enableResponseValidation: false, // Workflows handle their own response processing
      blockThreats: true,
      ...options,
    });
  }

  static forDocumentation(options = {}) {
    const middleware = new AISecurityMiddleware();
    return middleware.middleware({
      context: 'DOCUMENTATION',
      enableRateLimit: true,
      enablePromptValidation: true,
      enableResponseValidation: true,
      blockThreats: true,
      ...options,
    });
  }

  static forGeneral(options = {}) {
    const middleware = new AISecurityMiddleware();
    return middleware.middleware({
      context: 'GENERAL',
      enableRateLimit: true,
      enablePromptValidation: true,
      enableResponseValidation: true,
      blockThreats: true,
      ...options,
    });
  }

  /**
   * Get security statistics
   */
  getStatistics() {
    return this.promptSecurity.getStatistics();
  }
}

module.exports = AISecurityMiddleware;
