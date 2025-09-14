/**
 * Temporary Notifications Routes - Quick Fix for Dashboard
 * This provides basic endpoints to prevent 500 errors while we complete the GraphQL migration
 */

const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');

// Apply authentication to all routes (simplified for now)
router.use((req, res, next) => {
  // Basic auth check - in real implementation this would be proper middleware
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
});

/**
 * GET /api/notifications
 * Get user's notifications - temporary empty response
 */
router.get('/', async (req, res) => {
  try {
    logger.info('Notifications endpoint hit - returning empty data (temporary)');

    res.json({
      success: true,
      notifications: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 1,
        hasMore: false,
      },
    });
  } catch (error) {
    logger.error('Error in notifications endpoint:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications - temporary zero response
 */
router.get('/unread-count', async (req, res) => {
  try {
    logger.info('Unread count endpoint hit - returning zero (temporary)');

    res.json({
      success: true,
      unreadCount: 0,
    });
  } catch (error) {
    logger.error('Error in unread-count endpoint:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/notifications
 * Create notification - temporary success response
 */
router.post('/', async (req, res) => {
  try {
    logger.info('Create notification endpoint hit - returning success (temporary)');

    res.status(201).json({
      success: true,
      notification: {
        id: 'temp-' + Date.now(),
        ...req.body,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      message: 'Notification created successfully',
    });
  } catch (error) {
    logger.error('Error in create notification endpoint:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read - temporary success response
 */
router.patch('/:id/read', async (req, res) => {
  try {
    logger.info(`Mark read endpoint hit for ID: ${req.params.id} (temporary)`);

    res.json({
      success: true,
      notification: {
        id: req.params.id,
        isRead: true,
        updatedAt: new Date().toISOString(),
      },
      message: 'Notification marked as read',
    });
  } catch (error) {
    logger.error('Error in mark read endpoint:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read - temporary success response
 */
router.patch('/mark-all-read', async (req, res) => {
  try {
    logger.info('Mark all read endpoint hit (temporary)');

    res.json({
      success: true,
      modifiedCount: 0,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    logger.error('Error in mark all read endpoint:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification - temporary success response
 */
router.delete('/:id', async (req, res) => {
  try {
    logger.info(`Delete notification endpoint hit for ID: ${req.params.id} (temporary)`);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    logger.error('Error in delete notification endpoint:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * DELETE /api/notifications
 * Clear all notifications - temporary success response
 */
router.delete('/', async (req, res) => {
  try {
    logger.info('Clear all notifications endpoint hit (temporary)');

    res.json({
      success: true,
      deletedCount: 0,
      message: 'All notifications cleared',
    });
  } catch (error) {
    logger.error('Error in clear all notifications endpoint:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
