const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { logger } = require('../../utils/logger');
const usersController = require('../../controllers/usersController');
const prismaService = require('../../services/prismaService');

// Helper function to check if user has admin access (either super admin or organization owner)
const hasAdminAccess = currentUser => {
  if (currentUser?.isSuperAdmin) return true;
  if (currentUser?.isAdmin) return true;
  return currentUser?.memberships?.some(
    membership =>
      membership.role === 'ORGANIZATION_OWNER' || membership.role === 'ORGANIZATION_ADMIN'
  );
};

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

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const user = await tx.user.findFirst({
          where: {
            id,
          },
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
      });
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

      if (!hasAdminAccess(currentUser)) throw new ForbiddenError('Admin access required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'asc' } = pagination;

        console.log(
          '🔍 [UserResolver] Fetching users for organizationId:',
          currentUser.organizationId
        );

        const memberships = await tx.membership.findMany({
          include: {
            user: true,
            organization: true,
          },
        });

        console.log('🔍 [UserResolver] Found memberships:', memberships.length);

        const userMap = new Map();
        memberships.forEach(m => {
          if (!userMap.has(m.user.id)) {
            userMap.set(m.user.id, {
              ...m.user,
              memberships: [],
            });
          }
          userMap.get(m.user.id).memberships.push({
            organization: m.organization,
            role: m.role,
            joinedAt: m.joinedAt,
          });
        });

        let users = Array.from(userMap.values());

        if (filters.isActive !== undefined) {
          users = users.filter(u => u.isActive === filters.isActive);
        }
        if (filters.isSuperAdmin !== undefined) {
          users = users.filter(u => u.isSuperAdmin === filters.isSuperAdmin);
        }
        if (filters.search) {
          const search = filters.search.toLowerCase();
          users = users.filter(
            u =>
              u.firstName?.toLowerCase().includes(search) ||
              u.lastName?.toLowerCase().includes(search) ||
              u.email?.toLowerCase().includes(search)
          );
        }

        users.sort((a, b) => {
          const aVal = a[sortBy];
          const bVal = b[sortBy];
          const direction = sortOrder.toLowerCase() === 'desc' ? -1 : 1;
          return aVal < bVal ? -direction : aVal > bVal ? direction : 0;
        });

        const totalCount = users.length;
        const paginatedUsers = users.slice(offset, offset + limit);

        return {
          edges: paginatedUsers.map((user, index) => ({
            node: user,
            cursor: Buffer.from((offset + index).toString()).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: offset + limit < totalCount,
            hasPreviousPage: offset > 0,
            totalCount,
            startCursor:
              paginatedUsers.length > 0 ? Buffer.from(offset.toString()).toString('base64') : null,
            endCursor:
              paginatedUsers.length > 0
                ? Buffer.from((offset + paginatedUsers.length - 1).toString()).toString('base64')
                : null,
          },
        };
      });
    },

    me: async (_, __, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing user info
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access user information');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const systemPrisma = prismaService.getSystemClient();
      const user = await systemPrisma.user.findUnique({
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
      if (!hasAdminAccess(currentUser)) throw new ForbiddenError('Admin access required');

      try {
        const systemPrisma = prismaService.getSystemClient();
        const userData = input;

        const user = await systemPrisma.user.create({
          data: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            isActive: userData.isActive ?? true,
            memberships: {
              create: {
                organizationId: currentUser.organizationId,
                role: 'MEMBER',
              },
            },
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
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          const membership = await tx.membership.findFirst({
            where: { userId: id },
            include: { user: true },
          });

          if (!membership) {
            throw new UserInputError('User not found');
          }

          const updateData = input;
          const systemPrisma = prismaService.getSystemClient();

          const user = await systemPrisma.user.update({
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
        });
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Email already exists');
        }
        logger.error('GraphQL user update error', { error: error.message, userId: id });
        throw new Error('Failed to update user');
      }
    },

    deleteUser: async (_, { id }, { user: currentUser }) => {
      if (!hasAdminAccess(currentUser)) throw new ForbiddenError('Admin access required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          const membership = await tx.membership.findFirst({
            where: { userId: id },
          });

          if (!membership) {
            throw new UserInputError('User not found');
          }

          if (id === currentUser.userId) {
            throw new ForbiddenError('Cannot delete your own account');
          }

          const systemPrisma = prismaService.getSystemClient();
          await systemPrisma.user.delete({
            where: { id },
          });

          logger.info('User deleted via GraphQL', {
            userId: id,
            deletedBy: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return true;
        });
      } catch (error) {
        if (error.code === 'P2003') {
          throw new UserInputError('Cannot delete user: it has dependent records');
        }
        logger.error('GraphQL user deletion error', { error: error.message, userId: id });
        return false;
      }
    },

    inviteUser: async (_, { email, firstName, lastName }, { user: currentUser, req, res }) => {
      if (!hasAdminAccess(currentUser)) throw new ForbiddenError('Admin access required');

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

    // Resolver for isAdmin field - computed from memberships
    isAdmin: user => {
      return (
        user.memberships?.some(m =>
          ['ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER', 'ADMIN', 'OWNER'].includes(m.role)
        ) || false
      );
    },

    // Resolver for roles field - based on schema, roles are not directly associated with users
    roles: async user => {
      // In this schema, users don't have direct roles
      // Roles are associated with applications and services
      return [];
    },
    memberships: async (user, _, { user: currentUser }) => {
      if (!user?.id) return [];

      if (!currentUser?.organizationId) return [];

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const memberships = await tx.membership.findMany({
          where: { userId: user.id },
          include: { organization: true },
        });
        return memberships.map(m => ({
          organization: m.organization,
          role: m.role,
          joinedAt: m.joinedAt,
        }));
      });
    },
  },
};

module.exports = userResolvers;
