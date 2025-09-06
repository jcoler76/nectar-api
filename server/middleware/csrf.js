const crypto = require('crypto');

// CSRF token storage - In production, use Redis
const csrfTokens = new Map();
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Store CSRF token
const storeCSRFToken = (userId, token) => {
  const key = `csrf_${userId}`;
  csrfTokens.set(key, {
    token,
    expiry: Date.now() + TOKEN_EXPIRY,
  });

  // Clean up expired tokens periodically
  cleanupExpiredTokens();
};

// Validate CSRF token
const validateCSRFToken = (userId, token) => {
  const key = `csrf_${userId}`;
  const stored = csrfTokens.get(key);

  if (!stored) return false;
  if (Date.now() > stored.expiry) {
    csrfTokens.delete(key);
    return false;
  }

  return stored.token === token;
};

// Clean up expired tokens
const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (now > value.expiry) {
      csrfTokens.delete(key);
    }
  }
};

// CSRF protection middleware
const csrfProtection = (options = {}) => {
  const {
    excludePaths = [],
    excludePatterns = [],
    tokenHeader = 'x-csrf-token',
    tokenField = '_csrf',
    cookie = false,
  } = options;

  return (req, res, next) => {
    // Skip CSRF for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path) || req.url.startsWith(path))) {
      return next();
    }

    // Skip CSRF for excluded patterns (regex matching)
    if (excludePatterns.some(pattern => pattern.test(req.path) || pattern.test(req.url))) {
      return next();
    }

    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Generate token for forms
      if (req.user && req.user.userId) {
        const token = generateCSRFToken();
        storeCSRFToken(req.user.userId, token);
        res.locals.csrfToken = token;
      }
      return next();
    }

    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      console.error('CSRF: No user or userId found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get CSRF token from request
    const token = req.headers[tokenHeader] || req.body[tokenField] || req.query[tokenField];

    if (!token) {
      console.error(`CSRF: Token missing for ${req.method} ${req.path}`);
      return res.status(403).json({ message: 'CSRF token missing' });
    }

    // Validate CSRF token
    if (!validateCSRFToken(req.user.userId, token)) {
      console.error(`CSRF: Invalid token for user ${req.user.userId} on ${req.method} ${req.path}`);
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    // Token is valid, continue
    next();
  };
};

// Middleware to generate CSRF token for authenticated users
const generateCSRFTokenMiddleware = (req, res, next) => {
  if (req.user && req.user.userId) {
    const token = generateCSRFToken();
    storeCSRFToken(req.user.userId, token);
    res.locals.csrfToken = token;

    // Also send in response header for SPAs
    res.setHeader('X-CSRF-Token', token);
  }
  next();
};

// Get CSRF token endpoint
const getCSRFToken = (req, res) => {
  if (!req.user || !req.user.userId) {
    console.error('CSRF: getCSRFToken - No user or userId');
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = generateCSRFToken();
  storeCSRFToken(req.user.userId, token);

  if (process.env.NODE_ENV === 'development') {
    console.log(`CSRF: Generated new token for user ${req.user.userId}`);
  }

  res.json({ csrfToken: token });
};

module.exports = {
  csrfProtection,
  generateCSRFTokenMiddleware,
  getCSRFToken,
  generateCSRFToken,
  storeCSRFToken,
  validateCSRFToken,
};
