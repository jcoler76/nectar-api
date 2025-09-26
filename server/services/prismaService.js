const { PrismaClient } = require('../prisma/generated/client');
const { logger } = require('../utils/logger');

class PrismaService {
  constructor() {
    if (!PrismaService.instance) {
      // System Prisma: For infrastructure tables (no RLS) - uses admin/superuser
      this.systemPrisma = new PrismaClient({
        log:
          process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL,
          },
        },
      });

      // Tenant Prisma: For tenant tables (RLS enforced) - uses regular app user
      this.tenantPrisma = new PrismaClient({
        log:
          process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      // Track current organization context
      this.currentOrganizationId = null;

      // Add security middleware for tenant client
      // TEMPORARILY DISABLED: Prisma v6+ doesn't support $use middleware - needs migration to $extends
      // this._addSecurityMiddleware();

      logger.info('✅ Dual Prisma service initialized (System + Tenant with RLS enforcement)');

      PrismaService.instance = this;
    }

    return PrismaService.instance;
  }

  async connect() {
    await this.systemPrisma.$connect();
    await this.tenantPrisma.$connect();
    console.log('✅ Prisma connected to PostgreSQL (System + Tenant clients)');
  }

  async disconnect() {
    await this.systemPrisma.$disconnect();
    await this.tenantPrisma.$disconnect();
    console.log('🔌 Prisma disconnected from PostgreSQL');
  }

  async initialize() {
    await this.connect();
  }

  // Add security middleware to prevent direct tenant client access
  _addSecurityMiddleware() {
    // Middleware to ensure RLS context is always set for tenant operations
    this.tenantPrisma.$use(async (params, next) => {
      // Allow transaction operations (these are used within withTenantContext)
      if (params.runInTransaction) {
        return next(params);
      }

      // Block direct access to tenant client for tenant-scoped models
      const tenantModels = [
        'endpoint',
        'fileStorage',
        'apiKey',
        'workflow',
        'workflowExecution',
        'membership',
      ];

      if (tenantModels.includes(params.model?.toLowerCase())) {
        throw new Error(
          `Direct access to ${params.model} blocked. Use withTenantContext(organizationId, callback) for RLS enforcement.`
        );
      }

      return next(params);
    });
  }

  // DEPRECATED: Legacy context methods - Use withTenantContext instead
  setOrganizationContext(organizationId) {
    logger.warn('setOrganizationContext is deprecated. Use withTenantContext instead.');
    this.currentOrganizationId = organizationId;
  }

  clearOrganizationContext() {
    logger.warn('clearOrganizationContext is deprecated. Use withTenantContext instead.');
    this.currentOrganizationId = null;
  }

  // Get system client (for infrastructure tables)
  getSystemClient() {
    return this.systemPrisma;
  }

  // Execute operations within tenant context with RLS enforcement
  async withTenantContext(organizationId, callback) {
    if (!organizationId) {
      throw new Error('Organization ID is required for tenant context');
    }

    // Validate organizationId format (UUID only - secure and consistent)
    const validIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!validIdRegex.test(organizationId)) {
      throw new Error('Invalid organization ID format');
    }

    return await this.tenantPrisma.$transaction(async tx => {
      try {
        // Set organization context for this transaction (must match RLS policy variable name)
        await tx.$executeRaw`
          SELECT set_config('app.current_organization_id', ${organizationId}, true)
        `;

        // Execute callback with transaction client
        return await callback(tx);
      } catch (error) {
        logger.error('Tenant context operation failed', {
          organizationId,
          error: error.message,
        });
        throw error;
      }
    });
  }

  // DEPRECATED: Legacy method - Use withTenantContext instead
  getTenantClient() {
    throw new Error(
      'getTenantClient is deprecated for security reasons. Use withTenantContext(organizationId, callback) instead.'
    );
  }

  // Legacy compatibility: getClient returns system client
  getClient() {
    return this.systemPrisma;
  }

  // User operations (infrastructure - no RLS)
  async findUserByEmail(email) {
    return this.systemPrisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  }

  async findUserById(id) {
    return this.systemPrisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  }

  async createUser(data) {
    return this.systemPrisma.user.create({
      data,
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async updateUser(id, data) {
    return this.systemPrisma.user.update({
      where: { id },
      data,
    });
  }

  async updateUserLastLogin(id) {
    return this.systemPrisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // Organization operations (infrastructure - no RLS)
  async findOrganizationById(id) {
    return this.systemPrisma.organization.findUnique({
      where: { id },
    });
  }

  async findOrganizationBySlug(slug) {
    return this.systemPrisma.organization.findUnique({
      where: { slug },
    });
  }

  async createOrganization(data) {
    return this.systemPrisma.organization.create({
      data,
    });
  }

  // Security helper methods
  async validateOrganizationExists(organizationId) {
    const organization = await this.systemPrisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, isActive: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    if (!organization.isActive) {
      throw new Error('Organization is not active');
    }

    return organization;
  }

  async validateUserOrganizationAccess(userId, organizationId) {
    const membership = await this.systemPrisma.membership.findFirst({
      where: {
        userId,
        organizationId,
      },
      select: {
        role: true,
        isActive: true,
      },
    });

    if (!membership) {
      throw new Error('User does not have access to this organization');
    }

    if (!membership.isActive) {
      throw new Error('User membership is not active');
    }

    return membership;
  }

  // Membership operations - Use appropriate client based on context
  async findMembershipByUserAndOrganization(userId, organizationId) {
    // SECURITY FIX: Use withTenantContext for RLS enforcement
    return await this.withTenantContext(organizationId, async tx => {
      return await tx.membership.findFirst({
        where: {
          userId,
          // organizationId handled by RLS
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
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
    });
  }

  async createMembership(data) {
    // Membership creation during signup uses systemPrisma (before org context exists)
    return this.systemPrisma.membership.create({
      data,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
  }

  async getUserMemberships(userId, organizationId) {
    // SECURITY FIX: Use withTenantContext for RLS enforcement when organization context is available
    if (organizationId) {
      return await this.withTenantContext(organizationId, async tx => {
        return await tx.membership.findMany({
          where: {
            userId,
            // organizationId handled by RLS
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });
      });
    } else {
      // For initial auth lookup, use system client
      return this.systemPrisma.membership.findMany({
        where: {
          userId,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    }
  }
}

const prismaService = new PrismaService();

module.exports = prismaService;
