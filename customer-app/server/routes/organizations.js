const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
const AuthFactory = require('../middleware/authFactory');
const authenticateToken = AuthFactory.createJWTMiddleware();
const InputValidator = require('../utils/inputValidation');
const { logger } = require('../utils/logger');
const { errorResponses } = require('../utils/errorHandler');
const crypto = require('crypto');

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

  while (await prisma.organization.findUnique({ where: { slug } })) {
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
router.post('/', authenticateToken, validateOrganizationCreation, async (req, res) => {
  try {
    const { name, domain, website } = req.body;
    const userId = req.user.userId;

    // Validate domain uniqueness if provided
    if (domain) {
      const existingOrg = await prisma.organization.findUnique({
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
    const result = await prisma.$transaction(async tx => {
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
    const orgWithSubscription = await prisma.organization.findUnique({
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
});

// GET /api/organizations - Get user's organizations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get organizations where user is a member
    const memberships = await prisma.membership.findMany({
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
router.get('/:id', authenticateToken, validateOrganizationId, async (req, res) => {
  try {
    const organizationId = req.params.id;
    const userId = req.user.userId;

    // Check if user has access to this organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Access denied to this organization' },
      });
    }

    // Get organization with full details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
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
});

// PUT /api/organizations/:id - Update organization
router.put(
  '/:id',
  authenticateToken,
  validateOrganizationId,
  validateOrganizationUpdate,
  async (req, res) => {
    try {
      const organizationId = req.params.id;
      const userId = req.user.userId;
      const { name, domain, website, logo } = req.body;

      // Check if user has admin access to this organization
      const membership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        });
      }

      // Check if organization exists
      const existingOrg = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!existingOrg) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        });
      }

      // Validate domain uniqueness if being changed
      if (domain && domain !== existingOrg.domain) {
        const domainExists = await prisma.organization.findUnique({
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

      // Update organization
      const updatedOrganization = await prisma.organization.update({
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
router.delete('/:id', authenticateToken, validateOrganizationId, async (req, res) => {
  try {
    const organizationId = req.params.id;
    const userId = req.user.userId;

    // Check if user is the owner of this organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only organization owners can delete organizations' },
      });
    }

    // Check if organization exists and get details for logging
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
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
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }

    // Delete organization (cascade will handle related records)
    await prisma.organization.delete({
      where: { id: organizationId },
    });

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
});

// GET /api/organizations/:id/usage - Get organization usage statistics
router.get('/:id/usage', authenticateToken, validateOrganizationId, async (req, res) => {
  try {
    const organizationId = req.params.id;
    const userId = req.user.userId;

    // Check if user has access to this organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Access denied to this organization' },
      });
    }

    // Get subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
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
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      });
    }

    // Get current usage counts
    const [connectionCount, memberCount, workflowCount, currentMonthUsage] = await Promise.all([
      prisma.databaseConnection.count({ where: { organizationId } }),
      prisma.membership.count({ where: { organizationId } }),
      prisma.workflow.count({ where: { organizationId } }),
      prisma.usageMetric.count({
        where: {
          organizationId,
          timestamp: {
            gte: subscription.currentPeriodStart,
            lte: subscription.currentPeriodEnd,
          },
        },
      }),
    ]);

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
});

// DELETE /api/organizations/:id/members/:memberId - Remove team member
router.delete(
  '/:id/members/:memberId',
  authenticateToken,
  validateOrganizationId,
  async (req, res) => {
    try {
      const { id: organizationId, memberId } = req.params;
      const userId = req.user.userId;

      // Check if user has admin permissions
      const userMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      if (!userMembership || !['OWNER', 'ADMIN'].includes(userMembership.role)) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You must be an owner or admin to remove members' },
        });
      }

      // Get the member to be removed
      const memberToRemove = await prisma.membership.findUnique({
        where: { id: memberId },
        include: { user: true },
      });

      if (!memberToRemove || memberToRemove.organizationId !== organizationId) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Member not found' },
        });
      }

      // Cannot remove owner
      if (memberToRemove.role === 'OWNER') {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'Cannot remove organization owner' },
        });
      }

      // Admin cannot remove another admin unless they are owner
      if (memberToRemove.role === 'ADMIN' && userMembership.role !== 'OWNER') {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only owners can remove admins' },
        });
      }

      // Remove the membership
      await prisma.membership.delete({
        where: { id: memberId },
      });

      // Create audit log
      await prisma.auditLog.create({
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

      // Check if user has admin permissions
      const userMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      if (!userMembership || !['OWNER', 'ADMIN'].includes(userMembership.role)) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You must be an owner or admin to change roles' },
        });
      }

      // Get the member to be updated
      const memberToUpdate = await prisma.membership.findUnique({
        where: { id: memberId },
        include: { user: true },
      });

      if (!memberToUpdate || memberToUpdate.organizationId !== organizationId) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Member not found' },
        });
      }

      // Cannot change owner role
      if (memberToUpdate.role === 'OWNER') {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'Cannot change owner role' },
        });
      }

      // Admin cannot promote to admin or change admin roles unless they are owner
      if (
        userMembership.role !== 'OWNER' &&
        (role === 'ADMIN' || memberToUpdate.role === 'ADMIN')
      ) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only owners can manage admin roles' },
        });
      }

      const oldRole = memberToUpdate.role;

      // Update the membership
      const updatedMembership = await prisma.membership.update({
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

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'MEMBER_ROLE_CHANGED',
          entityType: 'membership',
          entityId: memberId,
          organizationId,
          userId,
          metadata: {
            targetUserId: memberToUpdate.userId,
            targetUserEmail: memberToUpdate.user.email,
            oldRole,
            newRole: role,
          },
        },
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
