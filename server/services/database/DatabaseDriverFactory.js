const MSSQLDriver = require('./drivers/MSSQLDriver');
const PostgreSQLDriver = require('./drivers/PostgreSQLDriver');
const MySQLDriver = require('./drivers/MySQLDriver');
const MongoDBDriver = require('./drivers/MongoDBDriver');
const SQLiteDriver = require('./drivers/SQLiteDriver');
const OracleDriver = require('./drivers/OracleDriver');
const AWSRDSDriver = require('./drivers/AWSRDSDriver');
const AzureSQLDriver = require('./drivers/AzureSQLDriver');
const GoogleCloudSQLDriver = require('./drivers/GoogleCloudSQLDriver');
const BigQueryDriver = require('../analytics/drivers/BigQueryDriver');
const SnowflakeDriver = require('../analytics/drivers/SnowflakeDriver');
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
    ['SQLITE', SQLiteDriver],
    ['ORACLE', OracleDriver],
    // AWS RDS variants
    ['AWS_RDS', AWSRDSDriver],
    ['AWS_RDS_POSTGRESQL', AWSRDSDriver],
    ['AWS_RDS_MYSQL', AWSRDSDriver],
    ['AWS_RDS_MSSQL', AWSRDSDriver],
    ['AWS_RDS_ORACLE', AWSRDSDriver],
    ['AWS_AURORA_POSTGRESQL', AWSRDSDriver],
    ['AWS_AURORA_MYSQL', AWSRDSDriver],
    // Azure SQL variants
    ['AZURE_SQL', AzureSQLDriver],
    ['AZURE_SQL_DATABASE', AzureSQLDriver],
    ['AZURE_SQL_MANAGED_INSTANCE', AzureSQLDriver],
    ['AZURE_POSTGRESQL', AzureSQLDriver],
    ['AZURE_MYSQL', AzureSQLDriver],
    // Google Cloud SQL variants
    ['GOOGLE_CLOUD_SQL', GoogleCloudSQLDriver],
    ['GCP_CLOUD_SQL_POSTGRESQL', GoogleCloudSQLDriver],
    ['GCP_CLOUD_SQL_MYSQL', GoogleCloudSQLDriver],
    ['GCP_CLOUD_SQL_MSSQL', GoogleCloudSQLDriver],
    ['GCP_SPANNER', GoogleCloudSQLDriver],
    // Analytics platforms
    ['BIGQUERY', BigQueryDriver],
    ['SNOWFLAKE', SnowflakeDriver],
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

    // Validate SDK availability before creating driver
    this._validateSDKAvailability(normalizedType);

    // Enhance connection config with engine information for cloud providers
    const enhancedConfig = { ...connectionConfig };

    // Map database types to underlying engines for cloud providers
    if (normalizedType.startsWith('AWS_RDS_') || normalizedType.startsWith('AWS_AURORA_')) {
      enhancedConfig.engine = this._mapToEngine(normalizedType);
    } else if (normalizedType.startsWith('AZURE_')) {
      enhancedConfig.engine = this._mapToEngine(normalizedType);
    } else if (normalizedType.startsWith('GCP_')) {
      enhancedConfig.engine = this._mapToEngine(normalizedType);
    }

    const DriverClass = this.drivers.get(normalizedType);
    return new DriverClass(enhancedConfig);
  }

  /**
   * Validate SDK availability for database type
   * @private
   * @param {string} databaseType - Database type
   * @throws {Error} If required SDK is not available
   */
  static _validateSDKAvailability(databaseType) {
    const sdkRequirements = {
      BIGQUERY: '@google-cloud/bigquery',
      SNOWFLAKE: 'snowflake-sdk',
      AWS_RDS_POSTGRESQL: 'aws-sdk',
      AWS_RDS_MYSQL: 'aws-sdk',
      AWS_RDS_MSSQL: 'aws-sdk',
      AWS_RDS_ORACLE: 'aws-sdk',
      AWS_AURORA_POSTGRESQL: 'aws-sdk',
      AWS_AURORA_MYSQL: 'aws-sdk',
      AZURE_SQL_DATABASE: '@azure/identity',
      AZURE_SQL_MANAGED_INSTANCE: '@azure/identity',
      AZURE_POSTGRESQL: '@azure/identity',
      AZURE_MYSQL: '@azure/identity',
      GCP_CLOUD_SQL_POSTGRESQL: '@google-cloud/storage',
      GCP_CLOUD_SQL_MYSQL: '@google-cloud/storage',
      GCP_CLOUD_SQL_MSSQL: '@google-cloud/storage',
      GCP_SPANNER: '@google-cloud/spanner',
      ORACLE: 'oracledb',
      MONGODB: 'mongodb',
      MYSQL: 'mysql2',
      POSTGRESQL: 'pg',
      MSSQL: 'mssql',
      SQLITE: 'sqlite3',
    };

    const requiredSDK = sdkRequirements[databaseType];
    if (requiredSDK) {
      try {
        require.resolve(requiredSDK);
      } catch (error) {
        throw new Error(
          `Missing required SDK for ${databaseType}: ${requiredSDK}. Please install with: npm install ${requiredSDK}`
        );
      }
    }
  }

  /**
   * Map database types to underlying engines
   * @private
   * @param {string} databaseType - Database type
   * @returns {string} Engine name
   */
  static _mapToEngine(databaseType) {
    const engineMap = {
      // AWS RDS engines
      AWS_RDS_POSTGRESQL: 'postgres',
      AWS_RDS_MYSQL: 'mysql',
      AWS_RDS_MSSQL: 'sqlserver',
      AWS_RDS_ORACLE: 'oracle',
      AWS_AURORA_POSTGRESQL: 'aurora-postgresql',
      AWS_AURORA_MYSQL: 'aurora-mysql',
      // Azure engines
      AZURE_SQL_DATABASE: 'sqlserver',
      AZURE_SQL_MANAGED_INSTANCE: 'sqlserver',
      AZURE_POSTGRESQL: 'postgres',
      AZURE_MYSQL: 'mysql',
      // Google Cloud engines
      GCP_CLOUD_SQL_POSTGRESQL: 'postgres',
      GCP_CLOUD_SQL_MYSQL: 'mysql',
      GCP_CLOUD_SQL_MSSQL: 'sqlserver',
      GCP_SPANNER: 'spanner',
    };

    return engineMap[databaseType] || 'unknown';
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
    const databaseTypes = [];

    // Add each driver type dynamically
    for (const [type, DriverClass] of this.drivers.entries()) {
      try {
        const driverInfo = DriverClass.getDriverInfo();
        databaseTypes.push({
          type,
          displayName: driverInfo.name,
          description: driverInfo.description,
          category: driverInfo.category || 'standard',
          features: driverInfo.features || [],
          icon: this._getIconForType(type),
        });
      } catch (error) {
        // Fallback for legacy drivers without getDriverInfo
        databaseTypes.push({
          type,
          displayName: type,
          description: `${type} database`,
          category: 'standard',
          features: [],
          icon: this._getIconForType(type),
        });
      }
    }

    return databaseTypes;
  }

  /**
   * Get icon for database type
   * @private
   */
  static _getIconForType(type) {
    const icons = {
      MSSQL: '🗄️',
      POSTGRESQL: '🐘',
      MYSQL: '🐬',
      MONGODB: '🍃',
      SQLITE: '📄',
      ORACLE: '🔺',
      AWS_RDS: '☁️',
      AZURE_SQL: '🌐',
      GOOGLE_CLOUD_SQL: '🌩️',
      BIGQUERY: '📊',
      SNOWFLAKE: '❄️',
    };
    return icons[type] || '💾';
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
