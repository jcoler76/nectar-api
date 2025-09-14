/**
 * Interface for database drivers
 * All database drivers must implement these methods
 */
class IDatabaseDriver {
  constructor(connectionConfig) {
    if (new.target === IDatabaseDriver) {
      throw new Error('Cannot instantiate abstract class IDatabaseDriver directly');
    }
    this.connectionConfig = connectionConfig;
  }

  /**
   * Test the database connection
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async testConnection() {
    throw new Error('Method testConnection must be implemented');
  }

  /**
   * Create a connection to the database
   * @returns {Promise<any>} Database connection object
   */
  async createConnection() {
    throw new Error('Method createConnection must be implemented');
  }

  /**
   * Execute a query on the database
   * @param {any} connection - Database connection
   * @param {string} query - SQL query to execute
   * @param {Object} parameters - Query parameters
   * @returns {Promise<any>} Query results
   */
  async executeQuery(connection, query, parameters = {}) {
    throw new Error('Method executeQuery must be implemented');
  }

  /**
   * Execute a stored procedure
   * @param {any} connection - Database connection
   * @param {string} procedureName - Name of the stored procedure
   * @param {Object} parameters - Procedure parameters
   * @param {Object} options - Additional options
   * @returns {Promise<any>} Procedure results
   */
  async executeStoredProcedure(connection, procedureName, parameters = {}, options = {}) {
    throw new Error('Method executeStoredProcedure must be implemented');
  }

  /**
   * Get list of databases
   * @param {any} connection - Database connection
   * @returns {Promise<string[]>} Array of database names
   */
  async getDatabaseList(connection) {
    throw new Error('Method getDatabaseList must be implemented');
  }

  /**
   * Get database objects (tables, views, procedures)
   * @param {any} connection - Database connection
   * @param {string} databaseName - Target database name
   * @returns {Promise<Array>} Array of database objects
   */
  async getDatabaseObjects(connection, databaseName) {
    throw new Error('Method getDatabaseObjects must be implemented');
  }

  /**
   * Get table columns for a specific table
   * @param {any} connection - Database connection
   * @param {string} databaseName - Database name
   * @param {string} tableName - Table name
   * @returns {Promise<Array>} Array of column definitions
   */
  async getTableColumns(connection, databaseName, tableName) {
    throw new Error('Method getTableColumns must be implemented');
  }

  /**
   * Close database connection
   * @param {any} connection - Database connection to close
   * @returns {Promise<void>}
   */
  async closeConnection(connection) {
    throw new Error('Method closeConnection must be implemented');
  }

  /**
   * Get the default port for this database type
   * @returns {number} Default port number
   */
  static getDefaultPort() {
    throw new Error('Static method getDefaultPort must be implemented');
  }

  /**
   * Get connection validation rules specific to this database type
   * @returns {Object} Validation rules
   */
  static getConnectionValidation() {
    throw new Error('Static method getConnectionValidation must be implemented');
  }
}

module.exports = IDatabaseDriver;
