const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { validateToken } = require('../utils/tokenService');

// Customer-only authentication middleware (no platform admin access)
const customerAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Customer authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
      });
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Use enhanced token validation
    const decoded = await validateToken(token);

    // Only allow customer tokens, no platform admin access
    if (decoded.type === 'admin') {
      logger.warn('Platform admin token rejected in customer app', {
        userId: decoded.userId,
        tokenType: decoded.type,
        ip: req.ip,
        path: req.path,
      });
      return res.status(403).json({ error: 'Platform admin access not allowed in customer app' });
    }

    // Validate organization access
    if (!decoded.organizationId) {
      logger.warn('Token missing organizationId', {
        userId: decoded.userId,
        ip: req.ip,
        path: req.path,
      });
      return res.status(401).json({ error: 'Invalid token - missing organization context' });
    }

    // Set user context with organization information
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      organizationId: decoded.organizationId,
      organizationSlug: decoded.organizationSlug,
      role: decoded.role, // OWNER, ADMIN, MEMBER, VIEWER
      type: 'customer', // Always customer type
    };

    req.organizationId = decoded.organizationId;

    logger.debug('Customer authentication successful', {
      userId: decoded.userId,
      email: decoded.email,
      organizationId: decoded.organizationId,
      role: decoded.role,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error('Customer auth middleware error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });

    // Enhanced error handling for better security
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token format' });
    } else if (error.message.includes('revoked')) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Organization role-based authorization middleware
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Insufficient role permissions', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        organizationId: req.user.organizationId,
        path: req.path,
      });
      return res.status(403).json({
        error: 'Insufficient permissions for this action',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

// Specific role requirement helpers
const requireOwner = () => requireRole(['OWNER']);
const requireOwnerOrAdmin = () => requireRole(['OWNER', 'ADMIN']);
const requireAnyRole = () => requireRole(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

module.exports = {
  customerAuth,
  requireRole,
  requireOwner,
  requireOwnerOrAdmin,
  requireAnyRole,
};
