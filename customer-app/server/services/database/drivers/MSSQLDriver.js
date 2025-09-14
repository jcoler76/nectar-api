const sql = require('mssql');
const IDatabaseDriver = require('../interfaces/IDatabaseDriver');
const { decryptDatabasePassword } = require('../../../utils/encryption');
const { logger } = require('../../../utils/logger');

/**
 * Microsoft SQL Server Database Driver
 */
class MSSQLDriver extends IDatabaseDriver {
  constructor(connectionConfig) {
    super(connectionConfig);
    this.connectionPools = new Map();
  }

  /**
   * Create MSSQL connection configuration
   * @private
   */
  _createConfig(database = null) {
    let password = this.connectionConfig.password;

    // Handle encrypted passwords
    if (typeof password === 'string' && password.includes(':')) {
      try {
        password = decryptDatabasePassword(password);
      } catch (error) {
        logger.error('Password decryption failed:', error.message);
      }
    }

    const config = {
      user: this.connectionConfig.username,
      password: password,
      server: this.connectionConfig.host,
      port: parseInt(this.connectionConfig.port) || 1433,
      options: {
        encrypt: this.connectionConfig.sslEnabled || true,
        trustServerCertificate: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };

    if (database) {
      config.database = database;
    } else if (this.connectionConfig.database) {
      config.database = this.connectionConfig.database;
    }

    return config;
  }

  /**
   * Test the database connection
   */
  async testConnection() {
    let pool;
    try {
      logger.debug('Testing MSSQL connection', {
        host: this.connectionConfig.host,
        port: this.connectionConfig.port,
        database: this.connectionConfig.database,
      });

      const config = this._createConfig();
      pool = new sql.ConnectionPool(config);
      await pool.connect();
      await pool.request().query('SELECT 1 as test');

      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error) {
      logger.error('MSSQL connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          state: error.state,
        },
      };
    } finally {
      if (pool) {
        try {
          await pool.close();
        } catch (err) {
          logger.error('Error closing MSSQL test connection:', err.message);
        }
      }
    }
  }

  /**
   * Create a connection to the database
   */
  async createConnection(database = null) {
    const config = this._createConfig(database);
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    return pool;
  }

  /**
   * Execute a query on the database
   */
  async executeQuery(connection, query, parameters = {}) {
    const request = connection.request();

    // Add parameters to the request
    Object.entries(parameters).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.query(query);
    return result.recordset;
  }

  /**
   * Execute a stored procedure
   */
  async executeStoredProcedure(connection, procedureName, parameters = {}, options = {}) {
    const request = connection.request();
    let isLegacyClient = false;

    if (typeof options === 'boolean') {
      isLegacyClient = options;
    } else if (typeof options === 'object' && options !== null) {
      isLegacyClient = options.isLegacyClient || false;
    }

    // Add parameters to the request
    Object.entries(parameters).forEach(([key, value]) => {
      // For legacy Dreamfactory clients, convert undefined/null to empty strings
      if (isLegacyClient && (value === undefined || value === null)) {
        request.input(key, '');
      } else {
        request.input(key, value);
      }
    });

    const result = await request.execute(procedureName);
    return result.recordset;
  }

  /**
   * Get list of databases
   */
  async getDatabaseList(connection) {
    const result = await connection
      .request()
      .query('SELECT name FROM sys.databases WHERE state = 0 ORDER BY name');
    return result.recordset.map(record => record.name);
  }

  /**
   * Get database objects (tables, views, procedures)
   */
  async getDatabaseObjects(connection, databaseName) {
    // Switch to the target database if specified
    if (databaseName && databaseName !== connection.config.database) {
      const newConnection = await this.createConnection(databaseName);
      try {
        return await this._getDatabaseObjectsFromConnection(newConnection);
      } finally {
        await newConnection.close();
      }
    }

    return await this._getDatabaseObjectsFromConnection(connection);
  }

  /**
   * Internal method to get database objects from a specific connection
   * @private
   */
  async _getDatabaseObjectsFromConnection(connection) {
    const result = await connection.request().query(`
      SELECT 
        o.name,
        o.type_desc,
        o.type,
        s.name as schema_name,
        CASE 
          WHEN o.type IN ('U') THEN 'TABLE'
          WHEN o.type IN ('V') THEN 'VIEW'
          WHEN o.type IN ('P', 'PC') THEN 'PROCEDURE'
          ELSE o.type_desc
        END as object_category
      FROM sys.objects o
      JOIN sys.schemas s ON o.schema_id = s.schema_id
      WHERE o.type IN ('U', 'V', 'P', 'PC')
        AND o.is_ms_shipped = 0
      ORDER BY o.type_desc, o.name;
    `);

    return result.recordset;
  }

  /**
   * Get table columns for a specific table
   */
  async getTableColumns(connection, databaseName, tableName) {
    // Switch to the target database if specified
    let workingConnection = connection;
    let shouldCloseConnection = false;

    if (databaseName && databaseName !== connection.config.database) {
      workingConnection = await this.createConnection(databaseName);
      shouldCloseConnection = true;
    }

    try {
      const result = await workingConnection.request().query(`
        SELECT 
          COLUMN_NAME as name,
          DATA_TYPE as dataType,
          IS_NULLABLE as isNullable,
          CHARACTER_MAXIMUM_LENGTH as maxLength,
          NUMERIC_PRECISION as precision,
          NUMERIC_SCALE as scale,
          COLUMN_DEFAULT as defaultValue
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
          AND TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
        ORDER BY ORDINAL_POSITION;
      `);

      return result.recordset;
    } finally {
      if (shouldCloseConnection && workingConnection) {
        await workingConnection.close();
      }
    }
  }

  /**
   * Get views for a database
   */
  async getViews(connection, databaseName) {
    let workingConnection = connection;
    let shouldCloseConnection = false;

    if (databaseName && databaseName !== connection.config.database) {
      workingConnection = await this.createConnection(databaseName);
      shouldCloseConnection = true;
    }

    try {
      const result = await workingConnection.request().query(`
        SELECT TABLE_NAME as name
        FROM INFORMATION_SCHEMA.VIEWS
        WHERE TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
        ORDER BY TABLE_NAME
      `);
      return result.recordset.map(row => row.name);
    } finally {
      if (shouldCloseConnection && workingConnection) {
        await workingConnection.close();
      }
    }
  }

  /**
   * Get stored procedures for a database
   */
  async getProcedures(connection, databaseName) {
    let workingConnection = connection;
    let shouldCloseConnection = false;

    if (databaseName && databaseName !== connection.config.database) {
      workingConnection = await this.createConnection(databaseName);
      shouldCloseConnection = true;
    }

    try {
      const result = await workingConnection.request().query(`
        SELECT ROUTINE_NAME as name
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_TYPE = 'PROCEDURE'
          AND ROUTINE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
        ORDER BY ROUTINE_NAME
      `);
      return result.recordset.map(row => row.name);
    } finally {
      if (shouldCloseConnection && workingConnection) {
        await workingConnection.close();
      }
    }
  }

  /**
   * Get tables for a database
   */
  async getTables(connection, databaseName) {
    let workingConnection = connection;
    let shouldCloseConnection = false;

    if (databaseName && databaseName !== connection.config.database) {
      workingConnection = await this.createConnection(databaseName);
      shouldCloseConnection = true;
    }

    try {
      const result = await workingConnection.request().query(`
        SELECT TABLE_NAME as name
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
          AND TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
        ORDER BY TABLE_NAME
      `);
      return result.recordset.map(row => row.name);
    } finally {
      if (shouldCloseConnection && workingConnection) {
        await workingConnection.close();
      }
    }
  }

  /**
   * Close database connection
   */
  async closeConnection(connection) {
    if (connection) {
      await connection.close();
    }
  }

  /**
   * Get the default port for MSSQL
   */
  static getDefaultPort() {
    return 1433;
  }

  /**
   * Get connection validation rules for MSSQL
   */
  static getConnectionValidation() {
    return {
      host: { required: true, type: 'string' },
      port: { required: true, type: 'number', min: 1, max: 65535, default: 1433 },
      username: { required: true, type: 'string' },
      password: { required: true, type: 'string' },
      database: { required: false, type: 'string' },
      sslEnabled: { required: false, type: 'boolean', default: true },
    };
  }

  /**
   * Get the database type identifier
   */
  static getDatabaseType() {
    return 'MSSQL';
  }
}

module.exports = MSSQLDriver;
