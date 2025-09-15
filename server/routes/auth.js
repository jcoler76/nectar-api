const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const AuthFactory = require('../middleware/authFactory');
const { logger } = require('../utils/logger');
const { body, validationResult } = require('express-validator');
const { getPrismaClient } = require('../config/prisma');
const bcrypt = require('bcryptjs');

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least 8 characters with uppercase, lowercase, number, and special character'
    ),
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
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'New password must contain at least 8 characters with uppercase, lowercase, number, and special character'
    ),
];

const emailVerificationValidation = [
  body('token').isUUID().withMessage('Valid verification token is required'),
];

const setPasswordValidation = [
  body('token').isUUID().withMessage('Valid verification token is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least 8 characters with uppercase, lowercase, number, and special character'
    ),
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
const getClientIP = req => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection.remoteAddress ||
    req.ip ||
    'unknown'
  );
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

    // Store user info in session for documentation access
    req.session.user = {
      id: result.user.id,
      email: result.user.email,
      isAdmin: result.user.isAdmin,
      organizationId: result.organization?.id,
      loginTime: new Date().toISOString(),
    };

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
      ipAddress: getClientIP(req),
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
      ipAddress: getClientIP(req),
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
      userId: req.user?.userId,
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
router.post(
  '/change-password',
  AuthFactory.createJWTMiddleware(),
  changePasswordValidation,
  handleValidationErrors,
  async (req, res) => {
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
        userId: req.user?.userId,
      });

      res.status(400).json({
        success: false,
        message: error.message || 'Failed to change password',
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user (currently just returns success)
 */
router.post('/logout', AuthFactory.createJWTMiddleware(), async (req, res) => {
  try {
    // 1. Clear session data for documentation access
    req.session.destroy(err => {
      if (err) {
        logger.error('Session destruction failed', { error: err.message });
      }
    });

    // 2. Add token to blacklist (if implemented)
    // 3. Log the logout event
    logger.info('User logged out', { userId: req.user.userId });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error', {
      error: error.message,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
});

/**
 * GET /api/auth/verify-email/:token
 * Verify email verification token and get user info
 */
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
    }

    const prisma = getPrismaClient();

    // Find the verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token',
      });
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });

      return res.status(400).json({
        success: false,
        message: 'Verification token has expired',
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.email },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        needsPassword: !user.passwordHash,
        token: token,
      },
    });
  } catch (error) {
    logger.error('Email verification error', { error: error.message, token: req.params.token });
    res.status(500).json({
      success: false,
      message: 'Verification failed',
    });
  }
});

/**
 * POST /api/auth/set-password
 * Set password for verified user account
 */
router.post('/set-password', setPasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body;
    const ipAddress = getClientIP(req);

    const prisma = getPrismaClient();

    // Find and validate the verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token',
      });
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });

      return res.status(400).json({
        success: false,
        message: 'Verification token has expired',
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.email },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user in transaction
    await prisma.$transaction(async tx => {
      // Update user with password and verify email
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });

      // Delete the verification token
      await tx.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });
    });

    // Generate JWT token for immediate login
    const primaryMembership = user.memberships[0];
    const organization = primaryMembership.organization;

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: organization.id,
      organizationSlug: organization.slug,
      role: primaryMembership.role,
      isAdmin: primaryMembership.role === 'OWNER',
      isSuperAdmin: user.isSuperAdmin || false,
      type: 'access',
    };

    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const jwtToken = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: process.env.JWT_ISSUER || 'nectar-api',
      audience: 'nectar-users',
    });

    logger.info('Password set successfully', {
      userId: user.id,
      email: user.email,
      organizationId: organization.id,
      ipAddress,
    });

    res.json({
      success: true,
      message: 'Password set successfully. You are now logged in.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        emailVerified: true,
        lastLoginAt: new Date(),
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        subscription: organization.subscription,
      },
      membership: {
        role: primaryMembership.role,
        joinedAt: primaryMembership.joinedAt,
      },
      token: jwtToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });
  } catch (error) {
    logger.error('Set password error', {
      error: error.message,
      email: req.body.email,
      ipAddress: getClientIP(req),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to set password',
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

/**
 * GET /api/auth/oauth/providers
 * Get available OAuth providers
 */
router.get('/oauth/providers', (req, res) => {
  try {
    // Check which OAuth providers are configured
    const providers = [];

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push({
        name: 'google',
        displayName: 'Google',
        loginUrl: '/api/auth/oauth/google',
      });
    }

    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      providers.push({
        name: 'github',
        displayName: 'GitHub',
        loginUrl: '/api/auth/oauth/github',
      });
    }

    if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
      providers.push({
        name: 'facebook',
        displayName: 'Facebook',
        loginUrl: '/api/auth/oauth/facebook',
      });
    }

    res.json({
      providers,
      count: providers.length,
      message:
        providers.length > 0
          ? 'OAuth providers configured and ready'
          : 'No OAuth providers configured. Check environment variables.',
    });
  } catch (error) {
    logger.error('Error getting OAuth providers:', error);
    res.status(500).json({ error: 'Failed to load OAuth providers' });
  }
});

// Mount full OAuth routes (will be available after server restart)
router.use('/oauth', require('./oauth'));

module.exports = router;
