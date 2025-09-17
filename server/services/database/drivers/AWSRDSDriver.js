const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');
const { Client: PostgresClient } = require('pg');
const { ConnectionPool: MSSQLPool } = require('mssql');
const IDatabaseDriver = require('../interfaces/IDatabaseDriver');
const { logger } = require('../../../utils/logger');

/**
 * AWS RDS Driver
 * Provides managed database connectivity for AWS RDS instances
 * Supports MySQL, PostgreSQL, and SQL Server engines
 */
class AWSRDSDriver extends IDatabaseDriver {
  constructor(config) {
    super(config);
    this.connection = null;
    this.rdsClient = null;
    this.engine = config.engine; // mysql, postgres, sqlserver
    this.connectionConfig = {
      host: config.host,
      port: config.port,
      user: config.user || config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl !== false, // Default to SSL for RDS
      connectTimeout: config.connectTimeout || 60000,
      acquireTimeout: config.acquireTimeout || 60000,
      timeout: config.timeout || 60000,
    };

    // AWS-specific configuration
    this.awsConfig = {
      region: config.region || 'us-east-1',
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };

    this._initializeAWS();
  }

  /**
   * Initialize AWS SDK
   * @private
   */
  _initializeAWS() {
    if (this.awsConfig.accessKeyId && this.awsConfig.secretAccessKey) {
      AWS.config.update({
        accessKeyId: this.awsConfig.accessKeyId,
        secretAccessKey: this.awsConfig.secretAccessKey,
        region: this.awsConfig.region,
      });
    }

    this.rdsClient = new AWS.RDS({ region: this.awsConfig.region });
  }

  /**
   * Create database connection based on engine type
   */
  async connect() {
    if (this.connection) {
      return this.connection;
    }

    try {
      logger.debug('Connecting to AWS RDS', {
        engine: this.engine,
        host: this.connectionConfig.host,
        database: this.connectionConfig.database,
        region: this.awsConfig.region,
      });

      switch (this.engine.toLowerCase()) {
        case 'mysql':
          this.connection = await this._connectMySQL();
          break;
        case 'postgres':
        case 'postgresql':
          this.connection = await this._connectPostgreSQL();
          break;
        case 'sqlserver':
        case 'mssql':
          this.connection = await this._connectSQLServer();
          break;
        default:
          throw new Error(`Unsupported RDS engine: ${this.engine}`);
      }

      logger.info('AWS RDS connection established successfully', {
        engine: this.engine,
        host: this.connectionConfig.host,
      });

      return this.connection;
    } catch (error) {
      logger.error('AWS RDS connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Connect to MySQL RDS instance
   * @private
   */
  async _connectMySQL() {
    const connection = await mysql.createConnection({
      host: this.connectionConfig.host,
      port: this.connectionConfig.port || 3306,
      user: this.connectionConfig.user,
      password: this.connectionConfig.password,
      database: this.connectionConfig.database,
      ssl: this.connectionConfig.ssl,
      connectTimeout: this.connectionConfig.connectTimeout,
      acquireTimeout: this.connectionConfig.acquireTimeout,
      timeout: this.connectionConfig.timeout,
    });

    return connection;
  }

  /**
   * Connect to PostgreSQL RDS instance
   * @private
   */
  async _connectPostgreSQL() {
    const client = new PostgresClient({
      host: this.connectionConfig.host,
      port: this.connectionConfig.port || 5432,
      user: this.connectionConfig.user,
      password: this.connectionConfig.password,
      database: this.connectionConfig.database,
      ssl: this.connectionConfig.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: this.connectionConfig.connectTimeout,
    });

    await client.connect();
    return client;
  }

  /**
   * Connect to SQL Server RDS instance
   * @private
   */
  async _connectSQLServer() {
    const pool = new MSSQLPool({
      server: this.connectionConfig.host,
      port: this.connectionConfig.port || 1433,
      user: this.connectionConfig.user,
      password: this.connectionConfig.password,
      database: this.connectionConfig.database,
      encrypt: this.connectionConfig.ssl,
      trustServerCertificate: true,
      connectTimeout: this.connectionConfig.connectTimeout,
      requestTimeout: this.connectionConfig.timeout,
    });

    await pool.connect();
    return pool;
  }

  /**
   * Test RDS connection
   */
  async testConnection() {
    try {
      await this.connect();

      // Test with engine-specific query
      let testQuery;
      switch (this.engine.toLowerCase()) {
        case 'mysql':
          testQuery = 'SELECT VERSION() as version, NOW() as timestamp';
          break;
        case 'postgres':
        case 'postgresql':
          testQuery = 'SELECT version(), NOW() as timestamp';
          break;
        case 'sqlserver':
        case 'mssql':
          testQuery = 'SELECT @@VERSION as version, GETDATE() as timestamp';
          break;
        default:
          testQuery = 'SELECT 1 as test';
      }

      const result = await this.executeQuery(testQuery);

      return {
        success: true,
        message: 'AWS RDS connection successful',
        details: {
          engine: this.engine,
          host: this.connectionConfig.host,
          database: this.connectionConfig.database,
          region: this.awsConfig.region,
          version: result.rows[0]?.version || result.rows[0]?.VERSION,
          timestamp: result.rows[0]?.timestamp,
        },
      };
    } catch (error) {
      logger.error('AWS RDS connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          engine: this.engine,
          host: this.connectionConfig.host,
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
        case 'sqlserver':
        case 'mssql':
          result = await this._executeSQLServer(sql, params);
          break;
        default:
          throw new Error(`Unsupported RDS engine: ${this.engine}`);
      }

      const executionTime = Date.now() - startTime;

      logger.info('AWS RDS query executed successfully', {
        engine: this.engine,
        rowCount: result.rows.length,
        executionTime: `${executionTime}ms`,
      });

      return {
        rows: result.rows,
        rowCount: result.rows.length,
        executionTime,
        fields: result.fields,
      };
    } catch (error) {
      logger.error('AWS RDS query execution failed:', {
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
   * Execute SQL Server query
   * @private
   */
  async _executeSQLServer(sql, params) {
    const request = this.connection.request();

    // Add parameters
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });

    const result = await request.query(sql);
    return {
      rows: result.recordset,
      fields: result.recordset.columns,
    };
  }

  /**
   * Get RDS instance information
   */
  async getRDSInstanceInfo() {
    try {
      if (!this.config.dbInstanceIdentifier) {
        return null;
      }

      const params = {
        DBInstanceIdentifier: this.config.dbInstanceIdentifier,
      };

      const result = await this.rdsClient.describeDBInstances(params).promise();

      if (result.DBInstances && result.DBInstances.length > 0) {
        const instance = result.DBInstances[0];
        return {
          identifier: instance.DBInstanceIdentifier,
          status: instance.DBInstanceStatus,
          engine: instance.Engine,
          engineVersion: instance.EngineVersion,
          instanceClass: instance.DBInstanceClass,
          allocatedStorage: instance.AllocatedStorage,
          multiAZ: instance.MultiAZ,
          publiclyAccessible: instance.PubliclyAccessible,
          storageType: instance.StorageType,
          backupRetentionPeriod: instance.BackupRetentionPeriod,
          availabilityZone: instance.AvailabilityZone,
          endpoint: instance.Endpoint,
          vpcSecurityGroups: instance.VpcSecurityGroups,
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to get RDS instance info:', error.message);
      throw error;
    }
  }

  /**
   * Get RDS performance insights
   */
  async getPerformanceInsights(options = {}) {
    try {
      // This would require Performance Insights API
      // For now, return basic connection pool stats
      const insights = {
        engine: this.engine,
        connectionStatus: this.connection ? 'connected' : 'disconnected',
        region: this.awsConfig.region,
      };

      // Add engine-specific stats
      if (this.connection) {
        switch (this.engine.toLowerCase()) {
          case 'mysql':
            const mysqlStats = await this.executeQuery('SHOW STATUS');
            insights.mysqlStatus = mysqlStats.rows.slice(0, 10);
            break;
          case 'postgres':
          case 'postgresql':
            const pgStats = await this.executeQuery(`
              SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
              FROM pg_stat_user_tables
              ORDER BY n_tup_ins DESC
              LIMIT 10
            `);
            insights.tableStats = pgStats.rows;
            break;
          case 'sqlserver':
          case 'mssql':
            const sqlStats = await this.executeQuery(`
              SELECT TOP 10 name, database_id, create_date
              FROM sys.databases
              WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
            `);
            insights.databases = sqlStats.rows;
            break;
        }
      }

      return insights;
    } catch (error) {
      logger.error('Failed to get RDS performance insights:', error.message);
      throw error;
    }
  }

  /**
   * Close RDS connection
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
          case 'sqlserver':
          case 'mssql':
            await this.connection.close();
            break;
        }

        this.connection = null;
        logger.debug('AWS RDS connection closed successfully');
      }
    } catch (error) {
      logger.warn('Error closing AWS RDS connection:', error.message);
    }
  }

  /**
   * Get driver information
   */
  static getDriverInfo() {
    return {
      type: 'AWS_RDS',
      name: 'AWS RDS',
      description: 'Amazon Relational Database Service with managed infrastructure',
      features: [
        'Managed database service',
        'Automatic backups',
        'Multi-AZ deployments',
        'Read replicas',
        'Performance insights',
        'Automatic scaling',
        'Security groups',
        'Encryption at rest',
      ],
      supportedEngines: ['MySQL', 'PostgreSQL', 'SQL Server'],
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
        enum: ['mysql', 'postgres', 'postgresql', 'sqlserver', 'mssql'],
        description: 'RDS database engine type',
      },
      host: {
        required: true,
        type: 'string',
        description: 'RDS endpoint hostname',
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
        required: true,
        type: 'string',
        description: 'Database password',
        sensitive: true,
      },
      database: {
        required: true,
        type: 'string',
        description: 'Database name',
      },
      region: {
        required: false,
        type: 'string',
        description: 'AWS region',
        default: 'us-east-1',
      },
      accessKeyId: {
        required: false,
        type: 'string',
        description: 'AWS access key ID',
      },
      secretAccessKey: {
        required: false,
        type: 'string',
        description: 'AWS secret access key',
        sensitive: true,
      },
      dbInstanceIdentifier: {
        required: false,
        type: 'string',
        description: 'RDS instance identifier for management operations',
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

module.exports = AWSRDSDriver;
