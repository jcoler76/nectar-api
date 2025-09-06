const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const { authMiddleware } = require('../middleware/auth');
const InputValidator = require('../utils/inputValidation');
const { logger } = require('../utils/logger');
const { errorResponses } = require('../utils/errorHandler');

// Apply authentication to all routes
router.use(authMiddleware);

// Validation middleware
const validateNotificationId = InputValidator.createValidationMiddleware({
  params: {
    id: value => InputValidator.validateObjectId(value, 'notification ID'),
  },
});

const validatePaginationQuery = InputValidator.createValidationMiddleware({
  query: {
    page: value => (value ? InputValidator.validatePositiveInteger(value, 'page') : undefined),
    limit: value => (value ? InputValidator.validatePositiveInteger(value, 'limit') : undefined),
    unreadOnly: value => (value ? InputValidator.validateBoolean(value, 'unreadOnly') : undefined),
    type: value =>
      value
        ? InputValidator.validateEnum(
            value,
            ['system', 'workflow', 'security', 'user_message'],
            'type'
          )
        : undefined,
  },
});

const validateCreateNotification = InputValidator.createValidationMiddleware({
  body: {
    type: value =>
      InputValidator.validateEnum(
        value,
        ['system', 'workflow', 'security', 'user_message'],
        'type'
      ),
    priority: value =>
      value ? InputValidator.validateEnum(value, ['high', 'medium', 'low'], 'priority') : undefined,
    title: value =>
      InputValidator.validateString(value, {
        minLength: 1,
        maxLength: 200,
        fieldName: 'title',
      }),
    message: value =>
      InputValidator.validateString(value, {
        minLength: 1,
        maxLength: 1000,
        fieldName: 'message',
      }),
    actionUrl: value =>
      value
        ? InputValidator.validateString(value, {
            maxLength: 500,
            fieldName: 'actionUrl',
          })
        : undefined,
    actionText: value =>
      value
        ? InputValidator.validateString(value, {
            maxLength: 50,
            fieldName: 'actionText',
          })
        : undefined,
  },
});

/**
 * GET /api/notifications
 * Get user's notifications with pagination and filtering
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 20, 50), // Max 50 per page
      unreadOnly: req.query.unreadOnly === 'true',
      type: req.query.type,
    };

    const result = await NotificationService.getUserNotifications(userId, options);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json(errorResponses.internalError);
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await NotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json(errorResponses.internalError);
  }
});

/**
 * POST /api/notifications
 * Create a new notification (for testing/admin purposes)
 */
router.post('/', validateCreateNotification, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationData = {
      userId,
      ...req.body,
    };

    const notification = await NotificationService.createNotification(notificationData);

    res.status(201).json({
      success: true,
      notification,
      message: 'Notification created successfully',
    });
  } catch (error) {
    logger.error('Error creating notification:', error);
    if (error.message.includes('Missing required notification fields')) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json(errorResponses.internalError);
    }
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.patch('/:id/read', validateNotificationId, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await NotificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      notification,
      message: 'Notification marked as read',
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    if (error.message === 'Notification not found') {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    } else {
      res.status(500).json(errorResponses.internalError);
    }
  }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read for the user
 */
router.patch('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await NotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json(errorResponses.internalError);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
router.delete('/:id', validateNotificationId, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    await NotificationService.deleteNotification(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    if (error.message === 'Notification not found') {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    } else {
      res.status(500).json(errorResponses.internalError);
    }
  }
});

/**
 * DELETE /api/notifications
 * Clear all notifications for the user
 */
router.delete('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await NotificationService.clearAllNotifications(userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error clearing all notifications:', error);
    res.status(500).json(errorResponses.internalError);
  }
});

module.exports = router;
