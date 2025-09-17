const oracledb = require('oracledb');
const IDatabaseDriver = require('../interfaces/IDatabaseDriver');
const { decryptDatabasePassword } = require('../../../utils/encryption');
const { logger } = require('../../../utils/logger');

/**
 * Oracle Database Driver
 * Supports Oracle Database connections
 */
class OracleDriver extends IDatabaseDriver {
  constructor(connectionConfig) {
    super(connectionConfig);
    this.pool = null;
  }

  /**
   * Create Oracle connection configuration
   * @private
   */
  _createConfig() {
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
      connectString: this._buildConnectString(),
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
      poolTimeout: 60,
      stmtCacheSize: 30,
    };

    return config;
  }

  /**
   * Build Oracle connect string
   * @private
   */
  _buildConnectString() {
    const { host, port = 1521, database, serviceName, sid } = this.connectionConfig;

    if (serviceName) {
      return `${host}:${port}/${serviceName}`;
    } else if (sid) {
      return `${host}:${port}:${sid}`;
    } else if (database) {
      // Assume database is service name if no explicit serviceName/sid
      return `${host}:${port}/${database}`;
    } else {
      throw new Error('Oracle connection requires either serviceName, sid, or database');
    }
  }

  /**
   * Test the database connection
   */
  async testConnection() {
    let connection;
    try {
      logger.debug('Testing Oracle connection', {
        host: this.connectionConfig.host,
        port: this.connectionConfig.port,
        database: this.connectionConfig.database,
        serviceName: this.connectionConfig.serviceName,
        sid: this.connectionConfig.sid,
      });

      const config = this._createConfig();
      connection = await oracledb.getConnection(config);

      // Test with a simple query
      const result = await connection.execute('SELECT 1 FROM DUAL');

      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error) {
      logger.error('Oracle connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          offset: error.offset,
        },
      };
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          logger.error('Error closing Oracle test connection:', err.message);
        }
      }
    }
  }

  /**
   * Create a connection to the database
   */
  async createConnection() {
    const config = this._createConfig();

    if (!this.pool) {
      this.pool = await oracledb.createPool(config);
    }

    return this.pool;
  }

  /**
   * Execute a query on the database
   */
  async executeQuery(connection, query, parameters = []) {
    const conn = await connection.getConnection();

    try {
      // Convert object parameters to array for Oracle
      let bindParams = parameters;
      let processedQuery = query;

      if (typeof parameters === 'object' && !Array.isArray(parameters)) {
        bindParams = {};
        // Oracle uses :paramName binding
        for (const [key, value] of Object.entries(parameters)) {
          const placeholder = `:${key}`;
          if (processedQuery.includes(placeholder)) {
            bindParams[key] = value;
          }
        }
      }

      const result = await conn.execute(processedQuery, bindParams, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
      });

      return result.rows;
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  /**
   * Execute a stored procedure
   */
  async executeStoredProcedure(connection, procedureName, parameters = {}, options = {}) {
    const conn = await connection.getConnection();

    try {
      // Build Oracle procedure call
      const bindParams = {};
      const paramKeys = Object.keys(parameters);

      for (const key of paramKeys) {
        bindParams[key] = parameters[key];
      }

      // Add output parameter for procedures that return values
      if (options.hasReturnValue) {
        bindParams.result = { dir: oracledb.BIND_OUT, type: oracledb.CURSOR };
      }

      const query = `BEGIN ${procedureName}(${paramKeys.map(key => `:${key}`).join(', ')}${options.hasReturnValue ? ', :result' : ''}); END;`;

      const result = await conn.execute(query, bindParams, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
      });

      if (options.hasReturnValue && result.outBinds.result) {
        const cursor = result.outBinds.result;
        const rows = await cursor.getRows();
        await cursor.close();
        return rows;
      }

      return result.outBinds || result.rowsAffected;
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  /**
   * Get list of databases (schemas in Oracle)
   */
  async getDatabaseList(connection) {
    const conn = await connection.getConnection();

    try {
      const result = await conn.execute(
        `
        SELECT username as schema_name
        FROM all_users
        WHERE username NOT IN ('SYS', 'SYSTEM', 'DBSNMP', 'SYSMAN', 'OUTLN', 'MGMT_VIEW', 'FLOWS_FILES', 'MDSYS', 'ORDSYS', 'EXFSYS', 'WMSYS', 'APPQOSSYS', 'APEX_030200', 'OWBSYS_AUDIT', 'ORDDATA', 'CTXSYS', 'ANONYMOUS', 'XDB', 'ORDPLUGINS', 'OWBSYS', 'SI_INFORMTN_SCHEMA', 'OLAPSYS')
        ORDER BY username
      `,
        [],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      return result.rows.map(row => row.SCHEMA_NAME);
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  /**
   * Get database objects (tables, views, procedures)
   */
  async getDatabaseObjects(connection, schemaName) {
    const conn = await connection.getConnection();

    try {
      const results = [];
      const schema = schemaName || this.connectionConfig.username?.toUpperCase();

      // Get tables
      const tables = await conn.execute(
        `
        SELECT
          table_name as name,
          'BASE TABLE' as type_desc,
          'U' as type,
          owner as schema_name,
          'TABLE' as object_category
        FROM all_tables
        WHERE owner = :schema
        ORDER BY table_name
      `,
        { schema },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );
      results.push(...tables.rows);

      // Get views
      const views = await conn.execute(
        `
        SELECT
          view_name as name,
          'VIEW' as type_desc,
          'V' as type,
          owner as schema_name,
          'VIEW' as object_category
        FROM all_views
        WHERE owner = :schema
        ORDER BY view_name
      `,
        { schema },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );
      results.push(...views.rows);

      // Get procedures and functions
      const procedures = await conn.execute(
        `
        SELECT
          object_name as name,
          object_type as type_desc,
          CASE
            WHEN object_type = 'PROCEDURE' THEN 'P'
            WHEN object_type = 'FUNCTION' THEN 'F'
            WHEN object_type = 'PACKAGE' THEN 'PK'
            ELSE 'O'
          END as type,
          owner as schema_name,
          'PROCEDURE' as object_category
        FROM all_objects
        WHERE owner = :schema
        AND object_type IN ('PROCEDURE', 'FUNCTION', 'PACKAGE')
        ORDER BY object_name
      `,
        { schema },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );
      results.push(...procedures.rows);

      return results;
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  /**
   * Get table columns for a specific table
   */
  async getTableColumns(connection, schemaName, tableName) {
    const conn = await connection.getConnection();

    try {
      const schema = schemaName || this.connectionConfig.username?.toUpperCase();

      const result = await conn.execute(
        `
        SELECT
          column_name as name,
          data_type as dataType,
          nullable as isNullable,
          data_length as maxLength,
          data_precision as precision,
          data_scale as scale,
          data_default as defaultValue,
          column_id as ordinalPosition
        FROM all_tab_columns
        WHERE owner = :schema AND table_name = :tableName
        ORDER BY column_id
      `,
        { schema, tableName: tableName.toUpperCase() },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      return result.rows.map(row => ({
        ...row,
        isNullable: row.ISNULLABLE === 'Y' ? 'YES' : 'NO',
      }));
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  /**
   * Get views for a schema
   */
  async getViews(connection, schemaName) {
    const conn = await connection.getConnection();

    try {
      const schema = schemaName || this.connectionConfig.username?.toUpperCase();

      const result = await conn.execute(
        `
        SELECT view_name as name
        FROM all_views
        WHERE owner = :schema
        ORDER BY view_name
      `,
        { schema },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      return result.rows.map(row => row.NAME);
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  /**
   * Get stored procedures for a schema
   */
  async getProcedures(connection, schemaName) {
    const conn = await connection.getConnection();

    try {
      const schema = schemaName || this.connectionConfig.username?.toUpperCase();

      const result = await conn.execute(
        `
        SELECT object_name as name
        FROM all_objects
        WHERE owner = :schema
        AND object_type IN ('PROCEDURE', 'FUNCTION', 'PACKAGE')
        ORDER BY object_name
      `,
        { schema },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      return result.rows.map(row => row.NAME);
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  /**
   * Get tables for a schema
   */
  async getTables(connection, schemaName) {
    const conn = await connection.getConnection();

    try {
      const schema = schemaName || this.connectionConfig.username?.toUpperCase();

      const result = await conn.execute(
        `
        SELECT table_name as name
        FROM all_tables
        WHERE owner = :schema
        ORDER BY table_name
      `,
        { schema },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      return result.rows.map(row => row.NAME);
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  /**
   * Close database connection
   */
  async closeConnection(connection) {
    if (connection && typeof connection.close === 'function') {
      await connection.close();
    }
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  /**
   * Get the default port for Oracle
   */
  static getDefaultPort() {
    return 1521;
  }

  /**
   * Get connection validation rules for Oracle
   */
  static getConnectionValidation() {
    return {
      host: { required: true, type: 'string' },
      port: { required: false, type: 'number', min: 1, max: 65535, default: 1521 },
      username: { required: true, type: 'string' },
      password: { required: true, type: 'string' },
      database: {
        required: false,
        type: 'string',
        description: 'Database name (used as service name if serviceName not specified)',
      },
      serviceName: { required: false, type: 'string', description: 'Oracle service name' },
      sid: { required: false, type: 'string', description: 'Oracle SID (System Identifier)' },
    };
  }

  /**
   * Get the database type identifier
   */
  static getDatabaseType() {
    return 'ORACLE';
  }
}

module.exports = OracleDriver;
