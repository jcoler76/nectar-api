const Endpoint = require('../../models/Endpoint');
const ApiUsage = require('../../models/ApiUsage');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { createCursorConnection } = require('../utils/pagination');
const crypto = require('crypto');

const endpointResolvers = {
  // Type resolvers
  Endpoint: {
    creator: async (endpoint, _, { dataloaders }) => {
      return dataloaders.userLoader.load(endpoint.createdBy);
    },

    usageCount: async endpoint => {
      return ApiUsage.countDocuments({ endpoint: endpoint.name });
    },

    lastUsed: async endpoint => {
      const lastUsage = await ApiUsage.findOne({ endpoint: endpoint.name })
        .sort({ timestamp: -1 })
        .select('timestamp');
      return lastUsage?.timestamp || null;
    },

    isActive: () => true, // Default implementation - could be enhanced with actual status logic
  },

  // Query resolvers
  Query: {
    endpoint: async (_, { id }, { user, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing endpoint management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access endpoint management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const endpoint = await dataloaders.endpointLoader.load(id);
      if (!endpoint) return null;

      // Check ownership
      if (endpoint.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      return endpoint;
    },

    endpoints: async (
      _,
      { first = 10, after, filters = {}, orderBy = 'DESC' },
      { user, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing endpoints list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access endpoint management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const query = {};

      // Apply filters
      if (filters.name) {
        query.name = { $regex: filters.name, $options: 'i' };
      }
      if (filters.createdBy) {
        query.createdBy = filters.createdBy;
      } else if (!user.isAdmin) {
        // Non-admin users can only see their own endpoints
        query.createdBy = user.userId;
      }
      if (filters.isActive !== undefined) {
        // This would require additional logic to determine active status
        // For now, we'll skip this filter
      }
      if (filters.createdAfter) {
        query.createdAt = { ...query.createdAt, $gte: new Date(filters.createdAfter) };
      }
      if (filters.createdBefore) {
        query.createdAt = { ...query.createdAt, $lte: new Date(filters.createdBefore) };
      }

      return createCursorConnection(Endpoint, { first, after }, query, {
        createdAt: orderBy === 'DESC' ? -1 : 1,
      });
    },

    myEndpoints: async (_, { first = 10, after }, { user, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing endpoints
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access endpoint management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      return createCursorConnection(
        Endpoint,
        { first, after },
        { createdBy: user.userId },
        { createdAt: -1 }
      );
    },

    endpointUsage: async (_, { id }, { user, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing endpoint usage
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access endpoint management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const endpoint = await dataloaders.endpointLoader.load(id);
      if (!endpoint) {
        throw new UserInputError('Endpoint not found');
      }

      // Check ownership
      if (endpoint.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      return dataloaders.endpointUsageStatsLoader.load(endpoint.name);
    },

    verifyApiKey: async (_, { apiKey }, { dataloaders }) => {
      // This is typically used for public verification, so no auth required
      return dataloaders.endpointByApiKeyLoader.load(apiKey);
    },
  },

  // Mutation resolvers
  Mutation: {
    createEndpoint: async (_, { input }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      // Check if endpoint name is unique
      const existingEndpoint = await Endpoint.findOne({ name: input.name });
      if (existingEndpoint) {
        throw new UserInputError('Endpoint name must be unique');
      }

      const endpoint = new Endpoint({
        ...input,
        createdBy: user.userId,
      });

      await endpoint.save();
      return endpoint;
    },

    updateEndpoint: async (_, { id, input }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const endpoint = await Endpoint.findById(id);
      if (!endpoint) {
        throw new UserInputError('Endpoint not found');
      }

      // Check ownership
      if (endpoint.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      // If name is being changed, check uniqueness
      if (input.name && input.name !== endpoint.name) {
        const existingEndpoint = await Endpoint.findOne({ name: input.name });
        if (existingEndpoint) {
          throw new UserInputError('Endpoint name must be unique');
        }
      }

      Object.assign(endpoint, input);
      await endpoint.save();

      return endpoint;
    },

    deleteEndpoint: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const endpoint = await Endpoint.findById(id);
      if (!endpoint) {
        throw new UserInputError('Endpoint not found');
      }

      // Check ownership
      if (endpoint.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      await Endpoint.findByIdAndDelete(id);
      return true;
    },

    regenerateEndpointApiKey: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const endpoint = await Endpoint.findById(id);
      if (!endpoint) {
        throw new UserInputError('Endpoint not found');
      }

      // Check ownership
      if (endpoint.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      // Generate new API key
      const newApiKey = crypto.randomBytes(24).toString('base64url');

      // Ensure the new key is unique
      const existingEndpoint = await Endpoint.findOne({ apiKey: newApiKey });
      if (existingEndpoint) {
        // Very unlikely, but regenerate if there's a collision
        const newApiKey2 = crypto.randomBytes(24).toString('base64url');
        endpoint.apiKey = newApiKey2;
      } else {
        endpoint.apiKey = newApiKey;
      }

      await endpoint.save();

      return {
        success: true,
        newApiKey: endpoint.apiKey,
        message: 'API key regenerated successfully',
      };
    },

    activateEndpoint: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const endpoint = await Endpoint.findById(id);
      if (!endpoint) {
        throw new UserInputError('Endpoint not found');
      }

      // Check ownership
      if (endpoint.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      // For now, this is just a conceptual operation
      // In a real implementation, you might have an isActive field
      return endpoint;
    },

    deactivateEndpoint: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const endpoint = await Endpoint.findById(id);
      if (!endpoint) {
        throw new UserInputError('Endpoint not found');
      }

      // Check ownership
      if (endpoint.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      // For now, this is just a conceptual operation
      // In a real implementation, you might have an isActive field
      return endpoint;
    },
  },
};

module.exports = endpointResolvers;
