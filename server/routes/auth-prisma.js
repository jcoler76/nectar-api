const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const AuthFactory = require('../middleware/authFactory');
const { logger } = require('../utils/logger');
const { body, validationResult } = require('express-validator');

// Validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least 8 characters with uppercase, lowercase, number, and special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('organizationName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Organization name must be less than 100 characters'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least 8 characters with uppercase, lowercase, number, and special character'),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// Helper function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.connection.remoteAddress ||
         req.ip ||
         'unknown';
};

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    logger.info('Login attempt', { email, ipAddress });

    const result = await authService.login(email, password, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      organization: result.organization,
      membership: result.membership,
      token: result.token,
      expiresIn: result.expiresIn,
    });

  } catch (error) {
    logger.error('Login error', { 
      error: error.message, 
      email: req.body.email, 
      ipAddress: getClientIP(req) 
    });

    res.status(401).json({
      success: false,
      message: error.message || 'Login failed',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using JWT validation
 */
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    // For now, just validate the existing token and return user info
    const { validateToken } = require('../utils/tokenService');
    const decoded = await validateToken(token);

    // Token is valid, return the same token (simplified approach)
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

  } catch (error) {
    logger.error('Token refresh error', { error: error.message });
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
});

/**
 * POST /api/auth/register
 * Register new user and create organization
 */
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, firstName, lastName, organizationName } = req.body;
    const ipAddress = getClientIP(req);

    logger.info('Registration attempt', { email, organizationName, ipAddress });

    const result = await authService.register(
      { email, password, firstName, lastName },
      { organizationName }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
      },
    });

  } catch (error) {
    logger.error('Registration error', { 
      error: error.message, 
      email: req.body.email, 
      ipAddress: getClientIP(req) 
    });

    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify JWT token and get user info
 */
router.post('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const token = authHeader.substring(7);
    const result = await authService.verifyToken(token);

    res.json({
      success: true,
      data: {
        userId: result.userId,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        organizationId: result.organizationId,
        role: result.role,
        isAdmin: result.isAdmin,
      },
    });

  } catch (error) {
    logger.error('Token verification error', { error: error.message });
    
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile with organizations
 */
router.get('/profile', AuthFactory.createJWTMiddleware(), async (req, res) => {
  try {
    const profile = await authService.getProfile(req.user.userId);

    res.json({
      success: true,
      data: profile,
    });

  } catch (error) {
    logger.error('Get profile error', { 
      error: error.message, 
      userId: req.user?.userId 
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', AuthFactory.createJWTMiddleware(), changePasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    await authService.changePassword(req.user.userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (error) {
    logger.error('Change password error', { 
      error: error.message, 
      userId: req.user?.userId 
    });

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to change password',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (currently just returns success)
 */
router.post('/logout', AuthFactory.createJWTMiddleware(), async (req, res) => {
  try {
    // In a full implementation, we would:
    // 1. Add token to blacklist
    // 2. Clear session data
    // 3. Log the logout event
    
    logger.info('User logged out', { userId: req.user.userId });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error) {
    logger.error('Logout error', { 
      error: error.message, 
      userId: req.user?.userId 
    });

    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
});

/**
 * GET /api/auth/health
 * Health check endpoint for auth service
 */
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const prisma = await require('../services/prismaService').getClient();
    await prisma.$queryRaw`SELECT 1 as test`;

    res.json({
      success: true,
      message: 'Auth service healthy',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Auth health check failed', { error: error.message });

    res.status(503).json({
      success: false,
      message: 'Auth service unhealthy',
      error: error.message,
    });
  }
});

module.exports = router;