#!/usr/bin/env node

/**
 * MongoDB Backup Script for Mirabel API
 * Creates compressed backups using mongodump with proper logging and error handling
 */

require('dotenv').config();
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

const execAsync = promisify(exec);

class MongoBackup {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI;
    this.backupDir = path.join(__dirname, '../../backups/mongodb');
    this.retentionDays = parseInt(process.env.DB_BACKUP_RETENTION_DAYS) || 30;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  /**
   * Validates environment and prerequisites
   */
  async validateEnvironment() {
    if (!this.mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    // Check if mongodump is available
    try {
      await execAsync('mongodump --version');
    } catch (error) {
      throw new Error('mongodump is not installed or not in PATH. Please install MongoDB tools.');
    }

    // Create backup directory if it doesn't exist
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  /**
   * Creates a compressed MongoDB backup
   */
  async createBackup() {
    const backupPath = path.join(this.backupDir, `backup_${this.timestamp}`);
    const archivePath = `${backupPath}.gz`;

    try {
      logger.info('🔄 Starting MongoDB backup process', {
        timestamp: this.timestamp,
        backupPath,
        archivePath,
      });

      // Parse MongoDB URI to extract database name
      const dbMatch = this.mongoUri.match(/\/([^/?]+)(\?|$)/);
      const databaseName = dbMatch ? dbMatch[1] : 'mirabel-api';

      // Create backup using mongodump with gzip compression
      const mongodumpCommand = [
        'mongodump',
        '--uri',
        this.mongoUri,
        '--archive',
        archivePath,
        '--gzip',
      ];

      logger.info('Executing mongodump command', { database: databaseName });

      const backupProcess = spawn(mongodumpCommand[0], mongodumpCommand.slice(1), {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      backupProcess.stdout.on('data', data => {
        stdout += data.toString();
      });

      backupProcess.stderr.on('data', data => {
        stderr += data.toString();
      });

      return new Promise((resolve, reject) => {
        backupProcess.on('close', async code => {
          if (code === 0) {
            try {
              // Verify backup file was created and get its size
              const stats = await fs.stat(archivePath);
              const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

              logger.info('✅ MongoDB backup completed successfully', {
                timestamp: this.timestamp,
                archivePath,
                sizeInMB,
                database: databaseName,
              });

              resolve({
                success: true,
                backupPath: archivePath,
                size: stats.size,
                timestamp: this.timestamp,
                database: databaseName,
              });
            } catch (error) {
              logger.error('❌ Error verifying backup file', error);
              reject(error);
            }
          } else {
            logger.error('❌ MongoDB backup failed', {
              exitCode: code,
              stderr,
              stdout,
            });
            reject(new Error(`mongodump exited with code ${code}: ${stderr}`));
          }
        });

        backupProcess.on('error', error => {
          logger.error('❌ MongoDB backup process error', error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('❌ MongoDB backup failed', error);
      throw error;
    }
  }

  /**
   * Removes old backup files based on retention policy
   */
  async cleanupOldBackups() {
    try {
      logger.info('🧹 Starting backup cleanup', { retentionDays: this.retentionDays });

      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.gz'));

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      let deletedCount = 0;
      let totalSize = 0;

      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          totalSize += stats.size;
          await fs.unlink(filePath);
          deletedCount++;
          logger.info('🗑️ Deleted old backup', {
            file,
            age: Math.floor((Date.now() - stats.mtime) / (1000 * 60 * 60 * 24)) + ' days',
          });
        }
      }

      const deletedSizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      logger.info('✅ Backup cleanup completed', {
        deletedCount,
        deletedSizeInMB,
        retentionDays: this.retentionDays,
      });

      return { deletedCount, deletedSizeInMB };
    } catch (error) {
      logger.error('❌ Error during backup cleanup', error);
      throw error;
    }
  }

  /**
   * Lists all available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.gz'));

      const backups = [];
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        backups.push({
          filename: file,
          path: filePath,
          created: stats.mtime,
          size: stats.size,
          sizeInMB,
          age: Math.floor((Date.now() - stats.mtime) / (1000 * 60 * 60 * 24)),
        });
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('❌ Error listing backups', error);
      throw error;
    }
  }

  /**
   * Main backup execution
   */
  async execute() {
    try {
      console.log('🗄️  Mirabel API - MongoDB Backup Tool');
      console.log('====================================');

      await this.validateEnvironment();
      const result = await this.createBackup();
      await this.cleanupOldBackups();

      console.log('✅ Backup process completed successfully');
      console.log(`📁 Backup location: ${result.backupPath}`);
      console.log(`📦 Backup size: ${(result.size / (1024 * 1024)).toFixed(2)} MB`);

      return result;
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      logger.error('❌ MongoDB backup execution failed', error);
      throw error;
    }
  }
}

// Run if called directly
async function main() {
  if (require.main === module) {
    const backup = new MongoBackup();

    try {
      await backup.execute();
      process.exit(0);
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      process.exit(1);
    }
  }
}

main();

module.exports = MongoBackup;
