const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const IStorageProvider = require('../interfaces/IStorageProvider');
const { logger } = require('../../../utils/logger');

/**
 * AWS S3 Storage Provider
 * Provides cloud file storage using Amazon S3
 */
class S3StorageProvider extends IStorageProvider {
  constructor(config) {
    super(config);
    this.s3Client = null;
    this.bucket = config.bucket;
    this.region = config.region || 'us-east-1';

    this._initializeClient();
  }

  /**
   * Initialize S3 client
   * @private
   */
  _initializeClient() {
    const clientConfig = {
      region: this.region,
    };

    // Configure credentials
    if (this.config.accessKeyId && this.config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      };
    }

    // Configure custom endpoint (for S3-compatible services)
    if (this.config.endpoint) {
      clientConfig.endpoint = this.config.endpoint;
      clientConfig.forcePathStyle = true;
    }

    this.s3Client = new S3Client(clientConfig);
  }

  /**
   * Test the storage connection
   */
  async testConnection() {
    try {
      logger.debug('Testing S3 connection', {
        bucket: this.bucket,
        region: this.region,
        hasCustomEndpoint: !!this.config.endpoint,
      });

      // Try to list objects in the bucket (limited to 1)
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        MaxKeys: 1,
      });

      await this.s3Client.send(command);

      return {
        success: true,
        message: 'S3 connection successful',
      };
    } catch (error) {
      logger.error('S3 connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.Code,
          statusCode: error.$metadata?.httpStatusCode,
        },
      };
    }
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(buffer, key, metadata = {}) {
    try {
      const uploadParams = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: metadata.contentType || 'application/octet-stream',
        Metadata: {
          originalName: metadata.originalName || '',
          uploadedAt: new Date().toISOString(),
          ...metadata.customMetadata,
        },
      };

      // Add server-side encryption if configured
      if (this.config.serverSideEncryption) {
        uploadParams.ServerSideEncryption = this.config.serverSideEncryption;
        if (this.config.kmsKeyId) {
          uploadParams.SSEKMSKeyId = this.config.kmsKeyId;
        }
      }

      // Add ACL if specified
      if (this.config.acl) {
        uploadParams.ACL = this.config.acl;
      }

      // Use multipart upload for large files
      const upload = new Upload({
        client: this.s3Client,
        params: uploadParams,
      });

      const result = await upload.done();

      logger.info('File uploaded to S3', {
        key,
        bucket: this.bucket,
        size: buffer.length,
        etag: result.ETag,
      });

      return {
        url: result.Location || `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
        key,
        etag: result.ETag,
        versionId: result.VersionId,
      };
    } catch (error) {
      logger.error('Failed to upload file to S3:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Download a file from S3
   */
  async downloadFile(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      logger.info('File downloaded from S3', {
        key,
        bucket: this.bucket,
        size: buffer.length,
      });

      return {
        buffer,
        metadata: {
          contentType: response.ContentType,
          contentLength: response.ContentLength,
          lastModified: response.LastModified,
          etag: response.ETag,
          metadata: response.Metadata,
          versionId: response.VersionId,
        },
      };
    } catch (error) {
      logger.error('Failed to download file from S3:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info('File deleted from S3', {
        key,
        bucket: this.bucket,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete file from S3:', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata,
        versionId: response.VersionId,
        storageClass: response.StorageClass,
      };
    } catch (error) {
      logger.error('Failed to get file metadata from S3:', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List files in S3
   */
  async listFiles(prefix = '', limit = 100) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: limit,
      });

      const response = await this.s3Client.send(command);

      const files = (response.Contents || []).map(object => ({
        key: object.Key,
        size: object.Size,
        lastModified: object.LastModified,
        etag: object.ETag,
        storageClass: object.StorageClass,
      }));

      return files;
    } catch (error) {
      logger.error('Failed to list files from S3:', {
        prefix,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate a presigned URL for S3
   */
  async generatePresignedUrl(key, operation, expiresIn = 3600) {
    try {
      let command;

      if (operation === 'upload') {
        command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
      } else if (operation === 'download') {
        command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
      } else {
        throw new Error(`Unsupported operation: ${operation}`);
      }

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      logger.info('Generated presigned URL', {
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
   * Copy a file within S3
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        CopySource: `${this.bucket}/${sourceKey}`,
      });

      await this.s3Client.send(command);

      logger.info('File copied in S3', {
        sourceKey,
        destinationKey,
        bucket: this.bucket,
      });

      return true;
    } catch (error) {
      logger.error('Failed to copy file in S3:', {
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
      type: 'S3',
      name: 'Amazon S3',
      description: 'Amazon Simple Storage Service (S3) cloud storage',
      features: [
        'Unlimited storage capacity',
        'High durability (99.999999999%)',
        'Global availability',
        'Server-side encryption',
        'Versioning support',
        'Lifecycle management',
        'Access control',
      ],
      icon: '☁️',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigValidation() {
    return {
      bucket: {
        required: true,
        type: 'string',
        description: 'S3 bucket name',
      },
      region: {
        required: false,
        type: 'string',
        default: 'us-east-1',
        description: 'AWS region',
      },
      accessKeyId: {
        required: false,
        type: 'string',
        description: 'AWS Access Key ID (optional if using IAM roles)',
      },
      secretAccessKey: {
        required: false,
        type: 'string',
        description: 'AWS Secret Access Key (optional if using IAM roles)',
      },
      endpoint: {
        required: false,
        type: 'string',
        description: 'Custom S3 endpoint for S3-compatible services',
      },
      serverSideEncryption: {
        required: false,
        type: 'string',
        enum: ['AES256', 'aws:kms'],
        description: 'Server-side encryption method',
      },
      kmsKeyId: {
        required: false,
        type: 'string',
        description: 'KMS Key ID for encryption (required if using aws:kms)',
      },
      acl: {
        required: false,
        type: 'string',
        enum: ['private', 'public-read', 'public-read-write', 'authenticated-read'],
        default: 'private',
        description: 'Access Control List',
      },
    };
  }
}

module.exports = S3StorageProvider;
