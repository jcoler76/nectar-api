const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const Service = require('../models/Service');
const sql = require('mssql');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../utils/logger');
// Auth middleware not needed - handled at app level
const { asyncHandler, errorResponses } = require('../utils/errorHandler');
const { verifyConnectionAccess } = require('../middleware/resourceAuthorization');
const { connectionsCache } = require('../utils/cache');

// Authentication is already handled at app level in server.js

// Helper function to get database list
const getDatabaseList = async connection => {
  let pool;
  try {
    const decryptedPassword = decryptDatabasePassword(connection.password);
    const config = {
      user: connection.username,
      password: decryptedPassword,
      server: connection.host,
      port: connection.port,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 15000,
      },
    };
    pool = await sql.connect(config);
    const result = await pool
      .request()
      .query('SELECT name FROM sys.databases WHERE state = 0 ORDER BY name');
    return result.recordset.map(record => record.name);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

// GET all connections (only return user's own connections)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = `connections_${userId}`;

    // Try to get from cache first
    let connections = connectionsCache.get(cacheKey);

    if (!connections) {
      // Build query
      const query = req.user.isAdmin ? {} : { createdBy: userId };

      connections = await Connection.find(query)
        .select('-password') // Exclude sensitive password field
        .lean() // Use lean() for better performance
        .sort({ name: 1 }); // Sort by name for consistent ordering

      // Cache the results
      connectionsCache.set(cacheKey, connections);
    }

    res.json(connections);
  } catch (error) {
    logger.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// GET connection by ID (with authorization)
router.get('/:id', verifyConnectionAccess(), async (req, res) => {
  try {
    // Connection is already attached to req by authorization middleware
    res.json(req.connection);
  } catch (error) {
    logger.error('Error fetching connection:', error);
    res.status(500).json({ error: 'Failed to fetch connection' });
  }
});

// GET databases for a connection (with authorization)
router.get('/:id/databases', verifyConnectionAccess(), async (req, res) => {
  try {
    // Return the stored databases array from authorized connection
    res.json(req.connection.databases || []);
  } catch (error) {
    logger.error(`Error fetching databases for connection ${req.params.id}:`, error);
    errorResponses.serverError(res, error);
  }
});

// POST refresh databases for a connection (with authorization)
router.post('/:id/databases/refresh', verifyConnectionAccess(), async (req, res) => {
  try {
    // Re-fetch with password field
    const connection = await Connection.findById(req.params.id).select('+password');
    const databaseNames = await getDatabaseList(connection);
    connection.databases = databaseNames;
    await connection.save();
    res.json(databaseNames);
  } catch (error) {
    logger.error(`Error refreshing databases for connection ${req.params.id}:`, error);
    errorResponses.serverError(res, error);
  }
});

// POST create new connection
router.post('/', async (req, res) => {
  try {
    // Connection creation request received

    // Test connection first with unencrypted password
    const connection = new Connection(req.body);
    const testResult = await connection.testConnection();

    if (!testResult.success) {
      return res.status(400).json({
        message: 'Connection test failed',
        error: testResult.error,
      });
    }

    // Save connection (password will be encrypted by pre-save middleware)
    connection.createdBy = req.user.userId;
    const savedConnection = await connection.save();

    // Now, fetch and save the database list
    let finalConnection = savedConnection;
    try {
      // Reload the connection from database to ensure we have the encrypted password
      const reloadedConnection = await Connection.findById(savedConnection._id).select('+password');
      const dbs = await getDatabaseList(reloadedConnection);
      reloadedConnection.databases = dbs;
      await reloadedConnection.save();
      // Use the reloaded connection for the response
      finalConnection = await Connection.findById(savedConnection._id);
    } catch (dbError) {
      logger.error(
        `Could not automatically fetch database list for new connection ${savedConnection._id}: ${dbError.message}`
      );
      // Don't fail the whole request, just log the error. The user can refresh manually.
    }

    // Clear connections cache since we added a new connection
    connectionsCache.clear();

    res.status(201).json(finalConnection);
  } catch (error) {
    logger.error('Error creating connection:', { error: error.message });

    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({
        message: `A connection with the name "${req.body.name}" already exists. Please use a different name.`,
      });
    }

    errorResponses.serverError(res, error);
  }
});

// PUT update connection (with authorization)
router.put('/:id', verifyConnectionAccess(), async (req, res) => {
  try {
    const connection = req.connection;

    // If password is being updated, test the connection first
    if (req.body.password) {
      const testConnection = new Connection({
        ...connection.toObject(),
        ...req.body,
      });
      const testResult = await testConnection.testConnection();

      if (!testResult.success) {
        return res.status(400).json({
          message: 'Connection test failed',
          error: testResult.error,
        });
      }
    }

    // Update connection
    Object.assign(connection, req.body);
    const updatedConnection = await connection.save();

    // Clear connections cache since we updated a connection
    connectionsCache.clear();

    res.json(updatedConnection);
  } catch (error) {
    logger.error('Error updating connection:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// DELETE connection (with authorization)
router.delete('/:id', verifyConnectionAccess(), async (req, res) => {
  try {
    // Check if any services depend on this connection
    const dependentServices = await Service.find({ connectionId: req.params.id });
    if (dependentServices.length > 0) {
      return res.status(400).json({
        message: `Cannot delete connection. ${dependentServices.length} service(s) depend on it.`,
        dependentServices: dependentServices.map(s => s.name),
      });
    }

    const connection = await Connection.findByIdAndDelete(req.params.id);
    if (!connection) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Connection not found' } });
    }

    res.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    logger.error('Error deleting connection:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// POST test connection (with authorization)
router.post('/:id/test', verifyConnectionAccess(), async (req, res) => {
  try {
    const connection = req.connection;

    const result = await connection.testConnection();
    res.json(result);
  } catch (error) {
    logger.error('Test connection error:', error);
    errorResponses.serverError(res, error);
  }
});

// POST test connection (without saving)
router.post('/test', async (req, res) => {
  try {
    const tempConnection = new Connection(req.body);
    const result = await tempConnection.testConnection();
    res.json(result);
  } catch (error) {
    logger.error('Test connection error:', error);
    errorResponses.serverError(res, error);
  }
});

// POST refresh databases for a connection (with authorization)
router.post('/:id/refresh-databases', verifyConnectionAccess(), async (req, res) => {
  try {
    // Re-fetch with password field
    const connection = await Connection.findById(req.params.id).select('+password');

    const databaseNames = await getDatabaseList(connection);
    connection.databases = databaseNames;
    await connection.save();

    res.json({
      message: 'Database list refreshed successfully.',
      databases: databaseNames,
    });
  } catch (error) {
    logger.error(`Error refreshing databases for connection ${req.params.id}:`, error);
    errorResponses.serverError(res, error);
  }
});

// POST table columns for a specific table (for database triggers)
router.post('/:id/table-columns', verifyConnectionAccess(), async (req, res) => {
  try {
    const { database, table } = req.body;
    // Connection is already verified and available from middleware
    const connection = req.connection;

    if (!database || !table) {
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: 'Database and table are required' } });
    }

    // Parse table name and schema
    const tableName = table.includes('.') ? table.split('.').pop() : table;
    const schemaName = table.includes('.') ? table.split('.')[0] : 'dbo';

    const decryptedPassword = decryptDatabasePassword(connection.password);
    const config = {
      user: connection.username,
      password: decryptedPassword,
      server: connection.host,
      port: connection.port,
      database: database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 15000,
      },
    };

    const pool = await sql.connect(config);

    try {
      // Get timestamp columns from the table - use parameterized query
      const request = pool.request();
      request.input('tableName', sql.NVarChar, tableName);
      request.input('schemaName', sql.NVarChar, schemaName);

      const result = await request.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = @tableName 
        AND TABLE_SCHEMA = @schemaName
        AND DATA_TYPE IN ('datetime', 'datetime2', 'timestamp', 'date')
        ORDER BY ORDINAL_POSITION
      `);

      const timestampColumns = result.recordset.map(r => r.COLUMN_NAME);
      res.json(timestampColumns);
    } finally {
      await pool.close();
    }
  } catch (error) {
    logger.error(`Error fetching table columns for connection ${req.params.id}:`, error);
    errorResponses.serverError(res, error);
  }
});

module.exports = router;
