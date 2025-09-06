const Service = require('../../models/Service');
const Connection = require('../../models/Connection');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const databaseService = require('../../services/databaseService');
const { encryptDatabasePassword } = require('../../utils/encryption');

const serviceResolvers = {
  Query: {
    service: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing individual services
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError(
          'Client API keys cannot access service management. Use availableServices query instead.'
        );
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await dataloaders.serviceLoader.load(id);
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

      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'ASC' } = pagination;

      let query = {};
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
      if (filters.database) query.database = { $regex: filters.database, $options: 'i' };
      if (filters.host) query.host = { $regex: filters.host, $options: 'i' };
      if (filters.createdBy) query.createdBy = filters.createdBy;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { database: { $regex: filters.search, $options: 'i' } },
          { host: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const sort = { [sortBy]: sortOrder === 'ASC' ? 1 : -1 };

      const totalCount = await Service.countDocuments(query);
      const services = await Service.find(query)
        .populate('createdBy')
        .populate('connectionId')
        .sort(sort)
        .limit(limit)
        .skip(offset);

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

        let serviceData = {
          name,
          database,
          createdBy: currentUser.userId,
          ...otherData,
        };

        // If connectionId is provided, use connection details
        if (connectionId) {
          const connection = await Connection.findById(connectionId).select('+password');
          if (!connection) {
            throw new UserInputError('Associated connection not found');
          }

          serviceData = {
            ...serviceData,
            connectionId,
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password, // Already encrypted
            failoverHost: connection.failoverHost,
          };
        } else if (password) {
          // Encrypt password if provided directly
          serviceData.password = encryptDatabasePassword(password);
        }

        const service = new Service(serviceData);
        await service.save();

        return await Service.findById(service._id).populate('createdBy').populate('connectionId');
      } catch (error) {
        if (error.code === 11000) {
          throw new UserInputError('Service name already exists');
        }
        throw error;
      }
    },

    updateService: async (_, { id, input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      const service = await Service.findById(id);
      if (!service) throw new UserInputError('Service not found');

      const { password, ...updateData } = input;

      // Handle password update if provided
      if (password && !password.includes(':')) {
        updateData.password = encryptDatabasePassword(password);
      } else if (password) {
        updateData.password = password; // Already encrypted
      }

      Object.assign(service, updateData);
      await service.save();

      return await Service.findById(id).populate('createdBy').populate('connectionId');
    },

    deleteService: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      const deletedService = await Service.findByIdAndDelete(id);
      return !!deletedService;
    },

    testService: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        const service = await Service.findById(id).select('+password');
        if (!service) throw new UserInputError('Service not found');

        const result = await databaseService.testConnection(service);
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

  Service: {
    createdBy: async (service, _, { dataloaders }) => {
      if (!service.createdBy) return null;
      return await dataloaders.userLoader.load(service.createdBy);
    },

    connection: async (service, _, { dataloaders }) => {
      if (!service.connectionId) return null;
      return await dataloaders.connectionLoader.load(service.connectionId);
    },

    effectiveHost: async service => {
      try {
        return await service.getEffectiveHost();
      } catch (error) {
        return service.host;
      }
    },
  },
};

module.exports = serviceResolvers;
