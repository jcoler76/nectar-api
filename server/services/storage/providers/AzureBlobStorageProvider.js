const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require('@azure/storage-blob');
const IStorageProvider = require('../interfaces/IStorageProvider');
const { logger } = require('../../../utils/logger');

/**
 * Azure Blob Storage Provider
 * Provides cloud file storage using Microsoft Azure Blob Storage
 */
class AzureBlobStorageProvider extends IStorageProvider {
  constructor(config) {
    super(config);
    this.blobServiceClient = null;
    this.containerName = config.containerName;

    this._initializeClient();
  }

  /**
   * Initialize Azure Blob Storage client
   * @private
   */
  _initializeClient() {
    if (this.config.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(this.config.connectionString);
    } else if (this.config.accountName && this.config.accountKey) {
      const credential = new StorageSharedKeyCredential(
        this.config.accountName,
        this.config.accountKey
      );
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.config.accountName}.blob.core.windows.net`,
        credential
      );
    } else {
      throw new Error(
        'Azure Blob Storage requires either connectionString or accountName/accountKey'
      );
    }
  }

  /**
   * Test the storage connection
   */
  async testConnection() {
    try {
      logger.debug('Testing Azure Blob Storage connection', {
        accountName: this.config.accountName,
        containerName: this.containerName,
      });

      // Try to get container properties
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      await containerClient.getProperties();

      return {
        success: true,
        message: 'Azure Blob Storage connection successful',
      };
    } catch (error) {
      logger.error('Azure Blob Storage connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          statusCode: error.statusCode,
        },
      };
    }
  }

  /**
   * Upload a file to Azure Blob Storage
   */
  async uploadFile(buffer, key, metadata = {}) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(key);
      const blockBlobClient = blobClient.getBlockBlobClient();

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: metadata.contentType || 'application/octet-stream',
        },
        metadata: {
          originalName: metadata.originalName || '',
          uploadedAt: new Date().toISOString(),
          ...metadata.customMetadata,
        },
      };

      const uploadResponse = await blockBlobClient.upload(buffer, buffer.length, uploadOptions);

      logger.info('File uploaded to Azure Blob Storage', {
        key,
        containerName: this.containerName,
        size: buffer.length,
        etag: uploadResponse.etag,
      });

      return {
        url: blobClient.url,
        key,
        etag: uploadResponse.etag,
        versionId: uploadResponse.versionId,
      };
    } catch (error) {
      logger.error('Failed to upload file to Azure Blob Storage:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Download a file from Azure Blob Storage
   */
  async downloadFile(key) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(key);

      const downloadResponse = await blobClient.download();

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      logger.info('File downloaded from Azure Blob Storage', {
        key,
        containerName: this.containerName,
        size: buffer.length,
      });

      return {
        buffer,
        metadata: {
          contentType: downloadResponse.contentType,
          contentLength: downloadResponse.contentLength,
          lastModified: downloadResponse.lastModified,
          etag: downloadResponse.etag,
          metadata: downloadResponse.metadata,
          versionId: downloadResponse.versionId,
        },
      };
    } catch (error) {
      logger.error('Failed to download file from Azure Blob Storage:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete a file from Azure Blob Storage
   */
  async deleteFile(key) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(key);

      await blobClient.delete();

      logger.info('File deleted from Azure Blob Storage', {
        key,
        containerName: this.containerName,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete file from Azure Blob Storage:', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get file metadata from Azure Blob Storage
   */
  async getFileMetadata(key) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(key);

      const properties = await blobClient.getProperties();

      return {
        key,
        size: properties.contentLength,
        contentType: properties.contentType,
        lastModified: properties.lastModified,
        etag: properties.etag,
        metadata: properties.metadata,
        versionId: properties.versionId,
      };
    } catch (error) {
      logger.error('Failed to get file metadata from Azure Blob Storage:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List files in Azure Blob Storage
   */
  async listFiles(prefix = '', limit = 100) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);

      const files = [];
      const iterator = containerClient.listBlobsFlat({
        prefix,
        maxPageSize: limit,
      });

      for await (const blob of iterator) {
        files.push({
          key: blob.name,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
          etag: blob.properties.etag,
        });

        if (files.length >= limit) break;
      }

      return files;
    } catch (error) {
      logger.error('Failed to list files from Azure Blob Storage:', {
        prefix,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate a presigned URL for Azure Blob Storage
   */
  async generatePresignedUrl(key, operation, expiresIn = 3600) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(key);

      const permissions =
        operation === 'upload' ? BlobSASPermissions.parse('w') : BlobSASPermissions.parse('r');

      const sasOptions = {
        containerName: this.containerName,
        blobName: key,
        permissions,
        expiresOn: new Date(Date.now() + expiresIn * 1000),
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        this.blobServiceClient.credential
      );
      const url = `${blobClient.url}?${sasToken}`;

      logger.info('Generated presigned URL for Azure Blob Storage', {
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
   * Copy a file within Azure Blob Storage
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const sourceBlobClient = containerClient.getBlobClient(sourceKey);
      const destinationBlobClient = containerClient.getBlobClient(destinationKey);

      await destinationBlobClient.syncCopyFromURL(sourceBlobClient.url);

      logger.info('File copied in Azure Blob Storage', {
        sourceKey,
        destinationKey,
        containerName: this.containerName,
      });

      return true;
    } catch (error) {
      logger.error('Failed to copy file in Azure Blob Storage:', {
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
      type: 'AZURE_BLOB',
      name: 'Azure Blob Storage',
      description: 'Microsoft Azure Blob Storage cloud storage service',
      features: [
        'Scalable object storage',
        'Multiple storage tiers',
        'Global distribution',
        'Built-in security',
        'High availability',
        'Lifecycle management',
      ],
      icon: '☁️',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigValidation() {
    return {
      containerName: {
        required: true,
        type: 'string',
        description: 'Azure Blob Storage container name',
      },
      connectionString: {
        required: false,
        type: 'string',
        description: 'Azure Storage connection string (preferred method)',
      },
      accountName: {
        required: false,
        type: 'string',
        description: 'Azure Storage account name (alternative to connection string)',
      },
      accountKey: {
        required: false,
        type: 'string',
        description: 'Azure Storage account key (required with account name)',
      },
    };
  }
}

module.exports = AzureBlobStorageProvider;
