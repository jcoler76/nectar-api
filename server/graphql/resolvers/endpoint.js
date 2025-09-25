const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { logger } = require('../../utils/logger');
const crypto = require('crypto');
const prismaService = require('../../services/prismaService');

const endpointResolvers = {
  // Type resolvers
  Endpoint: {
    // Resolver for creator field - ensures user info is populated
    creator: async endpoint => {
      if (endpoint.creator) return endpoint.creator;

      if (!endpoint.createdBy) return null;

      // User is an infrastructure table - use getSystemClient()
      const prisma = prismaService.getSystemClient();
      return await prisma.user.findUnique({
        where: { id: endpoint.createdBy },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    },

    // Usage statistics from activity logs
    usageCount: async endpoint => {
      // ApiActivityLog is a tenant table - use withTenantContext with organizationId from parent
      return await prismaService.withTenantContext(endpoint.organizationId, async tx => {
        return await tx.apiActivityLog.count({
          where: { endpointId: endpoint.id },
        });
      });
    },

    lastUsed: async endpoint => {
      // ApiActivityLog is a tenant table - use withTenantContext with organizationId from parent
      return await prismaService.withTenantContext(endpoint.organizationId, async tx => {
        const lastUsage = await tx.apiActivityLog.findFirst({
          where: { endpointId: endpoint.id },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true },
        });
        return lastUsage?.timestamp || null;
      });
    },

    // Connection resolver
    connection: async endpoint => {
      if (endpoint.connection) return endpoint.connection;

      if (!endpoint.connectionId) return null;

      // DatabaseConnection is a tenant table - use withTenantContext with organizationId from parent
      return await prismaService.withTenantContext(endpoint.organizationId, async tx => {
        return await tx.databaseConnection.findUnique({
          where: { id: endpoint.connectionId },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });
      });
    },
  },

  // Query resolvers
  Query: {
    endpoint: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing endpoint management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access endpoint management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const endpoint = await tx.endpoint.findFirst({
          where: {
            id,
          },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            connection: {
              include: {
                creator: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
              },
            },
            organization: true,
          },
        });

        if (!endpoint) {
          throw new UserInputError('Endpoint not found');
        }

        // Check ownership
        if (endpoint.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        return endpoint;
      });
    },

    endpoints: async (
      _,
      { filters = {}, pagination = {} },
      { user: currentUser, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing endpoints list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access endpoint management');
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
        if (filters.createdBy) {
          where.createdBy = filters.createdBy;
        } else if (!currentUser.isAdmin) {
          // Non-admin users can only see their own endpoints
          where.createdBy = currentUser.userId;
        }

        if (filters.search) {
          where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        if (filters.createdAfter) {
          where.createdAt = { ...where.createdAt, gte: new Date(filters.createdAfter) };
        }
        if (filters.createdBefore) {
          where.createdAt = { ...where.createdAt, lte: new Date(filters.createdBefore) };
        }

        // Get total count for pagination
        const totalCount = await tx.endpoint.count({ where });

        // Get endpoints with pagination
        const endpoints = await tx.endpoint.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            connection: {
              select: { id: true, name: true, host: true, port: true },
            },
            _count: {
              select: { usageLogs: true },
            },
          },
        });

        return {
          edges: endpoints.map((endpoint, index) => ({
            node: endpoint,
            cursor: Buffer.from((offset + index).toString()).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: offset + limit < totalCount,
            hasPreviousPage: offset > 0,
            totalCount,
            startCursor:
              endpoints.length > 0 ? Buffer.from(offset.toString()).toString('base64') : null,
            endCursor:
              endpoints.length > 0
                ? Buffer.from((offset + endpoints.length - 1).toString()).toString('base64')
                : null,
          },
        };
      });
    },

    myEndpoints: async (
      _,
      { filters = {}, pagination = {} },
      { user: currentUser, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing endpoints
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access endpoint management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

        const where = {
          createdBy: currentUser.userId,
        };

        if (filters.isActive !== undefined) {
          where.isActive = filters.isActive;
        }
        if (filters.search) {
          where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        const totalCount = await tx.endpoint.count({ where });
        const endpoints = await tx.endpoint.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
          include: {
            connection: {
              select: { id: true, name: true, host: true, port: true },
            },
            _count: {
              select: { usageLogs: true },
            },
          },
        });

        return {
          edges: endpoints.map((endpoint, index) => ({
            node: endpoint,
            cursor: Buffer.from((offset + index).toString()).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: offset + limit < totalCount,
            hasPreviousPage: offset > 0,
            totalCount,
            startCursor:
              endpoints.length > 0 ? Buffer.from(offset.toString()).toString('base64') : null,
            endCursor:
              endpoints.length > 0
                ? Buffer.from((offset + endpoints.length - 1).toString()).toString('base64')
                : null,
          },
        };
      });
    },

    endpointUsage: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing endpoint usage
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access endpoint management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const endpoint = await tx.endpoint.findFirst({
          where: {
            id,
          },
        });

        if (!endpoint) {
          throw new UserInputError('Endpoint not found');
        }

        // Check ownership
        if (endpoint.createdBy !== currentUser.userId && !currentUser.isAdmin) {
          throw new ForbiddenError('Access denied');
        }

        // Get usage statistics
        const usageStats = await tx.apiActivityLog.groupBy({
          by: ['statusCode'],
          where: { endpointId: id },
          _count: { id: true },
          _avg: { responseTime: true },
          orderBy: { statusCode: 'asc' },
        });

        const totalRequests = await tx.apiActivityLog.count({
          where: { endpointId: id },
        });

        const recentUsage = await tx.apiActivityLog.findMany({
          where: { endpointId: id },
          orderBy: { timestamp: 'desc' },
          take: 10,
          select: {
            timestamp: true,
            statusCode: true,
            responseTime: true,
            method: true,
            userAgent: true,
          },
        });

        return {
          totalRequests,
          statusCodes: usageStats.map(stat => ({
            code: stat.statusCode,
            count: stat._count.id,
            avgResponseTime: stat._avg.responseTime,
          })),
          recentUsage,
        };
      });
    },

    verifyApiKey: async (_, { apiKey }) => {
      // This is typically used for public verification, so no auth required
      // First get the endpoint to find its organizationId
      const prisma = prismaService.getSystemClient();
      const endpoint = await prisma.endpoint.findUnique({
        where: { apiKey },
        select: { id: true, organizationId: true, isActive: true },
      });

      if (!endpoint || !endpoint.isActive) {
        return null;
      }

      // Now fetch full endpoint data with tenant context
      return await prismaService.withTenantContext(endpoint.organizationId, async tx => {
        return await tx.endpoint.findUnique({
          where: { id: endpoint.id },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            connection: {
              select: { id: true, name: true, host: true, port: true },
            },
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        });
      });
    },
  },

  // Mutation resolvers
  Mutation: {
    createEndpoint: async (_, { input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          const { name, path, method, query, connectionId, ...otherData } = input;

          if (!name || !path || !method || !query) {
            throw new UserInputError('Missing required fields: name, path, method, query');
          }

          // Verify connection exists and belongs to organization if provided
          if (connectionId) {
            const connection = await tx.databaseConnection.findFirst({
              where: {
                id: connectionId,
              },
            });

            if (!connection) {
              throw new UserInputError('Connection not found');
            }
          }

          // Generate API key
          const apiKey = crypto.randomBytes(32).toString('hex');

          const endpoint = await tx.endpoint.create({
            data: {
              name,
              path,
              method,
              query,
              apiKey,
              connectionId,
              organizationId: currentUser.organizationId,
              createdBy: currentUser.userId,
              ...otherData,
            },
            include: {
              creator: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
              connection: {
                include: {
                  creator: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                  },
                },
              },
              organization: true,
            },
          });

          logger.info('Endpoint created via GraphQL', {
            endpointId: endpoint.id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return endpoint;
        });
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Endpoint name already exists');
        }
        logger.error('GraphQL endpoint creation error', { error: error.message, input });
        throw new Error('Failed to create endpoint');
      }
    },

    updateEndpoint: async (_, { id, input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify endpoint exists and user has access
          const existingEndpoint = await tx.endpoint.findFirst({
            where: {
              id,
            },
          });

          if (!existingEndpoint) {
            throw new UserInputError('Endpoint not found');
          }

          // Check ownership
          if (existingEndpoint.createdBy !== currentUser.userId && !currentUser.isAdmin) {
            throw new ForbiddenError('Access denied');
          }

          const { connectionId, ...updateData } = input;

          // Verify connection if being updated
          if (connectionId && connectionId !== existingEndpoint.connectionId) {
            const connection = await tx.databaseConnection.findFirst({
              where: {
                id: connectionId,
              },
            });

            if (!connection) {
              throw new UserInputError('Connection not found');
            }

            updateData.connectionId = connectionId;
          }

          const endpoint = await tx.endpoint.update({
            where: { id },
            data: updateData,
            include: {
              creator: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
              connection: {
                include: {
                  creator: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                  },
                },
              },
              organization: true,
            },
          });

          logger.info('Endpoint updated via GraphQL', {
            endpointId: id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return endpoint;
        });
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Endpoint name must be unique');
        }
        logger.error('GraphQL endpoint update error', { error: error.message, endpointId: id });
        throw new Error('Failed to update endpoint');
      }
    },

    deleteEndpoint: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify endpoint exists and user has access
          const existingEndpoint = await tx.endpoint.findFirst({
            where: {
              id,
            },
          });

          if (!existingEndpoint) {
            throw new UserInputError('Endpoint not found');
          }

          // Check ownership
          if (existingEndpoint.createdBy !== currentUser.userId && !currentUser.isAdmin) {
            throw new ForbiddenError('Access denied');
          }

          await tx.endpoint.delete({ where: { id } });

          logger.info('Endpoint deleted via GraphQL', {
            endpointId: id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return true;
        });
      } catch (error) {
        if (error.code === 'P2003') {
          throw new UserInputError('Cannot delete endpoint: it has dependent records');
        }
        logger.error('GraphQL endpoint deletion error', { error: error.message, endpointId: id });
        return false;
      }
    },

    regenerateEndpointApiKey: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify endpoint exists and user has access
          const existingEndpoint = await tx.endpoint.findFirst({
            where: {
              id,
            },
          });

          if (!existingEndpoint) {
            throw new UserInputError('Endpoint not found');
          }

          // Check ownership
          if (existingEndpoint.createdBy !== currentUser.userId && !currentUser.isAdmin) {
            throw new ForbiddenError('Access denied');
          }

          // Generate new API key
          let newApiKey = crypto.randomBytes(32).toString('hex');

          // Ensure the new key is unique (very unlikely to collide, but be safe)
          const existingWithKey = await tx.endpoint.findUnique({
            where: { apiKey: newApiKey },
          });

          if (existingWithKey) {
            // Regenerate if collision (extremely rare)
            newApiKey = crypto.randomBytes(32).toString('hex');
          }

          const endpoint = await tx.endpoint.update({
            where: { id },
            data: { apiKey: newApiKey },
            include: {
              creator: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
              connection: {
                select: { id: true, name: true, host: true, port: true },
              },
              organization: true,
            },
          });

          logger.info('Endpoint API key regenerated via GraphQL', {
            endpointId: id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return {
            success: true,
            newApiKey: endpoint.apiKey,
            message: 'API key regenerated successfully',
            endpoint,
          };
        });
      } catch (error) {
        logger.error('GraphQL endpoint API key regeneration error', {
          error: error.message,
          endpointId: id,
        });
        throw new Error('Failed to regenerate API key');
      }
    },

    activateEndpoint: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify endpoint exists and user has access
          const existingEndpoint = await tx.endpoint.findFirst({
            where: {
              id,
            },
          });

          if (!existingEndpoint) {
            throw new UserInputError('Endpoint not found');
          }

          // Check ownership
          if (existingEndpoint.createdBy !== currentUser.userId && !currentUser.isAdmin) {
            throw new ForbiddenError('Access denied');
          }

          const endpoint = await tx.endpoint.update({
            where: { id },
            data: { isActive: true },
            include: {
              creator: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
              connection: {
                include: {
                  creator: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                  },
                },
              },
              organization: true,
            },
          });

          logger.info('Endpoint activated via GraphQL', {
            endpointId: id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return endpoint;
        });
      } catch (error) {
        logger.error('GraphQL endpoint activation error', { error: error.message, endpointId: id });
        throw new Error('Failed to activate endpoint');
      }
    },

    deactivateEndpoint: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify endpoint exists and user has access
          const existingEndpoint = await tx.endpoint.findFirst({
            where: {
              id,
            },
          });

          if (!existingEndpoint) {
            throw new UserInputError('Endpoint not found');
          }

          // Check ownership
          if (existingEndpoint.createdBy !== currentUser.userId && !currentUser.isAdmin) {
            throw new ForbiddenError('Access denied');
          }

          const endpoint = await tx.endpoint.update({
            where: { id },
            data: { isActive: false },
            include: {
              creator: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
              connection: {
                include: {
                  creator: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                  },
                },
              },
              organization: true,
            },
          });

          logger.info('Endpoint deactivated via GraphQL', {
            endpointId: id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return endpoint;
        });
      } catch (error) {
        logger.error('GraphQL endpoint deactivation error', {
          error: error.message,
          endpointId: id,
        });
        throw new Error('Failed to deactivate endpoint');
      }
    },
  },
};

module.exports = endpointResolvers;
