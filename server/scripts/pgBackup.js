#!/usr/bin/env node

/**
 * PostgreSQL Backup Script for Nectar API
 * Creates compressed backups using pg_dump with logging and error handling
 */

require('dotenv').config();
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

const execAsync = promisify(exec);

class PostgresBackup {
  constructor() {
    this.databaseUrl = process.env.DATABASE_URL;
    this.backupDir = path.join(__dirname, '../../backups/postgres');
    this.retentionDays = parseInt(process.env.DB_BACKUP_RETENTION_DAYS) || 30;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  async validateEnvironment() {
    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL backups');
    }

    // Ensure pg_dump is available
    try {
      await execAsync('pg_dump --version');
    } catch (error) {
      throw new Error(
        'pg_dump is not installed or not in PATH. Please install PostgreSQL client tools.'
      );
    }

    await fs.mkdir(this.backupDir, { recursive: true });
  }

  async createBackup() {
    const archivePath = path.join(this.backupDir, `backup_${this.timestamp}.dump`);

    try {
      logger.info('Starting PostgreSQL backup process', {
        timestamp: this.timestamp,
        archivePath,
      });

      // pg_dump custom format (-Fc) with compression (-Z 9)
      const pgDumpArgs = [`--dbname=${this.databaseUrl}`, '-Fc', '-Z', '9', '-f', archivePath];

      const backupProcess = spawn('pg_dump', pgDumpArgs, { stdio: ['inherit', 'pipe', 'pipe'] });

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
              const stats = await fs.stat(archivePath);
              const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

              logger.info('PostgreSQL backup completed successfully', {
                timestamp: this.timestamp,
                archivePath,
                sizeInMB,
              });

              resolve({
                success: true,
                backupPath: archivePath,
                size: stats.size,
                timestamp: this.timestamp,
              });
            } catch (error) {
              logger.error('Error verifying backup file', error);
              reject(error);
            }
          } else {
            logger.error('PostgreSQL backup failed', {
              exitCode: code,
              stderr,
              stdout,
            });
            reject(new Error(`pg_dump exited with code ${code}: ${stderr}`));
          }
        });

        backupProcess.on('error', error => {
          logger.error('PostgreSQL backup process error', error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('PostgreSQL backup failed', error);
      throw error;
    }
  }

  async cleanupOldBackups() {
    try {
      logger.info('Starting PostgreSQL backup cleanup', { retentionDays: this.retentionDays });

      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(
        file => file.startsWith('backup_') && file.endsWith('.dump')
      );

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
          logger.info('Deleted old PostgreSQL backup', {
            file,
            age: Math.floor((Date.now() - stats.mtime) / (1000 * 60 * 60 * 24)) + ' days',
          });
        }
      }

      const deletedSizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      logger.info('PostgreSQL backup cleanup completed', {
        deletedCount,
        deletedSizeInMB,
        retentionDays: this.retentionDays,
      });

      return { deletedCount, deletedSizeInMB };
    } catch (error) {
      logger.error('Error during PostgreSQL backup cleanup', error);
      throw error;
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(
        file => file.startsWith('backup_') && file.endsWith('.dump')
      );

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
      logger.error('Error listing PostgreSQL backups', error);
      throw error;
    }
  }

  async execute() {
    try {
      console.log('Nectar API - PostgreSQL Backup Tool');
      console.log('===================================');

      await this.validateEnvironment();
      const result = await this.createBackup();
      await this.cleanupOldBackups();

      console.log('Backup process completed successfully');
      console.log(`Backup location: ${result.backupPath}`);
      console.log(`Backup size: ${(result.size / (1024 * 1024)).toFixed(2)} MB`);

      return result;
    } catch (error) {
      console.error('Backup failed:', error.message);
      logger.error('PostgreSQL backup execution failed', error);
      throw error;
    }
  }
}

async function main() {
  if (require.main === module) {
    const backup = new PostgresBackup();
    try {
      await backup.execute();
      process.exit(0);
    } catch (error) {
      console.error('Backup failed:', error.message);
      process.exit(1);
    }
  }
}

main();

module.exports = PostgresBackup;
