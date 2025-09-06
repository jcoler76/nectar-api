/**
 * MongoDB Backup Service for Mirabel API
 * Provides backup management functionality with logging, scheduling, and monitoring
 */

const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../utils/logger');
const { getMessageQueue } = require('./messageQueue');
const MongoBackup = require('../scripts/mongoBackup');
const MongoRestore = require('../scripts/mongoRestore');

class MongoBackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups/mongodb');
    this.isBackupInProgress = false;
    this.lastBackupResult = null;
    this.backupHistory = [];
    this.maxHistoryLength = 100;
  }

  /**
   * Initialize backup service
   */
  async initialize() {
    try {
      // Create backup directory if it doesn't exist
      await fs.mkdir(this.backupDir, { recursive: true });

      // Load backup history
      await this.loadBackupHistory();

      logger.info('✅ MongoDB Backup Service initialized', {
        backupDir: this.backupDir,
        historyCount: this.backupHistory.length,
      });

      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize MongoDB Backup Service', error);
      throw error;
    }
  }

  /**
   * Check if backup functionality is enabled
   */
  isEnabled() {
    return process.env.DB_BACKUP_ENABLED === 'true';
  }

  /**
   * Get backup schedule from environment
   */
  getBackupSchedule() {
    return process.env.DB_BACKUP_SCHEDULE || '0 2 * * *'; // Default: 2 AM daily
  }

  /**
   * Get retention period from environment
   */
  getRetentionDays() {
    return parseInt(process.env.DB_BACKUP_RETENTION_DAYS) || 30;
  }

  /**
   * Load backup history from file or create new
   */
  async loadBackupHistory() {
    try {
      const historyFile = path.join(this.backupDir, 'backup-history.json');

      try {
        const historyData = await fs.readFile(historyFile, 'utf8');
        this.backupHistory = JSON.parse(historyData);
        logger.info('📋 Loaded backup history', { count: this.backupHistory.length });
      } catch (error) {
        // File doesn't exist, start with empty history
        this.backupHistory = [];
        await this.saveBackupHistory();
      }
    } catch (error) {
      logger.error('❌ Error loading backup history', error);
      this.backupHistory = [];
    }
  }

  /**
   * Save backup history to file
   */
  async saveBackupHistory() {
    try {
      const historyFile = path.join(this.backupDir, 'backup-history.json');

      // Keep only the most recent entries
      if (this.backupHistory.length > this.maxHistoryLength) {
        this.backupHistory = this.backupHistory.slice(-this.maxHistoryLength);
      }

      await fs.writeFile(historyFile, JSON.stringify(this.backupHistory, null, 2));
    } catch (error) {
      logger.error('❌ Error saving backup history', error);
    }
  }

  /**
   * Add entry to backup history
   */
  addToHistory(entry) {
    const historyEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.backupHistory.push(historyEntry);
    this.saveBackupHistory();

    logger.info('📝 Added entry to backup history', {
      type: entry.type,
      success: entry.success,
    });
  }

  /**
   * Create a new backup
   */
  async createBackup(options = {}) {
    if (this.isBackupInProgress) {
      const error = new Error('Backup is already in progress');
      logger.warn('⚠️ Backup creation skipped - already in progress');
      throw error;
    }

    this.isBackupInProgress = true;
    const startTime = Date.now();

    try {
      logger.info('🔄 Starting scheduled MongoDB backup');

      const backup = new MongoBackup();
      const result = await backup.execute();

      const duration = Date.now() - startTime;
      this.lastBackupResult = {
        ...result,
        duration,
        timestamp: new Date().toISOString(),
        success: true,
      };

      // Add to history
      this.addToHistory({
        type: 'backup',
        success: true,
        backupPath: result.backupPath,
        size: result.size,
        duration,
        ...result,
      });

      // Queue notification if configured
      await this.queueSuccessNotification(this.lastBackupResult);

      logger.info('✅ MongoDB backup completed successfully', {
        duration: `${duration}ms`,
        size: `${(result.size / (1024 * 1024)).toFixed(2)} MB`,
        backupPath: result.backupPath,
      });

      return this.lastBackupResult;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.lastBackupResult = {
        success: false,
        error: error.message,
        duration,
        timestamp: new Date().toISOString(),
      };

      // Add to history
      this.addToHistory({
        type: 'backup',
        success: false,
        error: error.message,
        duration,
      });

      // Queue failure notification
      await this.queueFailureNotification(error, duration);

      logger.error('❌ MongoDB backup failed', {
        duration: `${duration}ms`,
        error: error.message,
      });

      throw error;
    } finally {
      this.isBackupInProgress = false;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupFile, options = {}) {
    try {
      logger.info('🔄 Starting MongoDB restore', { backupFile, options });

      const restore = new MongoRestore();
      const result = await restore.executeRestore(backupFile, options);

      // Add to history
      this.addToHistory({
        type: 'restore',
        success: true,
        backupFile,
        options,
        ...result,
      });

      logger.info('✅ MongoDB restore completed successfully', {
        backupFile,
        dropped: options.dropDatabase,
      });

      return result;
    } catch (error) {
      // Add to history
      this.addToHistory({
        type: 'restore',
        success: false,
        error: error.message,
        backupFile,
        options,
      });

      logger.error('❌ MongoDB restore failed', {
        error: error.message,
        backupFile,
      });

      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const backup = new MongoBackup();
      return await backup.listBackups();
    } catch (error) {
      logger.error('❌ Error listing backups', error);
      throw error;
    }
  }

  /**
   * Get backup status and health information
   */
  async getBackupStatus() {
    try {
      const backups = await this.listBackups();
      const recentHistory = this.backupHistory.slice(-10);

      const status = {
        enabled: this.isEnabled(),
        schedule: this.getBackupSchedule(),
        retentionDays: this.getRetentionDays(),
        backupInProgress: this.isBackupInProgress,
        lastBackupResult: this.lastBackupResult,
        availableBackups: backups.length,
        totalBackupSize: backups.reduce((sum, backup) => sum + backup.size, 0),
        recentHistory: recentHistory,
        backupDirectory: this.backupDir,
        oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
        newestBackup: backups.length > 0 ? backups[0].created : null,
      };

      logger.info('📊 Generated backup status report', {
        enabled: status.enabled,
        availableBackups: status.availableBackups,
        lastBackup: this.lastBackupResult?.timestamp,
      });

      return status;
    } catch (error) {
      logger.error('❌ Error getting backup status', error);
      throw error;
    }
  }

  /**
   * Cleanup old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      logger.info('🧹 Starting backup cleanup process');

      const backup = new MongoBackup();
      const result = await backup.cleanupOldBackups();

      // Add to history
      this.addToHistory({
        type: 'cleanup',
        success: true,
        deletedCount: result.deletedCount,
        deletedSizeInMB: result.deletedSizeInMB,
      });

      logger.info('✅ Backup cleanup completed', result);

      return result;
    } catch (error) {
      // Add to history
      this.addToHistory({
        type: 'cleanup',
        success: false,
        error: error.message,
      });

      logger.error('❌ Backup cleanup failed', error);
      throw error;
    }
  }

  /**
   * Validate backup integrity
   */
  async validateBackup(backupPath) {
    try {
      logger.info('🔍 Validating backup integrity', { backupPath });

      const restore = new MongoRestore();
      await restore.validateBackupFile(backupPath);

      logger.info('✅ Backup validation passed', { backupPath });
      return { valid: true, backupPath };
    } catch (error) {
      logger.error('❌ Backup validation failed', { error: error.message, backupPath });
      return { valid: false, error: error.message, backupPath };
    }
  }

  /**
   * Queue success notification
   */
  async queueSuccessNotification(result) {
    try {
      const messageQueue = await getMessageQueue();
      await messageQueue.add('backup-success-notification', {
        type: 'backup-success',
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('❌ Failed to queue success notification', error);
    }
  }

  /**
   * Queue failure notification
   */
  async queueFailureNotification(error, duration) {
    try {
      const messageQueue = await getMessageQueue();
      await messageQueue.add(
        'backup-failure-notification',
        {
          type: 'backup-failure',
          error: error.message,
          duration,
          timestamp: new Date().toISOString(),
        },
        {
          priority: 'high',
          attempts: 3,
        }
      );
    } catch (queueError) {
      logger.error('❌ Failed to queue failure notification', queueError);
    }
  }

  /**
   * Get backup history
   */
  getHistory(limit = 50) {
    return this.backupHistory.slice(-limit);
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    const status = await this.getBackupStatus();

    const health = {
      healthy: true,
      issues: [],
      lastBackup: this.lastBackupResult,
      enabled: status.enabled,
    };

    // Check if backups are enabled but none exist
    if (status.enabled && status.availableBackups === 0) {
      health.healthy = false;
      health.issues.push('No backup files found but backup is enabled');
    }

    // Check if last backup failed
    if (this.lastBackupResult && !this.lastBackupResult.success) {
      health.healthy = false;
      health.issues.push(`Last backup failed: ${this.lastBackupResult.error}`);
    }

    // Check if last backup is too old
    const maxAge = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
    if (this.lastBackupResult && this.lastBackupResult.timestamp) {
      const lastBackupAge = Date.now() - new Date(this.lastBackupResult.timestamp).getTime();
      if (lastBackupAge > maxAge) {
        health.healthy = false;
        health.issues.push(
          `Last backup is ${Math.floor(lastBackupAge / (24 * 60 * 60 * 1000))} days old`
        );
      }
    }

    return health;
  }
}

module.exports = MongoBackupService;
