const sql = require('mssql');
const { decryptDatabasePassword } = require('../utils/encryption');
const Connection = require('../models/Connection');

class DatabaseService {
  static objectsCache = new Map();

  static clearObjectsCache(serviceId) {
    if (serviceId) {
      this.objectsCache.delete(serviceId);
    } else {
      this.objectsCache.clear();
    }
  }

  static async createConnection(service) {
    // Removed staging configuration logic - will be handled by separate staging application

    const config = {
      user: service.username,
      password: decryptDatabasePassword(service.password),
      server: service.host,
      port: parseInt(service.port),
      database: service.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000,
      },
    };

    return await sql.connect(config);
  }

  static async executeStoredProcedure(service, procedureName, params = {}, options = {}) {
    let pool;
    try {
      // Handle both legacy signature (4th param as string for environment) and new signature (4th param as object/boolean)
      let isLegacyClient = false;
      if (typeof options === 'boolean') {
        // Direct boolean for isLegacyClient (from API routes)
        isLegacyClient = options;
      } else if (typeof options === 'object' && options !== null) {
        // Options object with isLegacyClient property
        isLegacyClient = options.isLegacyClient || false;
      }
      // If options is a string (environment), ignore it for legacy client detection

      pool = await this.createConnection(service);
      const request = pool.request();

      // Add parameters to the request
      Object.entries(params).forEach(([key, value]) => {
        // For legacy Dreamfactory clients, convert undefined/null to empty strings
        // This matches Dreamfactory's behavior where missing parameters are sent as ''
        if (isLegacyClient && (value === undefined || value === null)) {
          request.input(key, '');
        } else {
          request.input(key, value);
        }
      });

      const result = await request.execute(procedureName);
      return result.recordset;
    } finally {
      if (pool) {
        try {
          await pool.close();
        } catch (err) {
          console.error('Error closing SQL connection:', err);
        }
      }
    }
  }

  static async testConnection(service) {
    let pool;
    try {
      // Log connection attempt without sensitive details
      console.log('DatabaseService.testConnection called for database:', service.database);

      // Handle both encrypted and unencrypted passwords
      let password = service.password;

      // If the password contains a colon, it's likely already encrypted
      if (typeof password === 'string' && password.includes(':')) {
        try {
          password = decryptDatabasePassword(password);
        } catch (error) {
          console.error('Password decryption failed for service:', service.database);
          // If decryption fails, assume password is not encrypted
        }
      }

      const config = {
        user: service.username,
        password: password,
        server: service.host,
        port: parseInt(service.port) || 1433,
        database: service.database,
        options: {
          encrypt: true,
          trustServerCertificate: true,
          connectTimeout: 30000,
        },
      };

      pool = await sql.connect(config);
      await pool.request().query('SELECT 1');

      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error) {
      console.error(
        'Connection test failed for database:',
        service.database,
        'Error:',
        error.message
      );

      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          state: error.state,
        },
      };
    } finally {
      if (pool) {
        try {
          await pool.close();
        } catch (err) {
          console.error('Error closing SQL connection for:', service.database);
        }
      }
    }
  }

  static async getDatabaseObjects(service) {
    let pool;
    try {
      pool = await this.createConnection(service);

      // Query database objects
      const result = await pool.request().query(`
        SELECT 
          o.name,
          o.type_desc,
          o.type,
          s.name as schema_name,
          CASE 
            WHEN o.type IN ('U') THEN 'TABLE'
            WHEN o.type IN ('V') THEN 'VIEW'
            WHEN o.type IN ('P', 'PC') THEN 'PROCEDURE'
            ELSE o.type_desc
          END as object_category
        FROM sys.objects o
        JOIN sys.schemas s ON o.schema_id = s.schema_id
        WHERE o.type IN ('U', 'V', 'P', 'PC')
          AND o.is_ms_shipped = 0
        ORDER BY o.type_desc, o.name;
      `);

      return result.recordset;
    } finally {
      if (pool) {
        try {
          await pool.close();
        } catch (err) {
          console.error('Error closing SQL connection:', err);
        }
      }
    }
  }
}

// Factory function to create a database service instance for a specific connection and database
const getDatabaseService = async (connection, database) => {
  // Create a service object from connection data
  const service = {
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    database: database || connection.database,
  };

  // Return an object with methods for schema operations
  return {
    async getViews() {
      let pool;
      try {
        pool = await DatabaseService.createConnection(service);
        const result = await pool.request().query(`
          SELECT TABLE_NAME as name
          FROM INFORMATION_SCHEMA.VIEWS
          WHERE TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
          ORDER BY TABLE_NAME
        `);
        return result.recordset.map(row => row.name);
      } finally {
        if (pool) {
          try {
            await pool.close();
          } catch (err) {
            console.error('Error closing SQL connection:', err);
          }
        }
      }
    },

    async getProcedures() {
      let pool;
      try {
        pool = await DatabaseService.createConnection(service);
        const result = await pool.request().query(`
          SELECT ROUTINE_NAME as name
          FROM INFORMATION_SCHEMA.ROUTINES
          WHERE ROUTINE_TYPE = 'PROCEDURE'
            AND ROUTINE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
          ORDER BY ROUTINE_NAME
        `);
        return result.recordset.map(row => row.name);
      } finally {
        if (pool) {
          try {
            await pool.close();
          } catch (err) {
            console.error('Error closing SQL connection:', err);
          }
        }
      }
    },

    async getTables() {
      let pool;
      try {
        pool = await DatabaseService.createConnection(service);
        const result = await pool.request().query(`
          SELECT TABLE_NAME as name
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_TYPE = 'BASE TABLE'
            AND TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
          ORDER BY TABLE_NAME
        `);
        return result.recordset.map(row => row.name);
      } finally {
        if (pool) {
          try {
            await pool.close();
          } catch (err) {
            console.error('Error closing SQL connection:', err);
          }
        }
      }
    },
  };
};

module.exports = DatabaseService;
module.exports.getDatabaseService = getDatabaseService;
