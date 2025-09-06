const sql = require('mssql');
const logger = require('../config/winston');
const { decryptDatabasePassword } = require('./encryption');

class DatabaseConnectionManager {
  constructor() {
    this.pools = new Map();
    this.connectionConfig = {
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      options: {
        encrypt: true,
        trustServerCertificate: process.env.NODE_ENV === 'development',
        connectTimeout: 30000,
        requestTimeout: 30000,
      },
    };
  }

  createConnectionKey(connectionData) {
    return `${connectionData.server}:${connectionData.database}:${connectionData.username}`;
  }

  async getConnection(connectionData) {
    const connectionKey = this.createConnectionKey(connectionData);

    if (this.pools.has(connectionKey)) {
      const pool = this.pools.get(connectionKey);

      if (pool.connected) {
        return pool;
      } else {
        this.pools.delete(connectionKey);
      }
    }

    return this.createConnection(connectionData);
  }

  async createConnection(connectionData) {
    const connectionKey = this.createConnectionKey(connectionData);

    try {
      let password;

      if (connectionData.encryptedPassword) {
        password = decryptDatabasePassword(connectionData.encryptedPassword);
      } else if (connectionData.password) {
        password = connectionData.password;
      } else {
        throw new Error('No password provided for database connection');
      }

      const config = {
        ...this.connectionConfig,
        server: connectionData.server,
        database: connectionData.database,
        user: connectionData.username,
        password,
        port: connectionData.port || 1433,
      };

      if (connectionData.trustedConnection) {
        config.options.trustedConnection = true;
        delete config.user;
        delete config.password;
      }

      const pool = new sql.ConnectionPool(config);

      pool.on('error', err => {
        logger.error(`Database pool error for ${connectionKey}:`, err);
        this.pools.delete(connectionKey);
      });

      await pool.connect();
      this.pools.set(connectionKey, pool);

      logger.debug(`Database connection established: ${connectionKey}`);
      return pool;
    } catch (error) {
      logger.error(`Failed to create database connection for ${connectionKey}:`, error);
      throw error;
    }
  }

  async executeQuery(connectionData, query, parameters = {}) {
    const pool = await this.getConnection(connectionData);
    const request = pool.request();

    try {
      Object.entries(parameters).forEach(([key, value]) => {
        request.input(key, value);
      });

      const result = await request.query(query);
      return result;
    } catch (error) {
      logger.error('Query execution failed:', { query, error: error.message });
      throw error;
    }
  }

  async executeProcedure(connectionData, procedureName, parameters = {}) {
    const pool = await this.getConnection(connectionData);
    const request = pool.request();

    try {
      Object.entries(parameters).forEach(([key, value]) => {
        request.input(key, value);
      });

      const result = await request.execute(procedureName);
      return result;
    } catch (error) {
      logger.error('Procedure execution failed:', {
        procedure: procedureName,
        error: error.message,
      });
      throw error;
    }
  }

  async executeTransaction(connectionData, operations) {
    const pool = await this.getConnection(connectionData);
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const results = [];
      for (const operation of operations) {
        const request = new sql.Request(transaction);

        if (operation.parameters) {
          Object.entries(operation.parameters).forEach(([key, value]) => {
            request.input(key, value);
          });
        }

        let result;
        if (operation.type === 'query') {
          result = await request.query(operation.sql);
        } else if (operation.type === 'procedure') {
          result = await request.execute(operation.procedure);
        } else {
          throw new Error(`Unknown operation type: ${operation.type}`);
        }

        results.push(result);
      }

      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      logger.error('Transaction failed:', error);
      throw error;
    }
  }

  async testConnection(connectionData) {
    try {
      const pool = await this.getConnection(connectionData);
      const request = pool.request();
      await request.query('SELECT 1 as test');
      return true;
    } catch (error) {
      logger.error('Connection test failed:', error);
      return false;
    }
  }

  async closeConnection(connectionData) {
    const connectionKey = this.createConnectionKey(connectionData);

    if (this.pools.has(connectionKey)) {
      const pool = this.pools.get(connectionKey);
      await pool.close();
      this.pools.delete(connectionKey);
      logger.debug(`Database connection closed: ${connectionKey}`);
    }
  }

  async closeAllConnections() {
    const closePromises = Array.from(this.pools.entries()).map(async ([key, pool]) => {
      try {
        await pool.close();
        logger.debug(`Database connection closed: ${key}`);
      } catch (error) {
        logger.error(`Error closing connection ${key}:`, error);
      }
    });

    await Promise.all(closePromises);
    this.pools.clear();
    logger.info('All database connections closed');
  }

  getActiveConnections() {
    return Array.from(this.pools.keys());
  }

  getConnectionCount() {
    return this.pools.size;
  }

  static validateSQLIdentifier(identifier) {
    const sqlIdentifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return sqlIdentifierPattern.test(identifier);
  }

  static sanitizeParameters(parameters) {
    const sanitized = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (!this.validateSQLIdentifier(key)) {
        throw new Error(`Invalid parameter name: ${key}`);
      }

      if (typeof value === 'string') {
        sanitized[key] = value.replace(/'/g, "''");
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

const dbManager = new DatabaseConnectionManager();

process.on('SIGINT', async () => {
  logger.info('Gracefully closing database connections...');
  await dbManager.closeAllConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Gracefully closing database connections...');
  await dbManager.closeAllConnections();
  process.exit(0);
});

module.exports = dbManager;
