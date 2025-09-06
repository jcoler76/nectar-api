/**
 * Express Application Configuration
 * Main application setup with modular middleware and route configuration
 */

const express = require('express');
const mongoose = require('mongoose');
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

  // Basic middleware
  app.use(express.json());
  app.use(require('cookie-parser')());

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

  // Add MongoDB connection event handlers
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

  return app;
};

/**
 * Add production static file serving and error handling
 * This is called after all other middleware and routes are configured
 */
const addProductionMiddleware = app => {
  // Serve static files in production with caching headers (MUST be before catch-all route)
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
