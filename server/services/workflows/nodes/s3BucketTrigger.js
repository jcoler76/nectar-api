const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { logger } = require('../../../utils/logger');
const { getFileStorageService } = require('../../fileStorageService');

const execute = async (config, context) => {
  try {
    logger.info(`Executing S3 Bucket Trigger Node: "${config.label}"`);

    const {
      bucketName,
      awsRegion = process.env.AWS_REGION || 'us-east-1',
      awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY,
      filePattern = '*',
      pollingInterval = parseInt(process.env.S3_POLLING_INTERVAL_MS) || 300000,
      processedFilesTracker = {},
      moveAfterProcessing = false,
      deleteAfterProcessing = false,
      prefix = '',
      maxFiles = 10,
    } = config;

    // Validate required configuration
    if (!bucketName) {
      return {
        status: 'error',
        message: 'S3 bucket name is required',
      };
    }

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      return {
        status: 'error',
        message:
          'AWS credentials are required. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables or configure them in the node.',
      };
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    // List objects in bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: maxFiles,
    });

    let response;
    try {
      response = await s3Client.send(listCommand);
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to list S3 objects: ${error.message}`,
      };
    }

    if (!response.Contents || response.Contents.length === 0) {
      logger.info(
        `No files found in S3 bucket: ${bucketName}${prefix ? ` with prefix: ${prefix}` : ''}`
      );
      return {
        status: 'success',
        data: {
          message: 'No new files found',
          filesProcessed: 0,
          files: [],
        },
      };
    }

    // Filter files based on pattern and check if not already processed
    const newFiles = response.Contents.filter(object => {
      const fileName = object.Key;

      // Check if already processed
      if (
        processedFilesTracker[fileName] &&
        processedFilesTracker[fileName] >= object.LastModified.getTime()
      ) {
        return false;
      }

      // Apply file pattern filter
      if (filePattern !== '*') {
        const regex = new RegExp(filePattern.replace(/\*/g, '.*'));
        if (!regex.test(fileName)) {
          return false;
        }
      }

      return true;
    });

    if (newFiles.length === 0) {
      logger.info(`No new files matching pattern "${filePattern}" in S3 bucket: ${bucketName}`);
      return {
        status: 'success',
        data: {
          message: 'No new files matching pattern',
          filesProcessed: 0,
          files: [],
        },
      };
    }

    // Process new files
    const processedFiles = [];
    const fileStorageService = getFileStorageService();

    for (const s3Object of newFiles.slice(0, maxFiles)) {
      try {
        // Download file from S3
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: s3Object.Key,
        });

        const fileResponse = await s3Client.send(getCommand);
        const fileBuffer = Buffer.from(await fileResponse.Body.transformToByteArray());

        // Store file in temporary storage
        const metadata = {
          originalname: s3Object.Key.split('/').pop(), // Get filename from key
          mimetype: fileResponse.ContentType || 'application/octet-stream',
          size: s3Object.Size,
          s3Key: s3Object.Key,
          s3Bucket: bucketName,
          s3LastModified: s3Object.LastModified,
          s3ETag: s3Object.ETag,
          downloadedAt: new Date().toISOString(),
        };

        const { fileId, expiresAt } = await fileStorageService.storeFile(fileBuffer, metadata);

        // Mark file as processed
        config.processedFilesTracker = config.processedFilesTracker || {};
        config.processedFilesTracker[s3Object.Key] = s3Object.LastModified.getTime();

        processedFiles.push({
          fileId,
          s3Key: s3Object.Key,
          filename: metadata.originalname,
          size: metadata.size,
          lastModified: s3Object.LastModified,
          expiresAt,
          mimetype: metadata.mimetype,
        });

        logger.info(`Downloaded and stored S3 file: ${s3Object.Key} (${metadata.size} bytes)`);

        // Handle post-processing actions
        if (deleteAfterProcessing) {
          // Note: Implement delete functionality if needed
          logger.info(`File ${s3Object.Key} marked for deletion (not implemented)`);
        } else if (moveAfterProcessing) {
          // Note: Implement move functionality if needed
          logger.info(`File ${s3Object.Key} marked for moving (not implemented)`);
        }
      } catch (error) {
        logger.error(`Failed to process S3 file ${s3Object.Key}:`, error.message);
        continue; // Continue with next file
      }
    }

    logger.info(
      `S3 Bucket Trigger processed ${processedFiles.length} files from bucket: ${bucketName}`
    );

    return {
      status: 'success',
      data: {
        bucketName,
        filesProcessed: processedFiles.length,
        files: processedFiles,
        pollingInterval,
        nextPollTime: new Date(Date.now() + pollingInterval).toISOString(),
        totalObjectsInBucket: response.Contents.length,
      },
    };
  } catch (error) {
    logger.error(`S3 Bucket Trigger node "${config.label}" failed:`, error.message);
    return {
      status: 'error',
      message: `S3 bucket monitoring failed: ${error.message}`,
    };
  }
};

const validateConfig = config => {
  const errors = [];

  if (!config.bucketName) {
    errors.push('S3 bucket name is required');
  }

  if (
    config.pollingInterval &&
    (config.pollingInterval < 60000 || config.pollingInterval > 3600000)
  ) {
    errors.push('Polling interval must be between 1 minute (60000ms) and 1 hour (3600000ms)');
  }

  if (config.maxFiles && (config.maxFiles < 1 || config.maxFiles > 100)) {
    errors.push('Max files must be between 1 and 100');
  }

  return errors;
};

const getDefaultConfig = () => ({
  bucketName: '',
  awsRegion: 'us-east-1',
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  filePattern: '*',
  pollingInterval: 300000, // 5 minutes
  processedFilesTracker: {},
  moveAfterProcessing: false,
  deleteAfterProcessing: false,
  prefix: '',
  maxFiles: 10,
});

module.exports = {
  execute,
  validateConfig,
  getDefaultConfig,
};
