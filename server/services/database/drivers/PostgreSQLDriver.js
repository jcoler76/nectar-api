const { Pool, Client } = require('pg');
const IDatabaseDriver = require('../interfaces/IDatabaseDriver');
const { decryptDatabasePassword } = require('../../../utils/encryption');
const { logger } = require('../../../utils/logger');

/**
 * PostgreSQL Database Driver
 */
class PostgreSQLDriver extends IDatabaseDriver {
  constructor(connectionConfig) {
    super(connectionConfig);
    this.connectionPools = new Map();
  }

  /**
   * Create PostgreSQL connection configuration
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
      port: parseInt(this.connectionConfig.port) || 5432,
      user: this.connectionConfig.username,
      password: password,
      database: database || this.connectionConfig.database || 'postgres',
      ssl: this.connectionConfig.sslEnabled ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      max: 10,
      min: 0,
    };

    return config;
  }

  /**
   * Test the database connection
   */
  async testConnection() {
    let client;
    try {
      logger.debug('Testing PostgreSQL connection', {
        host: this.connectionConfig.host,
        port: this.connectionConfig.port,
        database: this.connectionConfig.database,
      });

      const config = this._createConfig();
      client = new Client(config);
      await client.connect();
      await client.query('SELECT 1 as test');

      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error) {
      logger.error('PostgreSQL connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          severity: error.severity,
        },
      };
    } finally {
      if (client) {
        try {
          await client.end();
        } catch (err) {
          logger.error('Error closing PostgreSQL test connection:', err.message);
        }
      }
    }
  }

  /**
   * Create a connection to the database
   */
  async createConnection(database = null) {
    const config = this._createConfig(database);
    const pool = new Pool(config);
    return pool;
  }

  /**
   * Execute a query on the database
   */
  async executeQuery(connection, query, parameters = []) {
    // Convert object parameters to array for PostgreSQL
    let paramArray = parameters;
    let processedQuery = query;

    if (typeof parameters === 'object' && !Array.isArray(parameters)) {
      paramArray = [];
      let paramIndex = 1;

      // Replace named parameters with numbered parameters
      for (const [key, value] of Object.entries(parameters)) {
        const placeholder = `:${key}`;
        const pgPlaceholder = `$${paramIndex}`;
        processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), pgPlaceholder);
        paramArray.push(value);
        paramIndex++;
      }
    }

    const result = await connection.query(processedQuery, paramArray);
    return result.rows;
  }

  /**
   * Execute a stored procedure (PostgreSQL uses functions)
   */
  async executeStoredProcedure(connection, procedureName, parameters = {}, options = {}) {
    let isLegacyClient = false;

    if (typeof options === 'boolean') {
      isLegacyClient = options;
    } else if (typeof options === 'object' && options !== null) {
      isLegacyClient = options.isLegacyClient || false;
    }

    // Build the function call query
    const paramKeys = Object.keys(parameters);
    const paramValues = paramKeys.map(key => {
      let value = parameters[key];
      // For legacy clients, convert undefined/null to empty strings
      if (isLegacyClient && (value === undefined || value === null)) {
        return '';
      }
      return value;
    });

    const placeholders = paramValues.map((_, index) => `$${index + 1}`).join(', ');
    const query = `SELECT * FROM ${procedureName}(${placeholders})`;

    const result = await connection.query(query, paramValues);
    return result.rows;
  }

  /**
   * Get list of databases
   */
  async getDatabaseList(connection) {
    const result = await connection.query(`
      SELECT datname as name 
      FROM pg_database 
      WHERE datistemplate = false 
        AND datallowconn = true 
      ORDER BY datname
    `);
    return result.rows.map(row => row.name);
  }

  /**
   * Get database objects (tables, views, functions)
   */
  async getDatabaseObjects(connection, databaseName) {
    // For PostgreSQL, we need to connect to the specific database
    if (databaseName && databaseName !== connection.options.database) {
      const newConnection = await this.createConnection(databaseName);
      try {
        return await this._getDatabaseObjectsFromConnection(newConnection);
      } finally {
        await newConnection.end();
      }
    }

    return await this._getDatabaseObjectsFromConnection(connection);
  }

  /**
   * Internal method to get database objects from a specific connection
   * @private
   */
  async _getDatabaseObjectsFromConnection(connection) {
    const query = `
      SELECT 
        t.table_name as name,
        t.table_type as type_desc,
        CASE 
          WHEN t.table_type = 'BASE TABLE' THEN 'U'
          WHEN t.table_type = 'VIEW' THEN 'V'
          ELSE 'OTHER'
        END as type,
        t.table_schema as schema_name,
        CASE 
          WHEN t.table_type = 'BASE TABLE' THEN 'TABLE'
          WHEN t.table_type = 'VIEW' THEN 'VIEW'
          ELSE t.table_type
        END as object_category
      FROM information_schema.tables t
      WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND t.table_schema NOT LIKE 'pg_temp_%'
        AND t.table_schema NOT LIKE 'pg_toast_temp_%'
      
      UNION ALL
      
      SELECT 
        p.proname as name,
        'FUNCTION' as type_desc,
        'P' as type,
        n.nspname as schema_name,
        'PROCEDURE' as object_category
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND n.nspname NOT LIKE 'pg_temp_%'
        AND n.nspname NOT LIKE 'pg_toast_temp_%'
        AND p.prokind = 'f'
      
      ORDER BY object_category, name;
    `;

    const result = await connection.query(query);
    return result.rows;
  }

  /**
   * Get table columns for a specific table
   */
  async getTableColumns(connection, databaseName, tableName) {
    // For PostgreSQL, we need to connect to the specific database
    let workingConnection = connection;
    let shouldCloseConnection = false;

    if (databaseName && databaseName !== connection.options.database) {
      workingConnection = await this.createConnection(databaseName);
      shouldCloseConnection = true;
    }

    try {
      const result = await workingConnection.query(
        `
        SELECT 
          column_name as name,
          data_type as "dataType",
          is_nullable as "isNullable",
          character_maximum_length as "maxLength",
          numeric_precision as precision,
          numeric_scale as scale,
          column_default as "defaultValue"
        FROM information_schema.columns
        WHERE table_name = $1
          AND table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY ordinal_position;
      `,
        [tableName]
      );

      return result.rows;
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

    if (databaseName && databaseName !== connection.options.database) {
      workingConnection = await this.createConnection(databaseName);
      shouldCloseConnection = true;
    }

    try {
      const result = await workingConnection.query(`
        SELECT table_name as name
        FROM information_schema.views
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_name
      `);
      return result.rows.map(row => row.name);
    } finally {
      if (shouldCloseConnection && workingConnection) {
        await workingConnection.end();
      }
    }
  }

  /**
   * Get functions (stored procedures equivalent) for a database
   */
  async getProcedures(connection, databaseName) {
    let workingConnection = connection;
    let shouldCloseConnection = false;

    if (databaseName && databaseName !== connection.options.database) {
      workingConnection = await this.createConnection(databaseName);
      shouldCloseConnection = true;
    }

    try {
      const result = await workingConnection.query(`
        SELECT p.proname as name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          AND n.nspname NOT LIKE 'pg_temp_%'
          AND n.nspname NOT LIKE 'pg_toast_temp_%'
          AND p.prokind = 'f'
        ORDER BY p.proname
      `);
      return result.rows.map(row => row.name);
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

    if (databaseName && databaseName !== connection.options.database) {
      workingConnection = await this.createConnection(databaseName);
      shouldCloseConnection = true;
    }

    try {
      const result = await workingConnection.query(`
        SELECT table_name as name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_name
      `);
      return result.rows.map(row => row.name);
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
   * Get the default port for PostgreSQL
   */
  static getDefaultPort() {
    return 5432;
  }

  /**
   * Get connection validation rules for PostgreSQL
   */
  static getConnectionValidation() {
    return {
      host: { required: true, type: 'string' },
      port: { required: true, type: 'number', min: 1, max: 65535, default: 5432 },
      username: { required: true, type: 'string' },
      password: { required: true, type: 'string' },
      database: { required: false, type: 'string', default: 'postgres' },
      sslEnabled: { required: false, type: 'boolean', default: false },
    };
  }

  /**
   * Get the database type identifier
   */
  static getDatabaseType() {
    return 'POSTGRESQL';
  }
}

module.exports = PostgreSQLDriver;
