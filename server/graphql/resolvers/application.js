const Application = require('../../models/Application');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const crypto = require('crypto');

const applicationResolvers = {
  Query: {
    application: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing application management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access application management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await dataloaders.applicationLoader.load(id);
    },

    applications: async (
      _,
      { filters = {}, pagination = {} },
      { user: currentUser, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing applications list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access application management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'ASC' } = pagination;

      let query = {};
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
      if (filters.name) query.name = { $regex: filters.name, $options: 'i' };
      if (filters.createdBy) query.createdBy = filters.createdBy;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const sort = { [sortBy]: sortOrder === 'ASC' ? 1 : -1 };

      const totalCount = await Application.countDocuments(query);
      const applications = await Application.find(query)
        .populate('createdBy')
        .populate('defaultRole')
        .sort(sort)
        .limit(limit)
        .skip(offset);

      return {
        edges: applications.map((application, index) => ({
          node: application,
          cursor: Buffer.from((offset + index).toString()).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          totalCount,
          startCursor:
            applications.length > 0 ? Buffer.from(offset.toString()).toString('base64') : null,
          endCursor:
            applications.length > 0
              ? Buffer.from((offset + applications.length - 1).toString()).toString('base64')
              : null,
        },
      };
    },
  },

  Mutation: {
    createApplication: async (_, { input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        const { name, description, defaultRoleId, isActive } = input;

        if (!name || !defaultRoleId) {
          throw new UserInputError('Missing required fields: name, defaultRoleId');
        }

        // Generate API key
        const apiKey = crypto.randomBytes(32).toString('hex');

        const application = new Application({
          name,
          description,
          defaultRole: defaultRoleId,
          apiKey,
          isActive,
          createdBy: currentUser.userId,
        });

        await application.save();

        return await Application.findById(application._id)
          .populate('createdBy')
          .populate('defaultRole');
      } catch (error) {
        if (error.code === 11000) {
          throw new UserInputError('Application name already exists');
        }
        throw error;
      }
    },

    updateApplication: async (_, { id, input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      const application = await Application.findById(id);
      if (!application) throw new UserInputError('Application not found');

      const { defaultRoleId, ...updateData } = input;

      if (defaultRoleId) {
        updateData.defaultRole = defaultRoleId;
      }

      Object.assign(application, updateData);
      await application.save();

      return await Application.findById(id).populate('createdBy').populate('defaultRole');
    },

    deleteApplication: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      const deletedApplication = await Application.findByIdAndDelete(id);
      return !!deletedApplication;
    },

    regenerateApiKey: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      const application = await Application.findById(id);
      if (!application) throw new UserInputError('Application not found');

      // Generate new API key
      const newApiKey = crypto.randomBytes(32).toString('hex');
      application.apiKey = newApiKey;
      await application.save();

      return await Application.findById(id).populate('createdBy').populate('defaultRole');
    },
  },

  Application: {
    createdBy: async (application, _, { dataloaders }) => {
      if (!application.createdBy) return null;
      return await dataloaders.userLoader.load(application.createdBy);
    },

    defaultRole: async (application, _, { dataloaders }) => {
      if (!application.defaultRole) return null;
      return await dataloaders.roleLoader.load(application.defaultRole);
    },
  },
};

module.exports = applicationResolvers;
