const { PrismaClient } = require('../../prisma/generated/client');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../../utils/encryption');
const { logger } = require('../../utils/logger');
const DatabaseService = require('../../services/database/DatabaseService');
const sql = require('mssql');

const prisma = new PrismaClient();

// Helper function to get database list using the new DatabaseService
const getDatabaseList = async connection => {
  try {
    return await DatabaseService.getDatabaseList(connection);
  } catch (error) {
    logger.error('Error getting database list:', error);
    return [];
  }
};

const connectionResolvers = {
  Query: {
    connection: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing connection management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access connection management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const connection = await prisma.databaseConnection.findFirst({
        where: {
          id,
          organizationId: currentUser.organizationId
        },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true }
          },
          organization: true,
          services: {
            select: { id: true, name: true, database: true }
          }
        }
      });

      if (!connection) {
        throw new UserInputError('Connection not found');
      }

      return connection;
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

      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'asc' } = pagination;

      // Build where clause for filters
      const where = {
        organizationId: currentUser.organizationId
      };

      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.type) where.type = filters.type;
      if (filters.host) {
        where.host = { contains: filters.host, mode: 'insensitive' };
      }
      if (filters.createdBy) where.createdBy = filters.createdBy;
      
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { host: { contains: filters.search, mode: 'insensitive' } },
          { username: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      // Get total count for pagination
      const totalCount = await prisma.databaseConnection.count({ where });

      // Get connections with pagination
      const connections = await prisma.databaseConnection.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true }
          },
          services: {
            select: { id: true, name: true, database: true }
          },
          _count: {
            select: { services: true }
          }
        }
      });

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

    supportedDatabaseTypes: async () => {
      try {
        return DatabaseService.getSupportedDatabaseTypes();
      } catch (error) {
        logger.error('Error fetching supported database types:', error);
        return [];
      }
    },
  },

  Mutation: {
    createConnection: async (_, { input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        const { name, type, host, port, username, password, database, sslEnabled, ...otherData } = input;

        if (!name || !type || !host || !port || !username || !password) {
          throw new UserInputError('Missing required fields: name, type, host, port, username, password');
        }

        // Test connection first
        const connectionConfig = {
          type,
          host,
          port,
          username,
          password,
          database,
          sslEnabled
        };

        const testResult = await DatabaseService.testConnection(connectionConfig);

        if (!testResult.success) {
          throw new UserInputError(`Connection test failed: ${testResult.error}`);
        }

        // Encrypt password and create connection
        const passwordEncrypted = encryptDatabasePassword(password);
        
        const connection = await prisma.databaseConnection.create({
          data: {
            name,
            type,
            host,
            port,
            username,
            database,
            passwordEncrypted,
            sslEnabled: sslEnabled || false,
            organizationId: currentUser.organizationId,
            createdBy: currentUser.userId,
            ...otherData,
          },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            organization: true
          }
        });

        // Try to fetch and save the database list
        try {
          const dbs = await getDatabaseList(connection);
          await prisma.databaseConnection.update({
            where: { id: connection.id },
            data: { databases: dbs }
          });
        } catch (dbError) {
          logger.error(
            `Could not automatically fetch database list for new connection ${connection.id}: ${dbError.message}`
          );
        }

        logger.info('Database connection created via GraphQL', {
          connectionId: connection.id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId
        });

        return connection;
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Connection name already exists in your organization');
        }
        logger.error('GraphQL connection creation error', { error: error.message, input });
        throw new Error('Failed to create connection');
      }
    },

    updateConnection: async (_, { id, input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify connection exists and user has access
        const existingConnection = await prisma.databaseConnection.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId
          }
        });

        if (!existingConnection) {
          throw new UserInputError('Connection not found');
        }

        const { password, ...updateData } = input;

        // If password or connection details are being updated, test the connection first
        if (password || updateData.host || updateData.port || updateData.username || updateData.type) {
          const connectionConfig = {
            type: updateData.type || existingConnection.type,
            host: updateData.host || existingConnection.host,
            port: updateData.port || existingConnection.port,
            username: updateData.username || existingConnection.username,
            database: updateData.database || existingConnection.database,
            sslEnabled: updateData.sslEnabled !== undefined ? updateData.sslEnabled : existingConnection.sslEnabled,
            password: password || existingConnection.passwordEncrypted
          };

          const testResult = await DatabaseService.testConnection(connectionConfig);

          if (!testResult.success) {
            throw new UserInputError(`Connection test failed: ${testResult.error}`);
          }

          // Encrypt the new password
          updateData.passwordEncrypted = encryptDatabasePassword(password);
        }

        const connection = await prisma.databaseConnection.update({
          where: { id },
          data: updateData,
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            organization: true
          }
        });

        logger.info('Database connection updated via GraphQL', {
          connectionId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId
        });

        return connection;
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Connection name already exists in your organization');
        }
        logger.error('GraphQL connection update error', { error: error.message, connectionId: id });
        throw new Error('Failed to update connection');
      }
    },

    deleteConnection: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify connection exists and user has access
        const existingConnection = await prisma.databaseConnection.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId
          }
        });

        if (!existingConnection) {
          throw new UserInputError('Connection not found');
        }

        // Check if any services depend on this connection
        const dependentServices = await prisma.service.findMany({
          where: { connectionId: id },
          select: { id: true, name: true }
        });
        
        if (dependentServices.length > 0) {
          throw new UserInputError(
            `Cannot delete connection. ${dependentServices.length} service(s) depend on it: ${dependentServices.map(s => s.name).join(', ')}`
          );
        }

        await prisma.databaseConnection.delete({ where: { id } });

        logger.info('Database connection deleted via GraphQL', {
          connectionId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId
        });

        return true;
      } catch (error) {
        if (error.code === 'P2003') {
          throw new UserInputError('Cannot delete connection: it has dependent records');
        }
        logger.error('GraphQL connection deletion error', { error: error.message, connectionId: id });
        return false;
      }
    },

    testConnection: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify connection exists and user has access
        const connection = await prisma.databaseConnection.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId
          }
        });

        if (!connection) {
          throw new UserInputError('Connection not found');
        }

        // Build connection config for testing
        const connectionConfig = {
          type: connection.type,
          host: connection.host,
          port: connection.port,
          username: connection.username,
          database: connection.database,
          sslEnabled: connection.sslEnabled,
          password: connection.passwordEncrypted
        };

        const result = await DatabaseService.testStoredConnection(connection);
        
        logger.info('Database connection tested via GraphQL', {
          connectionId: id,
          userId: currentUser.userId,
          success: result.success
        });

        return {
          success: result.success || false,
          message: result.message,
          error: result.error,
        };
      } catch (error) {
        logger.error('GraphQL connection test error', { error: error.message, connectionId: id });
        return {
          success: false,
          error: error.message,
        };
      }
    },

    testConnectionTemp: async (_, { input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        const result = await DatabaseService.testConnection(input);
        
        logger.info('Temporary database connection tested via GraphQL', {
          userId: currentUser.userId,
          success: result.success,
          type: input.type
        });

        // If connection successful and it supports database listing, get databases
        let databases = [];
        if (result.success) {
          try {
            const connectionForDatabases = {
              ...input,
              passwordEncrypted: input.password  // For getDatabaseList compatibility
            };
            databases = await getDatabaseList(connectionForDatabases);
          } catch (dbError) {
            logger.warn('Could not fetch database list during temp connection test:', dbError.message);
          }
        }

        return {
          success: result.success || false,
          message: result.message,
          error: result.error,
          databases
        };
      } catch (error) {
        logger.error('GraphQL temporary connection test error', { error: error.message, input });
        return {
          success: false,
          error: error.message,
        };
      }
    },

    refreshConnectionDatabases: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify connection exists and user has access
        const connection = await prisma.databaseConnection.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId
          }
        });

        if (!connection) {
          throw new UserInputError('Connection not found');
        }

        // Fetch database list
        const databases = await getDatabaseList(connection);
        
        // Update the connection with the new database list
        const updatedConnection = await prisma.databaseConnection.update({
          where: { id },
          data: { databases },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            organization: true,
            services: {
              select: { id: true, name: true, database: true }
            }
          }
        });

        logger.info('Database list refreshed via GraphQL', {
          connectionId: id,
          userId: currentUser.userId,
          databaseCount: databases.length
        });

        return updatedConnection;
      } catch (error) {
        logger.error('GraphQL refresh databases error', { error: error.message, connectionId: id });
        throw new Error('Failed to refresh database list');
      }
    },

    getTableColumns: async (_, { connectionId, database, table }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify connection exists and user has access
        const connection = await prisma.databaseConnection.findFirst({
          where: {
            id: connectionId,
            organizationId: currentUser.organizationId
          }
        });

        if (!connection) {
          throw new UserInputError('Connection not found');
        }

        const connectionConfig = {
          type: connection.type,
          host: connection.host,
          port: connection.port,
          username: connection.username,
          password: connection.passwordEncrypted,
          database: connection.database,
          sslEnabled: connection.sslEnabled
        };

        const columns = await DatabaseService.getTableColumns(connectionConfig, database, table);
        
        logger.info('Table columns retrieved via GraphQL', {
          connectionId,
          database,
          table,
          userId: currentUser.userId,
          columnCount: columns.length
        });

        return {
          success: true,
          columns
        };
      } catch (error) {
        logger.error('GraphQL get table columns error', { 
          error: error.message, 
          connectionId, 
          database, 
          table 
        });
        
        return {
          success: false,
          error: error.message
        };
      }
    },
  },

  Connection: {
    // Resolver for createdBy field - ensures user info is populated
    createdBy: async (connection) => {
      if (connection.creator) return connection.creator;
      
      if (!connection.createdBy) return null;
      
      return await prisma.user.findUnique({
        where: { id: connection.createdBy },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
    },

    // Resolver for effectiveHost field - returns the actual host being used
    effectiveHost: async connection => {
      // For database connections, this is just the host field
      // In the future, this could include failover logic
      return connection.host;
    },

    // Resolver for services using this connection
    services: async (connection) => {
      if (connection.services) return connection.services;
      
      return await prisma.service.findMany({
        where: { connectionId: connection.id },
        select: { id: true, name: true, database: true }
      });
    },
  },
};

module.exports = connectionResolvers;
