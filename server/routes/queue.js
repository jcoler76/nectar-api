const express = require('express');
const logger = require('../utils/logger');
const router = express.Router();
const { getMessageQueue } = require('../services/messageQueue');

/**
 * Get queue statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const messageQueue = getMessageQueue();
    const stats = await messageQueue.getQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting queue stats:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
    });
  }
});

/**
 * Pause all queues
 */
router.post('/pause', async (req, res) => {
  try {
    const messageQueue = getMessageQueue();
    await messageQueue.pauseAll();

    res.json({
      success: true,
      message: 'All queues paused',
    });
  } catch (error) {
    logger.error('Error pausing queues:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to pause queues',
    });
  }
});

/**
 * Resume all queues
 */
router.post('/resume', async (req, res) => {
  try {
    const messageQueue = getMessageQueue();
    await messageQueue.resumeAll();

    res.json({
      success: true,
      message: 'All queues resumed',
    });
  } catch (error) {
    logger.error('Error resuming queues:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to resume queues',
    });
  }
});

/**
 * Manually trigger a database event (for testing)
 */
router.post('/test-event', async (req, res) => {
  try {
    const { eventType, table, database, connectionId, data } = req.body;

    if (!eventType || !table || !database || !connectionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: eventType, table, database, connectionId',
      });
    }

    const messageQueue = getMessageQueue();
    const job = await messageQueue.addDatabaseEvent({
      eventType,
      table,
      database,
      connectionId,
      data: data || { test: true, timestamp: new Date() },
      sourceWorkflowId: null, // No source workflow for manual tests
    });

    res.json({
      success: true,
      message: 'Test event added to queue',
      jobId: job.id,
    });
  } catch (error) {
    logger.error('Error adding test event:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to add test event',
    });
  }
});

module.exports = router;
