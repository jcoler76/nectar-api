/**
 * GitHub Issue Polling Service for Development
 * Automatically polls for GitHub issues with "auto-resolve" label
 * Runs ONLY in development mode - never in production
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { logger } = require('../middleware/logger');

class GitHubIssuePoller {
  constructor() {
    this.pollerProcess = null;
    this.isRunning = false;
    this.pollInterval = 300; // 5 minutes default
    this.enabled =
      process.env.NODE_ENV === 'development' && process.env.GITHUB_ISSUE_POLLING === 'true';
  }

  /**
   * Start the issue polling service
   */
  start() {
    if (!this.enabled) {
      logger.info('GitHub issue polling disabled (not in development mode or explicitly disabled)');
      return;
    }

    if (this.isRunning) {
      logger.warn('GitHub issue poller already running');
      return;
    }

    try {
      logger.info('🔄 Starting GitHub issue polling service...');

      // Path to the enhanced issue poller script
      const pollerScript = path.join(__dirname, '../../scripts/enhanced-issue-poller.ps1');

      // Verify the script exists
      if (!fs.existsSync(pollerScript)) {
        logger.error(`Issue poller script not found: ${pollerScript}`);
        return;
      }

      // Start the PowerShell process
      this.pollerProcess = spawn(
        'powershell',
        [
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          pollerScript,
          '-PollInterval',
          this.pollInterval.toString(),
          '-ApiUrl',
          `http://localhost:${process.env.PORT || 3001}`,
        ],
        {
          cwd: path.join(__dirname, '../..'),
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );

      this.isRunning = true;

      // Handle process output
      this.pollerProcess.stdout.on('data', data => {
        const output = data.toString().trim();
        if (output) {
          logger.info(`[Issue Poller] ${output}`);
        }
      });

      this.pollerProcess.stderr.on('data', data => {
        const error = data.toString().trim();
        if (error && !error.includes('WARNING:')) {
          logger.error(`[Issue Poller Error] ${error}`);
        }
      });

      // Handle process exit
      this.pollerProcess.on('exit', code => {
        this.isRunning = false;
        if (code === 0) {
          logger.info('GitHub issue poller stopped normally');
        } else {
          logger.error(`GitHub issue poller exited with code ${code}`);
        }
      });

      // Handle process errors
      this.pollerProcess.on('error', error => {
        this.isRunning = false;
        logger.error(`Failed to start GitHub issue poller: ${error.message}`);
      });

      logger.info(`✅ GitHub issue poller started (polling every ${this.pollInterval}s)`);
    } catch (error) {
      logger.error(`Error starting GitHub issue poller: ${error.message}`);
    }
  }

  /**
   * Stop the issue polling service
   */
  stop() {
    if (!this.isRunning || !this.pollerProcess) {
      return;
    }

    try {
      logger.info('🛑 Stopping GitHub issue polling service...');

      // Kill the PowerShell process
      this.pollerProcess.kill('SIGTERM');

      // Force kill after 5 seconds if it doesn't stop gracefully
      setTimeout(() => {
        if (this.pollerProcess && !this.pollerProcess.killed) {
          this.pollerProcess.kill('SIGKILL');
        }
      }, 5000);

      this.isRunning = false;
      logger.info('GitHub issue poller stopped');
    } catch (error) {
      logger.error(`Error stopping GitHub issue poller: ${error.message}`);
    }
  }

  /**
   * Check if the poller is currently running
   */
  getStatus() {
    return {
      enabled: this.enabled,
      running: this.isRunning,
      pollInterval: this.pollInterval,
      environment: process.env.NODE_ENV,
    };
  }

  /**
   * Update poll interval (requires restart)
   */
  setPollInterval(interval) {
    this.pollInterval = Math.max(60, interval); // Minimum 1 minute
    logger.info(`Poll interval updated to ${this.pollInterval}s (restart required)`);
  }
}

// Create singleton instance
const githubIssuePoller = new GitHubIssuePoller();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  githubIssuePoller.stop();
});

process.on('SIGINT', () => {
  githubIssuePoller.stop();
});

module.exports = githubIssuePoller;
