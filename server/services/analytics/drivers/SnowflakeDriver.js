const snowflake = require('snowflake-sdk');
const IDatabaseDriver = require('../../database/interfaces/IDatabaseDriver');
const { logger } = require('../../../utils/logger');

/**
 * Snowflake Analytics Driver
 * Provides cloud data warehouse capabilities using Snowflake
 */
class SnowflakeDriver extends IDatabaseDriver {
  constructor(config) {
    super(config);
    this.connection = null;
    this.connectionConfig = {
      account: config.account,
      username: config.username,
      password: config.password,
      database: config.database,
      schema: config.schema || 'PUBLIC',
      warehouse: config.warehouse,
      role: config.role,
      authenticator: config.authenticator || 'SNOWFLAKE',
      timeout: config.timeout || 60000,
      clientSessionKeepAlive: config.clientSessionKeepAlive !== false,
      clientSessionKeepAliveHeartbeatFrequency:
        config.clientSessionKeepAliveHeartbeatFrequency || 3600,
    };

    // Handle different authentication methods
    if (config.privateKey) {
      this.connectionConfig.privateKey = config.privateKey;
      this.connectionConfig.authenticator = 'SNOWFLAKE_JWT';
    }

    if (config.token) {
      this.connectionConfig.token = config.token;
      this.connectionConfig.authenticator = 'OAUTH';
    }
  }

  /**
   * Create and test Snowflake connection
   */
  async connect() {
    if (this.connection && this.connection.isUp()) {
      return this.connection;
    }

    return new Promise((resolve, reject) => {
      logger.debug('Connecting to Snowflake', {
        account: this.connectionConfig.account,
        username: this.connectionConfig.username,
        database: this.connectionConfig.database,
        warehouse: this.connectionConfig.warehouse,
      });

      this.connection = snowflake.createConnection(this.connectionConfig);

      this.connection.connect((err, conn) => {
        if (err) {
          logger.error('Snowflake connection failed:', err.message);
          reject(err);
        } else {
          logger.info('Snowflake connection established successfully');
          resolve(conn);
        }
      });
    });
  }

  /**
   * Test Snowflake connection
   */
  async testConnection() {
    try {
      await this.connect();

      // Test with a simple query
      const result = await this.executeQuery(
        'SELECT CURRENT_VERSION() as version, CURRENT_TIMESTAMP() as timestamp'
      );

      return {
        success: true,
        message: 'Snowflake connection successful',
        details: {
          account: this.connectionConfig.account,
          database: this.connectionConfig.database,
          warehouse: this.connectionConfig.warehouse,
          version: result.rows[0]?.VERSION,
          timestamp: result.rows[0]?.TIMESTAMP,
        },
      };
    } catch (error) {
      logger.error('Snowflake connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          sqlState: error.sqlState,
        },
      };
    }
  }

  /**
   * Execute Snowflake SQL
   */
  async executeQuery(sql, params = []) {
    try {
      await this.connect();

      const startTime = Date.now();

      return new Promise((resolve, reject) => {
        logger.debug('Executing Snowflake query', {
          query: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
          params: params.length,
          warehouse: this.connectionConfig.warehouse,
        });

        const queryOptions = {
          sqlText: sql,
          binds: params,
          complete: (err, stmt, rows) => {
            const executionTime = Date.now() - startTime;

            if (err) {
              logger.error('Snowflake query execution failed:', {
                query: sql.substring(0, 100),
                error: err.message,
                code: err.code,
                sqlState: err.sqlState,
              });
              reject(err);
            } else {
              const rowCount = rows ? rows.length : 0;

              logger.info('Snowflake query executed successfully', {
                statementId: stmt.getStatementId(),
                rowCount,
                executionTime: `${executionTime}ms`,
                warehouse: this.connectionConfig.warehouse,
              });

              resolve({
                rows: rows || [],
                rowCount,
                executionTime,
                statementId: stmt.getStatementId(),
                statistics: {
                  executionTime,
                  warehouse: this.connectionConfig.warehouse,
                  database: this.connectionConfig.database,
                  schema: this.connectionConfig.schema,
                },
              });
            }
          },
        };

        this.connection.execute(queryOptions);
      });
    } catch (error) {
      logger.error('Snowflake query execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute query with streaming results (for large datasets)
   */
  async executeStreamingQuery(sql, params = [], options = {}) {
    try {
      await this.connect();

      return new Promise((resolve, reject) => {
        const results = {
          rows: [],
          rowCount: 0,
          chunks: 0,
        };

        const queryOptions = {
          sqlText: sql,
          binds: params,
          streamResult: true,
          complete: (err, stmt, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                ...results,
                statementId: stmt.getStatementId(),
              });
            }
          },
        };

        // Handle streaming data
        const stream = this.connection.execute(queryOptions);

        stream.on('data', row => {
          results.rows.push(row);
          results.rowCount++;

          // Optional callback for each row
          if (options.onRow) {
            options.onRow(row, results.rowCount);
          }
        });

        stream.on('end', () => {
          logger.info('Snowflake streaming query completed', {
            rowCount: results.rowCount,
            chunks: results.chunks,
          });
        });

        stream.on('error', err => {
          logger.error('Snowflake streaming query error:', err.message);
          reject(err);
        });
      });
    } catch (error) {
      logger.error('Snowflake streaming query failed:', error.message);
      throw error;
    }
  }

  /**
   * Get warehouse information
   */
  async getWarehouseInfo() {
    try {
      const result = await this.executeQuery(`
        SHOW WAREHOUSES LIKE '${this.connectionConfig.warehouse}'
      `);

      if (result.rows.length > 0) {
        const warehouse = result.rows[0];
        return {
          name: warehouse.name,
          state: warehouse.state,
          type: warehouse.type,
          size: warehouse.size,
          minClusterCount: warehouse.min_cluster_count,
          maxClusterCount: warehouse.max_cluster_count,
          autoSuspend: warehouse.auto_suspend,
          autoResume: warehouse.auto_resume,
          comment: warehouse.comment,
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to get Snowflake warehouse info:', error.message);
      throw error;
    }
  }

  /**
   * Get database schema information
   */
  async getDatabaseSchema() {
    try {
      const result = await this.executeQuery(`
        SELECT
          table_catalog,
          table_schema,
          table_name,
          table_type,
          row_count,
          bytes
        FROM information_schema.tables
        WHERE table_catalog = '${this.connectionConfig.database}'
        ORDER BY table_schema, table_name
      `);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get Snowflake database schema:', error.message);
      throw error;
    }
  }

  /**
   * Get table columns information
   */
  async getTableSchema(tableName) {
    try {
      const result = await this.executeQuery(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          is_identity,
          comment
        FROM information_schema.columns
        WHERE table_catalog = '${this.connectionConfig.database}'
          AND table_schema = '${this.connectionConfig.schema}'
          AND table_name = '${tableName.toUpperCase()}'
        ORDER BY ordinal_position
      `);

      return {
        tableName,
        columns: result.rows,
      };
    } catch (error) {
      logger.error('Failed to get Snowflake table schema:', error.message);
      throw error;
    }
  }

  /**
   * Load data from stage
   */
  async loadDataFromStage(tableName, stageName, options = {}) {
    try {
      const copyOptions = [];

      if (options.fileFormat) {
        copyOptions.push(`FILE_FORMAT = ${options.fileFormat}`);
      }

      if (options.pattern) {
        copyOptions.push(`PATTERN = '${options.pattern}'`);
      }

      if (options.force) {
        copyOptions.push('FORCE = TRUE');
      }

      const sql = `
        COPY INTO ${tableName}
        FROM @${stageName}
        ${copyOptions.length > 0 ? copyOptions.join(' ') : ''}
      `;

      const result = await this.executeQuery(sql);

      logger.info('Data loaded from Snowflake stage', {
        tableName,
        stageName,
        rowsLoaded: result.rows[0]?.rows_loaded || 0,
        rowsParsed: result.rows[0]?.rows_parsed || 0,
      });

      return {
        success: true,
        rowsLoaded: result.rows[0]?.rows_loaded || 0,
        rowsParsed: result.rows[0]?.rows_parsed || 0,
        firstError: result.rows[0]?.first_error,
      };
    } catch (error) {
      logger.error('Failed to load data from Snowflake stage:', error.message);
      throw error;
    }
  }

  /**
   * Unload data to stage
   */
  async unloadDataToStage(query, stageName, options = {}) {
    try {
      const copyOptions = [];

      if (options.fileFormat) {
        copyOptions.push(`FILE_FORMAT = ${options.fileFormat}`);
      }

      if (options.header) {
        copyOptions.push('HEADER = TRUE');
      }

      if (options.singleFile) {
        copyOptions.push('SINGLE = TRUE');
      }

      const sql = `
        COPY INTO @${stageName}
        FROM (${query})
        ${copyOptions.length > 0 ? copyOptions.join(' ') : ''}
      `;

      const result = await this.executeQuery(sql);

      logger.info('Data unloaded to Snowflake stage', {
        stageName,
        rowsUnloaded: result.rows[0]?.rows_unloaded || 0,
      });

      return {
        success: true,
        rowsUnloaded: result.rows[0]?.rows_unloaded || 0,
        filesUnloaded: result.rows[0]?.files_unloaded || 0,
      };
    } catch (error) {
      logger.error('Failed to unload data to Snowflake stage:', error.message);
      throw error;
    }
  }

  /**
   * Get analytics insights
   */
  async getAnalyticsInsights(options = {}) {
    try {
      const insights = {};

      // Get warehouse usage
      insights.warehouse = await this.getWarehouseInfo();

      // Get database schema
      insights.schema = await this.getDatabaseSchema();

      // Get query history (last 24 hours)
      if (options.includeQueryHistory) {
        const queryHistoryResult = await this.executeQuery(`
          SELECT
            query_id,
            query_text,
            user_name,
            warehouse_name,
            execution_status,
            execution_time,
            queued_provisioning_time,
            queued_repair_time,
            queued_overload_time,
            compilation_time,
            total_elapsed_time,
            bytes_scanned,
            rows_produced,
            start_time,
            end_time
          FROM information_schema.query_history
          WHERE start_time >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
          ORDER BY start_time DESC
          LIMIT ${options.maxQueries || 10}
        `);

        insights.queryHistory = queryHistoryResult.rows;
      }

      // Get current sessions
      if (options.includeSessions) {
        const sessionsResult = await this.executeQuery(`
          SHOW SESSIONS
        `);

        insights.sessions = sessionsResult.rows;
      }

      return insights;
    } catch (error) {
      logger.error('Failed to get Snowflake analytics insights:', error.message);
      throw error;
    }
  }

  /**
   * Close Snowflake connection
   */
  async close() {
    if (this.connection && this.connection.isUp()) {
      return new Promise(resolve => {
        this.connection.destroy(err => {
          if (err) {
            logger.warn('Error closing Snowflake connection:', err.message);
          } else {
            logger.debug('Snowflake connection closed successfully');
          }
          resolve();
        });
      });
    }
  }

  /**
   * Get driver information
   */
  static getDriverInfo() {
    return {
      type: 'SNOWFLAKE',
      name: 'Snowflake',
      description: 'Snowflake cloud data warehouse and analytics platform',
      features: [
        'Cloud-native data warehouse',
        'Automatic scaling',
        'Multi-cluster compute',
        'Data sharing',
        'Time travel',
        'Zero-copy cloning',
        'Secure data sharing',
        'Built-in optimization',
      ],
      category: 'analytics',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConnectionValidation() {
    return {
      account: {
        required: true,
        type: 'string',
        description: 'Snowflake account identifier',
      },
      username: {
        required: true,
        type: 'string',
        description: 'Snowflake username',
      },
      password: {
        required: false,
        type: 'string',
        description: 'Snowflake password (required if not using key-pair auth)',
        sensitive: true,
      },
      database: {
        required: true,
        type: 'string',
        description: 'Snowflake database name',
      },
      schema: {
        required: false,
        type: 'string',
        description: 'Snowflake schema name',
        default: 'PUBLIC',
      },
      warehouse: {
        required: true,
        type: 'string',
        description: 'Snowflake warehouse name',
      },
      role: {
        required: false,
        type: 'string',
        description: 'Snowflake role name',
      },
      authenticator: {
        required: false,
        type: 'string',
        description: 'Authentication method',
        default: 'SNOWFLAKE',
        enum: ['SNOWFLAKE', 'SNOWFLAKE_JWT', 'OAUTH'],
      },
      privateKey: {
        required: false,
        type: 'string',
        description: 'Private key for key-pair authentication',
        sensitive: true,
      },
      token: {
        required: false,
        type: 'string',
        description: 'OAuth token',
        sensitive: true,
      },
      timeout: {
        required: false,
        type: 'number',
        description: 'Connection timeout in milliseconds',
        default: 60000,
      },
    };
  }
}

module.exports = SnowflakeDriver;
