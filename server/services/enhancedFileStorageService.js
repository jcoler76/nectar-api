/**
 * Enhanced File Storage Service
 * Provides comprehensive BaaS file storage with S3, CDN, and metadata management
 */

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const sharp = require('sharp');
const { logger } = require('../middleware/logger');
const { getPrismaClient } = require('../config/prisma');
const prismaService = require('../services/prismaService');

const prisma = getPrismaClient();

class EnhancedFileStorageService {
  constructor(options = {}) {
    this.bucketName = options.bucketName || process.env.S3_BUCKET_NAME || 'nectar-file-storage';
    this.cdnDomain = options.cdnDomain || process.env.CDN_DOMAIN;
    this.region = options.region || process.env.AWS_REGION || 'us-east-1';

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // File type configurations
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/json',
      'application/xml',
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
    ];

    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024; // 100MB default

    logger.info('Enhanced File Storage Service initialized', {
      bucket: this.bucketName,
      region: this.region,
      cdnDomain: this.cdnDomain,
    });
  }

  /**
   * Upload file to S3 with metadata storage
   */
  async uploadFile(buffer, filename, organizationId, uploadedBy = null, options = {}) {
    try {
      const {
        tags = [],
        description = null,
        isPublic = false,
        generateThumbnails = true,
        metadata = {},
      } = options;

      // Validate file
      await this.validateFile(buffer, filename);

      // Generate unique storage key
      const fileExt = path.extname(filename);
      const baseName = path.basename(filename, fileExt);
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const storageKey = `${organizationId}/${timestamp}-${randomId}-${baseName}${fileExt}`;

      // Calculate file hash for integrity checking
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
      const mimeType = this.getMimeType(buffer, filename);
      const fileSize = buffer.length;

      // Prepare S3 upload parameters with performance optimizations
      const uploadParams = {
        Bucket: this.bucketName,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
        // Browser caching: files are immutable (key includes timestamp/hash)
        CacheControl: 'public, max-age=31536000, immutable',
        // Server-side encryption for security
        ServerSideEncryption: 'AES256',
        Metadata: {
          'original-filename': filename,
          'uploaded-by': uploadedBy || 'system',
          'organization-id': organizationId,
          checksum: checksum,
          ...metadata,
        },
      };

      // Set public access if specified
      if (isPublic) {
        uploadParams.ACL = 'public-read';
      }

      // Upload to S3
      const uploadCommand = new PutObjectCommand(uploadParams);
      await this.s3Client.send(uploadCommand);

      // Generate CDN URL if available
      const cdnUrl = this.cdnDomain
        ? `https://${this.cdnDomain}/${storageKey}`
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${storageKey}`;

      // Store metadata in database
      const fileRecord = await prisma.fileStorage.create({
        data: {
          filename,
          storageKey,
          mimeType,
          fileSize: BigInt(fileSize),
          checksum,
          storageProvider: 'S3',
          bucketName: this.bucketName,
          cdnUrl,
          isPublic,
          organizationId,
          uploadedBy,
          metadata: JSON.stringify(metadata),
          tags,
          description,
        },
      });

      // Generate thumbnails for images
      if (generateThumbnails && this.isImage(mimeType)) {
        await this.generateThumbnails(fileRecord.id, buffer, storageKey);
      }

      logger.info('File uploaded successfully', {
        fileId: fileRecord.id,
        filename,
        storageKey,
        fileSize,
        organizationId,
      });

      return {
        id: fileRecord.id,
        filename,
        storageKey,
        cdnUrl,
        mimeType,
        fileSize,
        checksum,
        isPublic,
        uploadedAt: fileRecord.uploadedAt,
      };
    } catch (error) {
      logger.error('File upload failed', { error: error.message, filename, organizationId });
      throw error;
    }
  }

  /**
   * Generate presigned URLs for direct client uploads
   */
  async generatePresignedUploadUrl(filename, organizationId, uploadedBy = null, options = {}) {
    try {
      const {
        expiresIn = 300, // 5 minutes default
        maxFileSize = this.maxFileSize,
        isPublic = false,
      } = options;

      // Generate storage key
      const fileExt = path.extname(filename);
      const baseName = path.basename(filename, fileExt);
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const storageKey = `${organizationId}/${timestamp}-${randomId}-${baseName}${fileExt}`;

      // Prepare upload parameters with performance optimizations
      const uploadParams = {
        Bucket: this.bucketName,
        Key: storageKey,
        ContentType: this.getMimeTypeFromExtension(fileExt),
        // Browser caching: files are immutable (key includes timestamp/hash)
        CacheControl: 'public, max-age=31536000, immutable',
        // Server-side encryption for security
        ServerSideEncryption: 'AES256',
        Metadata: {
          'original-filename': filename,
          'uploaded-by': uploadedBy || 'system',
          'organization-id': organizationId,
        },
      };

      if (isPublic) {
        uploadParams.ACL = 'public-read';
      }

      // Generate presigned URL
      const command = new PutObjectCommand(uploadParams);
      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      // Generate CDN URL
      const cdnUrl = this.cdnDomain
        ? `https://${this.cdnDomain}/${storageKey}`
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${storageKey}`;

      return {
        uploadUrl: presignedUrl,
        storageKey,
        cdnUrl,
        maxFileSize,
        expiresIn,
        fields: {
          key: storageKey,
          'Content-Type': uploadParams.ContentType,
        },
      };
    } catch (error) {
      logger.error('Failed to generate presigned URL', {
        error: error.message,
        filename,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get file download URL or presigned URL for private files
   * SECURITY: Now requires organizationId to prevent cross-tenant access
   */
  async getFileUrl(fileId, organizationId, expiresIn = 3600) {
    try {
      // SECURITY FIX: Use withTenantContext for proper RLS enforcement
      const file = await prismaService.withTenantContext(organizationId, async tx => {
        const foundFile = await tx.fileStorage.findFirst({
          where: {
            id: fileId,
            isActive: true,
          },
        });

        // Update last accessed time within the same RLS context
        if (foundFile) {
          await tx.fileStorage.updateMany({
            where: { id: fileId },
            data: { lastAccessedAt: new Date() },
          });
        }

        return foundFile;
      });

      if (!file) {
        throw new Error('File not found or access denied');
      }

      // Return CDN URL for public files
      if (file.isPublic && file.cdnUrl) {
        return file.cdnUrl;
      }

      // Generate presigned URL for private files
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: file.storageKey,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      logger.error('Failed to get file URL', { error: error.message, fileId });
      throw error;
    }
  }

  /**
   * List files for an organization with filtering and pagination
   */
  async listFiles(organizationId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = null,
        mimeType = null,
        tags = null,
        isPublic = null,
        sortBy = 'uploadedAt',
        sortOrder = 'desc',
      } = options;

      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        organizationId,
        isActive: true,
      };

      if (search) {
        where.OR = [
          { filename: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (mimeType) {
        where.mimeType = { startsWith: mimeType };
      }

      if (tags && tags.length > 0) {
        where.tags = { hasSome: tags };
      }

      if (isPublic !== null) {
        where.isPublic = isPublic;
      }

      // SECURITY FIX: Use withTenantContext for proper RLS enforcement
      const [files, total] = await prismaService.withTenantContext(organizationId, async tx => {
        // Remove organizationId from where clause since RLS handles it
        const { organizationId: _, ...rlsWhere } = where;

        return await Promise.all([
          tx.fileStorage.findMany({
            where: rlsWhere,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
              uploader: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
              thumbnails: true,
              versions: {
                take: 1,
                orderBy: { versionNumber: 'desc' },
              },
            },
          }),
          tx.fileStorage.count({ where: rlsWhere }),
        ]);
      });

      return {
        files: files.map(file => ({
          ...file,
          fileSize: file.fileSize.toString(), // Convert BigInt to string
          metadata: file.metadata ? JSON.parse(file.metadata) : null,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to list files', { error: error.message, organizationId });
      throw error;
    }
  }

  /**
   * Delete file from storage and database
   */
  async deleteFile(fileId, organizationId) {
    try {
      // SECURITY FIX: Use withTenantContext for proper RLS enforcement
      const file = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.fileStorage.findFirst({
          where: { id: fileId },
          include: { thumbnails: true, versions: true },
        });
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Delete from S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: file.storageKey,
      });
      await this.s3Client.send(deleteCommand);

      // Delete thumbnails from S3
      for (const thumbnail of file.thumbnails) {
        const deleteThumbnailCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: thumbnail.storageKey,
        });
        await this.s3Client.send(deleteThumbnailCommand);
      }

      // Delete versions from S3
      for (const version of file.versions) {
        const deleteVersionCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: version.storageKey,
        });
        await this.s3Client.send(deleteVersionCommand);
      }

      // Delete from database using RLS context
      await prismaService.withTenantContext(organizationId, async tx => {
        await tx.fileStorage.delete({
          where: { id: fileId },
        });
      });

      logger.info('File deleted successfully', { fileId, storageKey: file.storageKey });
      return true;
    } catch (error) {
      logger.error('Failed to delete file', { error: error.message, fileId, organizationId });
      throw error;
    }
  }

  /**
   * Generate thumbnails for images
   */
  async generateThumbnails(fileId, imageBuffer, originalStorageKey) {
    try {
      const thumbnailSizes = [
        { name: '150x150', width: 150, height: 150 },
        { name: '300x300', width: 300, height: 300 },
        { name: '600x400', width: 600, height: 400 },
      ];

      for (const size of thumbnailSizes) {
        try {
          // Generate thumbnail
          const thumbnailBuffer = await sharp(imageBuffer)
            .resize(size.width, size.height, { fit: 'cover' })
            .jpeg({ quality: 85 })
            .toBuffer();

          // Generate storage key for thumbnail
          const pathParts = originalStorageKey.split('/');
          const filename = pathParts.pop();
          const thumbnailKey = `${pathParts.join('/')}/thumbnails/${size.name}-${filename}`;

          // Upload thumbnail to S3 with performance optimizations
          const uploadCommand = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: thumbnailKey,
            Body: thumbnailBuffer,
            ContentType: 'image/jpeg',
            // Aggressive caching for thumbnails (immutable)
            CacheControl: 'public, max-age=31536000, immutable',
            ServerSideEncryption: 'AES256',
            Metadata: {
              'thumbnail-size': size.name,
              'parent-file': fileId,
            },
          });

          await this.s3Client.send(uploadCommand);

          // Generate CDN URL
          const cdnUrl = this.cdnDomain
            ? `https://${this.cdnDomain}/${thumbnailKey}`
            : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${thumbnailKey}`;

          // Store thumbnail metadata
          await prisma.fileThumbnail.create({
            data: {
              fileId,
              size: size.name,
              storageKey: thumbnailKey,
              fileSize: BigInt(thumbnailBuffer.length),
              mimeType: 'image/jpeg',
              cdnUrl,
            },
          });
        } catch (thumbnailError) {
          logger.warn('Failed to generate thumbnail', {
            error: thumbnailError.message,
            fileId,
            size: size.name,
          });
        }
      }
    } catch (error) {
      logger.error('Thumbnail generation failed', { error: error.message, fileId });
    }
  }

  /**
   * Validate uploaded file
   */
  async validateFile(buffer, filename) {
    // Check file size
    if (buffer.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }

    // Check MIME type
    const mimeType = this.getMimeType(buffer, filename);
    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    // Additional security checks could go here
    return true;
  }

  /**
   * Get MIME type from file buffer and extension
   */
  getMimeType(buffer, filename) {
    // Check magic numbers for common file types
    if (buffer.length >= 4) {
      const header = buffer.subarray(0, 4);

      // JPEG
      if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
        return 'image/jpeg';
      }

      // PNG
      if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
        return 'image/png';
      }

      // PDF
      if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
        return 'application/pdf';
      }
    }

    // Fall back to extension-based detection
    return this.getMimeTypeFromExtension(path.extname(filename));
  }

  /**
   * Get MIME type from file extension
   */
  getMimeTypeFromExtension(ext) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
    };

    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Check if MIME type is an image
   */
  isImage(mimeType) {
    return mimeType.startsWith('image/');
  }
}

module.exports = EnhancedFileStorageService;
