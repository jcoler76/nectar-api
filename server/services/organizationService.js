const { getPrismaClient } = require('../config/prisma');
const crypto = require('crypto');

class OrganizationService {
  /**
   * Create a new organization with the creator as owner
   */
  static async createOrganization(userId, organizationData) {
    const prisma = getPrismaClient();
    
    // Generate a unique slug from the organization name
    const baseSlug = organizationData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Create organization with creator as owner
    const organization = await prisma.organization.create({
      data: {
        name: organizationData.name,
        slug,
        website: organizationData.website,
        memberships: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
        subscription: {
          create: {
            plan: 'FREE',
            status: 'TRIALING',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        },
      },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
        subscription: true,
      },
    });
    
    // Log organization creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'Organization',
        entityId: organization.id,
        organizationId: organization.id,
        userId,
        metadata: {
          name: organization.name,
          slug: organization.slug,
        },
      },
    });
    
    return organization;
  }
  
  /**
   * Get organization by ID with membership check
   */
  static async getOrganization(organizationId, userId) {
    const prisma = getPrismaClient({ organizationId, userId });
    
    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        memberships: {
          some: {
            userId,
          },
        },
      },
      include: {
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
        },
        subscription: true,
        _count: {
          select: {
            databaseConnections: true,
            apiKeys: true,
            workflows: true,
          },
        },
      },
    });
    
    if (!organization) {
      throw new Error('Organization not found or access denied');
    }
    
    return organization;
  }
  
  /**
   * List all organizations for a user
   */
  static async listUserOrganizations(userId) {
    const prisma = getPrismaClient({ userId });
    
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
      },
      include: {
        organization: {
          include: {
            subscription: {
              select: {
                plan: true,
                status: true,
              },
            },
            _count: {
              select: {
                memberships: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });
    
    return memberships.map(m => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }
  
  /**
   * Update organization details
   */
  static async updateOrganization(organizationId, userId, updates) {
    const prisma = getPrismaClient({ organizationId, userId });
    
    // Check if user has admin or owner role
    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN'],
        },
      },
    });
    
    if (!membership) {
      throw new Error('Insufficient permissions to update organization');
    }
    
    // If updating slug, ensure it's unique
    if (updates.slug) {
      const existing = await prisma.organization.findUnique({
        where: { slug: updates.slug },
      });
      
      if (existing && existing.id !== organizationId) {
        throw new Error('Slug is already taken');
      }
    }
    
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: updates,
    });
    
    // Log the update
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Organization',
        entityId: organizationId,
        organizationId,
        userId,
        metadata: updates,
      },
    });
    
    return organization;
  }
  
  /**
   * Delete organization (owner only)
   */
  static async deleteOrganization(organizationId, userId) {
    const prisma = getPrismaClient({ organizationId, userId });
    
    // Check if user is owner
    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        userId,
        role: 'OWNER',
      },
    });
    
    if (!membership) {
      throw new Error('Only organization owners can delete the organization');
    }
    
    // Check for active subscription
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });
    
    if (subscription && subscription.status === 'ACTIVE' && subscription.plan !== 'FREE') {
      throw new Error('Please cancel your subscription before deleting the organization');
    }
    
    // Log deletion before it happens
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'Organization',
        entityId: organizationId,
        organizationId,
        userId,
        metadata: {
          deletedAt: new Date(),
        },
      },
    });
    
    // Delete organization (cascades to all related data)
    await prisma.organization.delete({
      where: { id: organizationId },
    });
    
    return { success: true };
  }
  
  /**
   * Get organization usage statistics
   */
  static async getOrganizationStats(organizationId, userId) {
    const prisma = getPrismaClient({ organizationId, userId });
    
    // Check membership
    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        userId,
      },
    });
    
    if (!membership) {
      throw new Error('Access denied');
    }
    
    // Get current month's date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Get usage statistics
    const [
      apiCallCount,
      connectionCount,
      workflowCount,
      memberCount,
      subscription,
    ] = await Promise.all([
      prisma.usageMetric.count({
        where: {
          organizationId,
          timestamp: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      prisma.databaseConnection.count({
        where: { organizationId },
      }),
      prisma.workflow.count({
        where: { organizationId },
      }),
      prisma.membership.count({
        where: { organizationId },
      }),
      prisma.subscription.findUnique({
        where: { organizationId },
      }),
    ]);
    
    return {
      usage: {
        apiCalls: {
          current: apiCallCount,
          limit: subscription?.maxApiCallsPerMonth || 10000,
          percentage: (apiCallCount / (subscription?.maxApiCallsPerMonth || 10000)) * 100,
        },
        connections: {
          current: connectionCount,
          limit: subscription?.maxDatabaseConnections || 1,
        },
        workflows: {
          current: workflowCount,
          limit: subscription?.maxWorkflows || 5,
        },
        members: {
          current: memberCount,
          limit: subscription?.maxUsersPerOrg || 1,
        },
      },
      subscription: {
        plan: subscription?.plan || 'FREE',
        status: subscription?.status || 'TRIALING',
        currentPeriodEnd: subscription?.currentPeriodEnd,
      },
    };
  }
}

module.exports = OrganizationService;