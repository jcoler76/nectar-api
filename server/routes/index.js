/**
 * Route Mounting Configuration
 * Consolidates all route mounting logic with appropriate middleware
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { csrfProtection, getCSRFToken } = require('../middleware/csrf');
const {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  graphqlLimiter,
} = require('../middleware/dynamicRateLimiter');

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
      '/api/auth/oauth', // OAuth callbacks
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

  // Marketing billing routes moved to marketing-site/backend
  // Marketing billing (public): Stripe checkout + webhook
  // No auth or CSRF; webhook uses signature verification
  // app.use('/api/checkout', (req, res, next) => next(), require('./marketingBilling'));

  // Public routes (no auth required) - apply stricter rate limiting
  app.use('/api/auth', authLimiter, require('./auth'));

  // Public contact chatbot (no auth, rate limited, no CSRF)
  app.use('/api/contact-chat', apiLimiter, require('./contactChat'));

  // Versioned API routes (v1)
  app.use('/api/v1', authMiddleware, csrfProtection(csrfOptions), require('./v1'));

  // JWT protected routes (require login) with CSRF protection
  app.use('/api/users', authMiddleware, csrfProtection(csrfOptions), require('./users'));
  app.use(
    '/api/organizations',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./organizations')
  );
  app.use('/api/roles', authMiddleware, csrfProtection(csrfOptions), require('./roles'));
  app.use(
    '/api/applications',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./applications')
  );
  app.use('/api/services', authMiddleware, csrfProtection(csrfOptions), require('./services'));
  // Temporarily disabled during MongoDB to Prisma migration
  // TODO: Re-enable after implementing proper Prisma queries for schema intelligence
  // app.use(
  //   '/api/database-objects',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./databaseObjects')
  // );
  // app.use(
  //   '/api/schema-intelligence',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./schemaIntelligence')
  // );
  // app.use(
  //   '/api/ai-generation',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./aiGeneration')
  // );
  app.use(
    '/api/connections',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./connections')
  );
  // Re-enabled after Prisma migration - endpoints route
  app.use(
    '/api/developer-endpoints',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./endpoints')
  );
  // Reports route - Updated for Prisma
  app.use('/api/reports', authMiddleware, csrfProtection(csrfOptions), require('./reports'));
  app.use('/api/dashboard', authMiddleware, csrfProtection(csrfOptions), require('./dashboard'));
  // Blueprint auto-CRUD (read/list) with policy group and CSRF
  const { applyPolicyGroup } = require('../middleware/policies');
  app.use(
    '/api/blueprints',
    applyPolicyGroup('blueprints'),
    csrfProtection(csrfOptions),
    require('./blueprints')
  );
  // SDK generation endpoints (auth required); build SDKs from OpenAPI
  app.use('/api/documentation/sdk', authMiddleware, csrfProtection(csrfOptions), require('./sdk'));
  // API documentation & OpenAPI routes (enabled)
  app.use(
    '/api/documentation',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./documentation')
  );
  // Auto-REST OpenAPI (service-scoped)
  app.use(
    '/api/documentation/auto-rest',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./documentationAutoRest')
  );
  // Blueprints OpenAPI
  app.use(
    '/api/documentation/blueprints',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./documentationBlueprints')
  );
  // Swagger UI pages (Blueprints and role-based)
  app.use(
    '/api/documentation',
    authMiddleware,
    csrfProtection(csrfOptions),
    require('./swaggerUi')
  );
  // Temporarily disabled during MongoDB to Prisma migration - imports/ai routes
  // app.use('/api/imports', authMiddleware, csrfProtection(csrfOptions), require('./imports'));
  // app.use('/api/ai', authMiddleware, csrfProtection(csrfOptions), require('./ai'));
  // app.use(
  //   '/api/acceptance-criteria',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./acceptanceCriteria')
  // );
  // Re-enabled for SILO C - workflows route (needs MongoDB model updates)
  app.use('/api/workflows', authMiddleware, csrfProtection(csrfOptions), require('./workflows'));
  // Temporarily disabled during MongoDB to Prisma migration - template20Sync route
  // app.use(
  //   '/api/template20-sync',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./template20Sync')
  // );
  // Temporarily disabled during MongoDB to Prisma migration - ai-schema route
  // app.use(
  //   '/api/ai-schema',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./aiSchemaGeneration')
  // );
  // Temporarily disabled during MongoDB to Prisma migration - schema-selection route
  // app.use(
  //   '/api/schema-selection',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./schemaSelection')
  // );
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

  // User invitation system (with conditional auth for public endpoints)
  app.use(
    '/api/invitations',
    (req, res, next) => {
      // Public endpoints for invitation validation and acceptance
      if (req.path.match(/^\/validate\//) || req.path === '/accept') {
        return next();
      }
      // All other endpoints require authentication
      return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
    },
    require('./invitations')
  );

  // Terms and Conditions management
  app.use(
    '/api/terms',
    (req, res, next) => {
      // Public endpoint for fetching current terms
      if (req.path === '/current' && req.method === 'GET') {
        return next();
      }
      // All other endpoints require authentication
      return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
    },
    require('./terms')
  );

  // Freemium limits and usage tracking
  app.use('/api/freemium', require('./freemium'));

  // Activity logs API (admin/monitor access)
  app.use('/api/activity-logs', require('./activityLogs'));

  // GitHub Issue Poller API (development only)
  app.use('/api/issue-poller', require('./issue-poller'));

  // Re-enabled after Prisma migration - developer route for endpoint execution
  app.use('/api/developer', require('./developer'));

  // Temporarily disabled during MongoDB to Prisma migration - developerIntelligence route
  // app.use(
  //   '/api/developer-intelligence',
  //   process.env.NODE_ENV === 'production' ? authMiddleware : (req, res, next) => next(),
  //   process.env.NODE_ENV === 'production'
  //     ? csrfProtection(csrfOptions)
  //     : (req, res, next) => next(),
  //   require('./developerIntelligence')
  // );

  // API key protected routes (no CSRF needed - uses API key auth)
  app.use('/api/v1', require('./api'));
  app.use('/api/v2', require('./publicApi'));
  // Auto-generated REST for external databases (API-key auth)
  app.use('/api/v2', require('./autoRest'));

  // Re-enabled for SILO C - webhooks route (MongoDB dependencies fixed)
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

  // Temporarily disabled during MongoDB to Prisma migration - Jira webhook routes
  // app.use('/api/webhooks/jira', require('./jiraWebhook')); // Original static route

  // // Dynamic Jira webhook with conditional auth
  // app.use(
  //   '/api/webhooks/jira/dynamic',
  //   (req, res, next) => {
  //     // Webhook receiver endpoints use signature verification (no auth needed)
  //     if (req.method === 'POST' && (req.path === '/' || req.path.includes('/test/'))) {
  //       return next();
  //     }
  //     // Management endpoints require authentication and CSRF protection
  //     if (req.path.includes('/automations')) {
  //       return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
  //     }
  //     next();
  //   },
  //   require('./jiraWebhookDynamic')
  // );

  // Temporarily disabled during MongoDB to Prisma migration - forms route
  // app.use(
  //   '/api/forms',
  //   (req, res, next) => {
  //     // Apply CSRF only to non-public endpoints
  //     if (!req.path.includes('/public') && !req.path.includes('/trigger/')) {
  //       return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
  //     }
  //     next();
  //   },
  //   require('./forms')
  // );

  // Temporarily disabled during MongoDB to Prisma migration - email route
  // app.use(
  //   '/api/email',
  //   (req, res, next) => {
  //     // Apply CSRF only to non-trigger endpoints
  //     if (!req.path.includes('/trigger/')) {
  //       return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
  //     }
  //     next();
  //   },
  //   require('./email')
  // );

  // Temporarily disabled during MongoDB to Prisma migration - files route
  // app.use(
  //   '/api/files',
  //   (req, res, next) => {
  //     // Apply upload rate limiting for upload endpoints
  //     if (req.path.includes('/upload')) {
  //       return uploadLimiter(req, res, () => {
  //         // Apply CSRF only to non-public endpoints
  //         if (!req.path.includes('/public') && !req.path.includes('/trigger/')) {
  //           return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
  //         }
  //         next();
  //       });
  //     }

  //     // Apply CSRF only to non-public endpoints
  //     if (!req.path.includes('/public') && !req.path.includes('/trigger/')) {
  //       return authMiddleware(req, res, () => csrfProtection(csrfOptions)(req, res, next));
  //     }
  //     next();
  //   },
  //   require('./files')
  // );

  // Admin CRM endpoints for contact chatbot management
  app.use('/api/admin', authMiddleware, csrfProtection(csrfOptions), require('./adminContacts'));
  // Admin settings for security (header aliases) — self-service
  app.use('/api/admin', authMiddleware, csrfProtection(csrfOptions), require('./adminSettings'));

  console.log('✅ All routes mounted successfully');
};

module.exports = mountRoutes;
