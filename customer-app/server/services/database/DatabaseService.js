const DatabaseDriverFactory = require('./DatabaseDriverFactory');
const { logger } = require('../../utils/logger');
const { PrismaClient } = require('../../prisma/generated/client');

const prisma = new PrismaClient();

/**
 * Modern Database Service
 * Handles database operations using the new driver architecture
 */
class DatabaseService {
  static objectsCache = new Map();

  /**
   * Clear objects cache
   * @param {string} serviceId - Service ID to clear cache for
   */
  static clearObjectsCache(serviceId) {
    if (serviceId) {
      this.objectsCache.delete(serviceId);
    } else {
      this.objectsCache.clear();
    }
  }

  /**
   * Test database connection using appropriate driver
   * @param {Object} connectionConfig - Connection configuration
   * @returns {Promise<Object>} Test result
   */
  static async testConnection(connectionConfig) {
    try {
      // Determine database type - default to MSSQL for backward compatibility
      const databaseType = connectionConfig.type || 'MSSQL';

      logger.debug('Testing database connection', {
        type: databaseType,
        host: connectionConfig.host,
        port: connectionConfig.port,
        database: connectionConfig.database,
      });

      const driver = DatabaseDriverFactory.createDriver(databaseType, connectionConfig);
      return await driver.testConnection();
    } catch (error) {
      logger.error('Database connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test connection for a stored database connection
   * @param {Object} connection - Database connection from database
   * @returns {Promise<Object>} Test result
   */
  static async testStoredConnection(connection) {
    const connectionConfig = {
      type: connection.type || 'MSSQL',
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.passwordEncrypted,
      database: connection.database,
      sslEnabled: connection.sslEnabled,
    };

    return await this.testConnection(connectionConfig);
  }

  /**
   * Get database list for a connection
   * @param {Object} connection - Database connection
   * @returns {Promise<string[]>} Array of database names
   */
  static async getDatabaseList(connection) {
    let driver, dbConnection;
    try {
      const connectionConfig = {
        type: connection.type || 'MSSQL',
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.passwordEncrypted,
        sslEnabled: connection.sslEnabled,
      };

      driver = DatabaseDriverFactory.createDriver(connectionConfig.type, connectionConfig);
      dbConnection = await driver.createConnection();

      return await driver.getDatabaseList(dbConnection);
    } finally {
      if (driver && dbConnection) {
        try {
          await driver.closeConnection(dbConnection);
        } catch (error) {
          logger.error('Error closing connection in getDatabaseList:', error.message);
        }
      }
    }
  }

  /**
   * Execute stored procedure
   * @param {Object} service - Service configuration
   * @param {string} procedureName - Procedure name
   * @param {Object} params - Parameters
   * @param {Object} options - Options
   * @returns {Promise<any>} Procedure results
   */
  static async executeStoredProcedure(service, procedureName, params = {}, options = {}) {
    let driver, connection;
    try {
      const connectionConfig = {
        type: service.type || 'MSSQL',
        host: service.host,
        port: service.port,
        username: service.username,
        password: service.password,
        database: service.database,
        sslEnabled: service.sslEnabled,
      };

      driver = DatabaseDriverFactory.createDriver(connectionConfig.type, connectionConfig);
      connection = await driver.createConnection();

      return await driver.executeStoredProcedure(connection, procedureName, params, options);
    } finally {
      if (driver && connection) {
        try {
          await driver.closeConnection(connection);
        } catch (error) {
          logger.error('Error closing connection in executeStoredProcedure:', error.message);
        }
      }
    }
  }

  /**
   * Get database objects
   * @param {Object} service - Service configuration
   * @returns {Promise<Array>} Database objects
   */
  static async getDatabaseObjects(service) {
    let driver, connection;
    try {
      const connectionConfig = {
        type: service.type || 'MSSQL',
        host: service.host,
        port: service.port,
        username: service.username,
        password: service.password,
        database: service.database,
        sslEnabled: service.sslEnabled,
      };

      driver = DatabaseDriverFactory.createDriver(connectionConfig.type, connectionConfig);
      connection = await driver.createConnection();

      return await driver.getDatabaseObjects(connection, service.database);
    } finally {
      if (driver && connection) {
        try {
          await driver.closeConnection(connection);
        } catch (error) {
          logger.error('Error closing connection in getDatabaseObjects:', error.message);
        }
      }
    }
  }

  /**
   * Get table columns
   * @param {Object} connectionConfig - Connection configuration
   * @param {string} database - Database name
   * @param {string} table - Table name
   * @returns {Promise<Array>} Table columns
   */
  static async getTableColumns(connectionConfig, database, table) {
    let driver, connection;
    try {
      driver = DatabaseDriverFactory.createDriver(
        connectionConfig.type || 'MSSQL',
        connectionConfig
      );
      connection = await driver.createConnection();

      return await driver.getTableColumns(connection, database, table);
    } finally {
      if (driver && connection) {
        try {
          await driver.closeConnection(connection);
        } catch (error) {
          logger.error('Error closing connection in getTableColumns:', error.message);
        }
      }
    }
  }

  /**
   * Create a database service instance for legacy compatibility
   * @param {Object} connection - Connection data
   * @param {string} database - Database name
   * @returns {Promise<Object>} Service instance
   */
  static async createService(connection, database) {
    const connectionConfig = {
      type: connection.type || 'MSSQL',
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password || connection.passwordEncrypted,
      database: database || connection.database,
      sslEnabled: connection.sslEnabled,
    };

    return await DatabaseDriverFactory.createService(connectionConfig);
  }

  /**
   * Get supported database types
   * @returns {Object[]} Array of database type information
   */
  static getSupportedDatabaseTypes() {
    return DatabaseDriverFactory.getDatabaseTypeInfo();
  }

  /**
   * Get default port for database type
   * @param {string} databaseType - Database type
   * @returns {number} Default port
   */
  static getDefaultPort(databaseType) {
    return DatabaseDriverFactory.getDefaultPort(databaseType);
  }

  /**
   * Get validation rules for database type
   * @param {string} databaseType - Database type
   * @returns {Object} Validation rules
   */
  static getValidationRules(databaseType) {
    return DatabaseDriverFactory.getValidationRules(databaseType);
  }
}

// Export factory function for backward compatibility
const getDatabaseService = async (connection, database) => {
  return await DatabaseService.createService(connection, database);
};

module.exports = DatabaseService;
module.exports.getDatabaseService = getDatabaseService;
