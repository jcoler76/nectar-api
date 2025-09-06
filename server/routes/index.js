/**
 * Route Mounting Configuration
 * Consolidates all route mounting logic with appropriate middleware
 */

const { authMiddleware } = require('../middleware/auth');
const { csrfProtection, getCSRFToken } = require('../middleware/csrf');
const { authLimiter, uploadLimiter, graphqlLimiter } = require('../middleware/dynamicRateLimiter');

/**
 * Mount all application routes with appropriate middleware
 * @param {Express} app - Express application instance
 */
const mountRoutes = app => {
  // CSRF options configuration
  const csrfOptions = {
    excludePaths: [
      '/api/auth/login', // Login needs to work without CSRF
      '/api/auth/register', // Registration needs to work without CSRF
      '/api/auth/refresh', // Token refresh
      '/api/v1', // Public API with API key auth
      '/api/v2', // Public API with API key auth
      '/api/webhooks/trigger', // Webhook triggers use signature validation
      '/api/forms/public', // Public form submission
      '/api/email/trigger', // Email triggers use signature validation
      '/api/files/upload/public', // Public file uploads with token
      '/api/workflows/test-http-request', //workflow test
      // Specific schema endpoints that need to work reliably
      '/refresh-schema', // Schema refresh operations across all services
      '/databases/refresh', // Database refresh operations
    ],
    // Add support for path pattern matching
    excludePatterns: [
      /\/refresh-schema$/, // Any refresh-schema endpoint
      /\/databases\/refresh$/, // Any database refresh endpoint
      /\/refresh-databases$/, // Any refresh-databases endpoint
      /\/test$/, // Any connection test endpoint
    ],
  };

  // Health check endpoint (no auth required for monitoring)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // CSRF token endpoint (must be before CSRF protection middleware)
  app.get('/api/csrf-token', authMiddleware, getCSRFToken);

  // API information endpoints (no auth required for basic info)
  app.use('/api', require('./apiInfo'));

  // Public routes (no auth required) - apply stricter rate limiting
  app.use('/api/auth', authLimiter, require('./auth'));

  // Versioned API routes (v1)
  app.use('/api/v1', authMiddleware, csrfProtection(csrfOptions), require('./v1'));

  // JWT protected routes (require login) with CSRF protection
  app.use('/api/users', authMiddleware, csrfProtection(csrfOptions), require('./users'));
  app.use('/api/roles', authMiddleware, csrfProtection(csrfOptions), require('./roles'));
  app.use(
    '/api/applications',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./applications')
  );
  app.use('/api/services', authMiddleware, csrfProtection(csrfOptions), require('./services'));
  app.use(
    '/api/database-objects',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./databaseObjects')
  );
  app.use(
    '/api/schema-intelligence',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./schemaIntelligence')
  );
  app.use(
    '/api/ai-generation',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./aiGeneration')
  );
  app.use(
    '/api/connections',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./connections')
  );
  app.use(
    '/api/developer-endpoints',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./endpoints')
  );
  app.use('/api/reports', authMiddleware, csrfProtection(csrfOptions), require('./reports'));
  app.use('/api/dashboard', authMiddleware, csrfProtection(csrfOptions), require('./dashboard'));
  app.use(
    '/api/documentation',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./documentation')
  );
  app.use('/api/imports', authMiddleware, csrfProtection(csrfOptions), require('./imports'));
  app.use('/api/ai', authMiddleware, csrfProtection(csrfOptions), require('./ai'));
  app.use(
    '/api/acceptance-criteria',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./acceptanceCriteria')
  );
  app.use('/api/workflows', authMiddleware, csrfProtection(csrfOptions), require('./workflows'));
  app.use(
    '/api/template20-sync',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./template20Sync')
  );
  app.use(
    '/api/ai-schema',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./aiSchemaGeneration')
  );
  app.use(
    '/api/schema-selection',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./schemaSelection')
  );
  app.use('/api/queue', authMiddleware, csrfProtection(csrfOptions), require('./queue'));
  app.use(
    '/api/rate-limits',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./rateLimitManagement')
  );

  // Admin rate limit management routes
  app.use(
    '/api/admin/rate-limits',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./rateLimitAdmin')
  );
  app.use(
    '/api/notifications',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./notifications')
  );

  // Activity logs API (admin/monitor access)
  app.use('/api/activity-logs', require('./activityLogs'));

  // GitHub Issue Poller API (development only)
  app.use('/api/issue-poller', require('./issue-poller'));

  // Developer specific routes - CSRF protection for authenticated endpoints
  app.use('/api/developer', require('./developer'));

  // Developer Intelligence API routes (auth required for production, optional for development)
  app.use(
    '/api/developer-intelligence',
    process.env.NODE_ENV === 'production' ? authMiddleware : (req, res, next) => next(),
    process.env.NODE_ENV === 'production'
      ? csrfProtection(csrfOptions)
      : (req, res, next) => next(),
    require('./developerIntelligence')
  );

  // API key protected routes (no CSRF needed - uses API key auth)
  app.use('/api/v1', require('./api'));
  app.use('/api/v2', require('./publicApi'));

  // Webhook routes - CSRF protection for management endpoints, exclude trigger endpoints
  app.use(
    '/api/webhooks',
    (req, res, next) => {
      // Apply CSRF only to non-trigger endpoints
      if (!req.path.includes('/trigger/')) {
        return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
      }
      next();
    },
    require('./webhooks')
  );

  // Jira webhook routes - webhook endpoints use signature verification, management uses auth
  app.use('/api/webhooks/jira', require('./jiraWebhook')); // Original static route

  // Dynamic Jira webhook with conditional auth
  app.use(
    '/api/webhooks/jira/dynamic',
    (req, res, next) => {
      // Webhook receiver endpoints use signature verification (no auth needed)
      if (req.method === 'POST' && (req.path === '/' || req.path.includes('/test/'))) {
        return next();
      }
      // Management endpoints require authentication and CSRF protection
      if (req.path.includes('/automations')) {
        return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
      }
      next();
    },
    require('./jiraWebhookDynamic')
  );

  // Form routes - CSRF protection for management endpoints, exclude public submission
  app.use(
    '/api/forms',
    (req, res, next) => {
      // Apply CSRF only to non-public endpoints
      if (!req.path.includes('/public') && !req.path.includes('/trigger/')) {
        return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
      }
      next();
    },
    require('./forms')
  );

  // Email routes - CSRF protection for management endpoints, exclude trigger endpoints
  app.use(
    '/api/email',
    (req, res, next) => {
      // Apply CSRF only to non-trigger endpoints
      if (!req.path.includes('/trigger/')) {
        return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
      }
      next();
    },
    require('./email')
  );

  // File routes - CSRF protection for management endpoints, exclude public uploads
  app.use(
    '/api/files',
    (req, res, next) => {
      // Apply upload rate limiting for upload endpoints
      if (req.path.includes('/upload')) {
        return uploadLimiter(req, res, () => {
          // Apply CSRF only to non-public endpoints
          if (!req.path.includes('/public') && !req.path.includes('/trigger/')) {
            return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
          }
          next();
        });
      }

      // Apply CSRF only to non-public endpoints
      if (!req.path.includes('/public') && !req.path.includes('/trigger/')) {
        return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
      }
      next();
    },
    require('./files')
  );

  console.log('✅ All routes mounted successfully');
};

module.exports = mountRoutes;
