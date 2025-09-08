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

      if (currentUser.userId !== id && !currentUser.isAdmin) {
        throw new ForbiddenError('Forbidden');
      }

      const user = await prisma.user.findFirst({
        where: {
          id,
          organizationId: currentUser.organizationId
        },
        include: {
          organization: true,
          roles: {
            where: { isActive: true }
          }
        }
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

      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'asc' } = pagination;

      // Build where clause for filters
      const where = {
        organizationId: currentUser.organizationId
      };

      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.isAdmin !== undefined) where.isAdmin = filters.isAdmin;
      
      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } }
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
          organization: true,
          roles: {
            where: { isActive: true },
            select: { id: true, name: true }
          }
        }
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
          organization: true,
          roles: {
            where: { isActive: true }
          }
        }
      });

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      return user;
    },
  },

  Mutation: {
    createUser: async (_, { input }, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      try {
        const { roleIds, ...userData } = input;

        // Verify roles exist and belong to organization if provided
        if (roleIds?.length) {
          const roles = await prisma.role.findMany({
            where: {
              id: { in: roleIds },
              organizationId: currentUser.organizationId
            }
          });

          if (roles.length !== roleIds.length) {
            throw new UserInputError('One or more roles not found');
          }
        }

        const user = await prisma.user.create({
          data: {
            ...userData,
            organizationId: currentUser.organizationId,
            roles: roleIds?.length ? {
              connect: roleIds.map(id => ({ id }))
            } : undefined
          },
          include: {
            organization: true,
            roles: {
              where: { isActive: true }
            }
          }
        });

        logger.info('User created via GraphQL', {
          userId: user.id,
          createdBy: currentUser.userId,
          organizationId: currentUser.organizationId
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
      if (currentUser.userId !== id && !currentUser.isAdmin) {
        throw new ForbiddenError('Forbidden');
      }

      try {
        // Verify user exists and belongs to organization
        const existingUser = await prisma.user.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId
          }
        });

        if (!existingUser) {
          throw new UserInputError('User not found');
        }

        const { roleIds, ...updateData } = input;
        let roleUpdate = {};

        // Handle role updates if provided
        if (roleIds !== undefined) {
          if (roleIds?.length) {
            // Verify roles exist and belong to organization
            const roles = await prisma.role.findMany({
              where: {
                id: { in: roleIds },
                organizationId: currentUser.organizationId
              }
            });

            if (roles.length !== roleIds.length) {
              throw new UserInputError('One or more roles not found');
            }

            roleUpdate = {
              set: roleIds.map(id => ({ id }))
            };
          } else {
            // Clear all roles
            roleUpdate = { set: [] };
          }
        }

        const user = await prisma.user.update({
          where: { id },
          data: {
            ...updateData,
            ...(Object.keys(roleUpdate).length ? { roles: roleUpdate } : {})
          },
          include: {
            organization: true,
            roles: {
              where: { isActive: true }
            }
          }
        });

        logger.info('User updated via GraphQL', {
          userId: id,
          updatedBy: currentUser.userId,
          organizationId: currentUser.organizationId
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
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      try {
        // Verify user exists and belongs to organization
        const existingUser = await prisma.user.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId
          }
        });

        if (!existingUser) {
          throw new UserInputError('User not found');
        }

        // Prevent deleting self
        if (id === currentUser.userId) {
          throw new ForbiddenError('Cannot delete your own account');
        }

        await prisma.user.delete({
          where: { id }
        });

        logger.info('User deleted via GraphQL', {
          userId: id,
          deletedBy: currentUser.userId,
          organizationId: currentUser.organizationId
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
    
    // Resolver for roles field - ensures role info is populated
    roles: async (user) => {
      if (user.roles) return user.roles;
      
      if (!user.id) return [];
      
      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          roles: {
            where: { isActive: true }
          }
        }
      });

      return userWithRoles?.roles || [];
    },
  },
};

module.exports = userResolvers;
