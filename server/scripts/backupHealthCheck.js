#!/usr/bin/env node

/**
 * MongoDB Backup Health Check Script for Mirabel API
 * Validates backup system health, integrity, and sends alerts if issues are found
 */

require('dotenv').config();
const { logger } = require('../utils/logger');
const MongoBackupService = require('../services/mongoBackupService');
const nodemailer = require('nodemailer');

class BackupHealthChecker {
  constructor() {
    this.backupService = new MongoBackupService();
    this.healthStatus = {
      overall: 'unknown',
      checks: {},
      issues: [],
      recommendations: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Initialize health checker
   */
  async initialize() {
    try {
      await this.backupService.initialize();
      logger.info('✅ Backup health checker initialized');
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize backup health checker', error);
      throw error;
    }
  }

  /**
   * Run comprehensive backup health checks
   */
  async runHealthChecks() {
    logger.info('🔍 Starting backup health checks');

    try {
      // Check 1: Backup service configuration
      await this.checkBackupConfiguration();

      // Check 2: Backup directory and permissions
      await this.checkBackupDirectory();

      // Check 3: Available backups and their integrity
      await this.checkBackupIntegrity();

      // Check 4: Backup age and frequency
      await this.checkBackupFreshness();

      // Check 5: Storage space and cleanup
      await this.checkStorageSpace();

      // Check 6: MongoDB tools availability
      await this.checkMongoTools();

      // Determine overall health status
      this.determineOverallHealth();

      logger.info('✅ Backup health checks completed', {
        overall: this.healthStatus.overall,
        issuesCount: this.healthStatus.issues.length,
      });

      return this.healthStatus;
    } catch (error) {
      logger.error('❌ Health check failed', error);
      this.healthStatus.overall = 'critical';
      this.healthStatus.issues.push(`Health check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check backup service configuration
   */
  async checkBackupConfiguration() {
    const check = {
      name: 'Backup Configuration',
      status: 'pass',
      details: {},
      issues: [],
    };

    try {
      // Check if backup is enabled
      const enabled = this.backupService.isEnabled();
      check.details.enabled = enabled;

      if (!enabled) {
        check.status = 'warning';
        check.issues.push('Backup is disabled (DB_BACKUP_ENABLED=false)');
        this.healthStatus.recommendations.push(
          'Enable automated backups by setting DB_BACKUP_ENABLED=true'
        );
      }

      // Check MongoDB URI
      const mongoUri = process.env.MONGODB_URI;
      check.details.mongoUriConfigured = !!mongoUri;

      if (!mongoUri) {
        check.status = 'fail';
        check.issues.push('MONGODB_URI environment variable is not configured');
      }

      // Check backup schedule
      const schedule = this.backupService.getBackupSchedule();
      check.details.schedule = schedule;

      // Check retention policy
      const retention = this.backupService.getRetentionDays();
      check.details.retentionDays = retention;

      if (retention < 7) {
        check.status = 'warning';
        check.issues.push(`Low backup retention period: ${retention} days`);
        this.healthStatus.recommendations.push(
          'Consider increasing backup retention to at least 7 days'
        );
      }
    } catch (error) {
      check.status = 'fail';
      check.issues.push(`Configuration check failed: ${error.message}`);
    }

    this.healthStatus.checks.configuration = check;
  }

  /**
   * Check backup directory and permissions
   */
  async checkBackupDirectory() {
    const check = {
      name: 'Backup Directory',
      status: 'pass',
      details: {},
      issues: [],
    };

    try {
      const fs = require('fs').promises;
      const path = require('path');

      const backupDir = path.join(__dirname, '../../backups/mongodb');
      check.details.directory = backupDir;

      // Check if directory exists
      try {
        await fs.access(backupDir);
        check.details.exists = true;
      } catch (error) {
        check.status = 'fail';
        check.details.exists = false;
        check.issues.push('Backup directory does not exist');
        return;
      }

      // Check directory permissions (try to write a test file)
      try {
        const testFile = path.join(backupDir, '.health-check-test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        check.details.writable = true;
      } catch (error) {
        check.status = 'fail';
        check.details.writable = false;
        check.issues.push('Backup directory is not writable');
      }
    } catch (error) {
      check.status = 'fail';
      check.issues.push(`Directory check failed: ${error.message}`);
    }

    this.healthStatus.checks.directory = check;
  }

  /**
   * Check backup integrity and availability
   */
  async checkBackupIntegrity() {
    const check = {
      name: 'Backup Integrity',
      status: 'pass',
      details: {},
      issues: [],
    };

    try {
      const backups = await this.backupService.listBackups();
      check.details.totalBackups = backups.length;

      if (backups.length === 0) {
        check.status = 'warning';
        check.issues.push('No backup files found');
        this.healthStatus.recommendations.push('Create an initial backup to validate the system');
        return;
      }

      // Check integrity of recent backups (up to 3 most recent)
      const recentBackups = backups.slice(0, 3);
      let validBackups = 0;
      let invalidBackups = 0;

      for (const backup of recentBackups) {
        try {
          const validation = await this.backupService.validateBackup(backup.path);
          if (validation.valid) {
            validBackups++;
          } else {
            invalidBackups++;
            check.issues.push(`Backup validation failed: ${backup.filename}`);
          }
        } catch (error) {
          invalidBackups++;
          check.issues.push(`Cannot validate backup ${backup.filename}: ${error.message}`);
        }
      }

      check.details.validBackups = validBackups;
      check.details.invalidBackups = invalidBackups;

      if (invalidBackups > 0) {
        check.status = invalidBackups >= validBackups ? 'fail' : 'warning';
        this.healthStatus.recommendations.push(
          'Run backup validation and consider recreating invalid backups'
        );
      }

      // Calculate total storage used
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      check.details.totalStorageUsed = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
    } catch (error) {
      check.status = 'fail';
      check.issues.push(`Integrity check failed: ${error.message}`);
    }

    this.healthStatus.checks.integrity = check;
  }

  /**
   * Check backup freshness and frequency
   */
  async checkBackupFreshness() {
    const check = {
      name: 'Backup Freshness',
      status: 'pass',
      details: {},
      issues: [],
    };

    try {
      const backups = await this.backupService.listBackups();

      if (backups.length === 0) {
        check.status = 'fail';
        check.issues.push('No backups available');
        return;
      }

      const newestBackup = backups[0];
      const backupAge = Math.floor((Date.now() - newestBackup.created) / (1000 * 60 * 60 * 24));

      check.details.newestBackupAge = `${backupAge} days`;
      check.details.newestBackupDate = newestBackup.created;

      // Check if backup is too old
      if (backupAge > 7) {
        check.status = 'fail';
        check.issues.push(`Newest backup is ${backupAge} days old - too old`);
        this.healthStatus.recommendations.push('Create a fresh backup immediately');
      } else if (backupAge > 2) {
        check.status = 'warning';
        check.issues.push(`Newest backup is ${backupAge} days old`);
        this.healthStatus.recommendations.push('Verify backup schedule is running correctly');
      }

      // Check backup frequency (look for regular patterns)
      if (backups.length >= 3) {
        const intervals = [];
        for (let i = 0; i < Math.min(5, backups.length - 1); i++) {
          const interval =
            Math.abs(backups[i].created - backups[i + 1].created) / (1000 * 60 * 60 * 24);
          intervals.push(interval);
        }

        const avgInterval =
          intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        check.details.averageBackupInterval = `${avgInterval.toFixed(1)} days`;

        if (avgInterval > 7) {
          check.status = 'warning';
          check.issues.push(
            `Backup frequency appears low (avg ${avgInterval.toFixed(1)} days between backups)`
          );
        }
      }
    } catch (error) {
      check.status = 'fail';
      check.issues.push(`Freshness check failed: ${error.message}`);
    }

    this.healthStatus.checks.freshness = check;
  }

  /**
   * Check storage space and cleanup effectiveness
   */
  async checkStorageSpace() {
    const check = {
      name: 'Storage Management',
      status: 'pass',
      details: {},
      issues: [],
    };

    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const path = require('path');

      const backupDir = path.join(__dirname, '../../backups/mongodb');

      // Get disk usage information (Linux/Mac)
      try {
        const { stdout } = await execAsync(`df -h "${backupDir}"`);
        const lines = stdout.trim().split('\n');
        if (lines.length >= 2) {
          const usage = lines[1].split(/\s+/);
          check.details.diskUsage = {
            filesystem: usage[0],
            size: usage[1],
            used: usage[2],
            available: usage[3],
            usePercentage: usage[4],
          };

          const usePercent = parseInt(usage[4].replace('%', ''));
          if (usePercent > 90) {
            check.status = 'fail';
            check.issues.push(`Disk space critically low: ${usePercent}% used`);
            this.healthStatus.recommendations.push('Free up disk space immediately');
          } else if (usePercent > 80) {
            check.status = 'warning';
            check.issues.push(`Disk space getting low: ${usePercent}% used`);
            this.healthStatus.recommendations.push(
              'Consider cleaning up old files or increasing storage'
            );
          }
        }
      } catch (error) {
        // Disk usage check failed (might be Windows or permission issue)
        check.details.diskUsageError = error.message;
      }

      // Check if cleanup is working effectively
      const backups = await this.backupService.listBackups();
      const retentionDays = this.backupService.getRetentionDays();
      const oldBackups = backups.filter(backup => {
        const age = (Date.now() - backup.created) / (1000 * 60 * 60 * 24);
        return age > retentionDays;
      });

      check.details.oldBackupsFound = oldBackups.length;
      if (oldBackups.length > 5) {
        check.status = 'warning';
        check.issues.push(`Found ${oldBackups.length} backups older than retention policy`);
        this.healthStatus.recommendations.push('Run backup cleanup to remove old files');
      }
    } catch (error) {
      check.status = 'fail';
      check.issues.push(`Storage check failed: ${error.message}`);
    }

    this.healthStatus.checks.storage = check;
  }

  /**
   * Check MongoDB tools availability
   */
  async checkMongoTools() {
    const check = {
      name: 'MongoDB Tools',
      status: 'pass',
      details: {},
      issues: [],
    };

    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Check mongodump
      try {
        const { stdout } = await execAsync('mongodump --version');
        check.details.mongodump = stdout.trim().split('\n')[0];
      } catch (error) {
        check.status = 'fail';
        check.issues.push('mongodump is not available');
        check.details.mongodumpError = error.message;
      }

      // Check mongorestore
      try {
        const { stdout } = await execAsync('mongorestore --version');
        check.details.mongorestore = stdout.trim().split('\n')[0];
      } catch (error) {
        check.status = 'fail';
        check.issues.push('mongorestore is not available');
        check.details.mongorestoreError = error.message;
      }

      // Check gzip (for compression)
      try {
        await execAsync('gzip --version');
        check.details.gzipAvailable = true;
      } catch (error) {
        check.status = 'warning';
        check.issues.push('gzip is not available - backups will not be compressed');
        check.details.gzipAvailable = false;
      }

      if (check.status === 'fail') {
        this.healthStatus.recommendations.push(
          'Install MongoDB Database Tools from https://docs.mongodb.com/database-tools/'
        );
      }
    } catch (error) {
      check.status = 'fail';
      check.issues.push(`Tools check failed: ${error.message}`);
    }

    this.healthStatus.checks.tools = check;
  }

  /**
   * Determine overall health status based on individual checks
   */
  determineOverallHealth() {
    const checks = Object.values(this.healthStatus.checks);
    const failedChecks = checks.filter(check => check.status === 'fail');
    const warningChecks = checks.filter(check => check.status === 'warning');

    // Collect all issues
    checks.forEach(check => {
      this.healthStatus.issues.push(...check.issues);
    });

    if (failedChecks.length > 0) {
      this.healthStatus.overall = 'critical';
    } else if (warningChecks.length > 0) {
      this.healthStatus.overall = 'warning';
    } else {
      this.healthStatus.overall = 'healthy';
    }

    logger.info('📊 Health status determined', {
      overall: this.healthStatus.overall,
      failedChecks: failedChecks.length,
      warningChecks: warningChecks.length,
    });
  }

  /**
   * Send health status email if configured
   */
  async sendHealthAlert() {
    if (this.healthStatus.overall === 'healthy') {
      return; // No need to send alerts for healthy status
    }

    const alertEmail = process.env.SECURITY_ALERT_EMAIL || process.env.BACKUP_ALERT_EMAIL;
    if (!alertEmail) {
      logger.info('📧 No alert email configured, skipping notification');
      return;
    }

    try {
      // Configure email transporter (using existing email settings)
      const transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const subject = `🚨 Mirabel API Backup Health Alert - ${this.healthStatus.overall.toUpperCase()}`;

      let emailBody = `
Backup Health Check Results
==========================

Overall Status: ${this.healthStatus.overall.toUpperCase()}
Timestamp: ${this.healthStatus.timestamp}

Issues Found:
${this.healthStatus.issues.map(issue => `• ${issue}`).join('\n')}

Recommendations:
${this.healthStatus.recommendations.map(rec => `• ${rec}`).join('\n')}

Detailed Check Results:
${Object.values(this.healthStatus.checks)
  .map(
    check => `
${check.name}: ${check.status.toUpperCase()}
${check.issues.length > 0 ? check.issues.map(issue => `  - ${issue}`).join('\n') : '  - No issues found'}
`
  )
  .join('\n')}

Please address these issues promptly to ensure backup system reliability.

---
Mirabel API Backup Health Monitor
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Mirabel API" <no-reply@example.com>',
        to: alertEmail,
        subject: subject,
        text: emailBody,
      });

      logger.info('📧 Health alert email sent', {
        to: alertEmail,
        status: this.healthStatus.overall,
      });
    } catch (error) {
      logger.error('❌ Failed to send health alert email', error);
    }
  }

  /**
   * Generate health report
   */
  generateReport() {
    console.log('🏥 Mirabel API - Backup Health Check Report');
    console.log('==========================================');
    console.log(`Overall Status: ${this.healthStatus.overall.toUpperCase()}`);
    console.log(`Timestamp: ${this.healthStatus.timestamp}`);
    console.log('');

    // Show individual check results
    Object.values(this.healthStatus.checks).forEach(check => {
      const statusIcon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${check.name}: ${check.status.toUpperCase()}`);

      if (check.issues.length > 0) {
        check.issues.forEach(issue => console.log(`   - ${issue}`));
      }

      console.log('');
    });

    if (this.healthStatus.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      this.healthStatus.recommendations.forEach(rec => console.log(`   • ${rec}`));
      console.log('');
    }

    return this.healthStatus;
  }

  /**
   * Main execution function
   */
  async execute() {
    try {
      await this.initialize();
      await this.runHealthChecks();

      // Send alert if needed
      if (this.healthStatus.overall !== 'healthy') {
        await this.sendHealthAlert();
      }

      return this.generateReport();
    } catch (error) {
      logger.error('❌ Backup health check failed', error);
      console.error('❌ Health check failed:', error.message);
      throw error;
    }
  }
}

// Run if called directly
async function main() {
  if (require.main === module) {
    const healthChecker = new BackupHealthChecker();

    try {
      const result = await healthChecker.execute();
      const exitCode = result.overall === 'critical' ? 1 : 0;
      process.exit(exitCode);
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    }
  }
}

main();

module.exports = BackupHealthChecker;
