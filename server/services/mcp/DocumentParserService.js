const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { logger } = require('../../utils/logger');

/**
 * DocumentParserService
 *
 * Extracts text content from various document formats for embedding generation.
 * Supports: PDF, DOCX, TXT, MD, and other text-based formats.
 */
class DocumentParserService {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Supported MIME types
    this.supportedTypes = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'text/plain': 'text',
      'text/markdown': 'markdown',
      'text/html': 'html',
      'application/json': 'json',
    };
  }

  /**
   * Check if a file type is supported for parsing
   * @param {string} mimeType - MIME type of the file
   * @returns {boolean}
   */
  isSupported(mimeType) {
    return mimeType in this.supportedTypes;
  }

  /**
   * Parse a file and extract text content
   * @param {Object} file - File object from database
   * @param {string} file.storageKey - S3 storage key
   * @param {string} file.mimeType - MIME type
   * @param {string} file.filename - Original filename
   * @returns {Promise<string>} - Extracted text content
   */
  async parseFile(file) {
    try {
      logger.info('Parsing file', {
        fileId: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
      });

      if (!this.isSupported(file.mimeType)) {
        throw new Error(`Unsupported file type: ${file.mimeType}`);
      }

      // Download file from S3
      const fileBuffer = await this.downloadFile(file.storageKey, file.bucketName);

      // Parse based on type
      const fileType = this.supportedTypes[file.mimeType];
      let text = '';

      switch (fileType) {
        case 'pdf':
          text = await this.parsePDF(fileBuffer);
          break;
        case 'docx':
          text = await this.parseDOCX(fileBuffer);
          break;
        case 'text':
        case 'markdown':
        case 'html':
        case 'json':
          text = await this.parseText(fileBuffer);
          break;
        default:
          throw new Error(`Parser not implemented for type: ${fileType}`);
      }

      logger.info('File parsed successfully', {
        fileId: file.id,
        textLength: text.length,
      });

      return text;
    } catch (error) {
      logger.error('Error parsing file', {
        fileId: file.id,
        filename: file.filename,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Download file from S3
   * @param {string} storageKey - S3 key
   * @param {string} bucketName - S3 bucket name
   * @returns {Promise<Buffer>}
   */
  async downloadFile(storageKey, bucketName) {
    try {
      const bucket = bucketName || process.env.AWS_S3_BUCKET;

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      });

      const response = await this.s3Client.send(command);

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('Error downloading file from S3', {
        storageKey,
        bucketName,
        error: error.message,
      });
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Parse PDF file
   * @param {Buffer} buffer - File buffer
   * @returns {Promise<string>}
   */
  async parsePDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      return this.cleanText(data.text);
    } catch (error) {
      logger.error('Error parsing PDF', { error: error.message });
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse DOCX file
   * @param {Buffer} buffer - File buffer
   * @returns {Promise<string>}
   */
  async parseDOCX(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return this.cleanText(result.value);
    } catch (error) {
      logger.error('Error parsing DOCX', { error: error.message });
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse text-based files
   * @param {Buffer} buffer - File buffer
   * @returns {Promise<string>}
   */
  async parseText(buffer) {
    try {
      const text = buffer.toString('utf-8');
      return this.cleanText(text);
    } catch (error) {
      logger.error('Error parsing text file', { error: error.message });
      throw new Error(`Text parsing failed: ${error.message}`);
    }
  }

  /**
   * Clean and normalize text
   * @param {string} text - Raw text
   * @returns {string} - Cleaned text
   */
  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .replace(/ {2,}/g, ' ') // Remove excessive spaces
      .trim();
  }

  /**
   * Chunk text into smaller segments for embedding
   * @param {string} text - Full text content
   * @param {Object} options - Chunking options
   * @param {number} options.chunkSize - Max characters per chunk
   * @param {number} options.chunkOverlap - Overlap between chunks
   * @returns {Array<Object>} - Array of chunks with metadata
   */
  chunkText(text, options = {}) {
    const { chunkSize = 1000, chunkOverlap = 200 } = options;

    const chunks = [];
    const sentences = this.splitIntoSentences(text);

    let currentChunk = '';
    let chunkIndex = 0;
    let startChar = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

      if (potentialChunk.length > chunkSize && currentChunk) {
        // Save current chunk
        chunks.push({
          index: chunkIndex,
          text: currentChunk.trim(),
          startChar,
          endChar: startChar + currentChunk.length,
          metadata: {
            sentenceStart: Math.max(0, i - this.countSentences(currentChunk)),
            sentenceEnd: i,
          },
        });

        // Calculate overlap
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
        startChar += currentChunk.length - overlapText.length;
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push({
        index: chunkIndex,
        text: currentChunk.trim(),
        startChar,
        endChar: startChar + currentChunk.length,
        metadata: {
          sentenceStart: Math.max(0, sentences.length - this.countSentences(currentChunk)),
          sentenceEnd: sentences.length,
        },
      });
    }

    logger.info('Text chunking complete', {
      totalChunks: chunks.length,
      avgChunkSize: Math.round(chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length),
    });

    return chunks;
  }

  /**
   * Split text into sentences
   * @param {string} text
   * @returns {Array<string>}
   */
  splitIntoSentences(text) {
    // Simple sentence splitting (can be improved with NLP library)
    return text
      .split(/[.!?]+\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Count sentences in text
   * @param {string} text
   * @returns {number}
   */
  countSentences(text) {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  /**
   * Get overlap text from end of chunk
   * @param {string} text
   * @param {number} overlapSize
   * @returns {string}
   */
  getOverlapText(text, overlapSize) {
    if (text.length <= overlapSize) return text;

    // Try to break at sentence boundary
    const overlapText = text.slice(-overlapSize);
    const sentenceMatch = overlapText.match(/[.!?]\s+/);

    if (sentenceMatch) {
      return overlapText.slice(sentenceMatch.index + sentenceMatch[0].length);
    }

    return overlapText;
  }

  /**
   * Extract metadata from document
   * @param {Object} file - File object
   * @param {string} text - Extracted text
   * @returns {Object} - Metadata object
   */
  extractMetadata(file, text) {
    const wordCount = text.split(/\s+/).length;
    const characterCount = text.length;
    const lineCount = text.split('\n').length;

    return {
      wordCount,
      characterCount,
      lineCount,
      filename: file.filename,
      mimeType: file.mimeType,
      fileSize: parseInt(file.fileSize),
      uploadedAt: file.uploadedAt,
    };
  }
}

module.exports = new DocumentParserService();
