const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { validateToken } = require('../utils/tokenService');
const prismaService = require('../services/prismaService');
// PERMANENTLY DISABLED - SecurityMonitoringService causes hanging issues
// const { securityMonitoring } = require('../services/securityMonitoringService');

// Create a no-op replacement to prevent errors
const securityMonitoring = {
  trackAuthSuccess: async () => {
    /* disabled */
  },
  trackAuthFailure: async () => {
    /* disabled */
  },
};

const authMiddleware = async (req, res, next) => {
  try {
    // Skip authentication for static assets in documentation routes
    if (
      (req.path.includes('/api/documentation') || req.originalUrl.includes('/api/documentation')) &&
      req.path.match(/\.(css|js|png|jpg|gif|ico|woff|woff2|ttf|eot|svg)$/i)
    ) {
      return next();
    }

    // Check for token in Authorization header only
    let token = req.headers.authorization?.split(' ')[1];

    // For documentation routes, also allow session-based authentication
    if (
      !token &&
      (req.path.includes('/api/documentation') || req.originalUrl.includes('/api/documentation'))
    ) {
      logger.info('Documentation route - checking session', {
        hasSession: !!req.session,
        hasSessionUser: !!req.session?.user,
        cookies: req.headers.cookie ? 'present' : 'missing',
        path: req.path,
        sessionId: req.sessionID,
      });

      if (req.session?.user) {
        // Create a temporary user object for documentation access
        req.user = {
          userId: req.session.user.id,
          email: req.session.user.email,
          isAdmin: req.session.user.isAdmin,
          organizationId: req.session.user.organizationId,
          sessionAuth: true, // Flag to indicate session-based auth
        };
        logger.debug('Documentation access via session', {
          userId: req.user.userId,
          email: req.user.email,
          path: req.path,
        });
        return next();
      } else {
        logger.warn('Documentation route - no session user found', {
          hasSession: !!req.session,
          sessionKeys: req.session ? Object.keys(req.session) : [],
        });
      }
    }

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
      });

      // Track authentication failure
      await securityMonitoring.trackAuthFailure({
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        reason: 'No token provided',
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

    // Debug logging for organization ID
    logger.debug('Token decoded', {
      userId: req.user.userId,
      email: req.user.email,
      organizationId: req.user.organizationId,
      orgId: req.user.orgId,
      organization_id: req.user.organization_id,
      path: req.path,
    });

    // For SuperAdmins, they already have organization context in their JWT token
    // from the organization selection flow
    if (req.user.isSuperAdmin && req.user.organizationId) {
      req.user.inSupportMode = true;
      logger.debug('SuperAdmin using organization context from JWT', {
        superAdminId: req.user.userId,
        organizationId: req.user.organizationId,
        path: req.path,
      });
    }
    logger.info('Authentication successful', {
      userId: decoded.userId,
      email: decoded.email,
      organizationId: req.user.organizationId,
      originalOrganizationId: req.user.originalOrganizationId,
      inSupportMode: req.user.inSupportMode,
      path: req.path,
    });

    // Track successful authentication
    await securityMonitoring.trackAuthSuccess({
      userId: decoded.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      email: decoded.email,
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

    // Track authentication failure with specific error reason
    let reason = 'Unknown error';
    if (error.name === 'TokenExpiredError') {
      reason = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      reason = 'Invalid token format';
    } else if (error.message.includes('revoked')) {
      reason = 'Token revoked';
    } else if (error.message.includes('issuer') || error.message.includes('audience')) {
      reason = 'Invalid token issuer/audience';
    } else {
      reason = 'Token validation failed';
    }

    await securityMonitoring.trackAuthFailure({
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      reason: reason,
      path: req.path,
      error: error.message,
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

      await securityMonitoring.trackAuthFailure({
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        reason: 'Admin access without authentication',
        path: req.path,
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

        await securityMonitoring.trackAuthFailure({
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          reason: 'Privilege escalation attempt - non-admin accessing admin endpoint',
          path: req.path,
          userId: req.user.userId || req.user._id,
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

    // Use system client for admin check - not tenant-specific operation
    const systemClient = prismaService.getSystemClient();
    const user = await systemClient.user.findUnique({
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
