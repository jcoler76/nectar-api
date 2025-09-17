const { BigQuery } = require('@google-cloud/bigquery');
const IDatabaseDriver = require('../../database/interfaces/IDatabaseDriver');
const { logger } = require('../../../utils/logger');

/**
 * Google BigQuery Analytics Driver
 * Provides big data analytics capabilities using Google BigQuery
 */
class BigQueryDriver extends IDatabaseDriver {
  constructor(config) {
    super(config);
    this.client = null;
    this.projectId = config.projectId;
    this.datasetId = config.datasetId;
    this.location = config.location || 'US';

    this._initializeClient();
  }

  /**
   * Initialize BigQuery client
   * @private
   */
  _initializeClient() {
    const options = {
      projectId: this.projectId,
      location: this.location,
    };

    if (this.config && this.config.keyFilename) {
      options.keyFilename = this.config.keyFilename;
    } else if (this.config && this.config.credentials) {
      options.credentials = this.config.credentials;
    }

    this.client = new BigQuery(options);
  }

  /**
   * Test BigQuery connection
   */
  async testConnection() {
    try {
      logger.debug('Testing BigQuery connection', {
        projectId: this.projectId,
        datasetId: this.datasetId,
        location: this.location,
      });

      // Test by getting datasets
      const [datasets] = await this.client.getDatasets();

      return {
        success: true,
        message: 'BigQuery connection successful',
        details: {
          projectId: this.projectId,
          datasetsCount: datasets.length,
          location: this.location,
        },
      };
    } catch (error) {
      logger.error('BigQuery connection test failed:', error.message);
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
   * Execute BigQuery SQL
   */
  async executeQuery(sql, params = []) {
    try {
      const startTime = Date.now();

      // Configure query options
      const options = {
        query: sql,
        location: this.location,
        useLegacySql: false,
        useQueryCache: this.config.useQueryCache !== false,
        maximumBytesBilled: this.config.maximumBytesBilled,
        dryRun: this.config.dryRun || false,
      };

      // Add query parameters if provided
      if (params && params.length > 0) {
        options.params = params;
      }

      // Add job configuration if specified
      if (this.config.jobConfig) {
        options.jobConfig = this.config.jobConfig;
      }

      logger.debug('Executing BigQuery query', {
        query: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        params: params.length,
        location: this.location,
        dryRun: options.dryRun,
      });

      const [job] = await this.client.createQueryJob(options);
      const [rows] = await job.getQueryResults();

      const executionTime = Date.now() - startTime;
      const rowCount = rows.length;

      // Get job metadata for statistics
      const [jobMetadata] = await job.getMetadata();
      const statistics = jobMetadata.statistics?.query;

      logger.info('BigQuery query executed successfully', {
        jobId: job.id,
        rowCount,
        executionTime: `${executionTime}ms`,
        totalBytesProcessed: statistics?.totalBytesProcessed,
        totalSlotMs: statistics?.totalSlotMs,
        cacheHit: statistics?.cacheHit,
      });

      return {
        rows,
        rowCount,
        executionTime,
        jobId: job.id,
        statistics: {
          totalBytesProcessed: statistics?.totalBytesProcessed,
          totalSlotMs: statistics?.totalSlotMs,
          creationTime: statistics?.creationTime,
          startTime: statistics?.startTime,
          endTime: statistics?.endTime,
          cacheHit: statistics?.cacheHit,
          totalBytesSkipped: statistics?.totalBytesSkipped,
        },
      };
    } catch (error) {
      logger.error('BigQuery query execution failed:', {
        query: sql.substring(0, 100),
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName) {
    try {
      const dataset = this.client.dataset(this.datasetId);
      const table = dataset.table(tableName);

      const [metadata] = await table.getMetadata();

      return {
        schema: metadata.schema,
        tableInfo: {
          id: metadata.id,
          type: metadata.type,
          location: metadata.location,
          numRows: metadata.numRows,
          numBytes: metadata.numBytes,
          creationTime: metadata.creationTime,
          lastModifiedTime: metadata.lastModifiedTime,
        },
      };
    } catch (error) {
      logger.error('Failed to get BigQuery table schema:', error.message);
      throw error;
    }
  }

  /**
   * Create dataset
   */
  async createDataset(datasetId, options = {}) {
    try {
      const dataset = this.client.dataset(datasetId);

      const createOptions = {
        location: options.location || this.location,
        description: options.description,
        ...options,
      };

      await dataset.create(createOptions);

      logger.info('BigQuery dataset created successfully', {
        datasetId,
        location: createOptions.location,
      });

      return true;
    } catch (error) {
      logger.error('Failed to create BigQuery dataset:', error.message);
      throw error;
    }
  }

  /**
   * Create table from query results
   */
  async createTableFromQuery(tableName, sql, options = {}) {
    try {
      const dataset = this.client.dataset(this.datasetId);
      const table = dataset.table(tableName);

      const queryOptions = {
        query: sql,
        location: this.location,
        destination: table,
        writeDisposition: options.writeDisposition || 'WRITE_TRUNCATE',
        createDisposition: options.createDisposition || 'CREATE_IF_NEEDED',
        useLegacySql: false,
      };

      const [job] = await this.client.createQueryJob(queryOptions);
      await job.getQueryResults();

      logger.info('BigQuery table created from query', {
        tableName,
        jobId: job.id,
        datasetId: this.datasetId,
      });

      return {
        success: true,
        jobId: job.id,
        tableName,
        datasetId: this.datasetId,
      };
    } catch (error) {
      logger.error('Failed to create BigQuery table from query:', error.message);
      throw error;
    }
  }

  /**
   * Load data from Cloud Storage
   */
  async loadDataFromStorage(tableName, sourceUris, options = {}) {
    try {
      const dataset = this.client.dataset(this.datasetId);
      const table = dataset.table(tableName);

      const loadOptions = {
        sourceFormat: options.sourceFormat || 'CSV',
        autodetect: options.autodetect !== false,
        writeDisposition: options.writeDisposition || 'WRITE_TRUNCATE',
        skipLeadingRows: options.skipLeadingRows || 1,
        fieldDelimiter: options.fieldDelimiter || ',',
        location: this.location,
        ...options,
      };

      const [job] = await table.load(sourceUris, loadOptions);
      await job.getQueryResults();

      const [jobMetadata] = await job.getMetadata();
      const statistics = jobMetadata.statistics?.load;

      logger.info('BigQuery data loaded from Cloud Storage', {
        tableName,
        sourceUris,
        jobId: job.id,
        inputFiles: statistics?.inputFiles,
        inputFileBytes: statistics?.inputFileBytes,
        outputRows: statistics?.outputRows,
      });

      return {
        success: true,
        jobId: job.id,
        statistics,
      };
    } catch (error) {
      logger.error('Failed to load data from Cloud Storage:', error.message);
      throw error;
    }
  }

  /**
   * Export data to Cloud Storage
   */
  async exportDataToStorage(tableName, destinationUri, options = {}) {
    try {
      const dataset = this.client.dataset(this.datasetId);
      const table = dataset.table(tableName);

      const extractOptions = {
        format: options.format || 'CSV',
        compression: options.compression || 'GZIP',
        location: this.location,
        ...options,
      };

      const [job] = await table.extract(destinationUri, extractOptions);
      await job.getQueryResults();

      logger.info('BigQuery data exported to Cloud Storage', {
        tableName,
        destinationUri,
        jobId: job.id,
      });

      return {
        success: true,
        jobId: job.id,
        destinationUri,
      };
    } catch (error) {
      logger.error('Failed to export data to Cloud Storage:', error.message);
      throw error;
    }
  }

  /**
   * Get analytics insights
   */
  async getAnalyticsInsights(options = {}) {
    try {
      const insights = {};

      // Get dataset information
      const dataset = this.client.dataset(this.datasetId);
      const [tables] = await dataset.getTables();

      insights.dataset = {
        id: this.datasetId,
        tablesCount: tables.length,
        tables: await Promise.all(
          tables.map(async table => {
            const [metadata] = await table.getMetadata();
            return {
              id: metadata.id,
              type: metadata.type,
              numRows: metadata.numRows,
              numBytes: metadata.numBytes,
              creationTime: metadata.creationTime,
              lastModifiedTime: metadata.lastModifiedTime,
            };
          })
        ),
      };

      // Get recent jobs
      if (options.includeJobs) {
        const [jobs] = await this.client.getJobs({
          maxResults: options.maxJobs || 10,
          allUsers: false,
        });

        insights.recentJobs = jobs.map(job => ({
          id: job.id,
          status: job.metadata.status,
          statistics: job.metadata.statistics,
          configuration: job.metadata.configuration,
        }));
      }

      return insights;
    } catch (error) {
      logger.error('Failed to get BigQuery analytics insights:', error.message);
      throw error;
    }
  }

  /**
   * Close connection (BigQuery is stateless, so this is a no-op)
   */
  async close() {
    logger.debug('BigQuery connection closed (stateless)');
  }

  /**
   * Get driver information
   */
  static getDriverInfo() {
    return {
      type: 'BIGQUERY',
      name: 'Google BigQuery',
      description: 'Google BigQuery analytics and big data processing',
      features: [
        'Serverless data warehouse',
        'Petabyte-scale analytics',
        'Standard SQL support',
        'Real-time analytics',
        'Machine learning integration',
        'Data streaming',
        'Automatic scaling',
        'Cost optimization',
      ],
      category: 'analytics',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConnectionValidation() {
    return {
      projectId: {
        required: true,
        type: 'string',
        description: 'Google Cloud Project ID',
      },
      datasetId: {
        required: true,
        type: 'string',
        description: 'BigQuery dataset ID',
      },
      location: {
        required: false,
        type: 'string',
        description: 'BigQuery dataset location',
        default: 'US',
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
      useQueryCache: {
        required: false,
        type: 'boolean',
        description: 'Enable query result caching',
        default: true,
      },
      maximumBytesBilled: {
        required: false,
        type: 'string',
        description: 'Maximum bytes that will be billed for queries',
      },
    };
  }
}

module.exports = BigQueryDriver;
