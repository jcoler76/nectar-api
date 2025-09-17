const { Storage } = require('@google-cloud/storage');
const IStorageProvider = require('../interfaces/IStorageProvider');
const { logger } = require('../../../utils/logger');

/**
 * Google Cloud Storage Provider
 * Provides cloud file storage using Google Cloud Storage
 */
class GoogleCloudStorageProvider extends IStorageProvider {
  constructor(config) {
    super(config);
    this.storage = null;
    this.bucketName = config.bucketName;

    this._initializeClient();
  }

  /**
   * Initialize Google Cloud Storage client
   * @private
   */
  _initializeClient() {
    const options = {};

    if (this.config.projectId) {
      options.projectId = this.config.projectId;
    }

    if (this.config.keyFilename) {
      options.keyFilename = this.config.keyFilename;
    } else if (this.config.credentials) {
      options.credentials = this.config.credentials;
    }

    this.storage = new Storage(options);
  }

  /**
   * Test the storage connection
   */
  async testConnection() {
    try {
      logger.debug('Testing Google Cloud Storage connection', {
        projectId: this.config.projectId,
        bucketName: this.bucketName,
      });

      // Try to get bucket metadata
      const bucket = this.storage.bucket(this.bucketName);
      await bucket.getMetadata();

      return {
        success: true,
        message: 'Google Cloud Storage connection successful',
      };
    } catch (error) {
      logger.error('Google Cloud Storage connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          status: error.status,
        },
      };
    }
  }

  /**
   * Upload a file to Google Cloud Storage
   */
  async uploadFile(buffer, key, metadata = {}) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(key);

      const uploadOptions = {
        metadata: {
          contentType: metadata.contentType || 'application/octet-stream',
          metadata: {
            originalName: metadata.originalName || '',
            uploadedAt: new Date().toISOString(),
            ...metadata.customMetadata,
          },
        },
      };

      await file.save(buffer, uploadOptions);

      const [fileMetadata] = await file.getMetadata();

      logger.info('File uploaded to Google Cloud Storage', {
        key,
        bucketName: this.bucketName,
        size: buffer.length,
        etag: fileMetadata.etag,
      });

      return {
        url: `gs://${this.bucketName}/${key}`,
        key,
        etag: fileMetadata.etag,
        generation: fileMetadata.generation,
      };
    } catch (error) {
      logger.error('Failed to upload file to Google Cloud Storage:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Download a file from Google Cloud Storage
   */
  async downloadFile(key) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(key);

      const [buffer] = await file.download();
      const [metadata] = await file.getMetadata();

      logger.info('File downloaded from Google Cloud Storage', {
        key,
        bucketName: this.bucketName,
        size: buffer.length,
      });

      return {
        buffer,
        metadata: {
          contentType: metadata.contentType,
          contentLength: metadata.size,
          lastModified: new Date(metadata.updated),
          etag: metadata.etag,
          metadata: metadata.metadata,
          generation: metadata.generation,
        },
      };
    } catch (error) {
      logger.error('Failed to download file from Google Cloud Storage:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete a file from Google Cloud Storage
   */
  async deleteFile(key) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(key);

      await file.delete();

      logger.info('File deleted from Google Cloud Storage', {
        key,
        bucketName: this.bucketName,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete file from Google Cloud Storage:', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get file metadata from Google Cloud Storage
   */
  async getFileMetadata(key) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(key);

      const [metadata] = await file.getMetadata();

      return {
        key,
        size: parseInt(metadata.size),
        contentType: metadata.contentType,
        lastModified: new Date(metadata.updated),
        etag: metadata.etag,
        metadata: metadata.metadata,
        generation: metadata.generation,
      };
    } catch (error) {
      logger.error('Failed to get file metadata from Google Cloud Storage:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List files in Google Cloud Storage
   */
  async listFiles(prefix = '', limit = 100) {
    try {
      const bucket = this.storage.bucket(this.bucketName);

      const [files] = await bucket.getFiles({
        prefix,
        maxResults: limit,
      });

      return files.map(file => ({
        key: file.name,
        size: parseInt(file.metadata.size),
        lastModified: new Date(file.metadata.updated),
        etag: file.metadata.etag,
      }));
    } catch (error) {
      logger.error('Failed to list files from Google Cloud Storage:', {
        prefix,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate a presigned URL for Google Cloud Storage
   */
  async generatePresignedUrl(key, operation, expiresIn = 3600) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(key);

      const action = operation === 'upload' ? 'write' : 'read';

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action,
        expires: Date.now() + expiresIn * 1000,
      });

      logger.info('Generated presigned URL for Google Cloud Storage', {
        key,
        operation,
        expiresIn,
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL:', {
        key,
        operation,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Copy a file within Google Cloud Storage
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const sourceFile = bucket.file(sourceKey);
      const destinationFile = bucket.file(destinationKey);

      await sourceFile.copy(destinationFile);

      logger.info('File copied in Google Cloud Storage', {
        sourceKey,
        destinationKey,
        bucketName: this.bucketName,
      });

      return true;
    } catch (error) {
      logger.error('Failed to copy file in Google Cloud Storage:', {
        sourceKey,
        destinationKey,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get storage provider information
   */
  static getProviderInfo() {
    return {
      type: 'GCS',
      name: 'Google Cloud Storage',
      description: 'Google Cloud Storage object storage service',
      features: [
        'Unified object storage',
        'Global edge caching',
        'Strong consistency',
        'Multiple storage classes',
        'Lifecycle management',
        'Fine-grained access control',
      ],
      icon: '☁️',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigValidation() {
    return {
      bucketName: {
        required: true,
        type: 'string',
        description: 'Google Cloud Storage bucket name',
      },
      projectId: {
        required: false,
        type: 'string',
        description: 'Google Cloud Project ID',
      },
      keyFilename: {
        required: false,
        type: 'string',
        description: 'Path to service account key file',
      },
      credentials: {
        required: false,
        type: 'object',
        description: 'Service account credentials object',
      },
    };
  }
}

module.exports = GoogleCloudStorageProvider;
