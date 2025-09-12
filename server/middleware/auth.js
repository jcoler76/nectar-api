const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { validateToken } = require('../utils/tokenService');
const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
      });
      return res.status(401).json({ message: 'No token provided' });
    }

    // Use enhanced token validation with blacklist checking
    const decoded = await validateToken(token);

    req.user = decoded;
    // Backward-compat mapping for legacy code expecting id/orgId
    if (!req.user.id && req.user.userId) req.user.id = req.user.userId;
    if (!req.user.organizationId && (req.user.orgId || req.user.organization_id)) {
      req.user.organizationId = req.user.orgId || req.user.organization_id;
    }
    logger.debug('Authentication successful', {
      userId: decoded.userId,
      email: decoded.email,
      path: req.path,
    });
    next();
  } catch (error) {
    logger.error('Auth middleware error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });

    // Enhanced error handling for better security
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format' });
    } else if (error.message.includes('revoked')) {
      return res.status(401).json({ message: 'Token has been revoked' });
    } else if (error.message.includes('issuer') || error.message.includes('audience')) {
      return res.status(401).json({ message: 'Invalid token issuer or audience' });
    }

    return res.status(401).json({ message: 'Invalid token' });
  }
};

const adminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      logger.warn('Unauthorized admin access attempt - no user', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(401).json({ message: 'User needs admin privileges' });
    }

    // Check if token has explicit isAdmin claim
    if (req.user.hasOwnProperty('isAdmin')) {
      if (req.user.isAdmin) {
        return next();
      } else {
        // Token explicitly says user is not admin
        logger.warn('Non-admin user attempting admin access', {
          userId: req.user.userId || req.user._id,
          tokenHasAdmin: false,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(401).json({ message: 'User needs admin privileges' });
      }
    }

    // Fallback: Legacy token without isAdmin claim - check database
    logger.info('Legacy token detected without isAdmin claim, checking database', {
      userId: req.user.userId || req.user._id,
      tokenClaims: Object.keys(req.user),
      userAgent: req.headers['user-agent'],
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId || req.user._id },
      select: { isAdmin: true },
    });

    if (!user || !user.isAdmin) {
      logger.warn('Database fallback: Unauthorized admin access attempt', {
        userId: req.user.userId || req.user._id,
        tokenHasAdmin: 'missing',
        dbHasAdmin: !!user?.isAdmin,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(401).json({ message: 'User needs admin privileges' });
    }

    // User is admin in database - suggest token refresh for performance
    logger.warn('DATABASE_FALLBACK_USED', {
      middleware: 'requireAdmin',
      userId: req.user.userId || req.user._id,
      reason: 'legacy_token_missing_isAdmin_claim',
      recommendation: 'User should refresh token to include isAdmin claim',
      performance_impact: 'database_lookup_required',
    });

    // Add header to suggest token refresh for better performance
    res.setHeader('X-Token-Refresh-Suggested', 'true');
    res.setHeader('X-Token-Refresh-Reason', 'legacy-token-missing-claims');

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Error checking admin status' });
  }
};

module.exports = {
  authMiddleware,
  adminOnly,
};
