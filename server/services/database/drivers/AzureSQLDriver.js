const { ConnectionPool } = require('mssql');
const IDatabaseDriver = require('../interfaces/IDatabaseDriver');
const { logger } = require('../../../utils/logger');

/**
 * Azure SQL Database Driver
 * Provides managed database connectivity for Azure SQL Database
 * Supports Azure SQL Database with advanced cloud features
 */
class AzureSQLDriver extends IDatabaseDriver {
  constructor(config) {
    super(config);
    this.pool = null;
    this.connectionConfig = {
      server: config.server,
      port: config.port || 1433,
      user: config.user || config.username,
      password: config.password,
      database: config.database,
      encrypt: config.encrypt !== false, // Default to true for Azure SQL
      trustServerCertificate: config.trustServerCertificate || false,
      connectionTimeout: config.connectionTimeout || 30000,
      requestTimeout: config.requestTimeout || 30000,
      pool: {
        max: config.poolMax || 10,
        min: config.poolMin || 0,
        idleTimeoutMillis: config.idleTimeoutMillis || 30000,
        acquireTimeoutMillis: config.acquireTimeoutMillis || 30000,
      },
      options: {
        enableArithAbort: true,
        encrypt: true,
        trustServerCertificate: config.trustServerCertificate || false,
      },
    };

    // Azure AD authentication
    if (config.authentication && config.authentication.type === 'azure-active-directory-password') {
      this.connectionConfig.authentication = {
        type: 'azure-active-directory-password',
        options: {
          userName: config.authentication.userName,
          password: config.authentication.password,
          domain: config.authentication.domain,
        },
      };
    }

    // Azure AD Service Principal authentication
    if (
      config.authentication &&
      config.authentication.type === 'azure-active-directory-service-principal-secret'
    ) {
      this.connectionConfig.authentication = {
        type: 'azure-active-directory-service-principal-secret',
        options: {
          clientId: config.authentication.clientId,
          clientSecret: config.authentication.clientSecret,
          tenantId: config.authentication.tenantId,
        },
      };
    }

    // Azure AD Managed Identity authentication
    if (config.authentication && config.authentication.type === 'azure-active-directory-msi-vm') {
      this.connectionConfig.authentication = {
        type: 'azure-active-directory-msi-vm',
      };
    }

    // Connection string override
    if (config.connectionString) {
      this.connectionConfig.connectionString = config.connectionString;
    }
  }

  /**
   * Create Azure SQL Database connection pool
   */
  async connect() {
    if (this.pool && this.pool.connected) {
      return this.pool;
    }

    try {
      logger.debug('Connecting to Azure SQL Database', {
        server: this.connectionConfig.server,
        database: this.connectionConfig.database,
        authentication: this.connectionConfig.authentication?.type || 'sql',
      });

      this.pool = new ConnectionPool(this.connectionConfig);
      await this.pool.connect();

      logger.info('Azure SQL Database connection established successfully', {
        server: this.connectionConfig.server,
        database: this.connectionConfig.database,
      });

      return this.pool;
    } catch (error) {
      logger.error('Azure SQL Database connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Test Azure SQL Database connection
   */
  async testConnection() {
    try {
      await this.connect();

      // Test with Azure SQL specific query
      const result = await this.executeQuery(`
        SELECT
          @@VERSION as version,
          GETDATE() as timestamp,
          SERVERPROPERTY('Edition') as edition,
          SERVERPROPERTY('ServiceObjective') as service_objective,
          SERVERPROPERTY('ElasticPoolName') as elastic_pool
      `);

      return {
        success: true,
        message: 'Azure SQL Database connection successful',
        details: {
          server: this.connectionConfig.server,
          database: this.connectionConfig.database,
          version: result.rows[0]?.version,
          edition: result.rows[0]?.edition,
          serviceObjective: result.rows[0]?.service_objective,
          elasticPool: result.rows[0]?.elastic_pool,
          timestamp: result.rows[0]?.timestamp,
        },
      };
    } catch (error) {
      logger.error('Azure SQL Database connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          server: this.connectionConfig.server,
          database: this.connectionConfig.database,
          code: error.code,
          number: error.number,
          state: error.state,
        },
      };
    }
  }

  /**
   * Execute Azure SQL Database query
   */
  async executeQuery(sql, params = []) {
    try {
      await this.connect();

      const startTime = Date.now();
      const request = this.pool.request();

      // Add parameters
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      logger.debug('Executing Azure SQL Database query', {
        query: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        params: params.length,
        database: this.connectionConfig.database,
      });

      const result = await request.query(sql);
      const executionTime = Date.now() - startTime;

      logger.info('Azure SQL Database query executed successfully', {
        rowCount: result.recordset ? result.recordset.length : 0,
        executionTime: `${executionTime}ms`,
        database: this.connectionConfig.database,
      });

      return {
        rows: result.recordset || [],
        rowCount: result.recordset ? result.recordset.length : 0,
        executionTime,
        fields:
          result.recordset && result.recordset.columns ? Object.keys(result.recordset.columns) : [],
        info: result.rowsAffected,
      };
    } catch (error) {
      logger.error('Azure SQL Database query execution failed:', {
        query: sql.substring(0, 100),
        error: error.message,
        code: error.code,
        number: error.number,
      });
      throw error;
    }
  }

  /**
   * Get Azure SQL Database performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const result = await this.executeQuery(`
        SELECT
          GETDATE() as timestamp,
          (SELECT COUNT(*) FROM sys.dm_exec_requests WHERE session_id > 50) as active_requests,
          (SELECT COUNT(*) FROM sys.dm_exec_sessions WHERE is_user_process = 1) as user_sessions,
          (SELECT COUNT(*) FROM sys.dm_os_waiting_tasks) as waiting_tasks,
          (SELECT AVG(cpu_percent) FROM sys.dm_db_resource_stats WHERE end_time > DATEADD(minute, -5, GETDATE())) as avg_cpu_percent,
          (SELECT AVG(dtu_percent) FROM sys.dm_db_resource_stats WHERE end_time > DATEADD(minute, -5, GETDATE())) as avg_dtu_percent,
          (SELECT AVG(data_io_percent) FROM sys.dm_db_resource_stats WHERE end_time > DATEADD(minute, -5, GETDATE())) as avg_data_io_percent,
          (SELECT AVG(log_io_percent) FROM sys.dm_db_resource_stats WHERE end_time > DATEADD(minute, -5, GETDATE())) as avg_log_io_percent
      `);

      return {
        timestamp: result.rows[0]?.timestamp,
        activeRequests: result.rows[0]?.active_requests,
        userSessions: result.rows[0]?.user_sessions,
        waitingTasks: result.rows[0]?.waiting_tasks,
        avgCpuPercent: result.rows[0]?.avg_cpu_percent,
        avgDtuPercent: result.rows[0]?.avg_dtu_percent,
        avgDataIoPercent: result.rows[0]?.avg_data_io_percent,
        avgLogIoPercent: result.rows[0]?.avg_log_io_percent,
      };
    } catch (error) {
      logger.error('Failed to get Azure SQL Database performance metrics:', error.message);
      throw error;
    }
  }

  /**
   * Get Azure SQL Database resource usage
   */
  async getResourceUsage() {
    try {
      const result = await this.executeQuery(`
        SELECT TOP 10
          end_time,
          avg_cpu_percent,
          avg_data_io_percent,
          avg_log_write_percent,
          avg_memory_usage_percent,
          xtp_storage_percent,
          max_worker_percent,
          max_session_percent,
          dtu_limit,
          dtu_used,
          cpu_limit,
          avg_instance_cpu_percent,
          avg_instance_memory_percent
        FROM sys.dm_db_resource_stats
        ORDER BY end_time DESC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get Azure SQL Database resource usage:', error.message);
      throw error;
    }
  }

  /**
   * Get database size and storage information
   */
  async getDatabaseInfo() {
    try {
      const result = await this.executeQuery(`
        SELECT
          DB_NAME() as database_name,
          SERVERPROPERTY('Edition') as edition,
          SERVERPROPERTY('ServiceObjective') as service_objective,
          SERVERPROPERTY('ElasticPoolName') as elastic_pool_name,
          DATABASEPROPERTYEX(DB_NAME(), 'MaxSizeInBytes') as max_size_bytes,
          SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS bigint) * 8192.) as used_size_bytes,
          SUM(CAST(size AS bigint) * 8192.) as allocated_size_bytes
        FROM sys.database_files
        WHERE type = 0
      `);

      return {
        databaseName: result.rows[0]?.database_name,
        edition: result.rows[0]?.edition,
        serviceObjective: result.rows[0]?.service_objective,
        elasticPoolName: result.rows[0]?.elastic_pool_name,
        maxSizeBytes: result.rows[0]?.max_size_bytes,
        usedSizeBytes: result.rows[0]?.used_size_bytes,
        allocatedSizeBytes: result.rows[0]?.allocated_size_bytes,
        usedSizeMB: Math.round(result.rows[0]?.used_size_bytes / 1024 / 1024),
        allocatedSizeMB: Math.round(result.rows[0]?.allocated_size_bytes / 1024 / 1024),
      };
    } catch (error) {
      logger.error('Failed to get Azure SQL Database info:', error.message);
      throw error;
    }
  }

  /**
   * Get elastic pool information (if applicable)
   */
  async getElasticPoolInfo() {
    try {
      const result = await this.executeQuery(`
        SELECT
          elastic_pool_name,
          state_desc as state,
          edition,
          dtu_limit,
          cpu_limit,
          storage_limit_mb,
          max_size_mb,
          per_database_settings_min_dtu,
          per_database_settings_max_dtu
        FROM sys.elastic_pool_resource_stats
        WHERE elastic_pool_name = SERVERPROPERTY('ElasticPoolName')
        AND end_time = (
          SELECT MAX(end_time)
          FROM sys.elastic_pool_resource_stats
          WHERE elastic_pool_name = SERVERPROPERTY('ElasticPoolName')
        )
      `);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      return null;
    } catch (error) {
      logger.warn(
        'Could not get elastic pool info (database may not be in an elastic pool):',
        error.message
      );
      return null;
    }
  }

  /**
   * Get top queries by resource consumption
   */
  async getTopQueries(limit = 10) {
    try {
      const result = await this.executeQuery(`
        SELECT TOP ${limit}
          query_stats.query_id,
          query_stats.plan_id,
          query_stats.execution_count,
          query_stats.total_worker_time / 1000 as total_cpu_time_ms,
          query_stats.avg_worker_time / 1000 as avg_cpu_time_ms,
          query_stats.total_logical_reads,
          query_stats.avg_logical_reads,
          query_stats.total_elapsed_time / 1000 as total_elapsed_time_ms,
          query_stats.avg_elapsed_time / 1000 as avg_elapsed_time_ms,
          SUBSTRING(query_text.query_sql_text, 1, 200) as query_text
        FROM sys.query_store_query_stats query_stats
        INNER JOIN sys.query_store_query query_info
          ON query_stats.query_id = query_info.query_id
        INNER JOIN sys.query_store_query_text query_text
          ON query_info.query_text_id = query_text.query_text_id
        WHERE query_stats.last_execution_time > DATEADD(hour, -24, GETUTCDATE())
        ORDER BY query_stats.avg_worker_time DESC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get top queries:', error.message);
      throw error;
    }
  }

  /**
   * Close Azure SQL Database connection
   */
  async close() {
    try {
      if (this.pool && this.pool.connected) {
        await this.pool.close();
        this.pool = null;
        logger.debug('Azure SQL Database connection closed successfully');
      }
    } catch (error) {
      logger.warn('Error closing Azure SQL Database connection:', error.message);
    }
  }

  /**
   * Get driver information
   */
  static getDriverInfo() {
    return {
      type: 'AZURE_SQL',
      name: 'Azure SQL Database',
      description: 'Microsoft Azure SQL Database with cloud-native features',
      features: [
        'Managed database service',
        'Automatic scaling',
        'Built-in high availability',
        'Advanced security',
        'Intelligent performance',
        'Elastic pools',
        'Geo-replication',
        'Point-in-time restore',
        'Azure AD integration',
        'Query Store analytics',
      ],
      supportedAuthentication: [
        'SQL Authentication',
        'Azure Active Directory Password',
        'Azure Active Directory Service Principal',
        'Azure Active Directory Managed Identity',
      ],
      category: 'cloud',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConnectionValidation() {
    return {
      server: {
        required: true,
        type: 'string',
        description: 'Azure SQL server name (e.g., myserver.database.windows.net)',
      },
      port: {
        required: false,
        type: 'number',
        description: 'Server port',
        default: 1433,
      },
      user: {
        required: false,
        type: 'string',
        description: 'SQL authentication username (required if not using Azure AD)',
      },
      password: {
        required: false,
        type: 'string',
        description: 'SQL authentication password (required if not using Azure AD)',
        sensitive: true,
      },
      database: {
        required: true,
        type: 'string',
        description: 'Database name',
      },
      connectionString: {
        required: false,
        type: 'string',
        description: 'Complete connection string (overrides other connection parameters)',
        sensitive: true,
      },
      authentication: {
        required: false,
        type: 'object',
        description: 'Azure AD authentication configuration',
        properties: {
          type: {
            required: true,
            type: 'string',
            enum: [
              'azure-active-directory-password',
              'azure-active-directory-service-principal-secret',
              'azure-active-directory-msi-vm',
            ],
            description: 'Azure AD authentication type',
          },
          userName: {
            required: false,
            type: 'string',
            description: 'Azure AD username (for password auth)',
          },
          password: {
            required: false,
            type: 'string',
            description: 'Azure AD password (for password auth)',
            sensitive: true,
          },
          domain: {
            required: false,
            type: 'string',
            description: 'Azure AD domain (for password auth)',
          },
          clientId: {
            required: false,
            type: 'string',
            description: 'Service principal client ID',
          },
          clientSecret: {
            required: false,
            type: 'string',
            description: 'Service principal client secret',
            sensitive: true,
          },
          tenantId: {
            required: false,
            type: 'string',
            description: 'Azure AD tenant ID',
          },
        },
      },
      encrypt: {
        required: false,
        type: 'boolean',
        description: 'Enable SSL/TLS encryption',
        default: true,
      },
      trustServerCertificate: {
        required: false,
        type: 'boolean',
        description: 'Trust server certificate',
        default: false,
      },
      connectionTimeout: {
        required: false,
        type: 'number',
        description: 'Connection timeout in milliseconds',
        default: 30000,
      },
      requestTimeout: {
        required: false,
        type: 'number',
        description: 'Request timeout in milliseconds',
        default: 30000,
      },
      poolMax: {
        required: false,
        type: 'number',
        description: 'Maximum number of connections in pool',
        default: 10,
      },
      poolMin: {
        required: false,
        type: 'number',
        description: 'Minimum number of connections in pool',
        default: 0,
      },
    };
  }
}

module.exports = AzureSQLDriver;
