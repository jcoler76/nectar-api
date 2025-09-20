const path = require('path');
const envPath =
  process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, '.env.production')
    : path.resolve(__dirname, '.env');

require('dotenv').config({ path: envPath });

// Enable loading of TypeScript files at runtime
try {
  // Use transpileOnly to avoid type-check overhead in runtime
  require('ts-node').register({ transpileOnly: true });
} catch (e) {
  // ts-node not installed; TypeScript files will not be supported
}

// Validate environment variables on startup
const EnvironmentValidator = require('./utils/environmentValidator');
const envValidator = EnvironmentValidator.createDefaultValidator();
envValidator.validateAndExit();

// Override console methods in production to prevent sensitive data leakage
const { overrideConsole } = require('./utils/consoleOverride');
overrideConsole();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const { logger } = require('./middleware/logger');
const { consolidatedApiKeyMiddleware } = require('./middleware/consolidatedAuthMiddleware');
const {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  graphqlLimiter,
} = require('./middleware/dynamicRateLimiter');
const { apiVersioning, addVersionInfo } = require('./middleware/apiVersioning');
const authRoutes = require('./routes/auth');
const connectionsRoutes = require('./routes/connections');
const workflowsRoutes = require('./routes/workflows');
const webhooksRoutes = require('./routes/webhooks');
const formsRoutes = require('./routes/forms');
const emailRoutes = require('./routes/email');
const filesRoutes = require('./routes/files');
const { initializeScheduler } = require('./services/scheduler');
const { csrfProtection, getCSRFToken, generateCSRFTokenMiddleware } = require('./middleware/csrf');

// Trust proxy configuration - MUST be first, before any middleware
app.enable('trust proxy');
app.set('trust proxy', 1);

// Now import and configure middleware
const helmet = require('helmet');
const connectDB = require('./config/database');
const cookieParser = require('cookie-parser');
const { authMiddleware } = require('./middleware/auth');

// Add request logging middleware (development only)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.info(`${req.method} ${req.originalUrl}`);
  }

  // TEMPORARY: Log all API requests to debug missing logs
  if (req.originalUrl.includes('/api/')) {
    logger.info(`[DEBUG] ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
    // Also try console.error which might show up
    console.error(`[DEBUG-ERROR] ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  }
  next();
});

// Security middleware with comprehensive security headers
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Material-UI and React components
          'https://cdn.jsdelivr.net',
          'https://fonts.googleapis.com',
          'https://apollo-server-landing-page.cdn.apollographql.com',
        ],
        scriptSrc: [
          "'self'",
          // Remove 'unsafe-inline' for better XSS protection
          // "'unsafe-inline'", // Only allow if absolutely necessary
          'https://cdn.jsdelivr.net',
          'https://embeddable-sandbox.cdn.apollographql.com',
          'https://apollo-server-landing-page.cdn.apollographql.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https://cdn.jsdelivr.net',
          'https://apollographql.com',
          'https://apollo-server-landing-page.cdn.apollographql.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
        connectSrc: [
          "'self'",
          'https://studio.apollographql.com',
          'https://apollo-server-landing-page.cdn.apollographql.com',
        ],
        manifestSrc: ["'self'", 'https://apollo-server-landing-page.cdn.apollographql.com'],
        // Additional CSP directives for better security
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // Strict Transport Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Prevent clickjacking
    frameguard: {
      action: 'deny',
    },
    // Hide X-Powered-By header
    hidePoweredBy: true,
    // Prevent MIME type sniffing
    noSniff: true,
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false,
    },
    // IE No Open
    ieNoOpen: true,
    // XSS Filter (for legacy browsers)
    xssFilter: true,
    // Permissions Policy (replacing Feature Policy)
    permittedCrossDomainPolicies: false,
  })
);

// Additional security headers that Helmet doesn't provide
app.use((req, res, next) => {
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), ' +
      'microphone=(), ' +
      'geolocation=(), ' +
      'interest-cohort=(), ' +
      'payment=(), ' +
      'usb=(), ' +
      'sync-xhr=(), ' +
      'accelerometer=(), ' +
      'gyroscope=(), ' +
      'magnetometer=()'
  );

  // Cross-Origin headers
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Cache control for security
  if (req.url.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  next();
});

// CORS configuration
const corsOptions = require('./config/corsOptions');
app.use(cors(corsOptions));

// Add response logging middleware (production-safe)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    const originalSend = res.send;
    res.send = function (body) {
      logger.info(`Response status: ${res.statusCode}`);
      return originalSend.call(this, body);
    };
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// Initialize session service - this will be done in startServer function

// GraphQL Setup
const { createApolloServer, schema } = require('./graphql/schema');
const playgroundRouter = require('./routes/playground');
const { createServer } = require('http');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { execute, subscribe } = require('graphql');

// Mount playground route BEFORE GraphQL
app.use('/playground', playgroundRouter);

// Apply GraphQL-specific rate limiting
app.use('/graphql', graphqlLimiter);

// Initialize Apollo Server
const initializeGraphQL = async () => {
  try {
    const server = createApolloServer();
    await server.start();

    // Apply GraphQL middleware to Express
    server.applyMiddleware({
      app,
      path: '/graphql',
      cors: {
        origin: [
          'https://app.nectarstudio.ai',
          'http://app.nectarstudio.ai',
          'http://localhost:3000',
        ],
        credentials: true,
      },
    });

    logger.info(
      `GraphQL Server ready at http://localhost:${process.env.PORT || 3001}${server.graphqlPath}`
    );
    return server;
  } catch (error) {
    console.error('GraphQL initialization error:', error);
    throw error;
  }
};

// Add logging for MongoDB connection (without sensitive details)
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected successfully');
});

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', {
    message: err.message,
    code: err.code,
    name: err.name,
  });
});

// Public routes (no auth required) - apply stricter rate limiting
app.use('/api/auth', authLimiter, authRoutes);

// Apply general rate limiting to all other API routes
app.use('/api', apiLimiter);

// Add comprehensive activity logging middleware
const activityLogger = require('./middleware/activityLogger');
app.use('/api', activityLogger.middleware());

// Add performance monitoring middleware
const performanceMiddleware = require('./middleware/performanceMiddleware');
app.use('/api', performanceMiddleware);

// Apply API versioning to all API routes
app.use('/api', apiVersioning);
app.use('/api', addVersionInfo);

// CSRF token endpoint (must be before CSRF protection middleware)
app.get('/api/csrf-token', authMiddleware, getCSRFToken);

// API information endpoints (no auth required for basic info)
app.use('/api', require('./routes/apiInfo'));

// Apply CSRF protection to state-changing routes
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

// Versioned API routes (v1)
app.use('/api/v1', authMiddleware, csrfProtection(csrfOptions), require('./routes/v1'));

// JWT protected routes (require login) with CSRF protection
app.use('/api/users', authMiddleware, csrfProtection(csrfOptions), require('./routes/users'));
app.use('/api/roles', authMiddleware, csrfProtection(csrfOptions), require('./routes/roles'));
app.use(
  '/api/applications',
  authMiddleware,
  csrfProtection(csrfOptions),
  require('./routes/applications')
);
app.use('/api/services', authMiddleware, csrfProtection(csrfOptions), require('./routes/services'));
app.use(
  '/api/schema-intelligence',
  authMiddleware,
  csrfProtection(csrfOptions),
  require('./routes/schemaIntelligence')
);
app.use(
  '/api/ai-generation',
  authMiddleware,
  csrfProtection(csrfOptions),
  require('./routes/aiGeneration')
);
app.use('/api/connections', authMiddleware, csrfProtection(csrfOptions), connectionsRoutes);
app.use(
  '/api/developer-endpoints',
  authMiddleware,
  csrfProtection(csrfOptions),
  require('./routes/endpoints')
);
app.use('/api/reports', authMiddleware, csrfProtection(csrfOptions), require('./routes/reports'));
app.use(
  '/api/dashboard',
  authMiddleware,
  csrfProtection(csrfOptions),
  require('./routes/dashboard')
);
app.use(
  '/api/documentation',
  authMiddleware,
  csrfProtection(csrfOptions),
  require('./routes/documentation')
);
app.use('/api/imports', authMiddleware, csrfProtection(csrfOptions), require('./routes/imports'));
app.use('/api/ai', authMiddleware, csrfProtection(csrfOptions), require('./routes/ai'));
app.use('/api/workflows', authMiddleware, csrfProtection(csrfOptions), workflowsRoutes);
app.use(
  '/api/schema-selection',
  authMiddleware,
  csrfProtection(csrfOptions),
  require('./routes/schemaSelection')
);
app.use('/api/queue', authMiddleware, csrfProtection(csrfOptions), require('./routes/queue'));
app.use(
  '/api/rate-limits',
  authMiddleware,
  csrfProtection(csrfOptions),
  require('./routes/rateLimitManagement')
);
// Admin rate limit management routes
app.use(
  '/api/admin/rate-limits',
  authMiddleware,
  csrfProtection(csrfOptions),
  require('./routes/rateLimitAdmin')
);
app.use(
  '/api/notifications',
  authMiddleware,
  csrfProtection(csrfOptions),
  require('./routes/notifications')
);

// Activity logs API (admin/monitor access)
app.use('/api/activity-logs', require('./routes/activityLogs'));

// Developer specific routes - CSRF protection for authenticated endpoints
app.use('/api/developer', require('./routes/developer'));

// Developer Intelligence API routes (auth required for production, optional for development)
app.use(
  '/api/developer-intelligence',
  process.env.NODE_ENV === 'production' ? authMiddleware : (req, res, next) => next(),
  process.env.NODE_ENV === 'production' ? csrfProtection(csrfOptions) : (req, res, next) => next(),
  require('./routes/developerIntelligence')
);

// API key protected routes (no CSRF needed - uses API key auth)
app.use('/api/v1', require('./routes/api'));
app.use('/api/v2', require('./routes/publicApi'));

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
  webhooksRoutes
);

// Jira webhook routes - webhook endpoints use signature verification, management uses auth
app.use('/api/webhooks/jira', require('./routes/jiraWebhook')); // Original static route

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
  require('./routes/jiraWebhookDynamic')
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
  formsRoutes
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
  emailRoutes
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
  filesRoutes
);

// Initialize server after database and GraphQL setup
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Initialize session service before starting server
    const { getSessionService } = require('./services/sessionService');
    const sessionService = await getSessionService();
    app.use(sessionService.middleware());
    logger.info('Session service initialized successfully');

    // Initialize GraphQL after DB connection
    await initializeGraphQL();

    // Add catch-all route for 404 errors AFTER GraphQL is set up
    app.use('*', (req, res) => {
      if (process.env.NODE_ENV === 'development') {
        logger.info(`[404 ERROR] ${req.method} ${req.originalUrl}`);
      }
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        },
      });
    });

    // Global error handling middleware (must be last)
    const { errorMiddleware } = require('./utils/errorHandler');
    app.use(errorMiddleware);

    // Serve static files in production with caching headers
    if (process.env.NODE_ENV === 'production') {
      // Cache static assets (JS, CSS, images) for 1 year
      app.use(
        '/static',
        (req, res, next) => {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
          next();
        },
        express.static(path.join(__dirname, '../client/build/static'))
      );

      // Cache other static files (favicon, manifest, etc.) for 1 day
      app.use(
        express.static(path.join(__dirname, '../client/build'), {
          setHeaders: (res, path) => {
            if (path.endsWith('.html')) {
              // Don't cache HTML files to ensure users get updates
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
            } else {
              // Cache other files for 1 day
              res.setHeader('Cache-Control', 'public, max-age=86400');
              res.setHeader('Expires', new Date(Date.now() + 86400000).toUTCString());
            }
          },
        })
      );

      // Serve React app for all other routes (SPA fallback)
      app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(__dirname, '../client/build/index.html'));
      });
    }

    // Create HTTP server for WebSocket support
    const PORT = process.env.PORT || 3001;
    const httpServer = createServer(app);

    // Create subscription server
    const subscriptionServer = SubscriptionServer.create(
      {
        schema,
        execute,
        subscribe,
        onConnect: async (connectionParams, webSocket, context) => {
          console.log('WebSocket subscription connection initiated');

          // Extract auth token from connection params
          const token = connectionParams.Authorization || connectionParams.authorization;

          if (token) {
            try {
              const { getUser } = require('./graphql/middleware/auth');
              const user = await getUser({ headers: { authorization: token } });
              return { user };
            } catch (error) {
              console.error('Subscription auth error:', error);
              throw new Error('Authentication failed');
            }
          }

          return {};
        },
        onDisconnect: (webSocket, context) => {
          console.log('WebSocket subscription disconnected');
        },
      },
      {
        server: httpServer,
        path: '/graphql-subscriptions',
      }
    );

    // Graceful shutdown
    process.on('SIGTERM', () => {
      subscriptionServer.close();
      httpServer.close();
    });

    // Start the server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      logger.info(`🔗 GraphQL Playground: http://localhost:${PORT}/playground`);
      logger.info(`📡 Subscriptions endpoint: ws://localhost:${PORT}/graphql-subscriptions`);
    });

    // Initialize scheduler after everything is set up
    initializeScheduler();
  } catch (err) {
    console.error('Server initialization error:', err);
    process.exit(1);
  }
};

// Start the server
startServer();
