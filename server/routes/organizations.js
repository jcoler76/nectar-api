const express = require('express');
const router = express.Router();
// SECURITY FIX: Use proper prismaService for tenant isolation
const prismaService = require('../services/prismaService');
const AuthFactory = require('../middleware/authFactory');
const authenticateToken = AuthFactory.createJWTMiddleware();
const InputValidator = require('../utils/inputValidation');
const { logger } = require('../utils/logger');
const { errorResponses } = require('../utils/errorHandler');
const crypto = require('crypto');
const {
  requirePermission,
  PERMISSIONS,
  userHasPermission,
  canPerformAction,
} = require('../utils/rolePermissions');
const { logRoleChange, logInvitationEvent } = require('../services/auditService');

// Helper function to generate a URL-safe slug from name
const generateSlug = name => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Helper function to generate unique slug
const generateUniqueSlug = async name => {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  // SECURITY NOTE: Use system client for global slug uniqueness check
  // Organization slugs must be globally unique across the platform
  const systemPrisma = prismaService.getSystemClient();
  while (await systemPrisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// Validation middleware
const validateOrganizationId = InputValidator.createValidationMiddleware({
  params: {
    id: value =>
      InputValidator.validateString(value, {
        required: true,
        minLength: 1,
        fieldName: 'organization ID',
      }),
  },
});

const validateOrganizationCreation = InputValidator.createValidationMiddleware({
  body: {
    name: value =>
      InputValidator.validateString(value, {
        required: true,
        minLength: 1,
        maxLength: 100,
        fieldName: 'name',
      }),
    domain: value =>
      value
        ? InputValidator.validateString(value, {
            maxLength: 253,
            fieldName: 'domain',
          })
        : undefined,
    website: value =>
      value
        ? InputValidator.validateString(value, {
            maxLength: 500,
            fieldName: 'website',
          })
        : undefined,
  },
});

const validateOrganizationUpdate = InputValidator.createValidationMiddleware({
  body: {
    name: value =>
      value
        ? InputValidator.validateString(value, {
            minLength: 1,
            maxLength: 100,
            fieldName: 'name',
          })
        : undefined,
    domain: value =>
      value !== undefined
        ? value === null
          ? null
          : InputValidator.validateString(value, {
              maxLength: 253,
              fieldName: 'domain',
            })
        : undefined,
    website: value =>
      value !== undefined
        ? value === null
          ? null
          : InputValidator.validateString(value, {
              maxLength: 500,
              fieldName: 'website',
            })
        : undefined,
    logo: value =>
      value !== undefined
        ? value === null
          ? null
          : InputValidator.validateString(value, {
              maxLength: 500,
              fieldName: 'logo',
            })
        : undefined,
  },
});

// POST /api/organizations - Create new organization
router.post(
  '/',
  authenticateToken,
  requirePermission(PERMISSIONS.ORG_CREATE),
  validateOrganizationCreation,
  async (req, res) => {
    try {
      const { name, domain, website } = req.body;
      const userId = req.user.userId;

      // SECURITY FIX: Use system client for organization creation
      // Organization creation requires system-level access
      const systemPrisma = prismaService.getSystemClient();

      // Validate domain uniqueness if provided
      if (domain) {
        const existingOrg = await systemPrisma.organization.findUnique({
          where: { domain },
        });

        if (existingOrg) {
          return res.status(400).json({
            error: { code: 'BAD_REQUEST', message: 'Domain already exists' },
          });
        }
      }

      // Generate unique slug
      const slug = await generateUniqueSlug(name);

      // Create organization with transaction to ensure atomicity
      const result = await systemPrisma.$transaction(async tx => {
        // Create organization
        const organization = await tx.organization.create({
          data: {
            id: crypto.randomUUID(),
            name,
            slug,
            domain: domain || null,
            website: website || null,
            updatedAt: new Date(),
          },
        });

        // Create default subscription (free tier)
        const subscription = await tx.subscription.create({
          data: {
            id: crypto.randomUUID(),
            plan: 'FREE',
            status: 'TRIALING',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            maxDatabaseConnections: 1,
            maxApiCallsPerMonth: 10000,
            maxUsersPerOrg: 3,
            maxWorkflows: 5,
            organizationId: organization.id,
            updatedAt: new Date(),
          },
        });

        // Create membership for creator as OWNER
        const membership = await tx.membership.create({
          data: {
            id: crypto.randomUUID(),
            role: 'OWNER',
            userId: userId,
            organizationId: organization.id,
          },
        });

        return { organization, subscription, membership };
      });

      logger.info('Organization created successfully', {
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        createdByUserId: userId,
        ip: req.ip,
      });

      // Return organization with subscription info
      const orgWithSubscription = await systemPrisma.organization.findUnique({
        where: { id: result.organization.id },
        include: {
          subscription: {
            select: {
              plan: true,
              status: true,
              trialEndsAt: true,
              maxDatabaseConnections: true,
              maxApiCallsPerMonth: true,
              maxUsersPerOrg: true,
              maxWorkflows: true,
            },
          },
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: {
              databaseConnections: true,
              workflows: true,
              apiKeys: true,
            },
          },
        },
      });

      res.status(201).json(orgWithSubscription);
    } catch (error) {
      logger.error('Error creating organization:', {
        error: error.message,
        userId: req.user?.userId,
        ip: req.ip,
      });
      errorResponses.serverError(res, error);
    }
  }
);

// GET /api/organizations - Get user's organizations
router.get('/', async (req, res) => {
  try {
    const { getPrismaClient } = require('../config/prisma');
    const regularPrisma = getPrismaClient();

    const userId = req.query.userId || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID required',
      });
    }

    const user = await regularPrisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });

    if (user?.isSuperAdmin) {
      const allOrganizations = await regularPrisma.organization.findMany({
        include: {
          subscription: {
            select: {
              plan: true,
              status: true,
              trialEndsAt: true,
              maxDatabaseConnections: true,
              maxApiCallsPerMonth: true,
              maxUsersPerOrg: true,
              maxWorkflows: true,
            },
          },
          _count: {
            select: {
              databaseConnections: true,
              workflows: true,
              apiKeys: true,
              memberships: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const organizations = allOrganizations.map(org => ({
        ...org,
        userRole: 'SUPER_ADMIN',
        joinedAt: org.createdAt,
      }));

      return res.json({ organizations });
    }

    // SECURITY FIX: Use system client for membership lookup to get all user's organizations
    // This is appropriate since we need to find memberships across all organizations for this user
    const systemPrisma = prismaService.getSystemClient();
    const memberships = await systemPrisma.membership.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            subscription: {
              select: {
                plan: true,
                status: true,
                trialEndsAt: true,
                maxDatabaseConnections: true,
                maxApiCallsPerMonth: true,
                maxUsersPerOrg: true,
                maxWorkflows: true,
              },
            },
            _count: {
              select: {
                databaseConnections: true,
                workflows: true,
                apiKeys: true,
                memberships: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    const organizations = memberships.map(membership => ({
      ...membership.organization,
      userRole: membership.role,
      joinedAt: membership.joinedAt,
    }));

    res.json({ organizations });
  } catch (error) {
    logger.error('Error fetching organizations:', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip,
    });
    errorResponses.serverError(res, error);
  }
});

// GET /api/organizations/:id - Get organization by ID
router.get(
  '/:id',
  authenticateToken,
  AuthFactory.requireOrganizationAccess(),
  validateOrganizationId,
  async (req, res) => {
    try {
      const organizationId = req.params.id;
      const userId = req.user.userId;

      // SECURITY FIX: Check membership and get organization with proper RLS
      const result = await prismaService.withTenantContext(organizationId, async tx => {
        // Check if user has access to this organization
        const membership = await tx.membership.findUnique({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
        });

        if (!membership) {
          return { error: 'ACCESS_DENIED' };
        }

        // Get organization with full details
        const organization = await tx.organization.findFirst({
          where: {},
          include: {
            subscription: {
              select: {
                plan: true,
                status: true,
                trialEndsAt: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
                maxDatabaseConnections: true,
                maxApiCallsPerMonth: true,
                maxUsersPerOrg: true,
                maxWorkflows: true,
              },
            },
            memberships: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: {
                joinedAt: 'asc',
              },
            },
            databaseConnections: {
              select: {
                id: true,
                name: true,
                type: true,
                isActive: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            _count: {
              select: {
                workflows: true,
                apiKeys: true,
                usageMetrics: true,
              },
            },
          },
        });

        return { membership, organization };
      });

      if (result.error === 'ACCESS_DENIED') {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Access denied to this organization' },
        });
      }

      const { membership, organization } = result;

      if (!organization) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        });
      }

      // Add user's role to the response
      const responseData = {
        ...organization,
        userRole: membership.role,
      };

      res.json(responseData);
    } catch (error) {
      logger.error('Error fetching organization:', {
        error: error.message,
        organizationId: req.params.id,
        userId: req.user?.userId,
        ip: req.ip,
      });
      errorResponses.serverError(res, error);
    }
  }
);

// PUT /api/organizations/:id - Update organization
router.put(
  '/:id',
  authenticateToken,
  AuthFactory.requireOrganizationAccess([
    'OWNER',
    'ADMIN',
    'ORGANIZATION_OWNER',
    'ORGANIZATION_ADMIN',
  ]),
  validateOrganizationId,
  validateOrganizationUpdate,
  async (req, res) => {
    try {
      const organizationId = req.params.id;
      const userId = req.user.userId;
      const { name, domain, website, logo } = req.body;

      // SECURITY FIX: Use withTenantContext for organization update validation
      const validation = await prismaService.withTenantContext(organizationId, async tx => {
        // Check if user has admin access to this organization
        const membership = await tx.membership.findUnique({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
        });

        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
          return { error: 'FORBIDDEN' };
        }

        // Check if organization exists
        const existingOrg = await tx.organization.findFirst({
          where: {},
        });

        if (!existingOrg) {
          return { error: 'NOT_FOUND' };
        }

        return { existingOrg };
      });

      if (validation.error === 'FORBIDDEN') {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        });
      }

      if (validation.error === 'NOT_FOUND') {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        });
      }

      const { existingOrg } = validation;

      // Validate domain uniqueness if being changed (requires system client for global check)
      if (domain && domain !== existingOrg.domain) {
        const systemPrisma = prismaService.getSystemClient();
        const domainExists = await systemPrisma.organization.findUnique({
          where: { domain },
        });

        if (domainExists) {
          return res.status(400).json({
            error: { code: 'BAD_REQUEST', message: 'Domain already exists' },
          });
        }
      }

      // Build update data
      const updateData = { updatedAt: new Date() };
      if (name !== undefined) {
        updateData.name = name;
        updateData.slug = await generateUniqueSlug(name);
      }
      if (domain !== undefined) updateData.domain = domain;
      if (website !== undefined) updateData.website = website;
      if (logo !== undefined) updateData.logo = logo;

      // SECURITY FIX: Update organization with proper RLS
      const updatedOrganization = await prismaService.withTenantContext(
        organizationId,
        async tx => {
          return await tx.organization.update({
            where: { id: organizationId },
            data: updateData,
            include: {
              subscription: {
                select: {
                  plan: true,
                  status: true,
                  trialEndsAt: true,
                  maxDatabaseConnections: true,
                  maxApiCallsPerMonth: true,
                  maxUsersPerOrg: true,
                  maxWorkflows: true,
                },
              },
              _count: {
                select: {
                  databaseConnections: true,
                  workflows: true,
                  apiKeys: true,
                  memberships: true,
                },
              },
            },
          });
        }
      );

      logger.info('Organization updated successfully', {
        organizationId,
        updatedFields: Object.keys(updateData),
        updatedByUserId: userId,
        ip: req.ip,
      });

      res.json(updatedOrganization);
    } catch (error) {
      logger.error('Error updating organization:', {
        error: error.message,
        organizationId: req.params.id,
        userId: req.user?.userId,
        ip: req.ip,
      });
      errorResponses.serverError(res, error);
    }
  }
);

// DELETE /api/organizations/:id - Delete organization
router.delete(
  '/:id',
  authenticateToken,
  AuthFactory.requireOrganizationAccess(['OWNER', 'ORGANIZATION_OWNER']),
  validateOrganizationId,
  async (req, res) => {
    try {
      const organizationId = req.params.id;
      const userId = req.user.userId;

      // SECURITY FIX: Use withTenantContext for organization deletion
      const result = await prismaService.withTenantContext(organizationId, async tx => {
        // Check if user is the owner of this organization
        const membership = await tx.membership.findUnique({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
        });

        if (!membership || membership.role !== 'OWNER') {
          return { error: 'FORBIDDEN' };
        }

        // Check if organization exists and get details for logging
        const organization = await tx.organization.findFirst({
          where: {},
          include: {
            _count: {
              select: {
                memberships: true,
                databaseConnections: true,
                workflows: true,
              },
            },
          },
        });

        if (!organization) {
          return { error: 'NOT_FOUND' };
        }

        // Delete organization (cascade will handle related records)
        await tx.organization.delete({
          where: { id: organizationId },
        });

        return { organization };
      });

      if (result.error === 'FORBIDDEN') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners can delete organizations',
          },
        });
      }

      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        });
      }

      const { organization } = result;

      logger.info('Organization deleted successfully', {
        organizationId,
        organizationName: organization.name,
        deletedByUserId: userId,
        memberCount: organization._count.memberships,
        connectionsCount: organization._count.databaseConnections,
        workflowsCount: organization._count.workflows,
        ip: req.ip,
      });

      res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
      logger.error('Error deleting organization:', {
        error: error.message,
        organizationId: req.params.id,
        userId: req.user?.userId,
        ip: req.ip,
      });
      errorResponses.serverError(res, error);
    }
  }
);

// GET /api/organizations/:id/members - Get organization members
router.get(
  '/:id/members',
  authenticateToken,
  AuthFactory.requireOrganizationAccess(),
  validateOrganizationId,
  async (req, res) => {
    try {
      const organizationId = req.params.id;
      const userId = req.user.userId;

      // SECURITY FIX: Use withTenantContext for member list lookup
      const result = await prismaService.withTenantContext(organizationId, async tx => {
        // Check if user has access to this organization
        const membership = await tx.membership.findUnique({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
        });

        if (!membership) {
          return { error: 'FORBIDDEN' };
        }

        // Get all members of the organization
        const members = await tx.membership.findMany({
          where: {},
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                isActive: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        });

        return { members };
      });

      if (result.error === 'FORBIDDEN') {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Access denied to this organization' },
        });
      }

      const { members } = result;

      res.json({ members });
    } catch (error) {
      logger.error('Error fetching organization members:', {
        error: error.message,
        organizationId: req.params.id,
        userId: req.user?.userId,
        ip: req.ip,
      });
      errorResponses.serverError(res, error);
    }
  }
);

// GET /api/organizations/:id/usage - Get organization usage statistics
router.get(
  '/:id/usage',
  authenticateToken,
  AuthFactory.requireOrganizationAccess(),
  validateOrganizationId,
  async (req, res) => {
    try {
      const organizationId = req.params.id;
      const userId = req.user.userId;

      // SECURITY FIX: Use withTenantContext for organization usage lookup
      const result = await prismaService.withTenantContext(organizationId, async tx => {
        // Check if user has access to this organization
        const membership = await tx.membership.findUnique({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
        });

        if (!membership) {
          return { error: 'FORBIDDEN' };
        }

        // Get subscription limits
        const subscription = await tx.subscription.findFirst({
          where: {},
          select: {
            plan: true,
            maxDatabaseConnections: true,
            maxApiCallsPerMonth: true,
            maxUsersPerOrg: true,
            maxWorkflows: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        });

        if (!subscription) {
          return { error: 'SUBSCRIPTION_NOT_FOUND' };
        }

        // Get current usage counts
        const [connectionCount, memberCount, workflowCount, currentMonthUsage] = await Promise.all([
          tx.databaseConnection.count({ where: {} }),
          tx.membership.count({ where: {} }),
          tx.workflow.count({ where: {} }),
          tx.usageMetric.count({
            where: {
              timestamp: {
                gte: subscription.currentPeriodStart,
                lte: subscription.currentPeriodEnd,
              },
            },
          }),
        ]);

        return { subscription, connectionCount, memberCount, workflowCount, currentMonthUsage };
      });

      if (result.error === 'FORBIDDEN') {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Access denied to this organization' },
        });
      }

      if (result.error === 'SUBSCRIPTION_NOT_FOUND') {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Subscription not found' },
        });
      }

      const { subscription, connectionCount, memberCount, workflowCount, currentMonthUsage } =
        result;

      const usage = {
        plan: subscription.plan,
        currentPeriod: {
          start: subscription.currentPeriodStart,
          end: subscription.currentPeriodEnd,
        },
        limits: {
          databaseConnections: subscription.maxDatabaseConnections,
          apiCallsPerMonth: subscription.maxApiCallsPerMonth,
          usersPerOrg: subscription.maxUsersPerOrg,
          workflows: subscription.maxWorkflows,
        },
        current: {
          databaseConnections: connectionCount,
          apiCallsThisMonth: currentMonthUsage,
          users: memberCount,
          workflows: workflowCount,
        },
        usage: {
          databaseConnections: (connectionCount / subscription.maxDatabaseConnections) * 100,
          apiCallsPerMonth: (currentMonthUsage / subscription.maxApiCallsPerMonth) * 100,
          users: (memberCount / subscription.maxUsersPerOrg) * 100,
          workflows: (workflowCount / subscription.maxWorkflows) * 100,
        },
      };

      res.json(usage);
    } catch (error) {
      logger.error('Error fetching organization usage:', {
        error: error.message,
        organizationId: req.params.id,
        userId: req.user?.userId,
        ip: req.ip,
      });
      errorResponses.serverError(res, error);
    }
  }
);

// DELETE /api/organizations/:id/members/:memberId - Remove team member
router.delete(
  '/:id/members/:memberId',
  authenticateToken,
  validateOrganizationId,
  async (req, res) => {
    try {
      const { id: organizationId, memberId } = req.params;
      const userId = req.user.userId;

      // SECURITY FIX: Use withTenantContext for member removal
      const result = await prismaService.withTenantContext(organizationId, async tx => {
        // Check if user has admin permissions
        const userMembership = await tx.membership.findUnique({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
        });

        if (!userMembership || !['OWNER', 'ADMIN'].includes(userMembership.role)) {
          return { error: 'FORBIDDEN', message: 'You must be an owner or admin to remove members' };
        }

        // Get the member to be removed
        const memberToRemove = await tx.membership.findUnique({
          where: { id: memberId },
          include: { user: true },
        });

        if (!memberToRemove || memberToRemove.organizationId !== organizationId) {
          return { error: 'NOT_FOUND', message: 'Member not found' };
        }

        // Cannot remove owner
        if (memberToRemove.role === 'OWNER') {
          return { error: 'BAD_REQUEST', message: 'Cannot remove organization owner' };
        }

        // Admin cannot remove another admin unless they are owner
        if (memberToRemove.role === 'ADMIN' && userMembership.role !== 'OWNER') {
          return { error: 'FORBIDDEN', message: 'Only owners can remove admins' };
        }

        // Remove the membership
        await tx.membership.delete({
          where: { id: memberId },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            action: 'MEMBER_REMOVED',
            entityType: 'membership',
            entityId: memberId,
            organizationId,
            userId,
            metadata: {
              removedUserId: memberToRemove.userId,
              removedUserEmail: memberToRemove.user.email,
              removedUserRole: memberToRemove.role,
            },
          },
        });

        return { memberToRemove };
      });

      if (result.error) {
        const statusCode =
          result.error === 'FORBIDDEN' ? 403 : result.error === 'NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json({
          error: { code: result.error, message: result.message },
        });
      }

      const { memberToRemove } = result;

      logger.info('Member removed from organization', {
        organizationId,
        removedBy: userId,
        removedMember: memberToRemove.userId,
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      logger.error('Error removing organization member:', {
        error: error.message,
        organizationId: req.params.id,
        memberId: req.params.memberId,
        userId: req.user?.userId,
      });
      errorResponses.serverError(res, error);
    }
  }
);

// PATCH /api/organizations/:id/members/:memberId - Update member role
router.patch(
  '/:id/members/:memberId',
  authenticateToken,
  validateOrganizationId,
  async (req, res) => {
    try {
      const { id: organizationId, memberId } = req.params;
      const { role } = req.body;
      const userId = req.user.userId;

      // Validate role
      if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'Invalid role' },
        });
      }

      // SECURITY FIX: Use withTenantContext for member role update
      const result = await prismaService.withTenantContext(organizationId, async tx => {
        // Check if user has admin permissions
        const userMembership = await tx.membership.findUnique({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
        });

        if (!userMembership || !['OWNER', 'ADMIN'].includes(userMembership.role)) {
          return { error: 'FORBIDDEN', message: 'You must be an owner or admin to change roles' };
        }

        // Get the member to be updated
        const memberToUpdate = await tx.membership.findUnique({
          where: { id: memberId },
          include: { user: true },
        });

        if (!memberToUpdate || memberToUpdate.organizationId !== organizationId) {
          return { error: 'NOT_FOUND', message: 'Member not found' };
        }

        // Cannot change owner role
        if (memberToUpdate.role === 'OWNER') {
          return { error: 'BAD_REQUEST', message: 'Cannot change owner role' };
        }

        // Admin cannot promote to admin or change admin roles unless they are owner
        if (
          userMembership.role !== 'OWNER' &&
          (role === 'ADMIN' || memberToUpdate.role === 'ADMIN')
        ) {
          return { error: 'FORBIDDEN', message: 'Only owners can manage admin roles' };
        }

        const oldRole = memberToUpdate.role;

        // Update the membership
        const updatedMembership = await tx.membership.update({
          where: { id: memberId },
          data: { role },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return { memberToUpdate, updatedMembership, oldRole };
      });

      if (result.error) {
        const statusCode =
          result.error === 'FORBIDDEN' ? 403 : result.error === 'NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json({
          error: { code: result.error, message: result.message },
        });
      }

      const { memberToUpdate, updatedMembership, oldRole } = result;

      // Log role change with enhanced audit logging
      await logRoleChange({
        targetUserId: memberToUpdate.userId,
        organizationId,
        oldRole,
        newRole: role,
        performedById: userId,
        reason: `Role changed from ${oldRole} to ${role}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      logger.info('Member role updated', {
        organizationId,
        updatedBy: userId,
        member: memberToUpdate.userId,
        oldRole,
        newRole: role,
      });

      res.json({
        message: 'Role updated successfully',
        membership: {
          id: updatedMembership.id,
          userId: updatedMembership.userId,
          role: updatedMembership.role,
          user: updatedMembership.user,
        },
      });
    } catch (error) {
      logger.error('Error updating member role:', {
        error: error.message,
        organizationId: req.params.id,
        memberId: req.params.memberId,
        userId: req.user?.userId,
      });
      errorResponses.serverError(res, error);
    }
  }
);

module.exports = router;
