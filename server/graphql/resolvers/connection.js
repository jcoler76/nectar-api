const Connection = require('../../models/Connection');
const Service = require('../../models/Service');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { encryptDatabasePassword } = require('../../utils/encryption');
const sql = require('mssql');

// Helper function to get database list
const getDatabaseList = async connection => {
  let pool;
  try {
    const { decryptDatabasePassword } = require('../../utils/encryption');
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

const connectionResolvers = {
  Query: {
    connection: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing connection management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access connection management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await dataloaders.connectionLoader.load(id);
    },

    connections: async (
      _,
      { filters = {}, pagination = {} },
      { user: currentUser, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing connections list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access connection management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'ASC' } = pagination;

      let query = {};
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
      if (filters.host) query.host = { $regex: filters.host, $options: 'i' };
      if (filters.createdBy) query.createdBy = filters.createdBy;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { host: { $regex: filters.search, $options: 'i' } },
          { username: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const sort = { [sortBy]: sortOrder === 'ASC' ? 1 : -1 };

      const totalCount = await Connection.countDocuments(query);
      const connections = await Connection.find(query)
        .populate('createdBy')
        .sort(sort)
        .limit(limit)
        .skip(offset);

      return {
        edges: connections.map((connection, index) => ({
          node: connection,
          cursor: Buffer.from((offset + index).toString()).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          totalCount,
          startCursor:
            connections.length > 0 ? Buffer.from(offset.toString()).toString('base64') : null,
          endCursor:
            connections.length > 0
              ? Buffer.from((offset + connections.length - 1).toString()).toString('base64')
              : null,
        },
      };
    },
  },

  Mutation: {
    createConnection: async (_, { input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        const { name, host, port, username, password, ...otherData } = input;

        if (!name || !host || !port || !username || !password) {
          throw new UserInputError('Missing required fields: name, host, port, username, password');
        }

        // Test connection first with unencrypted password
        const connection = new Connection({
          name,
          host,
          port,
          username,
          password,
          createdBy: currentUser.userId,
          ...otherData,
        });

        const testResult = await connection.testConnection();

        if (!testResult.success) {
          throw new UserInputError(`Connection test failed: ${testResult.error}`);
        }

        // Save connection (password will be encrypted by pre-save middleware)
        await connection.save();

        // Try to fetch and save the database list
        try {
          const dbs = await getDatabaseList(connection);
          connection.databases = dbs;
          await connection.save();
        } catch (dbError) {
          // Don't fail the whole request, just log the error
          console.error(
            `Could not automatically fetch database list for new connection ${connection._id}: ${dbError.message}`
          );
        }

        return await Connection.findById(connection._id).populate('createdBy');
      } catch (error) {
        if (error.code === 11000) {
          throw new UserInputError('Connection name already exists');
        }
        throw error;
      }
    },

    updateConnection: async (_, { id, input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      const connection = await Connection.findById(id);
      if (!connection) throw new UserInputError('Connection not found');

      const { password, ...updateData } = input;

      // If password is being updated, test the connection first
      if (password) {
        const testConnection = new Connection({
          ...connection.toObject(),
          ...updateData,
          password,
        });

        const testResult = await testConnection.testConnection();

        if (!testResult.success) {
          throw new UserInputError(`Connection test failed: ${testResult.error}`);
        }

        // Handle password encryption if it's not already encrypted
        if (!password.includes(':')) {
          updateData.password = encryptDatabasePassword(password);
        } else {
          updateData.password = password;
        }
      }

      Object.assign(connection, updateData);
      await connection.save();

      return await Connection.findById(id).populate('createdBy');
    },

    deleteConnection: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      // Check if any services depend on this connection
      const dependentServices = await Service.find({ connectionId: id });
      if (dependentServices.length > 0) {
        throw new UserInputError(
          `Cannot delete connection. ${dependentServices.length} service(s) depend on it: ${dependentServices.map(s => s.name).join(', ')}`
        );
      }

      const deletedConnection = await Connection.findByIdAndDelete(id);
      return !!deletedConnection;
    },

    testConnection: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        const connection = await Connection.findById(id);
        if (!connection) throw new UserInputError('Connection not found');

        const result = await connection.testConnection();
        return {
          success: result.success || false,
          message: result.message,
          error: result.error,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  },

  Connection: {
    createdBy: async (connection, _, { dataloaders }) => {
      if (!connection.createdBy) return null;
      return await dataloaders.userLoader.load(connection.createdBy);
    },

    effectiveHost: async connection => {
      try {
        return await connection.getEffectiveHost();
      } catch (error) {
        return connection.host;
      }
    },
  },
};

module.exports = connectionResolvers;
