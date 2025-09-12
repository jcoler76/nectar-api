const { PrismaClient } = require('../../prisma/generated/client');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const databaseService = require('../../services/databaseService');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../../utils/encryption');
const { logger } = require('../../utils/logger');

const prisma = new PrismaClient();

const serviceResolvers = {
  Query: {
    service: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing individual services
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError(
          'Client API keys cannot access service management. Use availableServices query instead.'
        );
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const service = await prisma.service.findFirst({
        where: {
          id,
          organizationId: currentUser.organizationId,
        },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          connection: true,
          roles: {
            where: { isActive: true },
          },
        },
      });

      if (!service) {
        throw new UserInputError('Service not found');
      }

      return service;
    },

    services: async (
      _,
      { filters = {}, pagination = {} },
      { user: currentUser, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing services list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError(
          'Client API keys cannot access service management. Use availableServices query instead.'
        );
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

      // Build where clause for filters
      const where = {
        organizationId: currentUser.organizationId,
      };

      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.database) {
        where.database = { contains: filters.database, mode: 'insensitive' };
      }
      if (filters.host) {
        where.host = { contains: filters.host, mode: 'insensitive' };
      }
      if (filters.createdBy) where.createdBy = filters.createdBy;

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { database: { contains: filters.search, mode: 'insensitive' } },
          { host: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination
      const totalCount = await prisma.service.count({ where });

      // Get services with pagination
      const services = await prisma.service.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          connection: true,
          roles: {
            where: { isActive: true },
            select: { id: true, name: true },
          },
          _count: {
            select: { roles: true },
          },
        },
      });

      return {
        edges: services.map((service, index) => ({
          node: service,
          cursor: Buffer.from((offset + index).toString()).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          totalCount,
          startCursor:
            services.length > 0 ? Buffer.from(offset.toString()).toString('base64') : null,
          endCursor:
            services.length > 0
              ? Buffer.from((offset + services.length - 1).toString()).toString('base64')
              : null,
        },
      };
    },
  },

  Mutation: {
    createService: async (_, { input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        const { name, connectionId, database, password, ...otherData } = input;

        if (!name || !database) {
          throw new UserInputError('Missing required fields: name, database');
        }

        const serviceData = {
          name,
          database,
          organizationId: currentUser.organizationId,
          createdBy: currentUser.userId,
          ...otherData,
        };

        // If connectionId is provided, verify it exists and belongs to organization
        if (connectionId) {
          const connection = await prisma.databaseConnection.findFirst({
            where: {
              id: connectionId,
              organizationId: currentUser.organizationId,
            },
          });

          if (!connection) {
            throw new UserInputError('Associated connection not found');
          }

          serviceData.connectionId = connectionId;
          // Inherit connection details
          serviceData.host = connection.host;
          serviceData.port = connection.port;
          serviceData.username = connection.username;
          serviceData.passwordEncrypted = connection.passwordEncrypted;
          serviceData.failoverHost = connection.failoverHost || null;
        } else if (password) {
          // Encrypt password if provided directly
          serviceData.passwordEncrypted = encryptDatabasePassword(password);
        }

        const service = await prisma.service.create({
          data: serviceData,
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            connection: true,
            organization: true,
          },
        });

        logger.info('Service created via GraphQL', {
          serviceId: service.id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return service;
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Service name already exists in your organization');
        }
        logger.error('GraphQL service creation error', { error: error.message, input });
        throw new Error('Failed to create service');
      }
    },

    updateService: async (_, { id, input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify service exists and user has access
        const existingService = await prisma.service.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId,
          },
        });

        if (!existingService) {
          throw new UserInputError('Service not found');
        }

        const { password, ...updateData } = input;

        // Handle password update if provided
        if (password) {
          updateData.passwordEncrypted = encryptDatabasePassword(password);
        }

        const service = await prisma.service.update({
          where: { id },
          data: updateData,
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            connection: true,
            organization: true,
          },
        });

        logger.info('Service updated via GraphQL', {
          serviceId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return service;
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Service name already exists in your organization');
        }
        logger.error('GraphQL service update error', { error: error.message, serviceId: id });
        throw new Error('Failed to update service');
      }
    },

    deleteService: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify service exists and user has access
        const existingService = await prisma.service.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId,
          },
        });

        if (!existingService) {
          throw new UserInputError('Service not found');
        }

        await prisma.service.delete({
          where: { id },
        });

        logger.info('Service deleted via GraphQL', {
          serviceId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return true;
      } catch (error) {
        if (error.code === 'P2003') {
          throw new UserInputError(
            'Cannot delete service: it has dependent records (roles, endpoints, etc.)'
          );
        }
        logger.error('GraphQL service deletion error', { error: error.message, serviceId: id });
        return false;
      }
    },

    testService: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        const service = await prisma.service.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId,
          },
          include: {
            connection: true,
          },
        });

        if (!service) throw new UserInputError('Service not found');

        // Build connection config for testing
        let connectionConfig = {
          host: service.host,
          port: service.port,
          database: service.database,
          username: service.username,
        };

        // Decrypt password if exists
        if (service.passwordEncrypted) {
          try {
            connectionConfig.password = decryptDatabasePassword(service.passwordEncrypted);
          } catch (decryptError) {
            return {
              success: false,
              error: 'Failed to decrypt service password',
            };
          }
        }

        // If service uses a connection, override with connection details
        if (service.connection) {
          connectionConfig = {
            ...connectionConfig,
            host: service.connection.host,
            port: service.connection.port,
            username: service.connection.username,
          };

          if (service.connection.passwordEncrypted) {
            try {
              connectionConfig.password = decryptDatabasePassword(
                service.connection.passwordEncrypted
              );
            } catch (decryptError) {
              return {
                success: false,
                error: 'Failed to decrypt connection password',
              };
            }
          }
        }

        const result = await databaseService.testConnection(connectionConfig);

        logger.info('Service connection tested via GraphQL', {
          serviceId: id,
          userId: currentUser.userId,
          success: result.success,
        });

        return {
          success: result.success || false,
          message: result.message,
          error: result.error,
        };
      } catch (error) {
        logger.error('GraphQL service test error', { error: error.message, serviceId: id });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  },

  Service: {
    // Resolver for connectionId field - ensures connectionId is returned
    connectionId: async service => {
      return service.connectionId;
    },

    // Resolver for createdBy field - ensures user info is populated
    createdBy: async service => {
      if (service.creator) return service.creator;

      if (!service.createdBy) return null;

      return await prisma.user.findUnique({
        where: { id: service.createdBy },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    },

    // Resolver for connection field - ensures connection info is populated
    connection: async service => {
      if (service.connection) return service.connection;

      if (!service.connectionId) return null;

      return await prisma.databaseConnection.findUnique({
        where: { id: service.connectionId },
        select: {
          id: true,
          name: true,
          type: true,
          host: true,
          port: true,
          username: true,
          passwordEncrypted: true,
          sslEnabled: true,
          databases: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    },

    // Resolver for effectiveHost field - returns the actual host being used
    effectiveHost: async service => {
      // If service uses a connection, return connection's host
      if (service.connectionId) {
        const connection =
          service.connection ||
          (await prisma.databaseConnection.findUnique({
            where: { id: service.connectionId },
          }));
        return connection?.host || service.host;
      }

      // Otherwise return service's own host
      return service.host;
    },
  },
};

module.exports = serviceResolvers;
