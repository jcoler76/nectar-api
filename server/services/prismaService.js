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

  // User operations
  async findUserByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
      },
    });
  }

  async findUserById(id) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });
  }

  async createUser(userData) {
    return this.prisma.user.create({
      data: userData,
      include: {
        organization: true,
      },
    });
  }

  async updateUser(id, userData) {
    return this.prisma.user.update({
      where: { id },
      data: userData,
      include: {
        organization: true,
      },
    });
  }

  async updateUserPassword(id, hashedPassword) {
    return this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
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
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        organizationId: true,
        loginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
        twoFactorEnabledAt: true,
        trustedDevices: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
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
}

// Export a singleton instance
const prismaService = new PrismaService();
module.exports = prismaService;
