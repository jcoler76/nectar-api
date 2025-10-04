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

const authWithRLS = authMiddleware;

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
      '/api/mcp', // MCP server API with API key auth
      '/api/public/folders', // Public folder query API with folder API key auth
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
      /^\/api\/documentation\/openapi\//, // OpenAPI specs accessed from Swagger UI iframes
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
  app.get('/api/csrf-token', authWithRLS, getCSRFToken);

  // Endpoints route (must be before apiInfo to avoid conflict)
  app.use('/api/endpoints', authWithRLS, csrfProtection(csrfOptions), require('./endpoints'));

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
  app.use('/api/v1', authWithRLS, csrfProtection(csrfOptions), require('./v1'));

  // JWT protected routes (require login) with CSRF protection
  app.use('/api/users', authWithRLS, csrfProtection(csrfOptions), require('./users'));
  app.use(
    '/api/organizations',
    authWithRLS,
    csrfProtection(csrfOptions),
    require('./organizations')
  );
  app.use('/api/roles', authWithRLS, csrfProtection(csrfOptions), require('./roles'));
  // MCP routes use API key auth (not session), no CSRF needed
  app.use('/api/mcp', require('./mcp'));
  // Public folder query routes use folder API key auth (not session), no CSRF needed
  app.use('/api/public/folders', require('./publicFolders'));
  app.use('/api/applications', authWithRLS, csrfProtection(csrfOptions), require('./applications'));
  app.use('/api/services', authWithRLS, csrfProtection(csrfOptions), require('./services'));
  // Temporarily disabled during MongoDB to Prisma migration
  // TODO: Re-enable after implementing proper Prisma queries for schema intelligence
  // app.use(
  //   '/api/database-objects',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./databaseObjects')
  // );
  // Schema intelligence routes removed - replaced by blueprints/openapi system
  // app.use(
  //   '/api/ai-generation',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./aiGeneration')
  // );
  app.use('/api/connections', authWithRLS, csrfProtection(csrfOptions), require('./connections'));
  // Re-enabled after Prisma migration - endpoints route
  app.use(
    '/api/developer-endpoints',
    authWithRLS,
    csrfProtection(csrfOptions),
    require('./endpoints')
  );
  // Reports route - Updated for Prisma
  app.use('/api/reports', authWithRLS, csrfProtection(csrfOptions), require('./reports'));
  app.use('/api/dashboard', authWithRLS, csrfProtection(csrfOptions), require('./dashboard'));

  // Admin backend API endpoints (for admin-backend to consume)
  // No CSRF protection - these are server-to-server API calls, not browser requests
  app.use('/api/admin-backend', require('./adminBackend'));

  // File Storage & CDN (moved to comprehensive files route below)
  // Blueprint auto-CRUD (read/list) with policy group and CSRF
  const { applyPolicyGroup } = require('../middleware/policies');
  app.use(
    '/api/blueprints',
    applyPolicyGroup('blueprints'),
    csrfProtection(csrfOptions),
    require('./blueprints')
  );
  // SDK generation endpoints (auth required); build SDKs from OpenAPI
  app.use('/api/documentation/sdk', authWithRLS, csrfProtection(csrfOptions), require('./sdk'));

  // Swagger UI pages (Blueprints and role-based) - Mount on specific paths without auth
  app.use('/api/swagger-ui', require('./swaggerUi'));

  // API documentation & OpenAPI routes (enabled)
  // Note: Auth is handled within the documentation routes themselves
  app.use('/api/documentation', csrfProtection(csrfOptions), require('./documentation'));
  // Auto-REST OpenAPI (service-scoped)
  app.use(
    '/api/documentation/auto-rest',
    authWithRLS,
    csrfProtection(csrfOptions),
    require('./documentationAutoRest')
  );
  // Blueprints OpenAPI
  app.use(
    '/api/documentation/blueprints',
    authWithRLS,
    csrfProtection(csrfOptions),
    require('./documentationBlueprints')
  );
  // Re-enabled for BaaS analytics - imports/ai routes
  // TODO: Update imports route to use Prisma models instead of MongoDB models
  // app.use('/api/imports', authMiddleware, csrfProtection(csrfOptions), require('./imports'));
  app.use('/api/ai', authWithRLS, csrfProtection(csrfOptions), require('./ai'));
  // app.use(
  //   '/api/acceptance-criteria',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./acceptanceCriteria')
  // );
  // Re-enabled for SILO C - workflows route (needs MongoDB model updates)
  app.use('/api/workflows', authWithRLS, csrfProtection(csrfOptions), require('./workflows'));
  // Deprecated route removed during MongoDB to Prisma migration
  // Temporarily disabled during MongoDB to Prisma migration - ai-schema route
  // app.use(
  //   '/api/ai-schema',
  //   authMiddleware,
  //   csrfProtection(csrfOptions),
  //   require('./aiSchemaGeneration')
  // );
  // Admin rate limit management routes
  app.use(
    '/api/admin/rate-limits',
    authWithRLS,
    csrfProtection(csrfOptions),
    require('./rateLimitAdmin')
  );

  // SuperAdmin organization context switching routes
  app.use(
    '/api/super-admin',
    authWithRLS,
    csrfProtection(csrfOptions),
    require('./superAdminOrganizationContext')
  );

  // Debug routes (temporary for troubleshooting)
  // Commented out - debug.js file not found
  // if (process.env.NODE_ENV === 'development') {
  //   app.use('/api/debug', authWithRLS, require('./debug'));
  // }
  app.use(
    '/api/notifications',
    authWithRLS,
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
      return authWithRLS(req, res, () => csrfProtection(csrfOptions)(req, res, next));
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
      return authWithRLS(req, res, () => csrfProtection(csrfOptions)(req, res, next));
    },
    require('./terms')
  );

  // Freemium limits and usage tracking
  app.use(
    '/api/freemium',
    (req, res, next) => {
      // Public endpoints for plan information
      if (req.path === '/limits' && req.method === 'GET') {
        return next();
      }
      // All other endpoints require authentication
      return authWithRLS(req, res, next);
    },
    require('./freemium')
  );
  app.use('/api/usage', authWithRLS, csrfProtection(csrfOptions), require('./usage'));

  // Billing management routes (subscription portal, invoices, etc.)
  app.use('/api/billing', authWithRLS, csrfProtection(csrfOptions), require('./billing'));

  // Activity logs API (admin/monitor access)
  app.use(
    '/api/activity-logs',
    authWithRLS,
    csrfProtection(csrfOptions),
    require('./activityLogs')
  );

  // App usage tracking (no auth required for basic tracking)
  app.use('/api/tracking', apiLimiter, require('./tracking'));

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
        return authWithRLS(req, res, () => csrfProtection(csrfOptions)(req, res, next));
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

  // TODO: Re-enable after updating to use Prisma models instead of MongoDB models
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

  // TODO: Re-enable after updating to use Prisma models instead of MongoDB models
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

  // File Storage routes - Re-enabled with Prisma support
  app.use(
    '/api/files',
    (req, res, next) => {
      // Apply upload rate limiting for upload endpoints
      if (req.path.includes('/upload')) {
        return uploadLimiter(req, res, () => {
          // Apply CSRF only to non-public endpoints
          if (!req.path.includes('/public') && !req.path.includes('/trigger/')) {
            return authWithRLS(req, res, () => csrfProtection(csrfOptions)(req, res, next));
          }
          next();
        });
      }

      // Apply CSRF only to non-public endpoints
      if (!req.path.includes('/public') && !req.path.includes('/trigger/')) {
        return authWithRLS(req, res, () => csrfProtection(csrfOptions)(req, res, next));
      }
      next();
    },
    require('./fileStorage')
  );

  // Admin CRM endpoints for contact chatbot management
  app.use('/api/admin', authWithRLS, csrfProtection(csrfOptions), require('./adminContacts'));
  // Admin settings for security (header aliases) — self-service
  app.use('/api/admin', authWithRLS, csrfProtection(csrfOptions), require('./adminSettings'));

  // File Storage Folders
  app.use('/api/folders', authWithRLS, csrfProtection(csrfOptions), require('./folders'));

  console.log('✅ All routes mounted successfully');
};

module.exports = mountRoutes;
