const { PrismaClient } = require('../../prisma/generated/client');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { logger } = require('../../utils/logger');
const { fetchSchemaFromDatabase } = require('../../utils/schemaUtils');

const prisma = new PrismaClient();

const roleResolvers = {
  // Type resolvers
  Role: {
    // Resolver for service field - ensures service info is populated
    service: async role => {
      if (role.service) return role.service;

      if (!role.serviceId) return null;

      return await prisma.service.findUnique({
        where: { id: role.serviceId },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          connection: true,
        },
      });
    },

    // Resolver for creator field - ensures user info is populated
    creator: async role => {
      if (role.creator) return role.creator;

      if (!role.createdBy) return null;

      return await prisma.user.findUnique({
        where: { id: role.createdBy },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    },

    // Applications using this role as default
    applications: async role => {
      return await prisma.application.findMany({
        where: { defaultRoleId: role.id },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          organization: true,
        },
      });
    },

    // Usage statistics - will be implemented when API usage tracking is migrated
    usageCount: async role => {
      // TODO: Implement when ApiActivityLog is used for usage tracking
      return 0;
    },

    lastUsed: async role => {
      // TODO: Implement when ApiActivityLog is used for usage tracking
      return null;
    },
  },

  Permission: {
    // Resolver for service field in permissions
    service: async permission => {
      if (!permission.serviceId) return null;

      return await prisma.service.findUnique({
        where: { id: permission.serviceId },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          connection: true,
        },
      });
    },
  },

  // Query resolvers
  Query: {
    role: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing role management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const role = await prisma.role.findFirst({
        where: {
          id,
          organizationId: currentUser.organizationId,
        },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          service: {
            include: {
              creator: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
              connection: true,
            },
          },
          organization: true,
        },
      });

      if (!role) {
        throw new UserInputError('Role not found');
      }

      // Check if user can access this role
      if (role.createdBy !== currentUser.userId && !currentUser.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      return role;
    },

    roles: async (
      _,
      { filters = {}, pagination = {} },
      { user: currentUser, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing roles list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

      // Build where clause for filters
      const where = {
        organizationId: currentUser.organizationId,
      };

      if (filters.name) {
        where.name = { contains: filters.name, mode: 'insensitive' };
      }
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      if (filters.serviceId) {
        where.serviceId = filters.serviceId;
      }
      if (filters.createdBy) {
        where.createdBy = filters.createdBy;
      } else if (!currentUser.isAdmin) {
        // Non-admin users can only see their own roles
        where.createdBy = currentUser.userId;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination
      const totalCount = await prisma.role.count({ where });

      // Get roles with pagination
      const roles = await prisma.role.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
        include: {
          organization: {
            select: { id: true, name: true },
          },
          service: {
            select: { id: true, name: true, database: true },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      });

      return {
        edges: roles.map((role, index) => ({
          node: role,
          cursor: Buffer.from((offset + index).toString()).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          totalCount,
          startCursor: roles.length > 0 ? Buffer.from(offset.toString()).toString('base64') : null,
          endCursor:
            roles.length > 0
              ? Buffer.from((offset + roles.length - 1).toString()).toString('base64')
              : null,
        },
      };
    },

    serviceRoles: async (_, { serviceId }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing service roles
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const where = {
        serviceId,
        organizationId: currentUser.organizationId,
      };

      if (!currentUser.isAdmin) {
        where.createdBy = currentUser.userId;
      }

      return await prisma.role.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          service: {
            select: { id: true, name: true, database: true },
          },
        },
      });
    },

    userRoles: async (_, { userId }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing user roles
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      // Users can only see their own roles unless they're admin
      const targetUserId = userId || currentUser.userId;
      if (targetUserId !== currentUser.userId && !currentUser.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      // If asking for user's assigned roles, get from user relationship
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
          roles: {
            where: {
              isActive: true,
              organizationId: currentUser.organizationId,
            },
            include: {
              service: {
                select: { id: true, name: true, database: true },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
      });

      return user?.roles || [];
    },

    myRoles: async (_, __, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing roles
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      // Get roles assigned to the current user
      const user = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        include: {
          roles: {
            where: {
              isActive: true,
              organizationId: currentUser.organizationId,
            },
            include: {
              service: {
                select: { id: true, name: true, database: true },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
      });

      return user?.roles || [];
    },
  },

  // Mutation resolvers
  Mutation: {
    createRole: async (_, { input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        const { serviceId, permissions = [], createdBy, ...roleData } = input;

        logger.info('GraphQL createRole called', {
          input,
          serviceId,
          permissions,
          roleData,
          currentUser: {
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
            email: currentUser.email,
            isAdmin: currentUser.isAdmin,
          },
        });

        // Verify service exists and belongs to organization
        const service = await prisma.service.findFirst({
          where: {
            id: serviceId,
            organizationId: currentUser.organizationId,
          },
        });

        if (!service) {
          logger.error('Service not found', {
            serviceId,
            organizationId: currentUser.organizationId,
          });
          throw new UserInputError('Service not found');
        }

        // Ensure permissions are properly serialized for JSON storage
        const serializedPermissions = Array.isArray(permissions)
          ? permissions.map(permission => ({
              serviceId: permission.serviceId,
              objectName: permission.objectName,
              actions: permission.actions || {},
            }))
          : [];

        logger.info('Serialized permissions', { serializedPermissions });

        const role = await prisma.role.create({
          data: {
            ...roleData,
            serviceId,
            permissions: serializedPermissions,
            organizationId: currentUser.organizationId,
            createdBy: currentUser.userId,
          },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            service: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
                connection: true,
              },
            },
            organization: true,
          },
        });

        logger.info('Role created via GraphQL', {
          roleId: role.id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return role;
      } catch (error) {
        logger.error('GraphQL role creation error', {
          error: error.message,
          code: error.code,
          stack: error.stack,
          input,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        if (error.code === 'P2002') {
          throw new UserInputError('Role name already exists in your organization');
        }
        throw new Error('Failed to create role');
      }
    },

    updateRole: async (_, { id, input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify role exists and user has access
        const existingRole = await prisma.role.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId,
          },
        });

        if (!existingRole) {
          throw new UserInputError('Role not found');
        }

        // Check ownership
        if (existingRole.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        const { serviceId, permissions, ...updateData } = input;

        // Handle permissions serialization if being updated
        if (permissions !== undefined) {
          updateData.permissions = Array.isArray(permissions)
            ? permissions.map(permission => ({
                serviceId: permission.serviceId,
                objectName: permission.objectName,
                actions: permission.actions || {},
              }))
            : [];
        }

        // Verify service if being updated
        if (serviceId && serviceId !== existingRole.serviceId) {
          const service = await prisma.service.findFirst({
            where: {
              id: serviceId,
              organizationId: currentUser.organizationId,
            },
          });

          if (!service) {
            throw new UserInputError('Service not found');
          }

          updateData.serviceId = serviceId;
        }

        const role = await prisma.role.update({
          where: { id },
          data: updateData,
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            service: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
                connection: true,
              },
            },
            organization: true,
          },
        });

        logger.info('Role updated via GraphQL', {
          roleId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return role;
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Role name already exists in your organization');
        }
        logger.error('GraphQL role update error', { error: error.message, roleId: id });
        throw new Error('Failed to update role');
      }
    },

    deleteRole: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify role exists and user has access
        const existingRole = await prisma.role.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId,
          },
        });

        if (!existingRole) {
          throw new UserInputError('Role not found');
        }

        // Check ownership
        if (existingRole.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        // Check if role is being used by applications
        const applicationsUsingRole = await prisma.application.count({
          where: { defaultRoleId: id },
        });

        if (applicationsUsingRole > 0) {
          throw new UserInputError(
            `Cannot delete role. It is being used by ${applicationsUsingRole} application(s).`
          );
        }

        // Note: In this schema, roles are not directly assigned to users.
        // They are used as defaultRole in applications, which is checked above.

        await prisma.role.delete({ where: { id } });

        logger.info('Role deleted via GraphQL', {
          roleId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return true;
      } catch (error) {
        if (error.code === 'P2003') {
          throw new UserInputError('Cannot delete role: it has dependent records');
        }
        logger.error('GraphQL role deletion error', { error: error.message, roleId: id });
        return false;
      }
    },

    activateRole: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify role exists and user has access
        const existingRole = await prisma.role.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId,
          },
        });

        if (!existingRole) {
          throw new UserInputError('Role not found');
        }

        // Check ownership
        if (existingRole.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        const role = await prisma.role.update({
          where: { id },
          data: { isActive: true },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            service: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
                connection: true,
              },
            },
            organization: true,
          },
        });

        logger.info('Role activated via GraphQL', {
          roleId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return role;
      } catch (error) {
        logger.error('GraphQL role activation error', { error: error.message, roleId: id });
        throw new Error('Failed to activate role');
      }
    },

    deactivateRole: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify role exists and user has access
        const existingRole = await prisma.role.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId,
          },
        });

        if (!existingRole) {
          throw new UserInputError('Role not found');
        }

        // Check ownership
        if (existingRole.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        const role = await prisma.role.update({
          where: { id },
          data: { isActive: false },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            service: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
                connection: true,
              },
            },
            organization: true,
          },
        });

        logger.info('Role deactivated via GraphQL', {
          roleId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return role;
      } catch (error) {
        logger.error('GraphQL role deactivation error', { error: error.message, roleId: id });
        throw new Error('Failed to deactivate role');
      }
    },

    addPermission: async (_, { roleId, permission }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify role exists and user has access
        const existingRole = await prisma.role.findFirst({
          where: {
            id: roleId,
            organizationId: currentUser.organizationId,
          },
        });

        if (!existingRole) {
          throw new UserInputError('Role not found');
        }

        // Check ownership
        if (existingRole.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        // Check if permission already exists
        const existingPermissions = existingRole.permissions || [];
        const existingPermission = existingPermissions.find(
          p => p.serviceId === permission.serviceId && p.objectName === permission.objectName
        );

        if (existingPermission) {
          throw new UserInputError('Permission for this service and object already exists');
        }

        // Verify the service exists and belongs to organization
        const service = await prisma.service.findFirst({
          where: {
            id: permission.serviceId,
            organizationId: currentUser.organizationId,
          },
        });

        if (!service) {
          throw new UserInputError('Service not found');
        }

        // Add the new permission with proper serialization
        const serializedPermission = {
          serviceId: permission.serviceId,
          objectName: permission.objectName,
          actions: permission.actions || {},
        };
        const updatedPermissions = [...existingPermissions, serializedPermission];

        const role = await prisma.role.update({
          where: { id: roleId },
          data: { permissions: updatedPermissions },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            service: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
                connection: true,
              },
            },
            organization: true,
          },
        });

        logger.info('Permission added to role via GraphQL', {
          roleId,
          permission,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return role;
      } catch (error) {
        logger.error('GraphQL add permission error', { error: error.message, roleId, permission });
        throw new Error('Failed to add permission');
      }
    },

    removePermission: async (_, { roleId, serviceId, objectName }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify role exists and user has access
        const existingRole = await prisma.role.findFirst({
          where: {
            id: roleId,
            organizationId: currentUser.organizationId,
          },
        });

        if (!existingRole) {
          throw new UserInputError('Role not found');
        }

        // Check ownership
        if (existingRole.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        // Remove the permission
        const existingPermissions = existingRole.permissions || [];
        const updatedPermissions = existingPermissions.filter(
          p => !(p.serviceId === serviceId && p.objectName === objectName)
        );

        const role = await prisma.role.update({
          where: { id: roleId },
          data: { permissions: updatedPermissions },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            service: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
                connection: true,
              },
            },
            organization: true,
          },
        });

        logger.info('Permission removed from role via GraphQL', {
          roleId,
          serviceId,
          objectName,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return role;
      } catch (error) {
        logger.error('GraphQL remove permission error', {
          error: error.message,
          roleId,
          serviceId,
          objectName,
        });
        throw new Error('Failed to remove permission');
      }
    },

    updatePermission: async (_, { roleId, permission }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify role exists and user has access
        const existingRole = await prisma.role.findFirst({
          where: {
            id: roleId,
            organizationId: currentUser.organizationId,
          },
        });

        if (!existingRole) {
          throw new UserInputError('Role not found');
        }

        // Check ownership
        if (existingRole.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        // Find and update the permission
        const existingPermissions = existingRole.permissions || [];
        const existingPermissionIndex = existingPermissions.findIndex(
          p => p.serviceId === permission.serviceId && p.objectName === permission.objectName
        );

        if (existingPermissionIndex === -1) {
          throw new UserInputError('Permission not found');
        }

        // Verify the service exists and belongs to organization
        const service = await prisma.service.findFirst({
          where: {
            id: permission.serviceId,
            organizationId: currentUser.organizationId,
          },
        });

        if (!service) {
          throw new UserInputError('Service not found');
        }

        // Update the permission with proper serialization
        const updatedPermissions = [...existingPermissions];
        updatedPermissions[existingPermissionIndex] = {
          serviceId: permission.serviceId,
          objectName: permission.objectName,
          actions: permission.actions || {},
        };

        const role = await prisma.role.update({
          where: { id: roleId },
          data: { permissions: updatedPermissions },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            service: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
                connection: true,
              },
            },
            organization: true,
          },
        });

        logger.info('Permission updated in role via GraphQL', {
          roleId,
          permission,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return role;
      } catch (error) {
        logger.error('GraphQL update permission error', {
          error: error.message,
          roleId,
          permission,
        });
        throw new Error('Failed to update permission');
      }
    },

    testRole: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify role exists and user has access
        const role = await prisma.role.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId,
          },
          include: {
            service: {
              include: {
                connection: true,
              },
            },
          },
        });

        if (!role) {
          throw new UserInputError('Role not found');
        }

        // Check ownership
        if (role.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        const permissionTests = [];
        const permissions = role.permissions || [];

        for (const permission of permissions) {
          try {
            // Test database connection for this permission
            await fetchSchemaFromDatabase(role.service, permission.objectName);

            permissionTests.push({
              objectName: permission.objectName,
              actions: permission.actions,
              accessible: true,
              errors: [],
            });
          } catch (error) {
            permissionTests.push({
              objectName: permission.objectName,
              actions: permission.actions,
              accessible: false,
              errors: [error.message],
            });
          }
        }

        const allAccessible = permissionTests.every(test => test.accessible);

        logger.info('Role tested via GraphQL', {
          roleId: id,
          userId: currentUser.userId,
          success: allAccessible,
          organizationId: currentUser.organizationId,
        });

        return {
          success: allAccessible,
          message: allAccessible
            ? 'All permissions are accessible'
            : 'Some permissions have issues',
          permissions: permissionTests,
        };
      } catch (error) {
        logger.error('GraphQL role test error', { error: error.message, roleId: id });
        throw new Error('Failed to test role');
      }
    },

    refreshRoleSchemas: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify role exists and user has access
        const existingRole = await prisma.role.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId,
          },
          include: {
            service: {
              include: {
                connection: true,
              },
            },
          },
        });

        if (!existingRole) {
          throw new UserInputError('Role not found');
        }

        // Check ownership
        if (existingRole.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        const permissions = existingRole.permissions || [];
        const updatedPermissions = [];

        // Refresh schemas for all permissions
        for (const permission of permissions) {
          try {
            const schema = await fetchSchemaFromDatabase(
              existingRole.service,
              permission.objectName
            );
            updatedPermissions.push({
              ...permission,
              schema: {
                lastUpdated: new Date(),
                ...schema,
              },
            });
          } catch (error) {
            logger.error(`Failed to refresh schema for ${permission.objectName}:`, error);
            updatedPermissions.push({
              ...permission,
              schema: {
                lastUpdated: new Date(),
                error: error.message,
              },
            });
          }
        }

        const role = await prisma.role.update({
          where: { id },
          data: { permissions: updatedPermissions },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            service: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
                connection: true,
              },
            },
            organization: true,
          },
        });

        logger.info('Role schemas refreshed via GraphQL', {
          roleId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId,
        });

        return role;
      } catch (error) {
        logger.error('GraphQL role schema refresh error', { error: error.message, roleId: id });
        throw new Error('Failed to refresh role schemas');
      }
    },
  },
};

module.exports = roleResolvers;
