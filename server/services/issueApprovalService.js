/**
 * Issue Approval Service
 * Manages the semi-automated workflow for GitHub issue resolution
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('../middleware/logger');
const { spawn } = require('child_process');

class IssueApprovalService {
  constructor() {
    this.pendingApprovalsFile = path.join(__dirname, '../../pending_approvals.json');
    this.processedIssuesFile = path.join(__dirname, '../../.processed_issues');
    this.commandsFile = path.join(__dirname, '../../pending_claude_commands.txt');
    this.ensureFiles();
  }

  /**
   * Ensure required files exist
   */
  ensureFiles() {
    if (!fs.existsSync(this.pendingApprovalsFile)) {
      fs.writeFileSync(this.pendingApprovalsFile, JSON.stringify([], null, 2));
    }
  }

  /**
   * Add issue for approval
   */
  async addIssueForApproval(issueData) {
    try {
      const approvals = this.getPendingApprovals();

      // Check if already pending approval
      const existing = approvals.find(a => a.issueNumber === issueData.number);
      if (existing) {
        logger.info(`Issue #${issueData.number} already pending approval`);
        return false;
      }

      const approval = {
        issueNumber: issueData.number,
        title: issueData.title,
        url: issueData.url,
        body: issueData.body,
        labels: issueData.labels,
        detectedAt: new Date().toISOString(),
        status: 'pending',
        acceptanceCriteriaGenerated: false,
        claudeCommandReady: false,
      };

      approvals.push(approval);
      fs.writeFileSync(this.pendingApprovalsFile, JSON.stringify(approvals, null, 2));

      logger.info(`✅ Issue #${issueData.number} added for approval: "${issueData.title}"`);
      this.notifyUser(approval);

      return true;
    } catch (error) {
      logger.error(`Error adding issue for approval: ${error.message}`);
      return false;
    }
  }

  /**
   * Update approval status
   */
  updateApprovalStatus(issueNumber, updates) {
    try {
      const approvals = this.getPendingApprovals();
      const approval = approvals.find(a => a.issueNumber === issueNumber);

      if (!approval) {
        logger.error(`Approval not found for issue #${issueNumber}`);
        return false;
      }

      Object.assign(approval, updates);
      fs.writeFileSync(this.pendingApprovalsFile, JSON.stringify(approvals, null, 2));

      logger.info(`Updated approval status for issue #${issueNumber}:`, updates);
      return true;
    } catch (error) {
      logger.error(`Error updating approval status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals() {
    try {
      if (!fs.existsSync(this.pendingApprovalsFile)) {
        return [];
      }
      const content = fs.readFileSync(this.pendingApprovalsFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Error reading pending approvals: ${error.message}`);
      return [];
    }
  }

  /**
   * Approve issue for resolution
   */
  async approveIssue(issueNumber, approvedBy = 'user') {
    try {
      const approvals = this.getPendingApprovals();
      const approval = approvals.find(a => a.issueNumber === issueNumber);

      if (!approval) {
        throw new Error(`Issue #${issueNumber} not found in pending approvals`);
      }

      if (approval.status !== 'pending') {
        throw new Error(
          `Issue #${issueNumber} is not pending approval (status: ${approval.status})`
        );
      }

      // Update approval status
      approval.status = 'approved';
      approval.approvedAt = new Date().toISOString();
      approval.approvedBy = approvedBy;

      fs.writeFileSync(this.pendingApprovalsFile, JSON.stringify(approvals, null, 2));

      // Execute Claude Code resolution
      const success = await this.executeClaudeResolution(issueNumber);

      if (success) {
        approval.status = 'resolving';
        approval.resolutionStartedAt = new Date().toISOString();
        fs.writeFileSync(this.pendingApprovalsFile, JSON.stringify(approvals, null, 2));

        logger.info(`🚀 Issue #${issueNumber} approved and resolution started`);
        return { success: true, message: `Issue #${issueNumber} approved and resolution started` };
      } else {
        approval.status = 'failed';
        approval.failureReason = 'Failed to start Claude Code resolution';
        fs.writeFileSync(this.pendingApprovalsFile, JSON.stringify(approvals, null, 2));

        return { success: false, message: `Failed to start resolution for issue #${issueNumber}` };
      }
    } catch (error) {
      logger.error(`Error approving issue #${issueNumber}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Reject issue
   */
  rejectIssue(issueNumber, reason = 'User rejected', rejectedBy = 'user') {
    try {
      const approvals = this.getPendingApprovals();
      const approval = approvals.find(a => a.issueNumber === issueNumber);

      if (!approval) {
        throw new Error(`Issue #${issueNumber} not found in pending approvals`);
      }

      approval.status = 'rejected';
      approval.rejectedAt = new Date().toISOString();
      approval.rejectedBy = rejectedBy;
      approval.rejectionReason = reason;

      fs.writeFileSync(this.pendingApprovalsFile, JSON.stringify(approvals, null, 2));

      // Add to processed issues to prevent re-polling
      this.addToProcessedIssues(issueNumber);

      logger.info(`❌ Issue #${issueNumber} rejected: ${reason}`);
      return { success: true, message: `Issue #${issueNumber} rejected` };
    } catch (error) {
      logger.error(`Error rejecting issue #${issueNumber}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Execute Claude Code resolution
   */
  async executeClaudeResolution(issueNumber) {
    try {
      logger.info(`Executing Claude Code resolution for issue #${issueNumber}...`);

      const command = `claude "Resolve GitHub issue #${issueNumber}"`;

      // Start Claude Code process
      const claudeProcess = spawn('cmd', ['/c', command], {
        cwd: path.join(__dirname, '../..'),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return new Promise(resolve => {
        let outputBuffer = '';

        claudeProcess.stdout.on('data', data => {
          const output = data.toString();
          outputBuffer += output;
          logger.info(`[Claude Code] ${output.trim()}`);
        });

        claudeProcess.stderr.on('data', data => {
          const error = data.toString();
          logger.error(`[Claude Code Error] ${error.trim()}`);
        });

        claudeProcess.on('exit', code => {
          if (code === 0) {
            logger.info(`✅ Claude Code resolution completed for issue #${issueNumber}`);
            this.updateApprovalStatus(issueNumber, {
              status: 'completed',
              completedAt: new Date().toISOString(),
              claudeOutput: outputBuffer,
            });
            this.addToProcessedIssues(issueNumber);
            resolve(true);
          } else {
            logger.error(
              `❌ Claude Code resolution failed for issue #${issueNumber} with exit code ${code}`
            );
            this.updateApprovalStatus(issueNumber, {
              status: 'failed',
              failedAt: new Date().toISOString(),
              failureReason: `Claude Code exited with code ${code}`,
              claudeOutput: outputBuffer,
            });
            resolve(false);
          }
        });

        claudeProcess.on('error', error => {
          logger.error(`Error spawning Claude Code: ${error.message}`);
          this.updateApprovalStatus(issueNumber, {
            status: 'failed',
            failedAt: new Date().toISOString(),
            failureReason: error.message,
          });
          resolve(false);
        });
      });
    } catch (error) {
      logger.error(`Error executing Claude resolution: ${error.message}`);
      return false;
    }
  }

  /**
   * Add to processed issues file
   */
  addToProcessedIssues(issueNumber) {
    try {
      let processedIssues = [];
      if (fs.existsSync(this.processedIssuesFile)) {
        processedIssues = fs
          .readFileSync(this.processedIssuesFile, 'utf8')
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.trim());
      }

      if (!processedIssues.includes(issueNumber.toString())) {
        processedIssues.push(issueNumber.toString());
        fs.writeFileSync(this.processedIssuesFile, processedIssues.join('\n') + '\n');
      }
    } catch (error) {
      logger.error(`Error adding to processed issues: ${error.message}`);
    }
  }

  /**
   * Notify user about new issue
   */
  notifyUser(approval) {
    const notification = `
🔔 NEW GITHUB ISSUE DETECTED FOR AUTO-RESOLUTION

Issue #${approval.issueNumber}: ${approval.title}
URL: ${approval.url}
Detected: ${new Date(approval.detectedAt).toLocaleString()}

⏳ Status: Pending your approval
🎯 Action: Visit http://localhost:3001/api/issue-poller/pending to review and approve

Commands available:
- GET /api/issue-poller/pending (view pending issues)  
- POST /api/issue-poller/approve/${approval.issueNumber} (approve resolution)
- POST /api/issue-poller/reject/${approval.issueNumber} (reject resolution)
`;

    logger.info(notification);

    // Also write to console for immediate visibility
    console.log('\n' + '='.repeat(80));
    console.log(notification);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Get approval statistics
   */
  getStats() {
    const approvals = this.getPendingApprovals();

    return {
      total: approvals.length,
      pending: approvals.filter(a => a.status === 'pending').length,
      approved: approvals.filter(a => a.status === 'approved').length,
      rejected: approvals.filter(a => a.status === 'rejected').length,
      completed: approvals.filter(a => a.status === 'completed').length,
      failed: approvals.filter(a => a.status === 'failed').length,
      resolving: approvals.filter(a => a.status === 'resolving').length,
    };
  }
}

// Create singleton instance
const issueApprovalService = new IssueApprovalService();

module.exports = issueApprovalService;
