/**
 * Interface for storage providers
 * All storage providers must implement these methods
 */
class IStorageProvider {
  constructor(config) {
    if (new.target === IStorageProvider) {
      throw new Error('Cannot instantiate abstract class IStorageProvider directly');
    }
    this.config = config;
  }

  /**
   * Test the storage connection/credentials
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async testConnection() {
    throw new Error('Method testConnection must be implemented');
  }

  /**
   * Upload a file to storage
   * @param {Buffer} buffer - File buffer
   * @param {string} key - File key/path
   * @param {Object} metadata - File metadata
   * @returns {Promise<{url: string, key: string, etag?: string}>}
   */
  async uploadFile(buffer, key, metadata = {}) {
    throw new Error('Method uploadFile must be implemented');
  }

  /**
   * Download a file from storage
   * @param {string} key - File key/path
   * @returns {Promise<{buffer: Buffer, metadata: Object}>}
   */
  async downloadFile(key) {
    throw new Error('Method downloadFile must be implemented');
  }

  /**
   * Delete a file from storage
   * @param {string} key - File key/path
   * @returns {Promise<boolean>}
   */
  async deleteFile(key) {
    throw new Error('Method deleteFile must be implemented');
  }

  /**
   * Get file metadata
   * @param {string} key - File key/path
   * @returns {Promise<Object>}
   */
  async getFileMetadata(key) {
    throw new Error('Method getFileMetadata must be implemented');
  }

  /**
   * List files in storage
   * @param {string} prefix - Prefix to filter files
   * @param {number} limit - Maximum number of files to return
   * @returns {Promise<Array<{key: string, size: number, lastModified: Date}>>}
   */
  async listFiles(prefix = '', limit = 100) {
    throw new Error('Method listFiles must be implemented');
  }

  /**
   * Generate a presigned URL for direct upload/download
   * @param {string} key - File key/path
   * @param {string} operation - 'upload' or 'download'
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {Promise<string>}
   */
  async generatePresignedUrl(key, operation, expiresIn = 3600) {
    throw new Error('Method generatePresignedUrl must be implemented');
  }

  /**
   * Copy a file within storage
   * @param {string} sourceKey - Source file key
   * @param {string} destinationKey - Destination file key
   * @returns {Promise<boolean>}
   */
  async copyFile(sourceKey, destinationKey) {
    throw new Error('Method copyFile must be implemented');
  }

  /**
   * Move a file within storage
   * @param {string} sourceKey - Source file key
   * @param {string} destinationKey - Destination file key
   * @returns {Promise<boolean>}
   */
  async moveFile(sourceKey, destinationKey) {
    const result = await this.copyFile(sourceKey, destinationKey);
    if (result) {
      await this.deleteFile(sourceKey);
    }
    return result;
  }

  /**
   * Get storage provider information
   * @returns {Object}
   */
  static getProviderInfo() {
    throw new Error('Static method getProviderInfo must be implemented');
  }

  /**
   * Get configuration validation rules
   * @returns {Object}
   */
  static getConfigValidation() {
    throw new Error('Static method getConfigValidation must be implemented');
  }
}

module.exports = IStorageProvider;
