/**
 * Express Application Configuration
 * Main application setup with modular middleware and route configuration
 */

const express = require('express');
const path = require('path');
const { logger } = require('./middleware/logger');

// Import configuration modules
const applySecurityMiddleware = require('./middleware');
const mountRoutes = require('./routes');

const app = express();

// Trust proxy configuration - MUST be first, before any middleware
app.enable('trust proxy');
app.set('trust proxy', 1);

/**
 * Configure Express app with all middleware and routes
 */
const configureApp = () => {
  // Apply security middleware
  applySecurityMiddleware(app);

  // Stripe webhook requires raw body to verify signature; mount before JSON parser
  app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));

  // Basic middleware with security limits
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, res, buf) => {
        // Store raw body for webhook verification if needed
        req.rawBody = buf;
      },
    })
  );
  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
      parameterLimit: 1000, // Limit number of parameters
    })
  );
  app.use(require('cookie-parser')());

  // Add BigInt serialization middleware for all JSON responses
  const { bigIntMiddleware } = require('./utils/bigintSerializer');
  app.use(bigIntMiddleware);

  // Session middleware for Passport OAuth
  const session = require('express-session');
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Allow iframe access in development
      },
    })
  );

  // Initialize Passport for OAuth
  const { passport } = require('./config/passport');
  app.use(passport.initialize());
  app.use(passport.session());

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

  // Mount all routes
  mountRoutes(app);

  return app;
};

/**
 * Add production static file serving and error handling
 * This is called after all other middleware and routes are configured
 */
const addProductionMiddleware = app => {
  // Serve static files in production with caching headers (MUST be before catch-all route)
  if (process.env.NODE_ENV === 'production') {
    // Resolve build directory (configurable), default to CRA build at repo root
    const buildDir = process.env.PUBLIC_DIR
      ? path.resolve(process.env.PUBLIC_DIR)
      : path.join(__dirname, '../build');

    // Cache static assets (JS, CSS, images) for 1 year
    app.use(
      '/static',
      (req, res, next) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
        next();
      },
      express.static(path.join(buildDir, 'static'))
    );

    // Cache other static files (favicon, manifest, etc.) for 1 day
    app.use(
      express.static(buildDir, {
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
      res.sendFile(path.join(buildDir, 'index.html'));
    });
  } else {
    // Add catch-all route for 404 errors in non-production environments
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
  }

  // Global error handling middleware (must be last)
  const { errorMiddleware } = require('./utils/errorHandler');
  app.use(errorMiddleware);
};

module.exports = { app, configureApp, addProductionMiddleware };
