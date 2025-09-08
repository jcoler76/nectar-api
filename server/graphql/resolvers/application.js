const { PrismaClient } = require('../../prisma/generated/client');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { logger } = require('../../utils/logger');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

const applicationResolvers = {
  Query: {
    application: async (_, { id }, { user: currentUser, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing application management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access application management');
      }

      if (!currentUser) throw new AuthenticationError('Authentication required');

      const application = await prisma.application.findFirst({
        where: {
          id,
          organizationId: currentUser.organizationId
        },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true }
          },
          defaultRole: {
            include: {
              service: true
            }
          },
          organization: true
        }
      });

      if (!application) {
        throw new UserInputError('Application not found');
      }

      return application;
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

      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

      // Build where clause for filters
      const where = {
        organizationId: currentUser.organizationId
      };

      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.name) {
        where.name = { contains: filters.name, mode: 'insensitive' };
      }
      if (filters.createdBy) where.createdBy = filters.createdBy;
      
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      // Get total count for pagination
      const totalCount = await prisma.application.count({ where });

      // Get applications with pagination
      const applications = await prisma.application.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true }
          },
          defaultRole: {
            include: {
              service: {
                select: { id: true, name: true, database: true }
              }
            }
          }
        }
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

        // Verify default role exists and belongs to organization
        const defaultRole = await prisma.role.findFirst({
          where: {
            id: defaultRoleId,
            organizationId: currentUser.organizationId
          }
        });

        if (!defaultRole) {
          throw new UserInputError('Default role not found');
        }

        // Generate API key
        const apiKey = crypto.randomBytes(32).toString('hex');

        const application = await prisma.application.create({
          data: {
            name,
            description,
            defaultRoleId,
            apiKey,
            isActive: isActive !== undefined ? isActive : true,
            organizationId: currentUser.organizationId,
            createdBy: currentUser.userId,
          },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            defaultRole: {
              include: {
                service: true
              }
            },
            organization: true
          }
        });

        logger.info('Application created via GraphQL', {
          applicationId: application.id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId
        });

        return application;
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
        // Verify application exists and user has access
        const existingApplication = await prisma.application.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId
          }
        });

        if (!existingApplication) {
          throw new UserInputError('Application not found');
        }

        const { defaultRoleId, ...updateData } = input;

        // Verify default role if provided
        if (defaultRoleId) {
          const defaultRole = await prisma.role.findFirst({
            where: {
              id: defaultRoleId,
              organizationId: currentUser.organizationId
            }
          });

          if (!defaultRole) {
            throw new UserInputError('Default role not found');
          }

          updateData.defaultRoleId = defaultRoleId;
        }

        const application = await prisma.application.update({
          where: { id },
          data: updateData,
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            defaultRole: {
              include: {
                service: true
              }
            },
            organization: true
          }
        });

        logger.info('Application updated via GraphQL', {
          applicationId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId
        });

        return application;
      } catch (error) {
        if (error.code === 'P2002') {
          throw new UserInputError('Application name already exists in your organization');
        }
        logger.error('GraphQL application update error', { error: error.message, applicationId: id });
        throw new Error('Failed to update application');
      }
    },

    deleteApplication: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify application exists and user has access
        const existingApplication = await prisma.application.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId
          }
        });

        if (!existingApplication) {
          throw new UserInputError('Application not found');
        }

        await prisma.application.delete({
          where: { id }
        });

        logger.info('Application deleted via GraphQL', {
          applicationId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId
        });

        return true;
      } catch (error) {
        if (error.code === 'P2003') {
          throw new UserInputError('Cannot delete application: it has dependent records');
        }
        logger.error('GraphQL application deletion error', { error: error.message, applicationId: id });
        return false;
      }
    },

    regenerateApiKey: async (_, { id }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      try {
        // Verify application exists and user has access
        const existingApplication = await prisma.application.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId
          }
        });

        if (!existingApplication) {
          throw new UserInputError('Application not found');
        }

        // Generate new API key
        const newApiKey = crypto.randomBytes(32).toString('hex');

        const application = await prisma.application.update({
          where: { id },
          data: { apiKey: newApiKey },
          include: {
            creator: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            defaultRole: {
              include: {
                service: true
              }
            },
            organization: true
          }
        });

        logger.info('Application API key regenerated via GraphQL', {
          applicationId: id,
          userId: currentUser.userId,
          organizationId: currentUser.organizationId
        });

        return application;
      } catch (error) {
        logger.error('GraphQL application API key regeneration error', { error: error.message, applicationId: id });
        throw new Error('Failed to regenerate API key');
      }
    },
  },

  Application: {
    // Resolver for createdBy field - ensures user info is populated
    createdBy: async (application) => {
      if (application.creator) return application.creator;
      
      if (!application.createdBy) return null;
      
      return await prisma.user.findUnique({
        where: { id: application.createdBy },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
    },

    // Resolver for defaultRole field - ensures role info is populated
    defaultRole: async (application) => {
      if (application.defaultRole) return application.defaultRole;
      
      if (!application.defaultRoleId) return null;
      
      return await prisma.role.findUnique({
        where: { id: application.defaultRoleId },
        include: {
          service: true
        }
      });
    },
  },
};

module.exports = applicationResolvers;
