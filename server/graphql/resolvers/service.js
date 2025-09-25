const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const databaseService = require('../../services/databaseService');
const DatabaseService = require('../../services/database/DatabaseService');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../../utils/encryption');
const { logger } = require('../../utils/logger');
const prismaService = require('../../services/prismaService');

/**
 * Discover and store database objects for a service
 * @param {Object} service - The service record
 * @param {Object} connectionConfig - Database connection configuration
 * @returns {Promise<void>}
 */
async function discoverAndStoreSchema(service, connectionConfig) {
  try {
    logger.info('Starting schema discovery for service', {
      serviceId: service.id,
      serviceName: service.name,
      database: service.database,
    });

    // Get database objects using DatabaseService
    const objects = await DatabaseService.getDatabaseObjects(connectionConfig);

    if (!objects || objects.length === 0) {
      logger.warn('No database objects found during schema discovery', {
        serviceId: service.id,
        database: service.database,
      });
      return;
    }

    logger.info('Database objects discovered', {
      serviceId: service.id,
      totalObjects: objects.length,
      sampleObjects: objects.slice(0, 3).map(obj => ({ name: obj.name, type: obj.type_desc })),
    });

    // Store objects in databaseObject table
    const databaseObjectsToCreate = objects.map(obj => ({
      serviceId: service.id,
      organizationId: service.organizationId,
      name: obj.name,
      schema: obj.schema_name || null,
      type: obj.type_desc || 'TABLE',
      metadata: {
        objectId: obj.object_id,
        parentObjectId: obj.parent_object_id,
        schemaId: obj.schema_id,
        createDate: obj.create_date,
        modifyDate: obj.modify_date,
        isPublished: obj.is_published,
        isSchemaPublished: obj.is_schema_published,
      },
    }));

    // Batch insert database objects using RLS
    await prismaService.withTenantContext(service.organizationId, async tx => {
      await tx.databaseObject.createMany({
        data: databaseObjectsToCreate,
        skipDuplicates: true,
      });
    });

    logger.info('Database objects stored successfully', {
      serviceId: service.id,
      objectsStored: databaseObjectsToCreate.length,
    });
  } catch (error) {
    logger.error('Failed to discover and store schema', {
      serviceId: service.id,
      error: error.message,
    });
  }
}

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

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const service = await tx.service.findFirst({
          where: {
            id,
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
      });
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

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

        // Build where clause for filters (no organizationId - handled by RLS)
        const where = {};

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
        const totalCount = await tx.service.count({ where });

        // Get services with pagination
        const services = await tx.service.findMany({
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
      });
    },
  },

  Mutation: {
    createService: async (_, { input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
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
            const connection = await tx.databaseConnection.findFirst({
              where: {
                id: connectionId,
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

          const service = await tx.service.create({
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

          // Automatically discover and store database schema
          try {
            // Build connection config for schema discovery
            let connectionConfig = {
              type: 'MSSQL', // Default to MSSQL for backward compatibility
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
                logger.warn('Could not decrypt service password for schema discovery', {
                  serviceId: service.id,
                  error: decryptError.message,
                });
              }
            }

            // If service uses a connection, override with connection details
            if (service.connection) {
              connectionConfig = {
                ...connectionConfig,
                type: service.connection.type || 'MSSQL',
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
                  logger.warn('Could not decrypt connection password for schema discovery', {
                    serviceId: service.id,
                    connectionId: service.connection.id,
                    error: decryptError.message,
                  });
                }
              }
            }

            // Perform schema discovery asynchronously (don't wait for it to complete)
            discoverAndStoreSchema(service, connectionConfig).catch(error => {
              logger.error('Async schema discovery failed for new service', {
                serviceId: service.id,
                error: error.message,
              });
            });
          } catch (error) {
            logger.error('Failed to initiate schema discovery for new service', {
              serviceId: service.id,
              error: error.message,
            });
          }

          return service;
        });
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
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify service exists and user has access
          const existingService = await tx.service.findFirst({
            where: {
              id,
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

          const service = await tx.service.update({
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
        });
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Service name already exists in your organization');
        }
        logger.error('GraphQL service update error', { error: error.message, serviceId: id });
        throw new Error('Failed to update service');
      }
    },

    deleteService: async (_, { id, force = false }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify service exists and user has access
          const existingService = await tx.service.findFirst({
            where: {
              id,
            },
            include: {
              _count: {
                select: {
                  roles: true,
                  databaseObjects: true,
                },
              },
            },
          });

          if (!existingService) {
            throw new UserInputError('Service not found');
          }

          // Check for additional dependent records
          const exposedEntitiesCount = await tx.exposedEntity.count({
            where: { serviceId: id },
          });

          // Check for dependent records
          const hasRoles = existingService._count.roles > 0;
          const hasDatabaseObjects = existingService._count.databaseObjects > 0;
          const hasExposedEntities = exposedEntitiesCount > 0;
          const hasDependents = hasRoles || hasDatabaseObjects || hasExposedEntities;

          if (hasDependents && !force) {
            const dependencies = [];
            if (hasRoles) dependencies.push(`${existingService._count.roles} role(s)`);
            if (hasDatabaseObjects)
              dependencies.push(`${existingService._count.databaseObjects} database object(s)`);
            if (hasExposedEntities)
              dependencies.push(`${exposedEntitiesCount} exposed entity/entities`);

            throw new UserInputError(
              `Cannot delete service: it has dependent records (${dependencies.join(', ')}). Use force deletion to remove all dependent records.`
            );
          }
          // If force deletion, delete all dependent records
          if (force) {
            // Delete all roles associated with this service
            await tx.role.deleteMany({
              where: { serviceId: id },
            });

            // Delete all database objects associated with this service
            await tx.databaseObject.deleteMany({
              where: { serviceId: id },
            });

            // Delete all exposed entities associated with this service
            await tx.exposedEntity.deleteMany({
              where: { serviceId: id },
            });

            // Delete any API activity logs that might reference this service
            try {
              // First, find and delete logs with serviceId in metadata
              const logsWithServiceId = await tx.apiActivityLog.findMany({
                where: {
                  metadata: {
                    path: ['serviceId'],
                    equals: id,
                  },
                },
                select: { id: true },
              });

              if (logsWithServiceId.length > 0) {
                await tx.apiActivityLog.deleteMany({
                  where: {
                    id: { in: logsWithServiceId.map(log => log.id) },
                  },
                });
              }

              // Also delete logs related to the service's connection if applicable
              if (existingService.connectionId) {
                await tx.apiActivityLog.deleteMany({
                  where: {
                    endpoint: {
                      connectionId: existingService.connectionId,
                    },
                  },
                });
              }
            } catch (e) {
              // Log but don't fail if this fails
              logger.warn('Could not fully clean up API activity logs', { error: e.message });
            }

            logger.info('Force deleting service with dependencies', {
              serviceId: id,
              rolesDeleted: existingService._count.roles,
              databaseObjectsDeleted: existingService._count.databaseObjects,
              exposedEntitiesDeleted: exposedEntitiesCount,
              userId: currentUser.userId,
              organizationId: currentUser.organizationId,
            });
          }

          // Now delete the service
          await tx.service.delete({
            where: { id },
          });

          logger.info('Service deleted via GraphQL', {
            serviceId: id,
            forced: force,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return true;
        });
      } catch (error) {
        // Check for foreign key constraint error
        if (error.code === 'P2003') {
          // Try to provide more specific error message
          logger.error('Foreign key constraint violation', {
            error: error.message,
            meta: error.meta,
            serviceId: id,
          });

          // If not forcing, suggest force deletion
          if (!force) {
            throw new UserInputError(
              'Cannot delete service due to existing dependencies. Try using force deletion to remove all dependent records.'
            );
          } else {
            throw new UserInputError(
              'Cannot delete service due to database constraint. There may be additional references to this service that need to be manually removed.'
            );
          }
        }

        if (error instanceof UserInputError) {
          throw error;
        }

        logger.error('GraphQL service deletion error', {
          error: error.message,
          code: error.code,
          serviceId: id,
        });

        throw new Error(`Failed to delete service: ${error.message}`);
      }
    },

    testService: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        const service = await prismaService.withTenantContext(
          currentUser.organizationId,
          async tx => {
            return await tx.service.findFirst({
              where: {
                id,
              },
              include: {
                connection: true,
              },
            });
          }
        );

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

      const systemPrisma = prismaService.getSystemClient();
      return await systemPrisma.user.findUnique({
        where: { id: service.createdBy },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    },

    // Resolver for connection field - ensures connection info is populated
    connection: async (service, _, { user: currentUser }) => {
      if (service.connection) return service.connection;

      if (!service.connectionId) return null;

      if (!currentUser?.organizationId) return null;

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        return await tx.databaseConnection.findUnique({
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
      });
    },

    // Resolver for effectiveHost field - returns the actual host being used
    effectiveHost: async (service, _, { user: currentUser }) => {
      // If service uses a connection, return connection's host
      if (service.connectionId) {
        if (service.connection) {
          return service.connection.host || service.host;
        }

        if (!currentUser?.organizationId) return service.host;

        const connection = await prismaService.withTenantContext(
          currentUser.organizationId,
          async tx => {
            return await tx.databaseConnection.findUnique({
              where: { id: service.connectionId },
            });
          }
        );
        return connection?.host || service.host;
      }

      // Otherwise return service's own host
      return service.host;
    },
  },
};

module.exports = serviceResolvers;
