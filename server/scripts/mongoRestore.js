#!/usr/bin/env node

/**
 * MongoDB Restore Script for Mirabel API
 * Restores MongoDB backups with validation and safety checks
 */

require('dotenv').config();
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { logger } = require('../utils/logger');
const mongoose = require('mongoose');

const execAsync = promisify(exec);

class MongoRestore {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI;
    this.backupDir = path.join(__dirname, '../../backups/mongodb');
  }

  /**
   * Validates environment and prerequisites
   */
  async validateEnvironment() {
    if (!this.mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    // Check if mongorestore is available
    try {
      await execAsync('mongorestore --version');
    } catch (error) {
      throw new Error(
        'mongorestore is not installed or not in PATH. Please install MongoDB tools.'
      );
    }

    // Verify backup directory exists
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      throw new Error(`Backup directory does not exist: ${this.backupDir}`);
    }
  }

  /**
   * Lists available backup files
   */
  async listAvailableBackups() {
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
      logger.error('❌ Error listing available backups', error);
      throw error;
    }
  }

  /**
   * Validates backup file integrity
   */
  async validateBackupFile(backupPath) {
    try {
      logger.info('🔍 Validating backup file', { backupPath });

      // Check if file exists and is readable
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      // Test if gzip file is valid by attempting to decompress a small portion
      try {
        await execAsync(`gzip -t "${backupPath}"`);
        logger.info('✅ Backup file integrity check passed', {
          backupPath,
          sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
        });
        return true;
      } catch (error) {
        throw new Error('Backup file appears to be corrupted (gzip test failed)');
      }
    } catch (error) {
      logger.error('❌ Backup file validation failed', error);
      throw error;
    }
  }

  /**
   * Creates a pre-restore backup of current database
   */
  async createPreRestoreBackup() {
    try {
      logger.info('🔄 Creating pre-restore backup of current database');

      const MongoBackup = require('./mongoBackup');
      const preRestoreBackup = new MongoBackup();
      preRestoreBackup.timestamp = `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;

      const result = await preRestoreBackup.createBackup();
      logger.info('✅ Pre-restore backup completed', { backupPath: result.backupPath });

      return result;
    } catch (error) {
      logger.error('❌ Failed to create pre-restore backup', error);
      throw error;
    }
  }

  /**
   * Performs the database restoration
   */
  async performRestore(backupPath, options = {}) {
    const { dropDatabase = false, createPreBackup = true, dryRun = false } = options;

    try {
      logger.info('🔄 Starting MongoDB restore process', {
        backupPath,
        dropDatabase,
        createPreBackup,
        dryRun,
      });

      // Validate backup file
      await this.validateBackupFile(backupPath);

      // Create pre-restore backup unless disabled
      if (createPreBackup && !dryRun) {
        await this.createPreRestoreBackup();
      }

      if (dryRun) {
        logger.info('🧪 Dry run mode - would restore from:', { backupPath });
        return { success: true, dryRun: true, backupPath };
      }

      // Parse MongoDB URI to extract database name
      const dbMatch = this.mongoUri.match(/\/([^/?]+)(\?|$)/);
      const databaseName = dbMatch ? dbMatch[1] : 'mirabel-api';

      // Build mongorestore command
      const mongorestoreCommand = [
        'mongorestore',
        '--uri',
        this.mongoUri,
        '--archive',
        backupPath,
        '--gzip',
      ];

      // Add drop option if requested
      if (dropDatabase) {
        mongorestoreCommand.push('--drop');
        logger.warn('⚠️ Database will be dropped before restore');
      }

      logger.info('Executing mongorestore command', { database: databaseName });

      const restoreProcess = spawn(mongorestoreCommand[0], mongorestoreCommand.slice(1), {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      restoreProcess.stdout.on('data', data => {
        stdout += data.toString();
      });

      restoreProcess.stderr.on('data', data => {
        stderr += data.toString();
      });

      return new Promise((resolve, reject) => {
        restoreProcess.on('close', async code => {
          if (code === 0) {
            logger.info('✅ MongoDB restore completed successfully', {
              backupPath,
              database: databaseName,
              dropped: dropDatabase,
            });

            // Verify database connection after restore
            try {
              await this.verifyDatabaseAfterRestore();
              resolve({
                success: true,
                backupPath,
                database: databaseName,
                dropped: dropDatabase,
              });
            } catch (verifyError) {
              logger.error('❌ Database verification failed after restore', verifyError);
              reject(verifyError);
            }
          } else {
            logger.error('❌ MongoDB restore failed', {
              exitCode: code,
              stderr,
              stdout,
            });
            reject(new Error(`mongorestore exited with code ${code}: ${stderr}`));
          }
        });

        restoreProcess.on('error', error => {
          logger.error('❌ MongoDB restore process error', error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('❌ MongoDB restore failed', error);
      throw error;
    }
  }

  /**
   * Verifies database connectivity and basic integrity after restore
   */
  async verifyDatabaseAfterRestore() {
    try {
      logger.info('🔍 Verifying database after restore');

      await mongoose.connect(this.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });

      // Check if we can list collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionCount = collections.length;

      // Check if admin user exists (basic integrity check)
      const User = require('../models/User');
      const adminUser = await User.findOne({ email: 'admin@mirabel.api' });

      await mongoose.connection.close();

      logger.info('✅ Database verification completed', {
        collectionsCount: collectionCount,
        adminUserExists: !!adminUser,
      });

      return {
        collectionsCount: collectionCount,
        adminUserExists: !!adminUser,
        collections: collections.map(c => c.name),
      };
    } catch (error) {
      logger.error('❌ Database verification failed', error);
      throw error;
    }
  }

  /**
   * Interactive restore with user prompts
   */
  async interactiveRestore() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = prompt => new Promise(resolve => rl.question(prompt, resolve));

    try {
      console.log('🗄️  Mirabel API - MongoDB Restore Tool');
      console.log('====================================');

      const backups = await this.listAvailableBackups();

      if (backups.length === 0) {
        console.log('❌ No backup files found in:', this.backupDir);
        return;
      }

      console.log('\n📋 Available backups:');
      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.filename}`);
        console.log(`   Created: ${backup.created.toLocaleString()}`);
        console.log(`   Size: ${backup.sizeInMB} MB`);
        console.log(`   Age: ${backup.age} days`);
        console.log('');
      });

      const choice = await question('Select backup number (or "cancel" to exit): ');

      if (choice.toLowerCase() === 'cancel') {
        console.log('Operation cancelled.');
        return;
      }

      const backupIndex = parseInt(choice) - 1;
      if (backupIndex < 0 || backupIndex >= backups.length) {
        console.log('❌ Invalid selection.');
        return;
      }

      const selectedBackup = backups[backupIndex];
      console.log(`\n📁 Selected backup: ${selectedBackup.filename}`);

      const confirmRestore = await question(
        '\n⚠️  This will restore the database. Continue? (yes/no): '
      );
      if (confirmRestore.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        return;
      }

      const dropConfirm = await question('Drop existing data before restore? (yes/no): ');
      const dropDatabase = dropConfirm.toLowerCase() === 'yes';

      if (dropDatabase) {
        const finalConfirm = await question(
          '\n🚨 WARNING: This will DELETE all existing data! Type "DELETE" to confirm: '
        );
        if (finalConfirm !== 'DELETE') {
          console.log('Operation cancelled.');
          return;
        }
      }

      console.log('\n🔄 Starting restore process...');
      const result = await this.performRestore(selectedBackup.path, { dropDatabase });

      console.log('✅ Restore completed successfully!');
      console.log(`📁 Restored from: ${result.backupPath}`);
    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      throw error;
    } finally {
      rl.close();
    }
  }

  /**
   * Command line restore with specified backup
   */
  async executeRestore(backupFile, options = {}) {
    try {
      await this.validateEnvironment();

      let backupPath;
      if (path.isAbsolute(backupFile)) {
        backupPath = backupFile;
      } else {
        backupPath = path.join(this.backupDir, backupFile);
      }

      // Check if backup file exists
      await fs.access(backupPath);

      const result = await this.performRestore(backupPath, options);
      return result;
    } catch (error) {
      logger.error('❌ MongoDB restore execution failed', error);
      throw error;
    }
  }
}

// Command line interface
async function main() {
  if (require.main === module) {
    const restore = new MongoRestore();

    const args = process.argv.slice(2);

    try {
      await restore.validateEnvironment();

      if (args.length === 0) {
        // Interactive mode
        await restore.interactiveRestore();
      } else {
        // Command line mode
        const backupFile = args[0];
        const options = {
          dropDatabase: args.includes('--drop'),
          createPreBackup: !args.includes('--no-pre-backup'),
          dryRun: args.includes('--dry-run'),
        };

        const result = await restore.executeRestore(backupFile, options);

        if (result.dryRun) {
          console.log('🧪 Dry run completed - no changes made');
        } else {
          console.log('✅ Restore completed successfully');
        }
      }

      process.exit(0);
    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      process.exit(1);
    }
  }
}

main();

module.exports = MongoRestore;
