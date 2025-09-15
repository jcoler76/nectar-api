const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../../prisma/generated/client');

const prisma = new PrismaClient();

/**
 * Authenticate API key middleware
 * Validates API key from Authorization header or X-API-Key header
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    let apiKey = null;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }

    // Check X-API-Key header
    if (!apiKey) {
      apiKey = req.headers['x-api-key'];
    }

    // Check for admin API key in environment (for internal system calls)
    if (!apiKey && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY) {
      req.isAdmin = true;
      req.permissions = ['*']; // All permissions
      return next();
    }

    if (!apiKey) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'API key must be provided in Authorization header or X-API-Key header'
      });
    }

    // Hash the provided API key to compare with stored hash
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Find the API key in database
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        isActive: true,
        OR: [
          { keyHash: keyHash },
          // For backward compatibility, also check if the key matches unhashed
          { keyHash: apiKey }
        ]
      }
    });

    if (!apiKeyRecord) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid or has been revoked'
      });
    }

    // Check if API key has expired
    if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
      return res.status(401).json({
        error: 'API key expired',
        message: 'The provided API key has expired'
      });
    }

    // Update usage statistics
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 }
      }
    });

    // Attach API key info to request
    req.apiKey = apiKeyRecord;
    req.permissions = apiKeyRecord.permissions || [];

    next();

  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Internal authentication system error'
    });
  }
};

/**
 * Require specific permissions middleware
 * @param {string[]} requiredPermissions - Array of required permissions
 */
const requirePermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.permissions) {
      return res.status(403).json({
        error: 'Permission check failed',
        message: 'No permissions found in request context'
      });
    }

    // Admin has all permissions
    if (req.isAdmin || req.permissions.includes('*')) {
      return next();
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some(permission =>
      req.permissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This operation requires one of the following permissions: ${requiredPermissions.join(', ')}`,
        required: requiredPermissions,
        current: req.permissions
      });
    }

    next();
  };
};

/**
 * Rate limiting by API key
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
const rateLimitByApiKey = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return async (req, res, next) => {
    try {
      if (req.isAdmin) {
        return next(); // No rate limiting for admin
      }

      if (!req.apiKey) {
        return res.status(401).json({
          error: 'Authentication required for rate limiting'
        });
      }

      const now = new Date();
      const windowStart = new Date(now.getTime() - windowMs);

      // Count recent requests for this API key
      const recentRequests = await prisma.apiKey.findUnique({
        where: { id: req.apiKey.id },
        select: { rateLimitCount: true }
      });

      if (recentRequests.rateLimitCount >= maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Maximum ${maxRequests} requests per ${Math.round(windowMs / 60000)} minutes`,
          retryAfter: Math.ceil(windowMs / 1000),
          resetAt: new Date(now.getTime() + windowMs).toISOString()
        });
      }

      // Increment rate limit counter
      await prisma.apiKey.update({
        where: { id: req.apiKey.id },
        data: {
          rateLimitCount: { increment: 1 }
        }
      });

      next();

    } catch (error) {
      console.error('Rate limiting error:', error);
      res.status(500).json({
        error: 'Rate limiting system error'
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Similar to authenticateApiKey but doesn't fail if no key provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    let apiKey = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }

    if (!apiKey) {
      apiKey = req.headers['x-api-key'];
    }

    if (!apiKey) {
      return next(); // Continue without authentication
    }

    const keyHash = await bcrypt.hash(apiKey, 10);

    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        isActive: true,
        OR: [
          { keyHash: keyHash },
          { keyHash: apiKey }
        ]
      }
    });

    if (apiKeyRecord && (!apiKeyRecord.expiresAt || new Date() <= apiKeyRecord.expiresAt)) {
      await prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 }
        }
      });

      req.apiKey = apiKeyRecord;
      req.permissions = apiKeyRecord.permissions || [];
    }

    next();

  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue even if authentication fails
  }
};

/**
 * Validate request origin middleware
 * Ensures requests come from allowed origins
 */
const validateOrigin = (allowedOrigins = []) => {
  return (req, res, next) => {
    const origin = req.headers.origin || req.headers.referer;

    if (!origin) {
      return next(); // Allow requests without origin (like API clients)
    }

    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (!isAllowed) {
      return res.status(403).json({
        error: 'Origin not allowed',
        message: 'Request origin is not in the allowed list'
      });
    }

    next();
  };
};

module.exports = {
  authenticateApiKey,
  requirePermissions,
  rateLimitByApiKey,
  optionalAuth,
  validateOrigin
};