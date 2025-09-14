const mysql = require('mysql2/promise');
const IDatabaseDriver = require('../interfaces/IDatabaseDriver');
const { decryptDatabasePassword } = require('../../../utils/encryption');
const { logger } = require('../../../utils/logger');

/**
 * MySQL Database Driver
 * Supports both MySQL and MariaDB databases
 */
class MySQLDriver extends IDatabaseDriver {
  constructor(connectionConfig) {
    super(connectionConfig);
    this.connectionPools = new Map();
  }

  /**
   * Create MySQL connection configuration
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
      host: this.connectionConfig.host,
      port: parseInt(this.connectionConfig.port) || 3306,
      user: this.connectionConfig.username,
      password: password,
      database: database || this.connectionConfig.database,
      ssl: this.connectionConfig.sslEnabled ? { rejectUnauthorized: false } : false,
      connectTimeout: 30000,
      charset: 'utf8mb4',
    };

    return config;
  }

  /**
   * Test the database connection
   */
  async testConnection() {
    let connection;
    try {
      logger.debug('Testing MySQL connection', {
        host: this.connectionConfig.host,
        port: this.connectionConfig.port,
        database: this.connectionConfig.database,
      });

      const config = this._createConfig();
      connection = await mysql.createConnection(config);
      await connection.execute('SELECT 1 as test');

      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error) {
      logger.error('MySQL connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          errno: error.errno,
          sqlState: error.sqlState,
        },
      };
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch (err) {
          logger.error('Error closing MySQL test connection:', err.message);
        }
      }
    }
  }

  /**
   * Create a connection to the database
   */
  async createConnection(database = null) {
    const config = this._createConfig(database);
    const pool = mysql.createPool(config);
    return pool;
  }

  /**
   * Execute a query on the database
   */
  async executeQuery(connection, query, parameters = []) {
    // Convert object parameters to array for MySQL
    let paramArray = parameters;

    if (typeof parameters === 'object' && !Array.isArray(parameters)) {
      paramArray = [];
      let processedQuery = query;
      let paramIndex = 0;

      // Replace named parameters with ? placeholders
      for (const [key, value] of Object.entries(parameters)) {
        const placeholder = `:${key}`;
        processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), '?');
        paramArray.push(value);
        paramIndex++;
      }

      query = processedQuery;
    }

    const [rows] = await connection.execute(query, paramArray);
    return rows;
  }

  /**
   * Execute a stored procedure
   */
  async executeStoredProcedure(connection, procedureName, parameters = {}, options = {}) {
    let isLegacyClient = false;

    if (typeof options === 'boolean') {
      isLegacyClient = options;
    } else if (typeof options === 'object' && options !== null) {
      isLegacyClient = options.isLegacyClient || false;
    }

    // Build the procedure call
    const paramKeys = Object.keys(parameters);
    const paramValues = paramKeys.map(key => {
      let value = parameters[key];
      // For legacy clients, convert undefined/null to empty strings
      if (isLegacyClient && (value === undefined || value === null)) {
        return '';
      }
      return value;
    });

    const placeholders = paramValues.map(() => '?').join(', ');
    const query = `CALL ${procedureName}(${placeholders})`;

    const [rows] = await connection.execute(query, paramValues);

    // MySQL stored procedures can return multiple result sets
    // Return the first result set (most common case)
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
  }

  /**
   * Get list of databases
   */
  async getDatabaseList(connection) {
    const [rows] = await connection.execute('SHOW DATABASES');
    return rows
      .map(row => row.Database)
      .filter(
        dbName => !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(dbName)
      );
  }

  /**
   * Get database objects (tables, views, procedures)
   */
  async getDatabaseObjects(connection, databaseName) {
    // For MySQL, we need to connect to the specific database or use qualified names
    if (databaseName && databaseName !== connection.config.database) {
      const newConnection = await this.createConnection(databaseName);
      try {
        return await this._getDatabaseObjectsFromConnection(newConnection, databaseName);
      } finally {
        await newConnection.end();
      }
    }

    return await this._getDatabaseObjectsFromConnection(
      connection,
      databaseName || connection.config.database
    );
  }

  /**
   * Internal method to get database objects from a specific connection
   * @private
   */
  async _getDatabaseObjectsFromConnection(connection, databaseName) {
    const results = [];

    try {
      // Get tables
      const [tables] = await connection.execute(
        `
        SELECT 
          table_name as name,
          'BASE TABLE' as type_desc,
          'U' as type,
          table_schema as schema_name,
          'TABLE' as object_category
        FROM information_schema.tables
        WHERE table_schema = ? AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `,
        [databaseName]
      );
      results.push(...tables);

      // Get views
      const [views] = await connection.execute(
        `
        SELECT 
          table_name as name,
          'VIEW' as type_desc,
          'V' as type,
          table_schema as schema_name,
          'VIEW' as object_category
        FROM information_schema.views
        WHERE table_schema = ?
        ORDER BY table_name
      `,
        [databaseName]
      );
      results.push(...views);

      // Get stored procedures
      const [procedures] = await connection.execute(
        `
        SELECT 
          routine_name as name,
          'PROCEDURE' as type_desc,
          'P' as type,
          routine_schema as schema_name,
          'PROCEDURE' as object_category
        FROM information_schema.routines
        WHERE routine_schema = ? AND routine_type = 'PROCEDURE'
        ORDER BY routine_name
      `,
        [databaseName]
      );
      results.push(...procedures);

      // Get functions
      const [functions] = await connection.execute(
        `
        SELECT 
          routine_name as name,
          'FUNCTION' as type_desc,
          'F' as type,
          routine_schema as schema_name,
          'FUNCTION' as object_category
        FROM information_schema.routines
        WHERE routine_schema = ? AND routine_type = 'FUNCTION'
        ORDER BY routine_name
      `,
        [databaseName]
      );
      results.push(...functions);
    } catch (error) {
      logger.error('Error fetching MySQL database objects:', error);
      throw error;
    }

    return results;
  }

  /**
   * Get table columns for a specific table
   */
  async getTableColumns(connection, databaseName, tableName) {
    // For MySQL, we need to connect to the specific database
    let workingConnection = connection;
    let shouldCloseConnection = false;

    if (databaseName && databaseName !== connection.config.database) {
      workingConnection = await this.createConnection(databaseName);
      shouldCloseConnection = true;
    }

    try {
      const [rows] = await workingConnection.execute(
        `
        SELECT 
          column_name as name,
          data_type as dataType,
          is_nullable as isNullable,
          character_maximum_length as maxLength,
          numeric_precision as precision,
          numeric_scale as scale,
          column_default as defaultValue,
          column_key as columnKey,
          extra as extra
        FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position
      `,
        [databaseName, tableName]
      );

      return rows;
    } finally {
      if (shouldCloseConnection && workingConnection) {
        await workingConnection.end();
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
      const [rows] = await workingConnection.execute(
        `
        SELECT table_name as name
        FROM information_schema.views
        WHERE table_schema = ?
        ORDER BY table_name
      `,
        [databaseName]
      );
      return rows.map(row => row.name);
    } finally {
      if (shouldCloseConnection && workingConnection) {
        await workingConnection.end();
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
      const [rows] = await workingConnection.execute(
        `
        SELECT routine_name as name
        FROM information_schema.routines
        WHERE routine_schema = ? AND routine_type IN ('PROCEDURE', 'FUNCTION')
        ORDER BY routine_name
      `,
        [databaseName]
      );
      return rows.map(row => row.name);
    } finally {
      if (shouldCloseConnection && workingConnection) {
        await workingConnection.end();
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
      const [rows] = await workingConnection.execute(
        `
        SELECT table_name as name
        FROM information_schema.tables
        WHERE table_schema = ? AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `,
        [databaseName]
      );
      return rows.map(row => row.name);
    } finally {
      if (shouldCloseConnection && workingConnection) {
        await workingConnection.end();
      }
    }
  }

  /**
   * Close database connection
   */
  async closeConnection(connection) {
    if (connection) {
      await connection.end();
    }
  }

  /**
   * Get the default port for MySQL
   */
  static getDefaultPort() {
    return 3306;
  }

  /**
   * Get connection validation rules for MySQL
   */
  static getConnectionValidation() {
    return {
      host: { required: true, type: 'string' },
      port: { required: true, type: 'number', min: 1, max: 65535, default: 3306 },
      username: { required: true, type: 'string' },
      password: { required: true, type: 'string' },
      database: { required: false, type: 'string' },
      sslEnabled: { required: false, type: 'boolean', default: false },
    };
  }

  /**
   * Get the database type identifier
   */
  static getDatabaseType() {
    return 'MYSQL';
  }
}

module.exports = MySQLDriver;
