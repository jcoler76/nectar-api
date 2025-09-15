const { PrismaClient } = require('../../prisma/generated/client');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { logger } = require('../../utils/logger');
const usersController = require('../../controllers/usersController');

const prisma = new PrismaClient();

const userResolvers = {
  Query: {
    user: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing individual users
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access user management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      if (currentUser.userId !== id && !currentUser.isSuperAdmin) {
        throw new ForbiddenError('Forbidden');
      }

      const whereClause = currentUser.organizationId
        ? {
            id,
            memberships: {
              some: {
                organizationId: currentUser.organizationId,
              },
            },
          }
        : { id };
      const user = await prisma.user.findFirst({
        where: whereClause,
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        throw new UserInputError('User not found');
      }

      return user;
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

      if (!currentUser?.isSuperAdmin) throw new ForbiddenError('Admin access required');

      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'asc' } = pagination;

      // Build where clause for filters
      const where = {};
      if (currentUser.organizationId) {
        where.memberships = {
          some: {
            organizationId: currentUser.organizationId,
          },
        };
      }

      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.isSuperAdmin !== undefined) where.isSuperAdmin = filters.isSuperAdmin;

      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination
      const totalCount = await prisma.user.count({ where });

      // Get users with pagination
      const users = await prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

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

    me: async (_, __, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing user info
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access user information');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const user = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      return user;
    },
  },

  Mutation: {
    createUser: async (_, { input }, { user: currentUser }) => {
      if (!currentUser?.isSuperAdmin) throw new ForbiddenError('Admin access required');

      try {
        const userData = input;

        const user = await prisma.user.create({
          data: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            isActive: userData.isActive ?? true,
          },
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
          },
        });

        logger.info('User created via GraphQL', {
          userId: user.id,
          createdBy: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return user;
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Email already exists');
        }
        logger.error('GraphQL user creation error', { error: error.message, input });
        throw new Error('Failed to create user');
      }
    },

    updateUser: async (_, { id, input }, { user: currentUser }) => {
      if (currentUser.userId !== id && !currentUser.isSuperAdmin) {
        throw new ForbiddenError('Forbidden');
      }

      try {
        // Verify user exists and belongs to organization
        const existingUser = await prisma.user.findFirst({ where: { id } });

        if (!existingUser) {
          throw new UserInputError('User not found');
        }

        const updateData = input;

        const user = await prisma.user.update({
          where: { id },
          data: {
            ...updateData,
          },
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
          },
        });

        logger.info('User updated via GraphQL', {
          userId: id,
          updatedBy: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return user;
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Email already exists');
        }
        logger.error('GraphQL user update error', { error: error.message, userId: id });
        throw new Error('Failed to update user');
      }
    },

    deleteUser: async (_, { id }, { user: currentUser }) => {
      if (!currentUser?.isSuperAdmin) throw new ForbiddenError('Admin access required');

      try {
        // Verify user exists and belongs to organization
        const existingUser = await prisma.user.findFirst({
          where: currentUser.organizationId
            ? {
                id,
                memberships: {
                  some: {
                    organizationId: currentUser.organizationId,
                  },
                },
              }
            : { id },
        });

        if (!existingUser) {
          throw new UserInputError('User not found');
        }

        // Prevent deleting self
        if (id === currentUser.userId) {
          throw new ForbiddenError('Cannot delete your own account');
        }

        await prisma.user.delete({
          where: { id },
        });

        logger.info('User deleted via GraphQL', {
          userId: id,
          deletedBy: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return true;
      } catch (error) {
        if (error.code === 'P2003') {
          throw new UserInputError('Cannot delete user: it has dependent records');
        }
        logger.error('GraphQL user deletion error', { error: error.message, userId: id });
        return false;
      }
    },

    inviteUser: async (_, { email, firstName, lastName }, { user: currentUser, req, res }) => {
      if (!currentUser?.isSuperAdmin) throw new ForbiddenError('Admin access required');

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

    // Resolver for roles field - based on schema, roles are not directly associated with users
    roles: async user => {
      // In this schema, users don't have direct roles
      // Roles are associated with applications and services
      return [];
    },
    memberships: async user => {
      if (!user?.id) return [];
      const memberships = await prisma.membership.findMany({
        where: { userId: user.id },
        include: { organization: true },
      });
      return memberships.map(m => ({
        organization: m.organization,
        role: m.role,
        joinedAt: m.joinedAt,
      }));
    },
  },
};

module.exports = userResolvers;
