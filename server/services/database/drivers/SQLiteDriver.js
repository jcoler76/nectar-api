const sqlite3 = require('sqlite3');
const IDatabaseDriver = require('../interfaces/IDatabaseDriver');
const { logger } = require('../../../utils/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * SQLite Database Driver
 * Supports local SQLite database files for development and lightweight applications
 */
class SQLiteDriver extends IDatabaseDriver {
  constructor(connectionConfig) {
    super(connectionConfig);
    this.database = null;
  }

  /**
   * Resolve database file path
   * @private
   */
  _getDatabasePath() {
    let dbPath = this.connectionConfig.database || this.connectionConfig.filePath;

    if (!dbPath) {
      throw new Error('Database file path is required for SQLite connections');
    }

    // Handle relative paths
    if (!path.isAbsolute(dbPath)) {
      dbPath = path.resolve(process.cwd(), dbPath);
    }

    return dbPath;
  }

  /**
   * Create SQLite database connection
   * @private
   */
  async _createDatabase(filePath) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(
        filePath,
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        err => {
          if (err) {
            reject(err);
          } else {
            // Enable foreign keys by default
            db.run('PRAGMA foreign_keys = ON', fkErr => {
              if (fkErr) {
                logger.warn('Could not enable foreign keys:', fkErr.message);
              }
              resolve(db);
            });
          }
        }
      );
    });
  }

  /**
   * Test the database connection
   */
  async testConnection() {
    let testDb;
    try {
      const dbPath = this._getDatabasePath();

      logger.debug('Testing SQLite connection', {
        filePath: dbPath,
      });

      // Ensure directory exists
      const dbDir = path.dirname(dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      testDb = await this._createDatabase(dbPath);

      // Test with a simple query
      await new Promise((resolve, reject) => {
        testDb.get('SELECT 1 as test', (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error) {
      logger.error('SQLite connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          errno: error.errno,
        },
      };
    } finally {
      if (testDb) {
        testDb.close();
      }
    }
  }

  /**
   * Create a connection to the database
   */
  async createConnection() {
    const dbPath = this._getDatabasePath();

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    await fs.mkdir(dbDir, { recursive: true });

    const db = await this._createDatabase(dbPath);
    this.database = db;
    return db;
  }

  /**
   * Execute a query on the database
   */
  async executeQuery(connection, query, parameters = {}) {
    return new Promise((resolve, reject) => {
      // Convert object parameters to array for SQLite
      let paramArray = [];
      let processedQuery = query;

      if (typeof parameters === 'object' && !Array.isArray(parameters)) {
        // Replace named parameters with ? placeholders
        for (const [key, value] of Object.entries(parameters)) {
          const placeholder = `:${key}`;
          if (processedQuery.includes(placeholder)) {
            processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), '?');
            paramArray.push(value);
          }
        }
      } else if (Array.isArray(parameters)) {
        paramArray = parameters;
      }

      // Determine if this is a SELECT query or a modification query
      const isSelect = processedQuery.trim().toUpperCase().startsWith('SELECT');

      if (isSelect) {
        connection.all(processedQuery, paramArray, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else {
        connection.run(processedQuery, paramArray, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              changes: this.changes,
              lastID: this.lastID,
              affectedRows: this.changes,
            });
          }
        });
      }
    });
  }

  /**
   * Execute a stored procedure (not supported in SQLite)
   */
  async executeStoredProcedure(connection, procedureName, parameters = {}, options = {}) {
    throw new Error('Stored procedures are not supported in SQLite');
  }

  /**
   * Get list of databases (SQLite only has one database per file)
   */
  async getDatabaseList(connection) {
    const dbPath = this._getDatabasePath();
    const dbName = path.basename(dbPath, path.extname(dbPath));
    return [dbName];
  }

  /**
   * Get database objects (tables, views)
   */
  async getDatabaseObjects(connection) {
    const results = [];

    try {
      // Get tables
      const tables = await new Promise((resolve, reject) => {
        connection.all(
          `SELECT name, 'BASE TABLE' as type_desc, 'U' as type, 'main' as schema_name, 'TABLE' as object_category
           FROM sqlite_master
           WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
           ORDER BY name`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      results.push(...tables);

      // Get views
      const views = await new Promise((resolve, reject) => {
        connection.all(
          `SELECT name, 'VIEW' as type_desc, 'V' as type, 'main' as schema_name, 'VIEW' as object_category
           FROM sqlite_master
           WHERE type = 'view'
           ORDER BY name`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      results.push(...views);

      // Get indexes (treated as database objects)
      const indexes = await new Promise((resolve, reject) => {
        connection.all(
          `SELECT name, 'INDEX' as type_desc, 'I' as type, 'main' as schema_name, 'INDEX' as object_category
           FROM sqlite_master
           WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
           ORDER BY name`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      results.push(...indexes);
    } catch (error) {
      logger.error('Error fetching SQLite database objects:', error);
      throw error;
    }

    return results;
  }

  /**
   * Get table columns for a specific table
   */
  async getTableColumns(connection, databaseName, tableName) {
    return new Promise((resolve, reject) => {
      connection.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const columns = rows.map(row => ({
            name: row.name,
            dataType: row.type,
            isNullable: row.notnull === 0 ? 'YES' : 'NO',
            defaultValue: row.dflt_value,
            isPrimaryKey: row.pk === 1,
            columnKey: row.pk === 1 ? 'PRI' : '',
            ordinalPosition: row.cid + 1,
          }));
          resolve(columns);
        }
      });
    });
  }

  /**
   * Get views for a database
   */
  async getViews(connection, databaseName) {
    return new Promise((resolve, reject) => {
      connection.all(
        `SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.name));
        }
      );
    });
  }

  /**
   * Get stored procedures for a database (not supported in SQLite)
   */
  async getProcedures(connection, databaseName) {
    return []; // SQLite doesn't support stored procedures
  }

  /**
   * Get tables for a database
   */
  async getTables(connection, databaseName) {
    return new Promise((resolve, reject) => {
      connection.all(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.name));
        }
      );
    });
  }

  /**
   * Close database connection
   */
  async closeConnection(connection) {
    if (connection) {
      return new Promise(resolve => {
        connection.close(err => {
          if (err) {
            logger.error('Error closing SQLite connection:', err.message);
          }
          resolve();
        });
      });
    }
  }

  /**
   * Get the default port for SQLite (not applicable)
   */
  static getDefaultPort() {
    return null; // SQLite doesn't use ports
  }

  /**
   * Get connection validation rules for SQLite
   */
  static getConnectionValidation() {
    return {
      database: {
        required: true,
        type: 'string',
        description: 'Path to SQLite database file (relative or absolute)',
      },
      filePath: {
        required: false,
        type: 'string',
        description: 'Alternative field name for database file path',
      },
    };
  }

  /**
   * Get the database type identifier
   */
  static getDatabaseType() {
    return 'SQLITE';
  }
}

module.exports = SQLiteDriver;
