const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { logger } = require('../middleware/logger');

/**
 * Secure file storage service
 * Handles temporary file storage with automatic cleanup
 */

class FileStorageService {
  constructor(options = {}) {
    this.tempDir = options.tempDir || path.join(__dirname, '../../temp/uploads');
    this.maxAge = options.maxAge || 3600000; // 1 hour default
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutes
    this.encryptionKey = options.encryptionKey || process.env.FILE_ENCRYPTION_KEY;

    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      // Ensure temp directory exists with secure permissions
      await fs.mkdir(this.tempDir, { recursive: true, mode: 0o700 });

      // Start cleanup interval
      this.cleanupTimer = setInterval(() => {
        this.cleanup().catch(err => logger.error('File cleanup error', { error: err.message }));
      }, this.cleanupInterval);

      logger.info('File storage service initialized', {
        tempDir: this.tempDir,
        maxAge: this.maxAge,
      });
    } catch (error) {
      logger.error('Failed to initialize file storage', { error: error.message });
      throw error;
    }
  }

  /**
   * Store file temporarily with encryption
   */
  async storeFile(buffer, metadata) {
    try {
      const fileId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const filename = `${fileId}_${timestamp}.tmp`;
      const filepath = path.join(this.tempDir, filename);

      // Encrypt file if encryption key is available
      let dataToStore = buffer;
      let encrypted = false;

      if (this.encryptionKey) {
        dataToStore = this.encryptFile(buffer);
        encrypted = true;
      }

      // Write file with restricted permissions
      await fs.writeFile(filepath, dataToStore, { mode: 0o600 });

      // Store metadata
      const metadataFile = `${filepath}.meta`;
      await fs.writeFile(
        metadataFile,
        JSON.stringify({
          ...metadata,
          fileId,
          storedAt: new Date(timestamp),
          encrypted,
          size: buffer.length,
          encryptedSize: dataToStore.length,
        }),
        { mode: 0o600 }
      );

      logger.info('File stored temporarily', {
        fileId,
        originalName: metadata.originalname,
        size: buffer.length,
        encrypted,
      });

      return {
        fileId,
        filepath,
        expiresAt: new Date(timestamp + this.maxAge),
      };
    } catch (error) {
      logger.error('Failed to store file', { error: error.message });
      throw error;
    }
  }

  /**
   * Retrieve file from temporary storage
   */
  async retrieveFile(fileId) {
    try {
      const files = await fs.readdir(this.tempDir);
      const filePattern = new RegExp(`^${fileId}_\\d+\\.tmp$`);
      const filename = files.find(f => filePattern.test(f));

      if (!filename) {
        throw new Error('File not found or expired');
      }

      const filepath = path.join(this.tempDir, filename);
      const metadataFile = `${filepath}.meta`;

      // Read metadata
      const metadataStr = await fs.readFile(metadataFile, 'utf8');
      const metadata = JSON.parse(metadataStr);

      // Check if file has expired
      const age = Date.now() - new Date(metadata.storedAt).getTime();
      if (age > this.maxAge) {
        await this.deleteFile(fileId);
        throw new Error('File has expired');
      }

      // Read file
      let data = await fs.readFile(filepath);

      // Decrypt if necessary
      if (metadata.encrypted && this.encryptionKey) {
        data = this.decryptFile(data);
      }

      logger.info('File retrieved', {
        fileId,
        age: Math.round(age / 1000) + 's',
        encrypted: metadata.encrypted,
      });

      return {
        buffer: data,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to retrieve file', {
        fileId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete file from temporary storage
   */
  async deleteFile(fileId) {
    try {
      const files = await fs.readdir(this.tempDir);
      const filePattern = new RegExp(`^${fileId}_\\d+\\.tmp$`);
      const filename = files.find(f => filePattern.test(f));

      if (filename) {
        const filepath = path.join(this.tempDir, filename);
        const metadataFile = `${filepath}.meta`;

        await Promise.all([
          fs.unlink(filepath).catch(() => {}),
          fs.unlink(metadataFile).catch(() => {}),
        ]);

        logger.info('File deleted', { fileId });
      }
    } catch (error) {
      logger.error('Failed to delete file', {
        fileId,
        error: error.message,
      });
    }
  }

  /**
   * Cleanup expired files
   */
  async cleanup() {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith('.tmp')) continue;

        const filepath = path.join(this.tempDir, file);
        const stats = await fs.stat(filepath);
        const age = now - stats.mtimeMs;

        if (age > this.maxAge) {
          const metadataFile = `${filepath}.meta`;

          await Promise.all([
            fs.unlink(filepath).catch(() => {}),
            fs.unlink(metadataFile).catch(() => {}),
          ]);

          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.info('Cleaned up expired files', { count: cleaned });
      }
    } catch (error) {
      logger.error('Cleanup error', { error: error.message });
    }
  }

  /**
   * Encrypt file data
   */
  encryptFile(buffer) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Prepend IV and auth tag to encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt file data
   */
  decryptFile(buffer) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

    // Extract IV, auth tag, and encrypted data
    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    try {
      const files = await fs.readdir(this.tempDir);
      const tmpFiles = files.filter(f => f.endsWith('.tmp'));

      let totalSize = 0;
      let oldestFile = null;
      let newestFile = null;

      for (const file of tmpFiles) {
        const filepath = path.join(this.tempDir, file);
        const stats = await fs.stat(filepath);

        totalSize += stats.size;

        if (!oldestFile || stats.mtimeMs < oldestFile.time) {
          oldestFile = { name: file, time: stats.mtimeMs };
        }

        if (!newestFile || stats.mtimeMs > newestFile.time) {
          newestFile = { name: file, time: stats.mtimeMs };
        }
      }

      return {
        fileCount: tmpFiles.length,
        totalSize,
        oldestFile: oldestFile
          ? {
              name: oldestFile.name,
              age: Date.now() - oldestFile.time,
            }
          : null,
        newestFile: newestFile
          ? {
              name: newestFile.name,
              age: Date.now() - newestFile.time,
            }
          : null,
      };
    } catch (error) {
      logger.error('Failed to get storage stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Shutdown service
   */
  shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    logger.info('File storage service shutdown');
  }
}

// Singleton instance
let instance = null;

const getFileStorageService = options => {
  if (!instance) {
    instance = new FileStorageService(options);
  }
  return instance;
};

module.exports = {
  FileStorageService,
  getFileStorageService,
};
