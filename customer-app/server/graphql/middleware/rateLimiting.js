const depthLimit = require('graphql-depth-limit');
const { logger } = require('../../utils/logger');

// Simple in-memory rate limiting store
const rateLimitStore = new Map();

// GraphQL query complexity analyzer (built-in implementation)
const analyzeQueryComplexity = (query, variables = {}) => {
  let complexity = 0;
  let depth = 0;

  // Simple complexity calculation based on query structure
  const queryStr = typeof query === 'string' ? query : query.source?.body || '';

  // Count fields and nested structures
  const fieldMatches = queryStr.match(/\w+\s*\{/g) || [];
  complexity += fieldMatches.length;

  // Count depth by matching nested braces
  let currentDepth = 0;
  let maxDepth = 0;

  for (const char of queryStr) {
    if (char === '{') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === '}') {
      currentDepth--;
    }
  }

  depth = maxDepth;

  // Add complexity for variables
  complexity += Object.keys(variables).length * 0.5;

  return { complexity, depth };
};

// Simple rate limiting implementation
const checkRateLimit = (identifier, maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitStore.has(identifier)) {
    rateLimitStore.set(identifier, []);
  }

  const requests = rateLimitStore.get(identifier);

  // Remove old requests outside the window
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);

  if (recentRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(identifier, recentRequests);

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to cleanup
    for (const [key, timestamps] of rateLimitStore.entries()) {
      const recent = timestamps.filter(ts => ts > windowStart);
      if (recent.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, recent);
      }
    }
  }

  return true;
};

// Rate limiting rule for GraphQL
const rateLimitRule = {
  requestDidStart() {
    return {
      willSendResponse(requestContext) {
        const context = requestContext.context;
        const identifier = context.user?.userId || context.req?.ip || 'anonymous';

        if (!checkRateLimit(identifier)) {
          logger.warn('GraphQL rate limit exceeded', {
            userId: context.user?.userId,
            ip: context.req?.ip,
            userAgent: context.req?.get('user-agent'),
          });

          throw new Error('Too many GraphQL requests, please try again later.');
        }
      },
    };
  },
};

// Query timeout middleware
const queryTimeoutRule = {
  requestDidStart() {
    return {
      willSendResponse(requestContext) {
        const { request, response } = requestContext;

        // Log slow queries
        if (response.http?.body && request.query) {
          const executionTime = Date.now() - (request.startTime || Date.now());

          if (executionTime > 5000) {
            // Log queries taking more than 5 seconds
            logger.warn('Slow GraphQL query detected', {
              query: request.query.substring(0, 200),
              executionTime,
              variables: Object.keys(request.variables || {}).length,
              userId: requestContext.context.user?.userId,
              ip: requestContext.context.req?.ip,
            });
          }
        }
      },
    };
  },
};

// Query complexity analysis middleware
const complexityAnalysisRule = {
  requestDidStart() {
    return {
      didResolveOperation(requestContext) {
        const { request, document } = requestContext;

        if (document && request.query) {
          try {
            const analysis = analyzeQueryComplexity(request.query, request.variables);

            // Set complexity limits
            const MAX_COMPLEXITY = 1000;
            const MAX_DEPTH = 15;

            if (analysis.complexity > MAX_COMPLEXITY) {
              logger.warn('GraphQL query complexity exceeded', {
                complexity: analysis.complexity,
                maxAllowed: MAX_COMPLEXITY,
                query: request.query.substring(0, 200),
                userId: requestContext.context.user?.userId,
                ip: requestContext.context.req?.ip,
              });

              throw new Error(
                `Query complexity of ${analysis.complexity} exceeds maximum allowed complexity of ${MAX_COMPLEXITY}`
              );
            }

            if (analysis.depth > MAX_DEPTH) {
              logger.warn('GraphQL query depth exceeded', {
                depth: analysis.depth,
                maxAllowed: MAX_DEPTH,
                query: request.query.substring(0, 200),
                userId: requestContext.context.user?.userId,
                ip: requestContext.context.req?.ip,
              });

              throw new Error(
                `Query depth of ${analysis.depth} exceeds maximum allowed depth of ${MAX_DEPTH}`
              );
            }

            // Log complex queries for monitoring
            if (analysis.complexity > 500 || analysis.depth > 10) {
              logger.info('Complex GraphQL query executed', {
                complexity: analysis.complexity,
                depth: analysis.depth,
                userId: requestContext.context.user?.userId,
                ip: requestContext.context.req?.ip,
              });
            }
          } catch (error) {
            if (error.message.includes('complexity') || error.message.includes('depth')) {
              throw error; // Re-throw validation errors
            }
            logger.error('GraphQL complexity analysis error:', error);
            // Don't block the query if analysis fails, but log the error
          }
        }
      },
    };
  },
};

// Introspection security
const introspectionSecurityRule = {
  requestDidStart() {
    return {
      didResolveOperation(requestContext) {
        const { request } = requestContext;

        // Check if this is an introspection query
        if (request.query && request.query.includes('__schema')) {
          const isProduction = process.env.NODE_ENV === 'production';
          const user = requestContext.context.user;

          // Block introspection in production for non-admin users
          if (isProduction && (!user || !user.isAdmin)) {
            logger.warn('Introspection query blocked in production', {
              userId: user?.userId,
              ip: requestContext.context.req?.ip,
              userAgent: requestContext.context.req?.get('user-agent'),
            });

            throw new Error('GraphQL introspection is disabled in production');
          }

          // Log introspection attempts
          logger.info('GraphQL introspection query', {
            userId: user?.userId,
            ip: requestContext.context.req?.ip,
            environment: process.env.NODE_ENV,
          });
        }
      },
    };
  },
};

// Query whitelist for production
const ALLOWED_OPERATIONS = new Set([
  'executeQuery',
  'getServiceSchema',
  'availableServices',
  'getUserProfile',
  'getApplications',
  'getConnections',
  'getWorkflows',
  'getRoles',
  'getEndpoints',
]);

const queryWhitelistRule = {
  requestDidStart() {
    return {
      didResolveOperation(requestContext) {
        const { document } = requestContext;

        if (process.env.NODE_ENV === 'production' && document) {
          const operations = [];

          // Extract operation names from the document
          document.definitions.forEach(definition => {
            if (definition.kind === 'OperationDefinition') {
              definition.selectionSet.selections.forEach(selection => {
                if (selection.name) {
                  operations.push(selection.name.value);
                }
              });
            }
          });

          // Check if all operations are allowed
          const unauthorizedOps = operations.filter(op => !ALLOWED_OPERATIONS.has(op));

          if (unauthorizedOps.length > 0) {
            logger.warn('Unauthorized GraphQL operations blocked', {
              operations: unauthorizedOps,
              userId: requestContext.context.user?.userId,
              ip: requestContext.context.req?.ip,
            });

            throw new Error(`Unauthorized operations: ${unauthorizedOps.join(', ')}`);
          }
        }
      },
    };
  },
};

// Input validation rule
const inputValidationRule = {
  requestDidStart() {
    return {
      didResolveOperation(requestContext) {
        const { request } = requestContext;

        if (request.variables) {
          try {
            // Validate variable values
            for (const [key, value] of Object.entries(request.variables)) {
              if (typeof value === 'string') {
                // Check for potential injection attempts
                if (value.length > 10000) {
                  throw new Error(`Variable ${key} exceeds maximum length`);
                }

                // Check for suspicious patterns
                const suspiciousPatterns = [
                  /<script[^>]*>/i,
                  /javascript:/i,
                  /vbscript:/i,
                  /\$where/i,
                  /function\s*\(/i,
                  /eval\s*\(/i,
                ];

                for (const pattern of suspiciousPatterns) {
                  if (pattern.test(value)) {
                    logger.warn('Suspicious GraphQL variable detected', {
                      variable: key,
                      pattern: pattern.toString(),
                      userId: requestContext.context.user?.userId,
                      ip: requestContext.context.req?.ip,
                    });

                    throw new Error(`Variable ${key} contains invalid content`);
                  }
                }
              }
            }
          } catch (error) {
            logger.error('GraphQL input validation error:', error);
            throw error;
          }
        }
      },
    };
  },
};

const graphqlRateLimiting = {
  // Basic depth limit
  depthLimit: depthLimit(15),

  // Rate limiting rule
  rateLimitRule,

  // Query analysis and security plugins
  plugins: [
    queryTimeoutRule,
    complexityAnalysisRule,
    introspectionSecurityRule,
    inputValidationRule,
  ],

  // Production-specific rules
  productionPlugins: [queryWhitelistRule],

  // Get all applicable rules based on environment
  getAllRules() {
    const rules = [this.depthLimit];

    if (process.env.NODE_ENV === 'production') {
      return [...rules, ...this.productionPlugins];
    }

    return rules;
  },

  // Get all plugins
  getAllPlugins() {
    let plugins = [...this.plugins];

    if (process.env.NODE_ENV === 'production') {
      plugins = [...plugins, ...this.productionPlugins];
    }

    return plugins;
  },
};

module.exports = graphqlRateLimiting;
