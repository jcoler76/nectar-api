const { MongoClient } = require('mongodb');
const IDatabaseDriver = require('../interfaces/IDatabaseDriver');
const { decryptDatabasePassword } = require('../../../utils/encryption');
const { logger } = require('../../../utils/logger');

/**
 * MongoDB Database Driver
 * NoSQL document database driver implementation
 */
class MongoDBDriver extends IDatabaseDriver {
  constructor(connectionConfig) {
    super(connectionConfig);
    this.clients = new Map();
  }

  /**
   * Build MongoDB connection string
   * @private
   */
  _buildConnectionString(database = null) {
    let password = this.connectionConfig.password;

    // Handle encrypted passwords
    if (typeof password === 'string' && password.includes(':')) {
      try {
        password = decryptDatabasePassword(password);
      } catch (error) {
        logger.error('Password decryption failed:', error.message);
      }
    }

    const host = this.connectionConfig.host;
    const port = this.connectionConfig.port || 27017;
    const username = this.connectionConfig.username;
    const dbName = database || this.connectionConfig.database || 'admin';
    
    // Build connection string based on whether authentication is required
    let connectionString;
    if (username && password) {
      // With authentication
      connectionString = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
    } else {
      // Without authentication (local development)
      connectionString = `mongodb://${host}:${port}/${dbName}`;
    }

    // Add SSL option if enabled
    if (this.connectionConfig.sslEnabled) {
      connectionString += '?ssl=true';
    }

    return connectionString;
  }

  /**
   * Create MongoDB client options
   * @private
   */
  _getClientOptions() {
    return {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 0,
      retryWrites: true,
      retryReads: true
    };
  }

  /**
   * Test the database connection
   */
  async testConnection() {
    let client;
    try {
      logger.debug('Testing MongoDB connection', { 
        host: this.connectionConfig.host, 
        port: this.connectionConfig.port,
        database: this.connectionConfig.database 
      });

      const connectionString = this._buildConnectionString();
      const options = this._getClientOptions();
      
      client = new MongoClient(connectionString, options);
      await client.connect();
      
      // Ping the database to verify connection
      const db = client.db();
      await db.admin().ping();

      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error) {
      logger.error('MongoDB connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          codeName: error.codeName,
        },
      };
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (err) {
          logger.error('Error closing MongoDB test connection:', err.message);
        }
      }
    }
  }

  /**
   * Create a connection to the database
   */
  async createConnection(database = null) {
    const connectionString = this._buildConnectionString(database);
    const options = this._getClientOptions();
    
    const client = new MongoClient(connectionString, options);
    await client.connect();
    
    return client;
  }

  /**
   * Execute a query on the database (MongoDB uses operations, not SQL)
   * For MongoDB, this will execute a find operation
   */
  async executeQuery(connection, query, parameters = {}) {
    // In MongoDB context, 'query' would be collection name and operation
    // Parameters would include the actual query filter
    const { collection, operation = 'find', filter = {}, options = {} } = parameters;
    
    if (!collection) {
      throw new Error('Collection name is required for MongoDB operations');
    }

    const db = connection.db();
    const coll = db.collection(collection);

    switch (operation) {
      case 'find':
        return await coll.find(filter, options).toArray();
      case 'findOne':
        return await coll.findOne(filter, options);
      case 'aggregate':
        return await coll.aggregate(filter).toArray();
      case 'count':
        return await coll.countDocuments(filter);
      default:
        throw new Error(`Unsupported MongoDB operation: ${operation}`);
    }
  }

  /**
   * Execute a stored procedure (MongoDB uses aggregation pipelines)
   */
  async executeStoredProcedure(connection, procedureName, parameters = {}, options = {}) {
    // MongoDB doesn't have stored procedures in the traditional sense
    // We can use aggregation pipelines or run commands
    const db = connection.db();
    
    // If procedureName is actually a command
    if (procedureName.startsWith('$')) {
      const command = { [procedureName.substring(1)]: 1, ...parameters };
      return await db.command(command);
    }
    
    // Otherwise, treat it as a collection operation
    const { collection, pipeline } = parameters;
    if (collection && pipeline) {
      const coll = db.collection(collection);
      return await coll.aggregate(pipeline).toArray();
    }
    
    throw new Error('MongoDB does not support traditional stored procedures. Use aggregation pipelines or commands instead.');
  }

  /**
   * Get list of databases
   */
  async getDatabaseList(connection) {
    const admin = connection.db().admin();
    const result = await admin.listDatabases();
    
    return result.databases
      .map(db => db.name)
      .filter(name => !['admin', 'config', 'local'].includes(name));
  }

  /**
   * Get database objects (collections in MongoDB)
   */
  async getDatabaseObjects(connection, databaseName) {
    const db = databaseName ? connection.db(databaseName) : connection.db();
    
    // Get collections
    const collections = await db.listCollections().toArray();
    
    const results = collections.map(coll => ({
      name: coll.name,
      type_desc: coll.type === 'view' ? 'VIEW' : 'COLLECTION',
      type: coll.type === 'view' ? 'V' : 'C',
      schema_name: databaseName || db.databaseName,
      object_category: coll.type === 'view' ? 'VIEW' : 'COLLECTION'
    }));
    
    // Get indexes as a type of database object
    for (const coll of collections) {
      if (coll.type !== 'view') {
        try {
          const indexes = await db.collection(coll.name).indexes();
          indexes.forEach(index => {
            if (index.name !== '_id_') { // Skip default _id index
              results.push({
                name: `${coll.name}.${index.name}`,
                type_desc: 'INDEX',
                type: 'I',
                schema_name: databaseName || db.databaseName,
                object_category: 'INDEX'
              });
            }
          });
        } catch (error) {
          logger.warn(`Could not fetch indexes for collection ${coll.name}:`, error.message);
        }
      }
    }
    
    return results;
  }

  /**
   * Get collection fields (equivalent to table columns)
   */
  async getTableColumns(connection, databaseName, collectionName) {
    const db = databaseName ? connection.db(databaseName) : connection.db();
    const collection = db.collection(collectionName);
    
    // Sample documents to infer schema
    const sampleSize = 100;
    const samples = await collection.find({}).limit(sampleSize).toArray();
    
    if (samples.length === 0) {
      return [];
    }
    
    // Analyze the samples to determine field types
    const fieldMap = new Map();
    
    samples.forEach(doc => {
      this._analyzeDocument(doc, '', fieldMap);
    });
    
    // Convert to column-like format
    const columns = [];
    fieldMap.forEach((typeInfo, fieldPath) => {
      columns.push({
        name: fieldPath,
        dataType: typeInfo.type,
        isNullable: typeInfo.nullable ? 'YES' : 'NO',
        maxLength: typeInfo.maxLength || null,
        precision: null,
        scale: null,
        defaultValue: null
      });
    });
    
    return columns;
  }

  /**
   * Analyze document structure recursively
   * @private
   */
  _analyzeDocument(obj, prefix, fieldMap, depth = 0) {
    if (depth > 5) return; // Limit recursion depth
    
    Object.entries(obj).forEach(([key, value]) => {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      let type = 'unknown';
      let nullable = false;
      let maxLength = null;
      
      if (value === null || value === undefined) {
        type = 'null';
        nullable = true;
      } else if (typeof value === 'string') {
        type = 'string';
        maxLength = Math.max(value.length, fieldMap.get(fieldPath)?.maxLength || 0);
      } else if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'int' : 'double';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (value instanceof Date) {
        type = 'date';
      } else if (Array.isArray(value)) {
        type = 'array';
        // Analyze array elements
        if (value.length > 0 && typeof value[0] === 'object') {
          this._analyzeDocument(value[0], `${fieldPath}[]`, fieldMap, depth + 1);
        }
      } else if (typeof value === 'object') {
        type = 'object';
        // Recursively analyze nested objects
        this._analyzeDocument(value, fieldPath, fieldMap, depth + 1);
      }
      
      // Update or create field info
      const existing = fieldMap.get(fieldPath);
      if (existing) {
        // Merge type information
        if (existing.type !== type && type !== 'null') {
          existing.type = 'mixed';
        }
        if (type === 'null' || nullable) {
          existing.nullable = true;
        }
        if (maxLength !== null) {
          existing.maxLength = Math.max(existing.maxLength || 0, maxLength);
        }
      } else {
        fieldMap.set(fieldPath, { type, nullable, maxLength });
      }
    });
  }

  /**
   * Get views for a database (MongoDB views)
   */
  async getViews(connection, databaseName) {
    const db = databaseName ? connection.db(databaseName) : connection.db();
    const collections = await db.listCollections({ type: 'view' }).toArray();
    return collections.map(coll => coll.name);
  }

  /**
   * Get stored procedures (not applicable for MongoDB, return empty)
   */
  async getProcedures(connection, databaseName) {
    // MongoDB doesn't have stored procedures
    return [];
  }

  /**
   * Get collections for a database (equivalent to tables)
   */
  async getTables(connection, databaseName) {
    const db = databaseName ? connection.db(databaseName) : connection.db();
    const collections = await db.listCollections({ type: 'collection' }).toArray();
    return collections.map(coll => coll.name);
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
   * Get the default port for MongoDB
   */
  static getDefaultPort() {
    return 27017;
  }

  /**
   * Get connection validation rules for MongoDB
   */
  static getConnectionValidation() {
    return {
      host: { required: true, type: 'string' },
      port: { required: true, type: 'number', min: 1, max: 65535, default: 27017 },
      username: { required: false, type: 'string' },
      password: { required: false, type: 'string' },
      database: { required: false, type: 'string', default: 'admin' },
      sslEnabled: { required: false, type: 'boolean', default: false }
    };
  }

  /**
   * Get the database type identifier
   */
  static getDatabaseType() {
    return 'MONGODB';
  }
}

module.exports = MongoDBDriver;