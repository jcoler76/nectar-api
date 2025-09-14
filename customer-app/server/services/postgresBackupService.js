/**
 * PostgreSQL Backup Service for Nectar API
 * Provides backup management with logging, scheduling, and monitoring
 */

const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../utils/logger');
const { getMessageQueue } = require('./messageQueue');
const PostgresBackup = require('../scripts/pgBackup');

class PostgresBackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups/postgres');
    this.isBackupInProgress = false;
    this.lastBackupResult = null;
    this.backupHistory = [];
    this.maxHistoryLength = 100;
  }

  async initialize() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await this.loadBackupHistory();

      logger.info('PostgreSQL Backup Service initialized', {
        backupDir: this.backupDir,
        historyCount: this.backupHistory.length,
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize PostgreSQL Backup Service', error);
      throw error;
    }
  }

  isEnabled() {
    return process.env.DB_BACKUP_ENABLED === 'true';
  }

  getBackupSchedule() {
    return process.env.DB_BACKUP_SCHEDULE || '0 2 * * *';
  }

  getRetentionDays() {
    return parseInt(process.env.DB_BACKUP_RETENTION_DAYS) || 30;
  }

  async loadBackupHistory() {
    try {
      const historyFile = path.join(this.backupDir, 'backup-history.json');

      try {
        const historyData = await fs.readFile(historyFile, 'utf8');
        this.backupHistory = JSON.parse(historyData);
        logger.info('Loaded backup history', { count: this.backupHistory.length });
      } catch (_e) {
        this.backupHistory = [];
        await this.saveBackupHistory();
      }
    } catch (error) {
      logger.error('Error loading backup history', error);
      this.backupHistory = [];
    }
  }

  async saveBackupHistory() {
    try {
      const historyFile = path.join(this.backupDir, 'backup-history.json');
      if (this.backupHistory.length > this.maxHistoryLength) {
        this.backupHistory = this.backupHistory.slice(-this.maxHistoryLength);
      }
      await fs.writeFile(historyFile, JSON.stringify(this.backupHistory, null, 2));
    } catch (error) {
      logger.error('Error saving backup history', error);
    }
  }

  addToHistory(entry) {
    const historyEntry = { timestamp: new Date().toISOString(), ...entry };
    this.backupHistory.push(historyEntry);
    this.saveBackupHistory();
  }

  async createBackup(options = {}) {
    if (this.isBackupInProgress) {
      const error = new Error('Backup is already in progress');
      logger.warn('Backup creation skipped - already in progress');
      throw error;
    }

    this.isBackupInProgress = true;
    const startTime = Date.now();

    try {
      logger.info('Starting scheduled PostgreSQL backup');

      const backup = new PostgresBackup();
      const result = await backup.execute(options);

      const duration = Date.now() - startTime;
      this.lastBackupResult = {
        ...result,
        duration,
        timestamp: new Date().toISOString(),
        success: true,
      };

      this.addToHistory({
        type: 'backup',
        success: true,
        backupPath: result.backupPath,
        size: result.size,
        duration,
        ...result,
      });
      await this.queueSuccessNotification(this.lastBackupResult);

      logger.info('PostgreSQL backup completed successfully', {
        duration: `${duration}ms`,
        sizeMB: (result.size / (1024 * 1024)).toFixed(2),
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
      this.addToHistory({ type: 'backup', success: false, error: error.message, duration });
      await this.queueFailureNotification(error, duration);
      logger.error('PostgreSQL backup failed', { duration: `${duration}ms`, error: error.message });
      throw error;
    } finally {
      this.isBackupInProgress = false;
    }
  }

  async listBackups() {
    try {
      const backup = new PostgresBackup();
      return await backup.listBackups();
    } catch (error) {
      logger.error('Error listing backups', error);
      throw error;
    }
  }

  async cleanupOldBackups() {
    try {
      logger.info('Starting PostgreSQL backup cleanup process');
      const backup = new PostgresBackup();
      const result = await backup.cleanupOldBackups();
      this.addToHistory({
        type: 'cleanup',
        success: true,
        deletedCount: result.deletedCount,
        deletedSizeInMB: result.deletedSizeInMB,
      });
      logger.info('Backup cleanup completed', result);
      return result;
    } catch (error) {
      this.addToHistory({ type: 'cleanup', success: false, error: error.message });
      logger.error('Backup cleanup failed', error);
      throw error;
    }
  }

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
        totalBackupSize: backups.reduce((sum, b) => sum + b.size, 0),
        recentHistory,
        backupDirectory: this.backupDir,
        oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
        newestBackup: backups.length > 0 ? backups[0].created : null,
      };
      logger.info('Generated backup status report', {
        enabled: status.enabled,
        availableBackups: status.availableBackups,
        lastBackup: this.lastBackupResult?.timestamp,
      });
      return status;
    } catch (error) {
      logger.error('Error getting backup status', error);
      throw error;
    }
  }

  async queueSuccessNotification(result) {
    try {
      const messageQueue = await getMessageQueue();
      await messageQueue.add('backup-success-notification', {
        type: 'backup-success',
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to queue success notification', error);
    }
  }

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
        { priority: 'high', attempts: 3 }
      );
    } catch (queueError) {
      logger.error('Failed to queue failure notification', queueError);
    }
  }

  getHistory(limit = 50) {
    return this.backupHistory.slice(-limit);
  }

  async getHealthStatus() {
    const status = await this.getBackupStatus();
    const health = {
      healthy: true,
      issues: [],
      lastBackup: this.lastBackupResult,
      enabled: status.enabled,
    };
    if (status.enabled && status.availableBackups === 0) {
      health.healthy = false;
      health.issues.push('No backup files found but backup is enabled');
    }
    if (this.lastBackupResult && !this.lastBackupResult.success) {
      health.healthy = false;
      health.issues.push(`Last backup failed: ${this.lastBackupResult.error}`);
    }
    const maxAge = 2 * 24 * 60 * 60 * 1000;
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

module.exports = PostgresBackupService;
