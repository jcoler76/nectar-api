/**
 * Content Security Policy (CSP) Headers Middleware
 *
 * CRITICAL SECURITY IMPLEMENTATION
 * - Prevents XSS attacks through iframe content
 * - Restricts script execution and resource loading
 * - Implements nonce-based script security
 * - Protects against clickjacking and data exfiltration
 */

const { logger } = require('../utils/logger');
const crypto = require('crypto');

/**
 * Generate secure CSP nonce for scripts and styles
 */
const generateNonce = () => {
  return crypto.randomBytes(16).toString('base64');
};

/**
 * SECURITY: Strict Content Security Policy for role management
 * Specifically configured to secure iframe implementations
 */
const createCSPHeader = nonce => {
  const cspDirectives = {
    // CRITICAL: Default policy - deny all by default
    'default-src': "'self'",

    // CRITICAL: Scripts - only allow self and nonce-based scripts
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'", // Allow dynamic script loading for React
      // Block unsafe-inline and unsafe-eval
    ],

    // CRITICAL: Styles - allow self and nonce-based styles
    'style-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'unsafe-inline'", // Required for styled-components/CSS-in-JS
    ],

    // CRITICAL: Images - allow self and data URIs
    'img-src': [
      "'self'",
      'data:', // Required for base64 images
      'blob:', // Required for dynamically generated images
    ],

    // CRITICAL: Fonts - allow self only
    'font-src': [
      "'self'",
      'data:', // Required for base64 fonts
    ],

    // CRITICAL: Connect (AJAX/fetch) - allow self for API calls
    'connect-src': [
      "'self'",
      // Add specific API endpoints if needed
    ],

    // CRITICAL: Media - allow self only
    'media-src': ["'self'"],

    // CRITICAL: Objects - deny all plugins
    'object-src': ["'none'"],

    // CRITICAL: Base URI - restrict to self
    'base-uri': ["'self'"],

    // CRITICAL: Forms - allow self only
    'form-action': ["'self'"],

    // CRITICAL: Frames - MOST IMPORTANT for iframe security
    'frame-src': [
      "'self'", // Only allow same-origin frames
      // Specific allowlist for trusted documentation sources
      // Add trusted domains here if needed for external docs
    ],

    // CRITICAL: Frame ancestors - prevent clickjacking
    'frame-ancestors': ["'self'"],

    // CRITICAL: Upgrade insecure requests in production
    ...(process.env.NODE_ENV === 'production' && {
      'upgrade-insecure-requests': [],
    }),

    // CRITICAL: Block mixed content
    'block-all-mixed-content': [],

    // CRITICAL: Require trusted types (modern browsers)
    'require-trusted-types-for': ["'script'"],

    // CRITICAL: Trusted types policy
    'trusted-types': ['default', 'dompurify'],
  };

  // Convert directives to CSP header string
  return Object.entries(cspDirectives)
    .map(([directive, sources]) => {
      if (Array.isArray(sources) && sources.length > 0) {
        return `${directive} ${sources.join(' ')}`;
      } else if (sources === []) {
        return directive; // For directives without sources
      }
      return null;
    })
    .filter(Boolean)
    .join('; ');
};

/**
 * SECURITY: CSP middleware for role management routes
 * Applies strict CSP headers to protect iframe implementations
 */
const applyCSPHeaders = (options = {}) => {
  const {
    reportUri = '/api/csp-report',
    reportOnly = false,
    additionalFrameSources = [],
  } = options;

  return (req, res, next) => {
    try {
      // Generate nonce for this request
      const nonce = generateNonce();

      // Attach nonce to request for use in templates
      req.cspNonce = nonce;

      // Build CSP header
      let cspHeader = createCSPHeader(nonce);

      // Add additional frame sources if specified
      if (additionalFrameSources.length > 0) {
        const additionalSources = additionalFrameSources.join(' ');
        cspHeader = cspHeader.replace("frame-src 'self'", `frame-src 'self' ${additionalSources}`);
      }

      // Add report URI if specified
      if (reportUri) {
        cspHeader += `; report-uri ${reportUri}`;
      }

      // Set CSP header
      const headerName = reportOnly
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy';

      res.setHeader(headerName, cspHeader);

      // Additional security headers for iframe protection
      res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Backup for older browsers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      // SECURITY: Feature Policy to restrict iframe capabilities
      res.setHeader(
        'Permissions-Policy',
        [
          'camera=()', // Block camera access
          'microphone=()', // Block microphone access
          'geolocation=()', // Block location access
          'payment=()', // Block payment API
          'usb=()', // Block USB access
          'magnetometer=()', // Block sensors
          'gyroscope=()', // Block sensors
          'accelerometer=()', // Block sensors
        ].join(', ')
      );

      // Log CSP application (debug only)
      if (process.env.NODE_ENV === 'development') {
        logger.debug('CSP headers applied', {
          path: req.path,
          nonce: nonce.substring(0, 8) + '...',
          reportOnly,
        });
      }

      next();
    } catch (error) {
      logger.error('CSP header application error', {
        error: error.message,
        path: req.path,
        stack: error.stack,
      });

      // Continue without CSP in case of error (fail open)
      next();
    }
  };
};

/**
 * SECURITY: CSP violation report handler
 * Logs CSP violations for security monitoring
 */
const handleCSPReport = () => {
  return (req, res) => {
    try {
      const report = req.body;

      logger.warn('CSP violation reported', {
        report,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
      });

      res.status(204).end();
    } catch (error) {
      logger.error('CSP report handler error', {
        error: error.message,
        body: req.body,
      });

      res.status(500).json({ error: 'Failed to process CSP report' });
    }
  };
};

/**
 * SECURITY: Role-specific CSP configuration
 * Tailored for role management iframe security
 */
const roleManagementCSP = () => {
  return applyCSPHeaders({
    reportUri: '/api/csp-report',
    reportOnly: false, // Enforce policy in production
    additionalFrameSources: [
      // Add trusted documentation sources here
      // Example: 'https://trusted-docs.example.com'
    ],
  });
};

module.exports = {
  applyCSPHeaders,
  handleCSPReport,
  roleManagementCSP,
  generateNonce,
};
