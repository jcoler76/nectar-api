const { logger } = require('./logger');

/**
 * Security headers middleware for enhanced application security
 */

// Environment-specific HSTS configuration
const getHSTSConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    maxAge: isProduction ? 31536000 : 86400, // 1 year in prod, 1 day in dev
    includeSubDomains: true,
    preload: isProduction,
  };
};

// Get allowed origins for CORS from environment
const getAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
  return origins.split(',').map(origin => origin.trim());
};

// Security headers for different content types
const securityHeadersMiddleware = (req, res, next) => {
  // Set security headers based on content type
  const contentType = req.path.match(
    /\.(js|css|html|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/
  );

  if (contentType) {
    const extension = contentType[1];

    // Set appropriate cache headers for static assets
    switch (extension) {
      case 'html':
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        break;
      case 'js':
      case 'css':
        // Cache static assets for 1 year with immutable flag
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        break;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'ico':
        // Cache images for 1 month
        res.setHeader('Cache-Control', 'public, max-age=2592000');
        break;
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'eot':
        // Cache fonts for 1 year
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        break;
    }
  }

  next();
};

// Nonce generator for CSP
const generateNonce = () => {
  return require('crypto').randomBytes(16).toString('base64');
};

// CSP middleware with nonce support
const cspMiddleware = (req, res, next) => {
  // Generate nonce for inline scripts if needed
  res.locals.nonce = generateNonce();

  // Add nonce to CSP header if using inline scripts
  const existingCSP = res.getHeader('Content-Security-Policy');
  if (existingCSP && req.path.endsWith('.html')) {
    const updatedCSP = existingCSP.replace(
      "script-src 'self'",
      `script-src 'self' 'nonce-${res.locals.nonce}'`
    );
    res.setHeader('Content-Security-Policy', updatedCSP);
  }

  next();
};

// Report URI middleware for CSP violations
const cspReportingMiddleware = (req, res, next) => {
  if (req.path === '/api/csp-report') {
    // Log CSP violations
    const violation = req.body;
    logger.warn('CSP Violation:', {
      documentUri: violation['document-uri'],
      violatedDirective: violation['violated-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number'],
      columnNumber: violation['column-number'],
    });

    res.status(204).end();
  } else {
    next();
  }
};

// Security headers for file downloads
const downloadSecurityHeaders = (req, res, next) => {
  if (req.path.includes('/download/') || req.path.includes('/export/')) {
    // Prevent XSS in file downloads
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'attachment');

    // Sandbox downloaded content
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  }

  next();
};

// CORS preflight optimization
const corsPreflightCache = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    // Cache preflight requests for 24 hours
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  next();
};

// Security monitoring headers
const securityMonitoring = (req, res, next) => {
  // Add request ID for tracking
  const requestId = require('crypto').randomBytes(16).toString('hex');
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log security-relevant requests
  if (req.path.includes('/auth/') || req.path.includes('/admin/')) {
    logger.info('Security-relevant request:', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  next();
};

module.exports = {
  securityHeadersMiddleware,
  cspMiddleware,
  cspReportingMiddleware,
  downloadSecurityHeaders,
  corsPreflightCache,
  securityMonitoring,
  getHSTSConfig,
  getAllowedOrigins,
};
