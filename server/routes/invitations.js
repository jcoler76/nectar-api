const express = require('express');
const router = express.Router();
const invitationService = require('../services/invitationService');
const { authMiddleware: authenticate } = require('../middleware/auth');
const { checkUserLimit } = require('../middleware/userLimitMiddleware');
const { body, param, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const rateLimiter = require('express-rate-limit');

// Rate limiting for invitation endpoints
const invitationRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 invitations per hour
  message: 'Too many invitations sent. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const validateInvitation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').isIn(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).withMessage('Invalid role'),
  // organizationId is now automatically inferred from authenticated user, no validation needed
];

const validateAcceptInvitation = [
  body('token').notEmpty().withMessage('Token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
];

// Helper to check validation errors
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Helper function to check if user has admin access (matches GraphQL resolver logic)
const hasAdminAccess = currentUser => {
  if (currentUser?.isSuperAdmin) return true;
  if (currentUser?.isAdmin) return true;
  return currentUser?.memberships?.some(
    membership =>
      membership.role === 'ORGANIZATION_OWNER' || membership.role === 'ORGANIZATION_ADMIN'
  );
};

// Check if user has permission to invite
const checkInvitePermission = async (req, res, next) => {
  try {
    const prismaService = require('../services/prismaService');
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        message: 'User must be associated with an organization',
      });
    }

    // First check if user has basic admin access (like GraphQL resolver)
    if (hasAdminAccess(req.user)) {
      // Create a default membership object for consistent API
      req.userMembership = {
        role: req.user.isAdmin || req.user.isSuperAdmin ? 'ADMIN' : 'ORGANIZATION_ADMIN',
        userId: req.user.userId,
        organizationId: organizationId,
      };
      return next();
    }

    // Fallback: Check membership table with tenant context
    const membership = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.membership.findFirst({
        where: {
          userId: req.user.userId,
          role: { in: ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'OWNER', 'ADMIN'] },
        },
      });
    });

    if (!membership) {
      logger.warn('Permission denied for user invitation', {
        userId: req.user.userId,
        organizationId: organizationId,
        isAdmin: req.user.isAdmin,
        isSuperAdmin: req.user.isSuperAdmin,
        hasMemberships: !!req.user.memberships?.length,
      });
      return res.status(403).json({
        message: 'You must be an owner or admin to invite users',
      });
    }

    req.userMembership = membership;
    next();
  } catch (error) {
    logger.error('Permission check failed', { error: error.message });
    res.status(500).json({ message: 'Failed to verify permissions' });
  }
};

/**
 * POST /api/invitations/send
 * Send invitation to new user
 */
router.post(
  '/send',
  authenticate,
  checkUserLimit,
  invitationRateLimiter,
  validateInvitation,
  checkValidation,
  checkInvitePermission,
  async (req, res) => {
    try {
      const { email, role } = req.body;

      // Use the authenticated user's organizationId automatically for security
      const organizationId = req.user.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          message: 'User must be associated with an organization to send invitations',
        });
      }

      // Validate role hierarchy - can't invite someone with higher role
      const inviterRole = req.userMembership.role;
      if (inviterRole === 'ADMIN' && role === 'OWNER') {
        return res.status(403).json({
          message: 'Admins cannot invite owners',
        });
      }

      const invitation = await invitationService.sendInvitation({
        email,
        role,
        organizationId,
        invitedById: req.user.userId,
      });

      res.status(201).json({
        message: 'Invitation sent successfully',
        invitation,
      });
    } catch (error) {
      logger.error('Failed to send invitation', {
        error: error.message,
        userId: req.user.userId,
      });

      if (error.message.includes('already')) {
        return res.status(409).json({ message: error.message });
      }
      if (error.message.includes('limit')) {
        return res.status(403).json({ message: error.message });
      }

      res.status(500).json({
        message: 'Failed to send invitation',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/invitations
 * List pending invitations for organization
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        message: 'Organization ID is required',
      });
    }

    const invitations = await invitationService.listPendingInvitations(
      organizationId,
      req.user.userId
    );

    res.json({ invitations });
  } catch (error) {
    logger.error('Failed to list invitations', {
      error: error.message,
      userId: req.user.userId,
    });

    if (error.message.includes('permissions')) {
      return res.status(403).json({ message: error.message });
    }

    res.status(500).json({
      message: 'Failed to retrieve invitations',
    });
  }
});

/**
 * GET /api/invitations/validate/:token
 * Validate invitation token (public endpoint)
 */
router.get('/validate/:token', param('token').notEmpty(), checkValidation, async (req, res) => {
  try {
    const { token } = req.params;

    const invitationData = await invitationService.validateInvitationToken(token);

    res.json({
      valid: true,
      ...invitationData,
    });
  } catch (error) {
    logger.error('Failed to validate invitation', {
      error: error.message,
    });

    res.status(400).json({
      valid: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/invitations/accept
 * Accept invitation and create account
 */
router.post('/accept', validateAcceptInvitation, checkValidation, async (req, res) => {
  try {
    const { token, password, firstName, lastName } = req.body;

    const result = await invitationService.acceptInvitation({
      token,
      password,
      firstName,
      lastName,
    });

    res.json({
      message: 'Invitation accepted successfully',
      ...result,
    });
  } catch (error) {
    logger.error('Failed to accept invitation', {
      error: error.message,
    });

    if (error.message.includes('expired') || error.message.includes('Invalid')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: 'Failed to accept invitation',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/invitations/:id
 * Revoke pending invitation
 */
router.delete(
  '/:id',
  authenticate,
  param('id').isUUID().withMessage('Valid invitation ID required'),
  checkValidation,
  async (req, res) => {
    try {
      const { id } = req.params;

      await invitationService.revokeInvitation(id, req.user.userId);

      res.json({
        message: 'Invitation revoked successfully',
      });
    } catch (error) {
      logger.error('Failed to revoke invitation', {
        error: error.message,
        userId: req.user.userId,
      });

      if (error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('permissions')) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message.includes('already been accepted')) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({
        message: 'Failed to revoke invitation',
      });
    }
  }
);

/**
 * POST /api/invitations/:id/resend
 * Resend invitation email
 */
router.post(
  '/:id/resend',
  authenticate,
  invitationRateLimiter,
  param('id').isUUID().withMessage('Valid invitation ID required'),
  checkValidation,
  checkInvitePermission,
  async (req, res) => {
    try {
      const { id } = req.params;

      await invitationService.resendInvitation(id, req.user.userId);

      res.json({
        message: 'Invitation resent successfully',
      });
    } catch (error) {
      logger.error('Failed to resend invitation', {
        error: error.message,
        userId: req.user.userId,
      });

      if (error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('already been accepted')) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({
        message: 'Failed to resend invitation',
      });
    }
  }
);

module.exports = router;
