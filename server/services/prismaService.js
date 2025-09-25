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

      logger.info('✅ Dual Prisma service initialized (System + Tenant with RLS middleware)');

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

  // Set organization context for tenant operations
  setOrganizationContext(organizationId) {
    this.currentOrganizationId = organizationId;
  }

  // Clear organization context
  clearOrganizationContext() {
    this.currentOrganizationId = null;
  }

  // Get system client (for infrastructure tables)
  getSystemClient() {
    return this.systemPrisma;
  }

  // Get tenant client with RLS context set
  async withTenantContext(organizationId, callback) {
    return await this.tenantPrisma.$transaction(async tx => {
      // Set organization context for this transaction (must match RLS policy variable name)
      // CONFIRMED: Database function uses app.current_organization_id
      await tx.$executeRaw`
        SELECT set_config('app.current_organization_id', ${organizationId}, true)
      `;

      // Execute callback with transaction client
      return await callback(tx);
    });
  }

  // Legacy method - Get tenant client (for tenant tables - RLS enforced)
  getTenantClient() {
    if (!this.currentOrganizationId) {
      throw new Error(
        'Organization context not set. Call setOrganizationContext() before using tenant client.'
      );
    }
    return this.tenantPrisma;
  }

  // Legacy compatibility: getClient returns system client
  getClient() {
    return this.systemPrisma;
  }

  // Legacy compatibility: getRLSClient (deprecated - use withTenantContext directly)
  // NOTE: This method is DEPRECATED and will be removed in a future update
  // Use prismaService.withTenantContext(organizationId, callback) instead
  getRLSClient() {
    return {
      withRLS: async (context, callback) => {
        return await this.withTenantContext(context.organizationId, callback);
      },
    };
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

  // Membership operations (TENANT SCOPED - RLS ENFORCED via withTenantContext)
  // These methods should NOT be used directly - use withTenantContext instead
  // Kept for backward compatibility but will throw error if used incorrectly
  async findMembershipByUserAndOrganization(userId, organizationId) {
    throw new Error('Use withTenantContext to query Membership with RLS');
  }

  async createMembership(data) {
    // Membership creation during signup uses systemPrisma (before org context exists)
    return this.systemPrisma.membership.create({
      data,
    });
  }

  async getUserMemberships(userId) {
    throw new Error('Use withTenantContext to query Membership with RLS');
  }
}

const prismaService = new PrismaService();

module.exports = prismaService;
