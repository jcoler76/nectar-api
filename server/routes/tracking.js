const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const trackingService = require('../services/trackingService');
const { logger } = require('../utils/logger');
const AuthFactory = require('../middleware/authFactory');

// Helper function to extract client information
const getClientInfo = req => {
  const ipAddress =
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown';

  const userAgent = req.headers['user-agent'] || 'unknown';

  return { ipAddress, userAgent };
};

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

// Validation rules for app usage tracking
const appUsageValidation = [
  body('sessionId')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('SessionId is required (max 255 chars)'),
  body('eventType')
    .isString()
    .isIn(['click', 'page_view', 'feature_use', 'form_submit', 'search', 'download'])
    .withMessage('Invalid event type'),
  body('page')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Page is required (max 255 chars)'),
  body('elementId')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('ElementId max 255 chars'),
  body('elementText')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('ElementText max 500 chars'),
  body('elementPath')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('ElementPath max 1000 chars'),
  body('referrerPage')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('ReferrerPage max 255 chars'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  body('pageLoadTime')
    .optional()
    .isInt({ min: 0, max: 300000 })
    .withMessage('PageLoadTime must be 0-300000ms'),
  body('timeOnPage')
    .optional()
    .isInt({ min: 0, max: 86400 })
    .withMessage('TimeOnPage must be 0-86400 seconds'),
];

// Validation rules for batch tracking
const batchTrackingValidation = [
  body('events').isArray({ min: 1, max: 100 }).withMessage('Events array required (1-100 items)'),
  body('events.*.sessionId')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Each event needs valid sessionId'),
  body('events.*.eventType')
    .isString()
    .isIn(['click', 'page_view', 'feature_use', 'form_submit', 'search', 'download'])
    .withMessage('Each event needs valid eventType'),
  body('events.*.page')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Each event needs valid page'),
];

/**
 * POST /api/tracking/app-usage
 * Track a single application usage event
 */
router.post('/app-usage', appUsageValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      sessionId,
      eventType,
      elementId,
      elementText,
      elementPath,
      page,
      referrerPage,
      metadata,
      pageLoadTime,
      timeOnPage,
    } = req.body;

    const { ipAddress, userAgent } = getClientInfo(req);

    // Extract user info from auth if available (optional)
    let userId = null;
    let organizationId = null;

    if (req.user) {
      userId = req.user.userId;
      organizationId = req.user.organizationId;
    }

    const result = await trackingService.trackAppUsage({
      sessionId,
      userId,
      organizationId,
      eventType,
      elementId,
      elementText,
      elementPath,
      page,
      referrerPage,
      userAgent,
      ipAddress,
      metadata,
      pageLoadTime,
      timeOnPage,
    });

    res.status(201).json({
      success: true,
      message: 'App usage tracked successfully',
      data: { id: result.id },
    });
  } catch (error) {
    logger.error('Failed to track app usage', {
      error: error.message,
      body: req.body,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to track app usage',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/tracking/batch
 * Track multiple app usage events in a single request
 */
router.post('/batch', batchTrackingValidation, handleValidationErrors, async (req, res) => {
  try {
    const { events } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    // Extract user info from auth if available (optional)
    let userId = null;
    let organizationId = null;

    if (req.user) {
      userId = req.user.userId;
      organizationId = req.user.organizationId;
    }

    // Enhance each event with common data
    const enhancedEvents = events.map(event => ({
      ...event,
      userId,
      organizationId,
      userAgent,
      ipAddress,
    }));

    const result = await trackingService.trackAppUsageBatch(enhancedEvents);

    res.status(201).json({
      success: true,
      message: 'Batch tracking completed successfully',
      data: {
        processed: result.count,
        submitted: events.length,
      },
    });
  } catch (error) {
    logger.error('Failed to track batch app usage', {
      error: error.message,
      eventCount: req.body.events?.length || 0,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to track batch app usage',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/tracking/session/:sessionId
 * Get tracking data for a specific session (admin only)
 */
router.get(
  '/session/:sessionId',
  AuthFactory.createAuthMiddleware(['ADMIN', 'SUPER_ADMIN']),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      if (!sessionId || sessionId.length > 255) {
        return res.status(400).json({
          success: false,
          message: 'Valid sessionId is required',
        });
      }

      // Note: Using standard @prisma/client import as per CLAUDE.md
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const sessionData = await prisma.appUsageLog.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: {
          sessionId,
          events: sessionData,
          totalEvents: sessionData.length,
          hasMore: sessionData.length === parseInt(limit),
        },
      });
    } catch (error) {
      logger.error('Failed to get session tracking data', {
        error: error.message,
        sessionId: req.params.sessionId,
        adminId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve session data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/tracking/analytics/app-usage
 * Get app usage analytics (admin only)
 */
router.get(
  '/analytics/app-usage',
  AuthFactory.createAuthMiddleware(['ADMIN', 'SUPER_ADMIN']),
  async (req, res) => {
    try {
      const { startDate, endDate, organizationId, userId, eventType, page } = req.query;

      const filters = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (organizationId) filters.organizationId = organizationId;
      if (userId) filters.userId = userId;
      if (eventType) filters.eventType = eventType;
      if (page) filters.page = page;

      const analytics = await trackingService.getAppUsageAnalytics(filters);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Failed to get app usage analytics', {
        error: error.message,
        filters: req.query,
        adminId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/tracking/analytics/login
 * Get login analytics (admin only)
 */
router.get(
  '/analytics/login',
  AuthFactory.createAuthMiddleware(['ADMIN', 'SUPER_ADMIN']),
  async (req, res) => {
    try {
      const { startDate, endDate, organizationId, loginType } = req.query;

      const filters = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (organizationId) filters.organizationId = organizationId;
      if (loginType) filters.loginType = loginType;

      const analytics = await trackingService.getLoginAnalytics(filters);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Failed to get login analytics', {
        error: error.message,
        filters: req.query,
        adminId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve login analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/tracking/cleanup
 * Clean up old tracking data (super admin only)
 */
router.post('/cleanup', AuthFactory.createAuthMiddleware(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { retentionDays = 90 } = req.body;

    if (retentionDays < 1 || retentionDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Retention days must be between 1 and 365',
      });
    }

    const result = await trackingService.cleanupOldData(retentionDays);

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Failed to cleanup tracking data', {
      error: error.message,
      retentionDays: req.body.retentionDays,
      adminId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to cleanup tracking data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

module.exports = router;
