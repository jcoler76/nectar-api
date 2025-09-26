const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { logger } = require('../../utils/logger');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { encryptApiKey, decryptApiKey, generateApiKey } = require('../../utils/encryption');
const prismaService = require('../../services/prismaService');

const applicationResolvers = {
  Query: {
    application: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing application management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access application management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const application = await tx.application.findFirst({
          where: {
            id,
          },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            defaultRole: {
              include: {
                service: true,
              },
            },
            organization: true,
          },
        });

        if (!application) {
          throw new UserInputError('Application not found');
        }

        return application;
      });
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

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

        // Build where clause for filters (no organizationId - handled by RLS)
        const where = {};

        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        if (filters.name) {
          where.name = { contains: filters.name, mode: 'insensitive' };
        }
        if (filters.createdBy) where.createdBy = filters.createdBy;

        if (filters.search) {
          where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        // Get total count for pagination
        const totalCount = await tx.application.count({ where });

        // Get applications with pagination
        const applications = await tx.application.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            defaultRole: {
              include: {
                service: {
                  select: { id: true, name: true, database: true },
                },
              },
            },
            organization: true,
          },
        });

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
      });
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

        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify default role exists and belongs to organization
          const defaultRole = await tx.role.findFirst({
            where: {
              id: defaultRoleId,
            },
          });

          if (!defaultRole) {
            throw new UserInputError('Default role not found');
          }

          // Generate API key
          const apiKey = await generateApiKey();
          const apiKeyHash = await bcrypt.hash(apiKey, 10);
          const apiKeyEncrypted = encryptApiKey(apiKey);
          const apiKeyPrefix = apiKey.substring(0, 8);
          const apiKeyHint = '•'.repeat(56) + apiKey.substring(apiKey.length - 4);

          const application = await tx.application.create({
            data: {
              name,
              description,
              defaultRoleId,
              apiKeyHash,
              apiKeyEncrypted,
              apiKeyPrefix,
              apiKeyHint,
              isActive: isActive !== undefined ? isActive : true,
              organizationId: currentUser.organizationId,
              createdBy: currentUser.userId,
            },
            include: {
              creator: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
              defaultRole: {
                include: {
                  service: true,
                },
              },
              organization: true,
            },
          });

          logger.info('Application created via GraphQL', {
            applicationId: application.id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          // Return with the plain API key for initial display
          return {
            ...application,
            apiKey: apiKey, // Include plain API key only on creation
          };
        });
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Application name already exists in your organization');
        }
        logger.error('GraphQL application creation error', { error: error.message, input });
        throw new Error('Failed to create application');
      }
    },

    updateApplication: async (_, { id, input }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify application exists and user has access
          const existingApplication = await tx.application.findFirst({
            where: {
              id,
            },
          });

          if (!existingApplication) {
            throw new UserInputError('Application not found');
          }

          const { defaultRoleId, ...updateData } = input;

          // Verify default role if provided
          if (defaultRoleId) {
            const defaultRole = await tx.role.findFirst({
              where: {
                id: defaultRoleId,
              },
            });

            if (!defaultRole) {
              throw new UserInputError('Default role not found');
            }

            updateData.defaultRoleId = defaultRoleId;
          }

          const application = await tx.application.update({
            where: { id },
            data: updateData,
            include: {
              creator: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
              defaultRole: {
                include: {
                  service: true,
                },
              },
              organization: true,
            },
          });

          logger.info('Application updated via GraphQL', {
            applicationId: id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return application;
        });
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Application name already exists in your organization');
        }
        logger.error('GraphQL application update error', {
          error: error.message,
          applicationId: id,
        });
        throw new Error('Failed to update application');
      }
    },

    deleteApplication: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify application exists and user has access
          const existingApplication = await tx.application.findFirst({
            where: {
              id,
            },
          });

          if (!existingApplication) {
            throw new UserInputError('Application not found');
          }

          await tx.application.delete({
            where: { id },
          });

          logger.info('Application deleted via GraphQL', {
            applicationId: id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          return true;
        });
      } catch (error) {
        if (error.code === 'P2003') {
          throw new UserInputError('Cannot delete application: it has dependent records');
        }
        logger.error('GraphQL application deletion error', {
          error: error.message,
          applicationId: id,
        });
        return false;
      }
    },

    regenerateApiKey: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
          // Verify application exists and user has access
          const existingApplication = await tx.application.findFirst({
            where: {
              id,
            },
          });

          if (!existingApplication) {
            throw new UserInputError('Application not found');
          }

          // Generate new API key
          const newApiKey = await generateApiKey();
          const apiKeyHash = await bcrypt.hash(newApiKey, 10);
          const apiKeyEncrypted = encryptApiKey(newApiKey);
          const apiKeyPrefix = newApiKey.substring(0, 8);
          const apiKeyHint = '•'.repeat(56) + newApiKey.substring(newApiKey.length - 4);

          const application = await tx.application.update({
            where: { id },
            data: {
              apiKeyHash,
              apiKeyEncrypted,
              apiKeyPrefix,
              apiKeyHint,
            },
            include: {
              creator: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
              defaultRole: {
                include: {
                  service: true,
                },
              },
              organization: true,
            },
          });

          logger.info('Application API key regenerated via GraphQL', {
            applicationId: id,
            userId: currentUser.userId,
            organizationId: currentUser.organizationId,
          });

          // Return with the new plain API key for display
          return {
            ...application,
            apiKey: newApiKey, // Include plain API key only on regeneration
          };
        });
      } catch (error) {
        logger.error('GraphQL application API key regeneration error', {
          error: error.message,
          applicationId: id,
        });
        throw new Error('Failed to regenerate API key');
      }
    },
  },

  Application: {
    // Resolver for apiKey field - returns plain key if just created/regenerated, otherwise returns hint
    apiKey: async application => {
      // If the plain API key was included (on creation or regeneration), return it
      if (application.apiKey) return application.apiKey;

      // Otherwise return the masked hint
      return application.apiKeyHint || '•'.repeat(60);
    },

    // Resolver for createdBy field - ensures user info is populated
    createdBy: async application => {
      if (application.creator) return application.creator;

      if (!application.createdBy) return null;

      // User is an infrastructure table - use getSystemClient()
      const prisma = prismaService.getSystemClient();
      return await prisma.user.findUnique({
        where: { id: application.createdBy },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    },

    // Resolver for defaultRole field - ensures role info is populated
    defaultRole: async (application, _, context) => {
      if (application.defaultRole) return application.defaultRole;

      if (!application.defaultRoleId) return null;

      // Role is a tenant table - use withTenantContext with organizationId from parent
      return await prismaService.withTenantContext(application.organizationId, async tx => {
        return await tx.role.findUnique({
          where: { id: application.defaultRoleId },
          include: {
            service: true,
          },
        });
      });
    },

    // Resolver for organization field - ensures organization info is populated
    organization: async application => {
      if (application.organization) return application.organization;

      if (!application.organizationId) {
        // Log data integrity issue - applications should always have an organizationId
        logger.warn('Application missing organizationId - data integrity issue', {
          applicationId: application.id,
          applicationName: application.name,
        });
        return null;
      }

      try {
        // Organization is an infrastructure table - use getSystemClient()
        const prisma = prismaService.getSystemClient();
        const org = await prisma.organization.findUnique({
          where: { id: application.organizationId },
        });

        if (!org) {
          logger.warn('Application references non-existent organization', {
            applicationId: application.id,
            organizationId: application.organizationId,
          });
        }

        return org;
      } catch (error) {
        logger.error('Error fetching organization for application', {
          applicationId: application.id,
          organizationId: application.organizationId,
          error: error.message,
        });
        return null;
      }
    },
  },
};

module.exports = applicationResolvers;
