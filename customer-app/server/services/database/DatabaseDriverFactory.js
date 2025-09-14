const MSSQLDriver = require('./drivers/MSSQLDriver');
const PostgreSQLDriver = require('./drivers/PostgreSQLDriver');
const MySQLDriver = require('./drivers/MySQLDriver');
const MongoDBDriver = require('./drivers/MongoDBDriver');
const { logger } = require('../../utils/logger');

/**
 * Database Driver Factory
 * Creates appropriate database driver instances based on database type
 */
class DatabaseDriverFactory {
  static drivers = new Map([
    ['MSSQL', MSSQLDriver],
    ['POSTGRESQL', PostgreSQLDriver],
    ['MYSQL', MySQLDriver],
    ['MONGODB', MongoDBDriver],
  ]);

  /**
   * Create a database driver instance
   * @param {string} databaseType - Type of database (MSSQL, POSTGRESQL, etc.)
   * @param {Object} connectionConfig - Database connection configuration
   * @returns {IDatabaseDriver} Database driver instance
   */
  static createDriver(databaseType, connectionConfig) {
    const normalizedType = databaseType.toUpperCase();

    if (!this.drivers.has(normalizedType)) {
      throw new Error(
        `Unsupported database type: ${databaseType}. Supported types: ${Array.from(this.drivers.keys()).join(', ')}`
      );
    }

    const DriverClass = this.drivers.get(normalizedType);
    return new DriverClass(connectionConfig);
  }

  /**
   * Register a new database driver
   * @param {string} databaseType - Database type identifier
   * @param {class} DriverClass - Driver class that extends IDatabaseDriver
   */
  static registerDriver(databaseType, DriverClass) {
    const normalizedType = databaseType.toUpperCase();

    // Validate that the driver extends IDatabaseDriver
    const IDatabaseDriver = require('./interfaces/IDatabaseDriver');
    const testInstance = new DriverClass({});
    if (!(testInstance instanceof IDatabaseDriver)) {
      throw new Error(`Driver for ${databaseType} must extend IDatabaseDriver`);
    }

    this.drivers.set(normalizedType, DriverClass);
    logger.info(`Registered database driver: ${normalizedType}`);
  }

  /**
   * Get all supported database types
   * @returns {string[]} Array of supported database types
   */
  static getSupportedTypes() {
    return Array.from(this.drivers.keys());
  }

  /**
   * Check if a database type is supported
   * @param {string} databaseType - Database type to check
   * @returns {boolean} True if supported
   */
  static isTypeSupported(databaseType) {
    return this.drivers.has(databaseType.toUpperCase());
  }

  /**
   * Get default port for a database type
   * @param {string} databaseType - Database type
   * @returns {number} Default port number
   */
  static getDefaultPort(databaseType) {
    const normalizedType = databaseType.toUpperCase();

    if (!this.drivers.has(normalizedType)) {
      throw new Error(`Unsupported database type: ${databaseType}`);
    }

    const DriverClass = this.drivers.get(normalizedType);
    return DriverClass.getDefaultPort();
  }

  /**
   * Get validation rules for a database type
   * @param {string} databaseType - Database type
   * @returns {Object} Validation rules
   */
  static getValidationRules(databaseType) {
    const normalizedType = databaseType.toUpperCase();

    if (!this.drivers.has(normalizedType)) {
      throw new Error(`Unsupported database type: ${databaseType}`);
    }

    const DriverClass = this.drivers.get(normalizedType);
    return DriverClass.getConnectionValidation();
  }

  /**
   * Get database type info with display names and descriptions
   * @returns {Object[]} Array of database type information
   */
  static getDatabaseTypeInfo() {
    return [
      {
        type: 'MSSQL',
        displayName: 'Microsoft SQL Server',
        description: 'Microsoft SQL Server database',
        defaultPort: MSSQLDriver.getDefaultPort(),
        icon: '🗄️',
      },
      {
        type: 'POSTGRESQL',
        displayName: 'PostgreSQL',
        description: 'PostgreSQL open-source relational database',
        defaultPort: PostgreSQLDriver.getDefaultPort(),
        icon: '🐘',
      },
      {
        type: 'MYSQL',
        displayName: 'MySQL',
        description: 'MySQL/MariaDB relational database',
        defaultPort: MySQLDriver.getDefaultPort(),
        icon: '🐬',
      },
      {
        type: 'MONGODB',
        displayName: 'MongoDB',
        description: 'MongoDB NoSQL document database',
        defaultPort: MongoDBDriver.getDefaultPort(),
        icon: '🍃',
      },
    ];
  }

  /**
   * Create a service object for legacy compatibility with existing databaseService methods
   * @param {Object} connectionData - Database connection data
   * @returns {Object} Service object with database-specific methods
   */
  static async createService(connectionData) {
    const driver = this.createDriver(connectionData.type, connectionData);
    const connection = await driver.createConnection();

    return {
      // Legacy compatibility methods
      async getViews() {
        try {
          return await driver.getViews(connection, connectionData.database);
        } catch (error) {
          logger.error('Error getting views:', error);
          throw error;
        }
      },

      async getProcedures() {
        try {
          return await driver.getProcedures(connection, connectionData.database);
        } catch (error) {
          logger.error('Error getting procedures:', error);
          throw error;
        }
      },

      async getTables() {
        try {
          return await driver.getTables(connection, connectionData.database);
        } catch (error) {
          logger.error('Error getting tables:', error);
          throw error;
        }
      },

      // Close connection when done
      async close() {
        try {
          await driver.closeConnection(connection);
        } catch (error) {
          logger.error('Error closing connection:', error);
        }
      },
    };
  }
}

module.exports = DatabaseDriverFactory;
