/**
 * Consolidated Middleware Configuration
 * Applies all security and request processing middleware to the Express app
 */

const helmet = require('helmet');
const cors = require('cors');
const { logger } = require('./logger');
const { apiLimiter, authLimiter, uploadLimiter, graphqlLimiter } = require('./dynamicRateLimiter');
const { apiVersioning, addVersionInfo } = require('./apiVersioning');
const buildCorsOptions = require('../config/corsOptions');

/**
 * Get allowed origins for frame-ancestors (same as CORS origins)
 */
const getAllowedFrameAncestors = () => {
  const envOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:8000',
  ];
  const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

  return ["'self'", ...allowedOrigins];
};

/**
 * Apply all security middleware to the Express app
 * @param {Express} app - Express application instance
 */
const applySecurityMiddleware = app => {
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
          frameAncestors: getAllowedFrameAncestors(),
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

  // CORS configuration (re-evaluated per request to reflect runtime updates)
  app.use((req, res, next) => cors(buildCorsOptions())(req, res, next));

  // Apply general rate limiting and other middleware
  app.use('/api', apiLimiter);

  // Add comprehensive activity logging middleware
  const activityLogger = require('./activityLogger');
  app.use('/api', activityLogger.middleware());

  // Add performance monitoring middleware
  const performanceMiddleware = require('./performanceMiddleware');
  app.use('/api', performanceMiddleware);

  // Apply API versioning to all API routes
  app.use('/api', apiVersioning);
  app.use('/api', addVersionInfo);

  logger.info('Security middleware applied successfully');
};

module.exports = applySecurityMiddleware;
