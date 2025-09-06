const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All activity log routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/activity-logs
 * @desc    Get activity logs with filtering and pagination
 * @access  Private (Admin or Monitor role required)
 * @query   {string} page - Page number (default: 1)
 * @query   {string} limit - Results per page (default: 50, max: 1000)
 * @query   {string} startDate - Filter by start date (ISO string)
 * @query   {string} endDate - Filter by end date (ISO string)
 * @query   {string} success - Filter by success status ('true'/'false')
 * @query   {string} method - Filter by HTTP method
 * @query   {string} endpoint - Filter by endpoint pattern
 * @query   {string} category - Filter by category (api, workflow, webhook, admin, auth) - comma-separated
 * @query   {string} endpointType - Filter by endpoint type (client, developer, internal, public)
 * @query   {string} importance - Filter by importance level (critical, high, medium, low) - comma-separated
 * @query   {string} userId - Filter by user ID
 * @query   {string} userEmail - Filter by user email (partial match)
 * @query   {string} errorType - Filter by error type
 * @query   {string} responseStatus - Filter by response status code
 * @query   {string} minDuration - Filter by minimum duration (ms)
 * @query   {string} maxDuration - Filter by maximum duration (ms)
 * @query   {string} search - Text search across multiple fields
 * @query   {string} sort - Sort field and direction (default: '-timestamp')
 */
router.get('/', adminOnly, activityLogController.getLogs);

/**
 * @route   GET /api/activity-logs/statistics
 * @desc    Get activity log statistics and summary
 * @access  Private (Admin or Monitor role required)
 * @query   {string} timeframe - Time period ('1h', '24h', '7d', '30d')
 */
router.get('/statistics', adminOnly, activityLogController.getStatistics);

/**
 * @route   GET /api/activity-logs/export
 * @desc    Export activity logs as CSV or JSON
 * @access  Private (Admin role required)
 * @query   {string} format - Export format ('csv' or 'json')
 * @query   {string} startDate - Filter by start date
 * @query   {string} endDate - Filter by end date
 * @query   {string} success - Filter by success status
 * @query   {string} method - Filter by HTTP method
 * @query   {string} endpoint - Filter by endpoint pattern
 * @query   {string} category - Filter by category
 */
router.get('/export', adminOnly, activityLogController.exportLogs);

/**
 * @route   GET /api/activity-logs/:id
 * @desc    Get a specific activity log by ID
 * @access  Private (Admin or Monitor role required)
 * @param   {string} id - Activity log ID
 */
router.get('/:id', adminOnly, activityLogController.getLogById);

/**
 * @route   DELETE /api/activity-logs/cleanup
 * @desc    Delete old activity logs (cleanup)
 * @access  Private (Admin role required)
 * @body    {string} olderThan - Delete logs older than ('30d', '60d', '90d', '180d', '1y')
 */
router.delete('/cleanup', adminOnly, activityLogController.cleanupLogs);

module.exports = router;
