const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const IStorageProvider = require('../interfaces/IStorageProvider');
const { logger } = require('../../../utils/logger');

/**
 * Local File Storage Provider
 * Provides local file system storage for development and lightweight applications
 */
class LocalStorageProvider extends IStorageProvider {
  constructor(config) {
    super(config);
    this.basePath = config.basePath || path.join(process.cwd(), 'storage');
    this.urlPrefix = config.urlPrefix || '/storage';
    this.encryptionEnabled = config.encryptionEnabled || false;
    this.encryptionKey = config.encryptionKey || process.env.FILE_ENCRYPTION_KEY;

    this._initializeStorage();
  }

  /**
   * Initialize local storage directory
   * @private
   */
  async _initializeStorage() {
    try {
      await fs.mkdir(this.basePath, { recursive: true, mode: 0o755 });
      logger.info('Local storage initialized', {
        basePath: this.basePath,
        encryptionEnabled: this.encryptionEnabled,
      });
    } catch (error) {
      logger.error('Failed to initialize local storage:', error.message);
      throw error;
    }
  }

  /**
   * Get full file path
   * @private
   */
  _getFilePath(key) {
    // Sanitize key to prevent directory traversal
    const sanitizedKey = key.replace(/\.\./g, '').replace(/^\//, '');
    return path.join(this.basePath, sanitizedKey);
  }

  /**
   * Get metadata file path
   * @private
   */
  _getMetadataPath(key) {
    return this._getFilePath(key) + '.meta';
  }

  /**
   * Test the storage connection
   */
  async testConnection() {
    try {
      logger.debug('Testing local storage connection', {
        basePath: this.basePath,
      });

      // Test write/read/delete permissions
      const testFile = path.join(this.basePath, '.test');
      const testContent = 'test';

      await fs.writeFile(testFile, testContent);
      const readContent = await fs.readFile(testFile, 'utf8');
      await fs.unlink(testFile);

      if (readContent !== testContent) {
        throw new Error('Write/read test failed');
      }

      return {
        success: true,
        message: 'Local storage connection successful',
      };
    } catch (error) {
      logger.error('Local storage connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          path: error.path,
        },
      };
    }
  }

  /**
   * Upload a file to local storage
   */
  async uploadFile(buffer, key, metadata = {}) {
    try {
      const filePath = this._getFilePath(key);
      const metadataPath = this._getMetadataPath(key);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      let dataToStore = buffer;

      // Encrypt file if encryption is enabled
      if (this.encryptionEnabled && this.encryptionKey) {
        dataToStore = this._encryptFile(buffer);
      }

      // Write file
      await fs.writeFile(filePath, dataToStore, { mode: 0o644 });

      // Write metadata
      const fileMetadata = {
        originalName: metadata.originalName || '',
        contentType: metadata.contentType || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        size: buffer.length,
        encryptedSize: dataToStore.length,
        encrypted: this.encryptionEnabled && !!this.encryptionKey,
        ...metadata.customMetadata,
      };

      await fs.writeFile(metadataPath, JSON.stringify(fileMetadata, null, 2), { mode: 0o644 });

      logger.info('File uploaded to local storage', {
        key,
        size: buffer.length,
        encrypted: fileMetadata.encrypted,
      });

      return {
        url: `${this.urlPrefix}/${key}`,
        key,
        etag: crypto.createHash('md5').update(buffer).digest('hex'),
      };
    } catch (error) {
      logger.error('Failed to upload file to local storage:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Download a file from local storage
   */
  async downloadFile(key) {
    try {
      const filePath = this._getFilePath(key);
      const metadataPath = this._getMetadataPath(key);

      // Read metadata
      let metadata = {};
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      } catch (err) {
        logger.warn('Could not read metadata file', { key, error: err.message });
      }

      // Read file
      let data = await fs.readFile(filePath);

      // Decrypt file if it was encrypted
      if (metadata.encrypted && this.encryptionKey) {
        data = this._decryptFile(data);
      }

      logger.info('File downloaded from local storage', {
        key,
        size: data.length,
      });

      const stats = await fs.stat(filePath);

      return {
        buffer: data,
        metadata: {
          contentType: metadata.contentType || 'application/octet-stream',
          contentLength: data.length,
          lastModified: stats.mtime,
          etag: crypto.createHash('md5').update(data).digest('hex'),
          metadata: metadata,
        },
      };
    } catch (error) {
      logger.error('Failed to download file from local storage:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete a file from local storage
   */
  async deleteFile(key) {
    try {
      const filePath = this._getFilePath(key);
      const metadataPath = this._getMetadataPath(key);

      // Delete file and metadata
      await Promise.all([
        fs.unlink(filePath).catch(() => {}),
        fs.unlink(metadataPath).catch(() => {}),
      ]);

      logger.info('File deleted from local storage', {
        key,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete file from local storage:', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get file metadata from local storage
   */
  async getFileMetadata(key) {
    try {
      const filePath = this._getFilePath(key);
      const metadataPath = this._getMetadataPath(key);

      const stats = await fs.stat(filePath);

      let metadata = {};
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      } catch (err) {
        logger.warn('Could not read metadata file', { key, error: err.message });
      }

      return {
        key,
        size: stats.size,
        contentType: metadata.contentType || 'application/octet-stream',
        lastModified: stats.mtime,
        etag: crypto
          .createHash('md5')
          .update(await fs.readFile(filePath))
          .digest('hex'),
        metadata: metadata,
      };
    } catch (error) {
      logger.error('Failed to get file metadata from local storage:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List files in local storage
   */
  async listFiles(prefix = '', limit = 100) {
    try {
      const prefixPath = path.join(this.basePath, prefix);
      const files = [];

      async function walkDirectory(dir, currentPrefix = '') {
        if (files.length >= limit) return;

        try {
          const items = await fs.readdir(dir);

          for (const item of items) {
            if (files.length >= limit) break;
            if (item.endsWith('.meta')) continue; // Skip metadata files

            const itemPath = path.join(dir, item);
            const relativePath = path.join(currentPrefix, item);
            const stats = await fs.stat(itemPath);

            if (stats.isDirectory()) {
              await walkDirectory(itemPath, relativePath);
            } else {
              files.push({
                key: relativePath.replace(/\\/g, '/'), // Normalize path separators
                size: stats.size,
                lastModified: stats.mtime,
                etag: crypto
                  .createHash('md5')
                  .update(await fs.readFile(itemPath))
                  .digest('hex'),
              });
            }
          }
        } catch (err) {
          if (err.code !== 'ENOENT') {
            logger.warn('Error reading directory:', { dir, error: err.message });
          }
        }
      }

      await walkDirectory(path.dirname(prefixPath), path.basename(prefixPath));

      return files;
    } catch (error) {
      logger.error('Failed to list files from local storage:', {
        prefix,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate a presigned URL (not applicable for local storage)
   */
  async generatePresignedUrl(key, operation, expiresIn = 3600) {
    // For local storage, return a simple URL with an expiration token
    const expires = Date.now() + expiresIn * 1000;
    const token = crypto
      .createHmac('sha256', this.encryptionKey || 'default-key')
      .update(`${key}:${expires}:${operation}`)
      .digest('hex');

    return `${this.urlPrefix}/${key}?expires=${expires}&token=${token}&op=${operation}`;
  }

  /**
   * Copy a file within local storage
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      const sourcePath = this._getFilePath(sourceKey);
      const destinationPath = this._getFilePath(destinationKey);
      const sourceMetadataPath = this._getMetadataPath(sourceKey);
      const destinationMetadataPath = this._getMetadataPath(destinationKey);

      // Ensure destination directory exists
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });

      // Copy file and metadata
      await Promise.all([
        fs.copyFile(sourcePath, destinationPath),
        fs.copyFile(sourceMetadataPath, destinationMetadataPath).catch(() => {}), // Metadata might not exist
      ]);

      logger.info('File copied in local storage', {
        sourceKey,
        destinationKey,
      });

      return true;
    } catch (error) {
      logger.error('Failed to copy file in local storage:', {
        sourceKey,
        destinationKey,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Encrypt file data
   * @private
   */
  _encryptFile(buffer) {
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
   * @private
   */
  _decryptFile(buffer) {
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
   * Get storage provider information
   */
  static getProviderInfo() {
    return {
      type: 'LOCAL',
      name: 'Local File System',
      description: 'Local file system storage for development and lightweight applications',
      features: [
        'Fast access',
        'No external dependencies',
        'Optional encryption',
        'Simple setup',
        'Development-friendly',
      ],
      icon: '💾',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigValidation() {
    return {
      basePath: {
        required: false,
        type: 'string',
        default: './storage',
        description: 'Base directory for file storage',
      },
      urlPrefix: {
        required: false,
        type: 'string',
        default: '/storage',
        description: 'URL prefix for file access',
      },
      encryptionEnabled: {
        required: false,
        type: 'boolean',
        default: false,
        description: 'Enable file encryption',
      },
      encryptionKey: {
        required: false,
        type: 'string',
        description: 'Encryption key (required if encryption is enabled)',
      },
    };
  }
}

module.exports = LocalStorageProvider;
