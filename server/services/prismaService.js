// Use the shared Prisma client to ensure identical table mappings
const { PrismaClient } = require('../prisma/generated/client');

// Create a singleton Prisma client instance
class PrismaService {
  constructor() {
    if (!PrismaService.instance) {
      this.prisma = new PrismaClient({
        log:
          process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      PrismaService.instance = this;
    }

    return PrismaService.instance;
  }

  async connect() {
    await this.prisma.$connect();
    console.log('✅ Prisma connected to PostgreSQL');
  }

  async disconnect() {
    await this.prisma.$disconnect();
    console.log('🔌 Prisma disconnected from PostgreSQL');
  }

  // Initialize method - alias for connect to match expected API
  async initialize() {
    await this.connect();
  }

  // User operations
  async findUserByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: {
              include: { subscription: true },
            },
          },
        },
      },
    });
  }

  async findUserById(id) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: {
              include: { subscription: true },
            },
          },
        },
      },
    });
  }

  async createUser(userData) {
    return this.prisma.user.create({
      data: userData,
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });
  }

  async updateUser(id, userData) {
    return this.prisma.user.update({
      where: { id },
      data: userData,
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });
  }

  async updateUserPassword(id, hashedPassword) {
    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      },
    });
  }

  // Organization operations
  async findOrganizationBySlug(slug) {
    return this.prisma.organization.findUnique({
      where: { slug },
      include: {
        users: true,
      },
    });
  }

  async createOrganization(orgData) {
    return this.prisma.organization.create({
      data: orgData,
    });
  }

  // Authentication specific operations
  async findUserForAuth(email) {
    // Return user with password for authentication
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                subscription: true,
              },
            },
          },
        },
      },
    });
  }

  async updateUserLoginAttempts(id, attempts, lockedUntil = null) {
    return this.prisma.user.update({
      where: { id },
      data: {
        loginAttempts: attempts,
        lockedUntil: lockedUntil,
        updatedAt: new Date(),
      },
    });
  }

  async recordSuccessfulLogin(id) {
    return this.prisma.user.update({
      where: { id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // Expose raw Prisma client for transactions in other services
  getClient() {
    return this.prisma;
  }

  // Convenience helper to update last login safely
  async updateUserLastLogin(id) {
    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

// Export a singleton instance
const prismaService = new PrismaService();
module.exports = prismaService;
