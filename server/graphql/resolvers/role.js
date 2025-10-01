const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');

const prismaService = require('../../services/prismaService');
const { logger } = require('../../utils/logger');
const { fetchSchemaFromDatabase } = require('../../utils/schemaUtils');

const roleResolvers = {
  // Type resolvers
  Role: {
    // Resolver for service field - ensures service info is populated
    service: async role => {
      if (role.service) return role.service;

      if (!role.serviceId) return null;

      return await prismaService.withTenantContext(role.organizationId, async tx => {
        return await tx.service.findUnique({
          where: { id: role.serviceId },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            connection: true,
          },
        });
      });
    },

    // Resolver for creator field - ensures user info is populated
    creator: async role => {
      if (role.creator) return role.creator;

      if (!role.createdBy) return null;

      return await prismaService.withTenantContext(role.organizationId, async tx => {
        return await tx.user.findUnique({
          where: { id: role.createdBy },
          select: { id: true, email: true, firstName: true, lastName: true },
        });
      });
    },

    // Applications using this role as default
    applications: async role => {
      return await prismaService.withTenantContext(role.organizationId, async tx => {
        return await tx.application.findMany({
          where: { defaultRoleId: role.id },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            organization: true,
          },
        });
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
    service: async (permission, _, context) => {
      if (!permission.serviceId) return null;

      // SECURITY: Get organization context from permission parent to enforce RLS
      // Permission objects should have access to their parent role's organization
      let organizationId;

      // Try to get organization from context first
      if (context?.user?.organizationId) {
        organizationId = context.user.organizationId;
      } else {
        // SECURITY: If no context org, we need to find the service's org using tenant context
        // This is a fallback that should rarely be used
        logger.warn('Permission resolver missing organization context, using system lookup', {
          serviceId: permission.serviceId,
          contextUser: context?.user?.userId || 'none',
        });

        const systemService = await prismaService.withTenantContext('system', async tx => {
          return await tx.service.findUnique({
            where: { id: permission.serviceId },
            select: { organizationId: true },
          });
        });

        if (!systemService) return null;
        organizationId = systemService.organizationId;
      }

      // Now fetch full service data with proper tenant context
      return await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.service.findUnique({
          where: { id: permission.serviceId },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            connection: true,
          },
        });
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

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // SECURITY: Build where clause with authorization BEFORE data retrieval
        const where = {
          id,
        };

        // CRITICAL: Apply authorization filter BEFORE database query
        if (!currentUser.isAdmin) {
          where.createdBy = currentUser.userId;
        }

        const role = await tx.role.findFirst({
          where,
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
          // SECURITY: Generic error message - don't reveal whether role exists
          throw new UserInputError('Role not found or access denied');
        }

        return role;
      });
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

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

        // Build where clause for filters (no organizationId - handled by RLS)
        const where = {};

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
        const totalCount = await tx.role.count({ where });

        // Get roles with pagination
        const roles = await tx.role.findMany({
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
            startCursor:
              roles.length > 0 ? Buffer.from(offset.toString()).toString('base64') : null,
            endCursor:
              roles.length > 0
                ? Buffer.from((offset + roles.length - 1).toString()).toString('base64')
                : null,
          },
        };
      });
    },

    serviceRoles: async (_, { serviceId }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing service roles
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const where = {
          serviceId,
        };

        if (!currentUser.isAdmin) {
          where.createdBy = currentUser.userId;
        }

        return await tx.role.findMany({
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
      });
    },

    userRoles: async (_, { userId }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing user roles
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Users can only see their own roles unless they're admin
        const targetUserId = userId || currentUser.userId;
        if (targetUserId !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        // If asking for user's assigned roles, get from user relationship
        const user = await tx.user.findUnique({
          where: { id: targetUserId },
          include: {
            roles: {
              where: {
                isActive: true,
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
      });
    },

    myRoles: async (_, __, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing roles
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Get roles assigned to the current user
        const user = await tx.user.findUnique({
          where: { id: currentUser.userId },
          include: {
            roles: {
              where: {
                isActive: true,
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
      });
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

        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify service exists and belongs to organization - include connection for schema fetch
          const service = await tx.service.findFirst({
            where: {
              id: serviceId,
            },
            include: {
              connection: true,
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
          // Also fetch schema details for each permission
          const serializedPermissions = [];

          if (Array.isArray(permissions)) {
            for (const permission of permissions) {
              const permissionData = {
                serviceId: permission.serviceId,
                objectName: permission.objectName,
                actions: permission.actions || {},
              };

              // Fetch schema details for this permission
              // Services can have password stored directly OR via connection
              const hasDirectPassword = service.passwordEncrypted;
              const hasConnectionPassword = service.connection?.passwordEncrypted;

              if (hasDirectPassword || hasConnectionPassword) {
                try {
                  const { decryptDatabasePassword } = require('../../utils/encryption');

                  // Build service object with connection details for schema fetch
                  let serviceWithPassword;
                  if (hasDirectPassword) {
                    // Service has password stored directly
                    serviceWithPassword = {
                      host: service.host,
                      port: service.port,
                      database: service.database,
                      username: service.username,
                      password: decryptDatabasePassword(service.passwordEncrypted),
                    };
                  } else {
                    // Service uses connection
                    serviceWithPassword = {
                      host: service.connection.host,
                      port: service.connection.port,
                      database: service.database,
                      username: service.connection.username,
                      password: decryptDatabasePassword(service.connection.passwordEncrypted),
                    };
                  }

                  const schema = await fetchSchemaFromDatabase(
                    serviceWithPassword,
                    permission.objectName
                  );
                  if (schema) {
                    // Store schema in both fields for backward compatibility
                    permissionData.procedureSchema = schema;
                    permissionData.schema = schema;
                    logger.info(`Schema fetched for ${permission.objectName}:`, {
                      hasParameters: !!schema.parameters,
                      paramCount: schema.parameters?.length || 0,
                    });
                  } else {
                    logger.warn(`No schema found for ${permission.objectName}`);
                  }
                } catch (schemaError) {
                  logger.error(`Failed to fetch schema for ${permission.objectName}:`, {
                    error: schemaError.message,
                    stack: schemaError.stack,
                  });
                  // Continue without schema - it can be refreshed later
                }
              } else {
                logger.warn(
                  `Service ${serviceId} has no password configured (neither direct nor via connection), skipping schema fetch`
                );
              }

              serializedPermissions.push(permissionData);
            }
          }

          logger.info('Serialized permissions', {
            count: serializedPermissions.length,
            withSchema: serializedPermissions.filter(p => p.procedureSchema).length,
          });

          const role = await tx.role.create({
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
        });
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
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // SECURITY: Build where clause with authorization BEFORE data retrieval
          const where = {
            id,
          };

          // CRITICAL: Apply authorization filter BEFORE database query
          if (!currentUser.isAdmin) {
            where.createdBy = currentUser.userId;
          }

          const existingRole = await tx.role.findFirst({
            where,
            include: {
              service: {
                include: {
                  connection: true,
                },
              },
            },
          });

          if (!existingRole) {
            // SECURITY: Generic error message - don't reveal whether role exists
            throw new UserInputError('Role not found or access denied');
          }

          const { serviceId, permissions, ...updateData } = input;

          // Handle permissions serialization if being updated
          if (permissions !== undefined) {
            const serializedPermissions = [];

            if (Array.isArray(permissions)) {
              // Get the service for schema fetching (use updated serviceId or existing)
              const targetServiceId = serviceId || existingRole.serviceId;
              const service = await tx.service.findFirst({
                where: { id: targetServiceId },
                include: { connection: true },
              });

              if (!service) {
                throw new UserInputError('Service not found');
              }

              // Process each permission and fetch schema
              for (const permission of permissions) {
                const permissionData = {
                  serviceId: permission.serviceId,
                  objectName: permission.objectName,
                  actions: permission.actions || {},
                };

                // Check if this permission already has a schema
                const existingPermission = (existingRole.permissions || []).find(
                  p =>
                    p.objectName === permission.objectName && p.serviceId === permission.serviceId
                );

                // If permission has existing schema, preserve it, otherwise fetch new schema
                if (existingPermission?.schema || existingPermission?.procedureSchema) {
                  permissionData.schema = existingPermission.schema;
                  permissionData.procedureSchema = existingPermission.procedureSchema;
                } else {
                  // Fetch schema for new permissions
                  const hasDirectPassword = service.passwordEncrypted;
                  const hasConnectionPassword = service.connection?.passwordEncrypted;

                  if (hasDirectPassword || hasConnectionPassword) {
                    try {
                      const { decryptDatabasePassword } = require('../../utils/encryption');

                      // Build service object with connection details for schema fetch
                      let serviceWithPassword;
                      if (hasDirectPassword) {
                        serviceWithPassword = {
                          host: service.host,
                          port: service.port,
                          database: service.database,
                          username: service.username,
                          password: decryptDatabasePassword(service.passwordEncrypted),
                        };
                      } else {
                        serviceWithPassword = {
                          host: service.connection.host,
                          port: service.connection.port,
                          database: service.database,
                          username: service.connection.username,
                          password: decryptDatabasePassword(service.connection.passwordEncrypted),
                        };
                      }

                      const schema = await fetchSchemaFromDatabase(
                        serviceWithPassword,
                        permission.objectName
                      );
                      if (schema) {
                        permissionData.procedureSchema = schema;
                        permissionData.schema = schema;
                        logger.info(`Schema fetched for ${permission.objectName} during update:`, {
                          hasParameters: !!schema.parameters,
                          paramCount: schema.parameters?.length || 0,
                        });
                      } else {
                        logger.warn(`No schema found for ${permission.objectName} during update`);
                      }
                    } catch (schemaError) {
                      logger.error(
                        `Failed to fetch schema for ${permission.objectName} during update:`,
                        {
                          error: schemaError.message,
                          stack: schemaError.stack,
                        }
                      );
                      // Continue without schema - it can be refreshed later
                    }
                  } else {
                    logger.warn(
                      `Service ${targetServiceId} has no password configured, skipping schema fetch during update`
                    );
                  }
                }

                serializedPermissions.push(permissionData);
              }
            }

            updateData.permissions = serializedPermissions;

            logger.info('Update: Serialized permissions', {
              count: serializedPermissions.length,
              withSchema: serializedPermissions.filter(p => p.procedureSchema || p.schema).length,
            });
          }

          // Verify service if being updated (only if we didn't already fetch it above)
          if (serviceId && serviceId !== existingRole.serviceId) {
            if (permissions === undefined) {
              // We didn't fetch the service above, so verify it now
              const service = await tx.service.findFirst({
                where: {
                  id: serviceId,
                },
              });

              if (!service) {
                throw new UserInputError('Service not found');
              }
            }
            // Service was already verified in the permissions block above

            updateData.serviceId = serviceId;
          }

          const role = await tx.role.update({
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
        });
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
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // SECURITY: Build where clause with authorization BEFORE data retrieval
          const where = {
            id,
          };

          // CRITICAL: Apply authorization filter BEFORE database query
          if (!currentUser.isAdmin) {
            where.createdBy = currentUser.userId;
          }

          const existingRole = await tx.role.findFirst({
            where,
          });

          if (!existingRole) {
            // SECURITY: Generic error message - don't reveal whether role exists
            throw new UserInputError('Role not found or access denied');
          }

          // Check if role is being used by applications
          const applicationsUsingRole = await tx.application.count({
            where: { defaultRoleId: id },
          });

          if (applicationsUsingRole > 0) {
            throw new UserInputError(
              `Cannot delete role. It is being used by ${applicationsUsingRole} application(s).`
            );
          }

          // Note: In this schema, roles are not directly assigned to users.
          // They are used as defaultRole in applications, which is checked above.

          await tx.role.delete({ where: { id } });

          logger.info('Role deleted via GraphQL', {
            roleId: id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return true;
        });
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
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // SECURITY: Build where clause with authorization BEFORE data retrieval
          const where = {
            id,
          };

          // CRITICAL: Apply authorization filter BEFORE database query
          if (!currentUser.isAdmin) {
            where.createdBy = currentUser.userId;
          }

          const existingRole = await tx.role.findFirst({
            where,
          });

          if (!existingRole) {
            // SECURITY: Generic error message - don't reveal whether role exists
            throw new UserInputError('Role not found or access denied');
          }

          const role = await tx.role.update({
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
        });
      } catch (error) {
        logger.error('GraphQL role activation error', { error: error.message, roleId: id });
        throw new Error('Failed to activate role');
      }
    },

    deactivateRole: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // SECURITY: Build where clause with authorization BEFORE data retrieval
          const where = {
            id,
          };

          // CRITICAL: Apply authorization filter BEFORE database query
          if (!currentUser.isAdmin) {
            where.createdBy = currentUser.userId;
          }

          const existingRole = await tx.role.findFirst({
            where,
          });

          if (!existingRole) {
            // SECURITY: Generic error message - don't reveal whether role exists
            throw new UserInputError('Role not found or access denied');
          }

          const role = await tx.role.update({
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
        });
      } catch (error) {
        logger.error('GraphQL role deactivation error', { error: error.message, roleId: id });
        throw new Error('Failed to deactivate role');
      }
    },

    addPermission: async (_, { roleId, permission }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // SECURITY: Build where clause with authorization BEFORE data retrieval
          const where = {
            id: roleId,
          };

          // CRITICAL: Apply authorization filter BEFORE database query
          if (!currentUser.isAdmin) {
            where.createdBy = currentUser.userId;
          }

          const existingRole = await tx.role.findFirst({
            where,
          });

          if (!existingRole) {
            // SECURITY: Generic error message - don't reveal whether role exists
            throw new UserInputError('Role not found or access denied');
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
          const service = await tx.service.findFirst({
            where: {
              id: permission.serviceId,
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

          const role = await tx.role.update({
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
        });
      } catch (error) {
        logger.error('GraphQL add permission error', { error: error.message, roleId, permission });
        throw new Error('Failed to add permission');
      }
    },

    removePermission: async (_, { roleId, serviceId, objectName }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // SECURITY: Build where clause with authorization BEFORE data retrieval
          const where = {
            id: roleId,
          };

          // CRITICAL: Apply authorization filter BEFORE database query
          if (!currentUser.isAdmin) {
            where.createdBy = currentUser.userId;
          }

          const existingRole = await tx.role.findFirst({
            where,
          });

          if (!existingRole) {
            // SECURITY: Generic error message - don't reveal whether role exists
            throw new UserInputError('Role not found or access denied');
          }

          // Remove the permission
          const existingPermissions = existingRole.permissions || [];
          const updatedPermissions = existingPermissions.filter(
            p => !(p.serviceId === serviceId && p.objectName === objectName)
          );

          const role = await tx.role.update({
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
        });
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
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // SECURITY: Build where clause with authorization BEFORE data retrieval
          const where = {
            id: roleId,
          };

          // CRITICAL: Apply authorization filter BEFORE database query
          if (!currentUser.isAdmin) {
            where.createdBy = currentUser.userId;
          }

          const existingRole = await tx.role.findFirst({
            where,
          });

          if (!existingRole) {
            // SECURITY: Generic error message - don't reveal whether role exists
            throw new UserInputError('Role not found or access denied');
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
          const service = await tx.service.findFirst({
            where: {
              id: permission.serviceId,
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

          const role = await tx.role.update({
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
        });
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
        const role = await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // SECURITY: Build where clause with authorization BEFORE data retrieval
          const where = {
            id,
          };

          // CRITICAL: Apply authorization filter BEFORE database query
          if (!currentUser.isAdmin) {
            where.createdBy = currentUser.userId;
          }

          const role = await tx.role.findFirst({
            where,
            include: {
              service: {
                include: {
                  connection: true,
                },
              },
            },
          });

          if (!role) {
            // SECURITY: Generic error message - don't reveal whether role exists
            throw new UserInputError('Role not found or access denied');
          }

          return role;
        });

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
        const existingRole = await prismaService.withTenantContext(
          currentUser.organizationId,
          async tx => {
            // SECURITY: Build where clause with authorization BEFORE data retrieval
            const where = {
              id,
            };

            // CRITICAL: Apply authorization filter BEFORE database query
            if (!currentUser.isAdmin) {
              where.createdBy = currentUser.userId;
            }

            const existingRole = await tx.role.findFirst({
              where,
              include: {
                service: {
                  include: {
                    connection: true,
                  },
                },
              },
            });

            if (!existingRole) {
              // SECURITY: Generic error message - don't reveal whether role exists
              throw new UserInputError('Role not found or access denied');
            }

            return existingRole;
          }
        );

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

        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          const role = await tx.role.update({
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
        });
      } catch (error) {
        logger.error('GraphQL role schema refresh error', { error: error.message, roleId: id });
        throw new Error('Failed to refresh role schemas');
      }
    },
  },
};

module.exports = roleResolvers;
