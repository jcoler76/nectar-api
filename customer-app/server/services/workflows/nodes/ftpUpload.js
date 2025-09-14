const { logger } = require('../../../utils/logger');
const { Client: FTPClient } = require('basic-ftp');
const SftpClient = require('ssh2-sftp-client');
const { getFileStorageService } = require('../../fileStorageService');

const execute = async (config, context) => {
  try {
    logger.info(`Executing FTP Upload Node: "${config.label}"`);

    const {
      protocol = 'ftp',
      host,
      port,
      username,
      password,
      remotePath = '/',
      filename,
      fileSource = 'previous',
      fileId,
      passive = true,
      secure = false,
      timeout = 30000,
    } = config;

    // Validate required fields
    if (!host) {
      return {
        status: 'error',
        message: 'Host is required',
      };
    }

    if (!username) {
      return {
        status: 'error',
        message: 'Username is required',
      };
    }

    if (!password) {
      return {
        status: 'error',
        message: 'Password is required',
      };
    }

    // Validate protocol
    if (!['ftp', 'ftps', 'sftp'].includes(protocol)) {
      return {
        status: 'error',
        message: 'Protocol must be ftp, ftps, or sftp',
      };
    }

    // Get file data
    let fileBuffer, fileMetadata;

    if (fileSource === 'previous') {
      // Look for file data in the previous node's output
      const contextValues = Object.values(context);
      const fileData = contextValues.find(result => result && result.data && result.data.fileId);

      if (!fileData) {
        return {
          status: 'error',
          message: 'No file found in previous node outputs',
        };
      }

      const fileStorageService = getFileStorageService();
      const fileResult = await fileStorageService.retrieveFile(fileData.data.fileId);
      fileBuffer = fileResult.buffer;
      fileMetadata = fileResult.metadata;
    } else if (fileSource === 'specific' && fileId) {
      // Use specific file ID
      const fileStorageService = getFileStorageService();
      const fileResult = await fileStorageService.retrieveFile(fileId);
      fileBuffer = fileResult.buffer;
      fileMetadata = fileResult.metadata;
    } else {
      return {
        status: 'error',
        message: 'Invalid file source configuration',
      };
    }

    if (!fileBuffer) {
      return {
        status: 'error',
        message: 'File not found or could not be retrieved',
      };
    }

    // Determine remote filename
    const remoteFilename = filename || fileMetadata.originalname || 'uploaded_file';
    const fullRemotePath = remotePath.endsWith('/')
      ? `${remotePath}${remoteFilename}`
      : `${remotePath}/${remoteFilename}`;

    // Upload file based on protocol
    let uploadResult;
    if (protocol === 'sftp') {
      uploadResult = await uploadViaSFTP({
        host,
        port: port || 22,
        username,
        password,
        remotePath: fullRemotePath,
        fileBuffer,
        timeout,
      });
    } else {
      uploadResult = await uploadViaFTP({
        host,
        port: port || 21,
        username,
        password,
        remotePath: fullRemotePath,
        fileBuffer,
        passive,
        secure: protocol === 'ftps' || secure,
        timeout,
      });
    }

    if (uploadResult.error) {
      return {
        status: 'error',
        message: uploadResult.error,
      };
    }

    logger.info(
      `Successfully uploaded file "${remoteFilename}" to ${protocol.toUpperCase()} server`
    );

    return {
      status: 'success',
      data: {
        protocol,
        host,
        remotePath: fullRemotePath,
        filename: remoteFilename,
        size: fileBuffer.length,
        uploadedAt: new Date().toISOString(),
        ...uploadResult.data,
      },
    };
  } catch (error) {
    logger.error(`FTP Upload node "${config.label}" failed:`, error.message);
    return {
      status: 'error',
      message: `FTP upload failed: ${error.message}`,
    };
  }
};

const uploadViaFTP = async options => {
  const { host, port, username, password, remotePath, fileBuffer, passive, secure, timeout } =
    options;

  const client = new FTPClient(timeout);

  try {
    // Set passive mode
    client.ftp.passive = passive;

    // Connect to FTP server
    await client.access({
      host,
      port,
      user: username,
      password,
      secure,
    });

    logger.info(`Connected to ${secure ? 'FTPS' : 'FTP'} server: ${host}:${port}`);

    // Ensure remote directory exists
    const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
    if (remoteDir && remoteDir !== '/') {
      try {
        await client.ensureDir(remoteDir);
      } catch (error) {
        logger.warn(`Could not ensure directory ${remoteDir}: ${error.message}`);
      }
    }

    // Upload file
    const readable = require('stream').Readable.from(fileBuffer);
    await client.uploadFrom(readable, remotePath);

    // Get file info to confirm upload
    let fileInfo;
    try {
      fileInfo = await client.size(remotePath);
    } catch (error) {
      logger.warn(`Could not get remote file size: ${error.message}`);
    }

    client.close();

    return {
      data: {
        transferMode: passive ? 'passive' : 'active',
        secure: secure,
        remoteSize: fileInfo || fileBuffer.length,
      },
    };
  } catch (error) {
    try {
      client.close();
    } catch (closeError) {
      logger.warn(`Error closing FTP connection: ${closeError.message}`);
    }

    return {
      error: `FTP upload failed: ${error.message}`,
    };
  }
};

const uploadViaSFTP = async options => {
  const { host, port, username, password, remotePath, fileBuffer, timeout } = options;

  const client = new SftpClient();

  try {
    // Connect to SFTP server
    await client.connect({
      host,
      port,
      username,
      password,
      readyTimeout: timeout,
    });

    logger.info(`Connected to SFTP server: ${host}:${port}`);

    // Ensure remote directory exists
    const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
    if (remoteDir && remoteDir !== '/') {
      try {
        await client.mkdir(remoteDir, true);
      } catch (error) {
        logger.warn(`Could not create directory ${remoteDir}: ${error.message}`);
      }
    }

    // Upload file
    await client.put(fileBuffer, remotePath);

    // Get file info to confirm upload
    let fileInfo;
    try {
      fileInfo = await client.stat(remotePath);
    } catch (error) {
      logger.warn(`Could not get remote file info: ${error.message}`);
    }

    await client.end();

    return {
      data: {
        remoteSize: fileInfo ? fileInfo.size : fileBuffer.length,
        remoteMode: fileInfo ? fileInfo.mode : null,
        remoteModified: fileInfo ? fileInfo.mtime : null,
      },
    };
  } catch (error) {
    try {
      await client.end();
    } catch (closeError) {
      logger.warn(`Error closing SFTP connection: ${closeError.message}`);
    }

    return {
      error: `SFTP upload failed: ${error.message}`,
    };
  }
};

module.exports = {
  execute,
};
