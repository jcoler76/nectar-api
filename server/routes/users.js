const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { adminOnly } = require('../middleware/auth');
const InputValidator = require('../utils/inputValidation');
const { logger } = require('../utils/logger');
const { errorResponses } = require('../utils/errorHandler');
const { inviteUser } = require('../controllers/usersController');

// Validation middleware for user routes
const validateUserId = InputValidator.createValidationMiddleware({
  params: {
    id: value => InputValidator.validateObjectId(value, 'user ID'),
  },
});

const validateUserUpdate = InputValidator.createValidationMiddleware({
  body: {
    email: value =>
      value
        ? InputValidator.validateString(value, {
            maxLength: 254,
            fieldName: 'email',
          })
        : undefined,
    firstName: value =>
      value
        ? InputValidator.validateString(value, {
            minLength: 1,
            maxLength: 50,
            fieldName: 'firstName',
          })
        : undefined,
    lastName: value =>
      value
        ? InputValidator.validateString(value, {
            minLength: 1,
            maxLength: 50,
            fieldName: 'lastName',
          })
        : undefined,
    isActive: value =>
      value !== undefined ? InputValidator.validateBoolean(value, 'isActive') : undefined,
    roles: value =>
      value
        ? InputValidator.validateArray(value, {
            maxLength: 10,
            fieldName: 'roles',
          })
        : undefined,
  },
});

const validateUserCreation = InputValidator.createValidationMiddleware({
  body: {
    email: value =>
      InputValidator.validateString(value, {
        required: true,
        maxLength: 254,
        fieldName: 'email',
      }),
    firstName: value =>
      InputValidator.validateString(value, {
        required: true,
        minLength: 1,
        maxLength: 50,
        fieldName: 'firstName',
      }),
    lastName: value =>
      InputValidator.validateString(value, {
        required: true,
        minLength: 1,
        maxLength: 50,
        fieldName: 'lastName',
      }),
    isAdmin: value =>
      value !== undefined ? InputValidator.validateBoolean(value, 'isAdmin') : undefined,
  },
});

// POST /api/users - Create/invite new user
router.post('/', adminOnly, validateUserCreation, inviteUser);

// GET /api/users/notification-preferences - Get current user's notification preferences
router.get('/notification-preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('notificationPreferences');

    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    // Return default preferences if not set
    const preferences = user.notificationPreferences || {
      inbox: {
        system: true,
        workflow: true,
        security: true,
        user_message: true,
      },
      email: {
        system: false,
        workflow: false,
        security: true,
        user_message: false,
      },
    };

    res.json(preferences);
  } catch (error) {
    logger.error('Error fetching notification preferences:', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip,
    });
    errorResponses.serverError(res, error);
  }
});

// PUT /api/users/notification-preferences - Update current user's notification preferences
router.put('/notification-preferences', async (req, res) => {
  try {
    const { inbox, email } = req.body;

    // Validate the structure
    if (!inbox || !email || typeof inbox !== 'object' || typeof email !== 'object') {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid notification preferences structure' },
      });
    }

    // Validate notification types
    const validTypes = ['system', 'workflow', 'security', 'user_message'];
    const validatePreferences = (prefs, category) => {
      for (const type of validTypes) {
        if (prefs[type] === undefined || typeof prefs[type] !== 'boolean') {
          throw new Error(`Invalid ${category} preference for ${type}`);
        }
      }
    };

    try {
      validatePreferences(inbox, 'inbox');
      validatePreferences(email, 'email');
    } catch (validationError) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: validationError.message },
      });
    }

    // Security notifications cannot be disabled
    const preferences = {
      inbox: {
        ...inbox,
        security: true, // Always true
      },
      email: {
        ...email,
        security: true, // Always true
      },
    };

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { notificationPreferences: preferences },
      { new: true, runValidators: true }
    ).select('notificationPreferences');

    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    logger.info('Notification preferences updated', {
      userId: req.user?.userId,
      ip: req.ip,
    });

    res.json(user.notificationPreferences);
  } catch (error) {
    logger.error('Error updating notification preferences:', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip,
    });
    errorResponses.serverError(res, error);
  }
});

// GET /api/users - Get all users with pagination
router.get('/', adminOnly, async (req, res) => {
  try {
    // Validate pagination parameters
    const pagination = InputValidator.validatePagination(req.query);

    // Sanitize search query if provided
    let searchQuery = {};
    if (req.query.search) {
      const searchTerm = InputValidator.validateString(req.query.search, {
        maxLength: 100,
        fieldName: 'search',
      });

      searchQuery = {
        $or: [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
        ],
      };
    }

    const users = await User.find(searchQuery, '-password')
      .populate('roles')
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(searchQuery);

    res.json({
      users,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching users:', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip,
    });
    errorResponses.serverError(res, error);
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', adminOnly, validateUserId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password').populate('roles');

    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', {
      error: error.message,
      userId: req.user?.userId,
      targetUserId: req.params.id,
      ip: req.ip,
    });
    errorResponses.serverError(res, error);
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', adminOnly, validateUserId, validateUserUpdate, async (req, res) => {
  try {
    const { email, firstName, lastName, isActive, roles } = req.body;

    // Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    // Validate email uniqueness if email is being changed
    if (email && email !== user.email) {
      if (!InputValidator.isValidEmail(email)) {
        return res
          .status(400)
          .json({ error: { code: 'BAD_REQUEST', message: 'Invalid email format' } });
      }

      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: { code: 'BAD_REQUEST', message: 'Email already exists' } });
      }
    }

    // Validate roles if provided
    if (roles && roles.length > 0) {
      for (const roleId of roles) {
        if (!InputValidator.isValidObjectId(roleId)) {
          return res
            .status(400)
            .json({ error: { code: 'BAD_REQUEST', message: 'Invalid role ID format' } });
        }
      }
    }

    // Update user
    const updateData = {};
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (roles) updateData.roles = roles;

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('roles')
      .select('-password');

    logger.info('User updated successfully', {
      userId: req.user?.userId,
      targetUserId: req.params.id,
      updatedFields: Object.keys(updateData),
      ip: req.ip,
    });

    res.json(updatedUser);
  } catch (error) {
    logger.error('Error updating user:', {
      error: error.message,
      userId: req.user?.userId,
      targetUserId: req.params.id,
      ip: req.ip,
    });
    errorResponses.serverError(res, error);
  }
});

// PATCH /api/users/:id/role - Update user admin status
router.patch('/:id/role', adminOnly, validateUserId, async (req, res) => {
  try {
    const { isAdmin } = req.body;

    // Validate isAdmin parameter
    if (typeof isAdmin !== 'boolean') {
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: 'isAdmin must be a boolean value' } });
    }

    // Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    // Prevent removing admin from the last admin user
    if (!isAdmin && user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'Cannot remove admin privileges from the last admin user',
          },
        });
      }
    }

    // Update user admin status
    user.isAdmin = isAdmin;
    await user.save();

    logger.info('User role updated successfully', {
      userId: req.user?.userId,
      targetUserId: req.params.id,
      isAdmin: isAdmin,
      ip: req.ip,
    });

    res.json({
      message: 'User role updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    logger.error('Error updating user role:', {
      error: error.message,
      userId: req.user?.userId,
      targetUserId: req.params.id,
      ip: req.ip,
    });
    errorResponses.serverError(res, error);
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', adminOnly, validateUserId, async (req, res) => {
  try {
    // Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    // Prevent deletion of the last admin user
    if (user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount <= 1) {
        return res
          .status(400)
          .json({ error: { code: 'BAD_REQUEST', message: 'Cannot delete the last admin user' } });
      }
    }

    // Prevent self-deletion
    if (req.params.id === req.user.userId) {
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: 'Cannot delete your own account' } });
    }

    await User.findByIdAndDelete(req.params.id);

    logger.info('User deleted successfully', {
      userId: req.user?.userId,
      deletedUserId: req.params.id,
      deletedUserEmail: user.email,
      ip: req.ip,
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user:', {
      error: error.message,
      userId: req.user?.userId,
      targetUserId: req.params.id,
      ip: req.ip,
    });
    errorResponses.serverError(res, error);
  }
});

// POST /api/users/:id/reset-auth - Reset user's authentication settings
router.post('/:id/reset-auth', adminOnly, validateUserId, async (req, res) => {
  try {
    // Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    // Prevent admin from resetting their own auth
    if (req.params.id === req.user.userId) {
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: 'Cannot reset your own authentication' } });
    }

    // Reset 2FA settings
    const updateData = {
      twoFactorSecret: undefined,
      twoFactorBackupCodes: [],
      twoFactorEnabledAt: undefined,
      trustedDevices: [],
    };

    await User.findByIdAndUpdate(req.params.id, { $unset: updateData });

    logger.info('User authentication reset successfully', {
      adminUserId: req.user?.userId,
      adminUserEmail: req.user?.email,
      resetUserId: req.params.id,
      resetUserEmail: user.email,
      ip: req.ip,
      action: 'RESET_USER_AUTH',
    });

    res.json({
      message: 'User authentication has been reset successfully',
      details: 'User will be prompted to set up 2FA on their next login',
    });
  } catch (error) {
    logger.error('Error resetting user authentication:', {
      error: error.message,
      adminUserId: req.user?.userId,
      targetUserId: req.params.id,
      ip: req.ip,
    });
    errorResponses.serverError(res, error);
  }
});

module.exports = router;
