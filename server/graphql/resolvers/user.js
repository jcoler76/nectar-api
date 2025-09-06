const User = require('../../models/User');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const usersController = require('../../controllers/usersController');

const userResolvers = {
  Query: {
    user: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing individual users
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access user management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      if (currentUser.userId !== id && !currentUser.isAdmin) {
        throw new ForbiddenError('Forbidden');
      }

      return await dataloaders.userLoader.load(id);
    },

    users: async (
      _,
      { filters = {}, pagination = {} },
      { user: currentUser, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing users
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access user management');
      }

      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'ASC' } = pagination;

      let query = {};
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
      if (filters.isAdmin !== undefined) query.isAdmin = filters.isAdmin;
      if (filters.roles?.length) query.roles = { $in: filters.roles };
      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const sort = { [sortBy]: sortOrder === 'ASC' ? 1 : -1 };

      const totalCount = await User.countDocuments(query);
      const users = await User.find(query).populate('roles').sort(sort).limit(limit).skip(offset);

      return {
        edges: users.map((user, index) => ({
          node: user,
          cursor: Buffer.from((offset + index).toString()).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          totalCount,
          startCursor: users.length > 0 ? Buffer.from(offset.toString()).toString('base64') : null,
          endCursor:
            users.length > 0
              ? Buffer.from((offset + users.length - 1).toString()).toString('base64')
              : null,
        },
      };
    },

    me: async (_, __, { user: currentUser, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing user info
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access user information');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');
      return await dataloaders.userLoader.load(currentUser.userId);
    },
  },

  Mutation: {
    createUser: async (_, { input }, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      try {
        const user = new User(input);
        await user.save();
        return await User.findById(user._id).populate('roles');
      } catch (error) {
        if (error.code === 11000) {
          throw new UserInputError('Email already exists');
        }
        throw error;
      }
    },

    updateUser: async (_, { id, input }, { user: currentUser }) => {
      if (currentUser.userId !== id && !currentUser.isAdmin) {
        throw new ForbiddenError('Forbidden');
      }

      const user = await User.findById(id);
      if (!user) throw new UserInputError('User not found');

      Object.assign(user, input);
      await user.save();

      return await User.findById(id).populate('roles');
    },

    deleteUser: async (_, { id }, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      const deletedUser = await User.findByIdAndDelete(id);
      return !!deletedUser;
    },

    inviteUser: async (_, { email, firstName, lastName }, { user: currentUser, req, res }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      try {
        // Create a mock request object for the existing controller
        const mockReq = {
          body: { email, firstName, lastName },
          user: currentUser,
        };

        // Create a promise to capture the response
        return new Promise((resolve, reject) => {
          const mockRes = {
            json: data => {
              if (data.user) {
                resolve(data.user);
              } else {
                resolve(data);
              }
            },
            status: code => ({
              json: data => {
                reject(new Error(data.message || 'Error creating user'));
              },
            }),
          };

          usersController.inviteUser(mockReq, mockRes);
        });
      } catch (error) {
        throw new UserInputError(error.message);
      }
    },
  },

  User: {
    fullName: user => `${user.firstName} ${user.lastName}`,
    roles: async (user, _, { dataloaders }) => {
      if (!user.roles?.length) return [];
      return await dataloaders.roleLoader.loadMany(user.roles);
    },
  },
};

module.exports = userResolvers;
