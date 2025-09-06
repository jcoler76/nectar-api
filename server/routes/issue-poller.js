/**
 * GitHub Issue Poller API Routes
 * Development-only endpoints for managing issue polling
 */

const express = require('express');
const router = express.Router();
const githubIssuePoller = require('../services/githubIssuePoller');
const issueApprovalService = require('../services/issueApprovalService');
const { logger } = require('../middleware/logger');

// Only enable routes in development
if (process.env.NODE_ENV === 'development') {
  /**
   * GET /api/issue-poller/status
   * Get current poller status
   */
  router.get('/status', (req, res) => {
    try {
      const status = githubIssuePoller.getStatus();
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Error getting poller status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get poller status',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/issue-poller/start
   * Start the issue poller
   */
  router.post('/start', (req, res) => {
    try {
      githubIssuePoller.start();
      const status = githubIssuePoller.getStatus();

      res.json({
        success: true,
        message: 'Issue poller started',
        data: status,
      });
    } catch (error) {
      logger.error('Error starting poller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start poller',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/issue-poller/stop
   * Stop the issue poller
   */
  router.post('/stop', (req, res) => {
    try {
      githubIssuePoller.stop();
      const status = githubIssuePoller.getStatus();

      res.json({
        success: true,
        message: 'Issue poller stopped',
        data: status,
      });
    } catch (error) {
      logger.error('Error stopping poller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop poller',
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/issue-poller/interval
   * Update poll interval
   */
  router.put('/interval', (req, res) => {
    try {
      const { interval } = req.body;

      if (!interval || interval < 60) {
        return res.status(400).json({
          success: false,
          message: 'Interval must be at least 60 seconds',
        });
      }

      githubIssuePoller.setPollInterval(interval);
      const status = githubIssuePoller.getStatus();

      res.json({
        success: true,
        message: `Poll interval updated to ${interval}s (restart required)`,
        data: status,
      });
    } catch (error) {
      logger.error('Error updating poll interval:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update poll interval',
        error: error.message,
      });
    }
  });

  // === APPROVAL WORKFLOW ENDPOINTS ===

  /**
   * GET /api/issue-poller/pending
   * Get pending issue approvals
   */
  router.get('/pending', (req, res) => {
    try {
      const pending = issueApprovalService.getPendingApprovals();
      const stats = issueApprovalService.getStats();

      res.json({
        success: true,
        data: {
          pending: pending,
          stats: stats,
        },
      });
    } catch (error) {
      logger.error('Error getting pending approvals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pending approvals',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/issue-poller/approve/:issueNumber
   * Approve an issue for resolution
   */
  router.post('/approve/:issueNumber', async (req, res) => {
    try {
      const { issueNumber } = req.params;
      const result = await issueApprovalService.approveIssue(parseInt(issueNumber));

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Error approving issue:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve issue',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/issue-poller/reject/:issueNumber
   * Reject an issue
   */
  router.post('/reject/:issueNumber', (req, res) => {
    try {
      const { issueNumber } = req.params;
      const { reason } = req.body;

      const result = issueApprovalService.rejectIssue(
        parseInt(issueNumber),
        reason || 'User rejected'
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Error rejecting issue:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject issue',
        error: error.message,
      });
    }
  });

  /**
   * GET /api/issue-poller/stats
   * Get approval statistics
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = issueApprovalService.getStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get stats',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/issue-poller/submit-for-approval
   * Submit an issue for approval workflow
   */
  router.post('/submit-for-approval', async (req, res) => {
    try {
      const issueData = req.body;

      if (!issueData.number || !issueData.title) {
        return res.status(400).json({
          success: false,
          message: 'Issue number and title are required',
        });
      }

      const result = await issueApprovalService.addIssueForApproval(issueData);

      res.json({
        success: result,
        message: result ? 'Issue submitted for approval' : 'Issue already pending approval',
      });
    } catch (error) {
      logger.error('Error submitting issue for approval:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit issue for approval',
        error: error.message,
      });
    }
  });
} else {
  // Production mode - return 404 for all routes
  router.all('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Issue poller endpoints not available in production',
    });
  });
}

module.exports = router;
