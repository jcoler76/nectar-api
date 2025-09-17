const mysql = require('mysql2/promise');
const { Client: PostgresClient } = require('pg');
const IDatabaseDriver = require('../interfaces/IDatabaseDriver');
const { logger } = require('../../../utils/logger');

/**
 * Google Cloud SQL Driver
 * Provides managed database connectivity for Google Cloud SQL instances
 * Supports MySQL and PostgreSQL engines with Cloud SQL features
 */
class GoogleCloudSQLDriver extends IDatabaseDriver {
  constructor(config) {
    super(config);
    this.connection = null;
    this.engine = config.engine; // mysql, postgres
    this.instanceConnectionName = config.instanceConnectionName;
    this.connectionConfig = {
      host: config.host,
      port: config.port,
      user: config.user || config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl !== false, // Default to SSL for Cloud SQL
      connectTimeout: config.connectTimeout || 60000,
      acquireTimeout: config.acquireTimeout || 60000,
      timeout: config.timeout || 60000,
    };

    // Google Cloud specific configuration
    this.cloudConfig = {
      projectId: config.projectId,
      region: config.region,
      instanceId: config.instanceId,
      socketPath: config.socketPath, // For Unix socket connections
    };

    // Google Cloud IAM authentication
    if (config.useIAMAuth) {
      this.cloudConfig.useIAMAuth = true;
      this.cloudConfig.serviceAccountEmail = config.serviceAccountEmail;
    }

    // Cloud SQL Proxy configuration
    if (config.useCloudSQLProxy) {
      this.cloudConfig.useCloudSQLProxy = true;
      this.connectionConfig.host = '127.0.0.1'; // Cloud SQL Proxy local endpoint
    }

    // Private IP configuration
    if (config.usePrivateIP) {
      this.cloudConfig.usePrivateIP = true;
    }
  }

  /**
   * Create database connection based on engine type
   */
  async connect() {
    if (this.connection) {
      return this.connection;
    }

    try {
      logger.debug('Connecting to Google Cloud SQL', {
        engine: this.engine,
        instanceConnectionName: this.instanceConnectionName,
        host: this.connectionConfig.host,
        database: this.connectionConfig.database,
        useIAMAuth: this.cloudConfig.useIAMAuth,
        useCloudSQLProxy: this.cloudConfig.useCloudSQLProxy,
      });

      switch (this.engine.toLowerCase()) {
        case 'mysql':
          this.connection = await this._connectMySQL();
          break;
        case 'postgres':
        case 'postgresql':
          this.connection = await this._connectPostgreSQL();
          break;
        default:
          throw new Error(`Unsupported Cloud SQL engine: ${this.engine}`);
      }

      logger.info('Google Cloud SQL connection established successfully', {
        engine: this.engine,
        instanceConnectionName: this.instanceConnectionName,
      });

      return this.connection;
    } catch (error) {
      logger.error('Google Cloud SQL connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Connect to MySQL Cloud SQL instance
   * @private
   */
  async _connectMySQL() {
    const connectionOptions = {
      host: this.connectionConfig.host,
      port: this.connectionConfig.port || 3306,
      user: this.connectionConfig.user,
      password: this.connectionConfig.password,
      database: this.connectionConfig.database,
      ssl: this.connectionConfig.ssl,
      connectTimeout: this.connectionConfig.connectTimeout,
      acquireTimeout: this.connectionConfig.acquireTimeout,
      timeout: this.connectionConfig.timeout,
    };

    // Unix socket connection for Cloud SQL
    if (this.cloudConfig.socketPath) {
      connectionOptions.socketPath = this.cloudConfig.socketPath;
      delete connectionOptions.host;
      delete connectionOptions.port;
    }

    // Cloud SQL instance connection name for socket
    if (this.instanceConnectionName && !this.cloudConfig.useCloudSQLProxy) {
      connectionOptions.socketPath = `/cloudsql/${this.instanceConnectionName}`;
      delete connectionOptions.host;
      delete connectionOptions.port;
    }

    const connection = await mysql.createConnection(connectionOptions);
    return connection;
  }

  /**
   * Connect to PostgreSQL Cloud SQL instance
   * @private
   */
  async _connectPostgreSQL() {
    const connectionOptions = {
      host: this.connectionConfig.host,
      port: this.connectionConfig.port || 5432,
      user: this.connectionConfig.user,
      password: this.connectionConfig.password,
      database: this.connectionConfig.database,
      ssl: this.connectionConfig.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: this.connectionConfig.connectTimeout,
    };

    // Unix socket connection for Cloud SQL
    if (this.cloudConfig.socketPath) {
      connectionOptions.host = this.cloudConfig.socketPath;
      delete connectionOptions.port;
    }

    // Cloud SQL instance connection name for socket
    if (this.instanceConnectionName && !this.cloudConfig.useCloudSQLProxy) {
      connectionOptions.host = `/cloudsql/${this.instanceConnectionName}`;
      delete connectionOptions.port;
    }

    const client = new PostgresClient(connectionOptions);
    await client.connect();
    return client;
  }

  /**
   * Test Cloud SQL connection
   */
  async testConnection() {
    try {
      await this.connect();

      // Test with engine-specific query
      let testQuery;
      switch (this.engine.toLowerCase()) {
        case 'mysql':
          testQuery = `
            SELECT
              VERSION() as version,
              NOW() as timestamp,
              @@hostname as hostname,
              @@read_only as read_only
          `;
          break;
        case 'postgres':
        case 'postgresql':
          testQuery = `
            SELECT
              version(),
              NOW() as timestamp,
              inet_server_addr() as server_addr,
              pg_is_in_recovery() as is_replica
          `;
          break;
        default:
          testQuery = 'SELECT 1 as test';
      }

      const result = await this.executeQuery(testQuery);

      return {
        success: true,
        message: 'Google Cloud SQL connection successful',
        details: {
          engine: this.engine,
          instanceConnectionName: this.instanceConnectionName,
          database: this.connectionConfig.database,
          projectId: this.cloudConfig.projectId,
          region: this.cloudConfig.region,
          version: result.rows[0]?.version,
          timestamp: result.rows[0]?.timestamp,
          hostname: result.rows[0]?.hostname,
          isReplica: result.rows[0]?.is_replica || result.rows[0]?.read_only,
        },
      };
    } catch (error) {
      logger.error('Google Cloud SQL connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          engine: this.engine,
          instanceConnectionName: this.instanceConnectionName,
          code: error.code,
        },
      };
    }
  }

  /**
   * Execute query based on engine type
   */
  async executeQuery(sql, params = []) {
    try {
      await this.connect();

      const startTime = Date.now();
      let result;

      switch (this.engine.toLowerCase()) {
        case 'mysql':
          result = await this._executeMySQL(sql, params);
          break;
        case 'postgres':
        case 'postgresql':
          result = await this._executePostgreSQL(sql, params);
          break;
        default:
          throw new Error(`Unsupported Cloud SQL engine: ${this.engine}`);
      }

      const executionTime = Date.now() - startTime;

      logger.info('Google Cloud SQL query executed successfully', {
        engine: this.engine,
        rowCount: result.rows.length,
        executionTime: `${executionTime}ms`,
        instanceConnectionName: this.instanceConnectionName,
      });

      return {
        rows: result.rows,
        rowCount: result.rows.length,
        executionTime,
        fields: result.fields,
      };
    } catch (error) {
      logger.error('Google Cloud SQL query execution failed:', {
        engine: this.engine,
        query: sql.substring(0, 100),
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute MySQL query
   * @private
   */
  async _executeMySQL(sql, params) {
    const [rows, fields] = await this.connection.execute(sql, params);
    return { rows, fields };
  }

  /**
   * Execute PostgreSQL query
   * @private
   */
  async _executePostgreSQL(sql, params) {
    const result = await this.connection.query(sql, params);
    return {
      rows: result.rows,
      fields: result.fields,
    };
  }

  /**
   * Get Cloud SQL instance information
   */
  async getInstanceInfo() {
    try {
      // This would typically require Cloud SQL Admin API
      // For now, return database-level information
      let infoQuery;
      switch (this.engine.toLowerCase()) {
        case 'mysql':
          infoQuery = `
            SELECT
              @@version as version,
              @@version_comment as version_comment,
              @@hostname as hostname,
              @@read_only as read_only,
              @@max_connections as max_connections,
              @@innodb_buffer_pool_size as buffer_pool_size
          `;
          break;
        case 'postgres':
        case 'postgresql':
          infoQuery = `
            SELECT
              version(),
              inet_server_addr() as server_addr,
              current_setting('max_connections') as max_connections,
              current_setting('shared_buffers') as shared_buffers,
              pg_is_in_recovery() as is_replica
          `;
          break;
        default:
          throw new Error(`Unsupported engine for instance info: ${this.engine}`);
      }

      const result = await this.executeQuery(infoQuery);

      return {
        engine: this.engine,
        instanceConnectionName: this.instanceConnectionName,
        projectId: this.cloudConfig.projectId,
        region: this.cloudConfig.region,
        database: this.connectionConfig.database,
        details: result.rows[0] || {},
      };
    } catch (error) {
      logger.error('Failed to get Cloud SQL instance info:', error.message);
      throw error;
    }
  }

  /**
   * Get Cloud SQL performance insights
   */
  async getPerformanceInsights() {
    try {
      const insights = {
        engine: this.engine,
        instanceConnectionName: this.instanceConnectionName,
        connectionStatus: this.connection ? 'connected' : 'disconnected',
      };

      if (this.connection) {
        switch (this.engine.toLowerCase()) {
          case 'mysql':
            const mysqlStats = await this.executeQuery(`
              SELECT
                VARIABLE_NAME,
                VARIABLE_VALUE
              FROM performance_schema.global_status
              WHERE VARIABLE_NAME IN (
                'Threads_connected',
                'Threads_running',
                'Queries',
                'Questions',
                'Uptime',
                'Innodb_buffer_pool_reads',
                'Innodb_buffer_pool_read_requests'
              )
            `);
            insights.mysqlStatus = mysqlStats.rows;
            break;

          case 'postgres':
          case 'postgresql':
            const pgStats = await this.executeQuery(`
              SELECT
                schemaname,
                tablename,
                n_tup_ins,
                n_tup_upd,
                n_tup_del,
                n_live_tup,
                n_dead_tup
              FROM pg_stat_user_tables
              ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
              LIMIT 10
            `);
            insights.tableStats = pgStats.rows;

            const pgActivity = await this.executeQuery(`
              SELECT
                COUNT(*) as total_connections,
                COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
                COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
              FROM pg_stat_activity
              WHERE pid != pg_backend_pid()
            `);
            insights.connectionStats = pgActivity.rows[0];
            break;
        }
      }

      return insights;
    } catch (error) {
      logger.error('Failed to get Cloud SQL performance insights:', error.message);
      throw error;
    }
  }

  /**
   * Get backup information
   */
  async getBackupInfo() {
    try {
      // This would typically require Cloud SQL Admin API
      // For now, return basic backup-related database information
      let backupQuery;
      switch (this.engine.toLowerCase()) {
        case 'mysql':
          backupQuery = `
            SELECT
              @@log_bin as binary_logging_enabled,
              @@binlog_format as binlog_format,
              @@expire_logs_days as log_retention_days
          `;
          break;
        case 'postgres':
        case 'postgresql':
          backupQuery = `
            SELECT
              current_setting('wal_level') as wal_level,
              current_setting('archive_mode') as archive_mode,
              pg_is_in_backup() as in_backup,
              pg_backup_start_time() as backup_start_time
          `;
          break;
        default:
          return { message: 'Backup info not available for this engine' };
      }

      const result = await this.executeQuery(backupQuery);
      return {
        engine: this.engine,
        instanceConnectionName: this.instanceConnectionName,
        backupConfig: result.rows[0] || {},
      };
    } catch (error) {
      logger.warn('Could not get backup info:', error.message);
      return { message: 'Backup info not available' };
    }
  }

  /**
   * Close Cloud SQL connection
   */
  async close() {
    try {
      if (this.connection) {
        switch (this.engine.toLowerCase()) {
          case 'mysql':
            await this.connection.end();
            break;
          case 'postgres':
          case 'postgresql':
            await this.connection.end();
            break;
        }

        this.connection = null;
        logger.debug('Google Cloud SQL connection closed successfully');
      }
    } catch (error) {
      logger.warn('Error closing Google Cloud SQL connection:', error.message);
    }
  }

  /**
   * Get driver information
   */
  static getDriverInfo() {
    return {
      type: 'GOOGLE_CLOUD_SQL',
      name: 'Google Cloud SQL',
      description: 'Google Cloud SQL managed database service',
      features: [
        'Fully managed database',
        'Automatic backups',
        'High availability',
        'Read replicas',
        'Point-in-time recovery',
        'Automatic scaling',
        'Private IP connectivity',
        'IAM authentication',
        'Cloud SQL Proxy support',
        'Encryption at rest and in transit',
      ],
      supportedEngines: ['MySQL', 'PostgreSQL'],
      category: 'cloud',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConnectionValidation() {
    return {
      engine: {
        required: true,
        type: 'string',
        enum: ['mysql', 'postgres', 'postgresql'],
        description: 'Cloud SQL database engine type',
      },
      instanceConnectionName: {
        required: false,
        type: 'string',
        description: 'Cloud SQL instance connection name (PROJECT:REGION:INSTANCE)',
      },
      host: {
        required: false,
        type: 'string',
        description: 'Database host (public IP or Cloud SQL Proxy endpoint)',
      },
      port: {
        required: false,
        type: 'number',
        description: 'Database port (engine default if not specified)',
      },
      user: {
        required: true,
        type: 'string',
        description: 'Database username',
      },
      password: {
        required: false,
        type: 'string',
        description: 'Database password (required if not using IAM auth)',
        sensitive: true,
      },
      database: {
        required: true,
        type: 'string',
        description: 'Database name',
      },
      projectId: {
        required: false,
        type: 'string',
        description: 'Google Cloud Project ID',
      },
      region: {
        required: false,
        type: 'string',
        description: 'Cloud SQL instance region',
      },
      instanceId: {
        required: false,
        type: 'string',
        description: 'Cloud SQL instance ID',
      },
      useIAMAuth: {
        required: false,
        type: 'boolean',
        description: 'Use Google Cloud IAM authentication',
        default: false,
      },
      serviceAccountEmail: {
        required: false,
        type: 'string',
        description: 'Service account email for IAM auth',
      },
      useCloudSQLProxy: {
        required: false,
        type: 'boolean',
        description: 'Connect through Cloud SQL Proxy',
        default: false,
      },
      usePrivateIP: {
        required: false,
        type: 'boolean',
        description: 'Use private IP connectivity',
        default: false,
      },
      socketPath: {
        required: false,
        type: 'string',
        description: 'Unix socket path for local connections',
      },
      ssl: {
        required: false,
        type: 'boolean',
        description: 'Enable SSL/TLS connection',
        default: true,
      },
      connectTimeout: {
        required: false,
        type: 'number',
        description: 'Connection timeout in milliseconds',
        default: 60000,
      },
    };
  }
}

module.exports = GoogleCloudSQLDriver;
