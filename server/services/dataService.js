/**
 * Unified Data Service Layer
 *
 * This service provides a clean interface for all database operations,
 * replacing MongoDB models with Prisma-based operations.
 * Organized by domain for maintainability.
 */

const { PrismaClient } = require('../prisma/generated/client');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

class DataService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  // ==========================================
  // SERVICE OPERATIONS
  // ==========================================

  async createService(organizationId, createdBy, serviceData) {
    const { password, ...otherData } = serviceData;

    const data = {
      ...otherData,
      organizationId,
      createdBy,
    };

    // Encrypt password if provided
    if (password) {
      data.passwordEncrypted = encryptDatabasePassword(password);
    }

    return await this.prisma.service.create({
      data,
      include: {
        organization: true,
        creator: true,
        connection: true,
      },
    });
  }

  async getServicesByOrganization(organizationId, filters = {}) {
    const where = {
      organizationId,
      ...filters,
    };

    return await this.prisma.service.findMany({
      where,
      include: {
        creator: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        connection: true,
        roles: {
          where: { isActive: true },
          include: {
            _count: { select: { applications: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getServiceById(serviceId, organizationId) {
    return await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        organizationId,
      },
      include: {
        creator: true,
        connection: true,
        roles: { include: { applications: true } },
        databaseObjects: true,
      },
    });
  }

  async updateService(serviceId, organizationId, updateData) {
    const { password, ...otherData } = updateData;

    const data = { ...otherData };

    // Encrypt password if provided
    if (password) {
      data.passwordEncrypted = encryptDatabasePassword(password);
    }

    return await this.prisma.service.update({
      where: {
        id: serviceId,
        organizationId,
      },
      data,
      include: {
        creator: true,
        connection: true,
        roles: true,
      },
    });
  }

  async deleteService(serviceId, organizationId) {
    return await this.prisma.service.delete({
      where: {
        id: serviceId,
        organizationId,
      },
    });
  }

  // ==========================================
  // APPLICATION OPERATIONS
  // ==========================================

  async createApplication(organizationId, createdBy, applicationData) {
    const { apiKey, defaultRoleId, ...otherData } = applicationData;

    // Generate API key components
    const apiKeyHash = await bcrypt.hash(apiKey, 12);
    const apiKeyPrefix = apiKey.substring(0, 8);
    const apiKeyHint = apiKey.substring(apiKey.length - 4);

    return await this.prisma.application.create({
      data: {
        ...otherData,
        organizationId,
        createdBy,
        defaultRoleId,
        apiKeyHash,
        apiKeyEncrypted: apiKey, // In real implementation, encrypt this
        apiKeyPrefix,
        apiKeyHint,
      },
      include: {
        organization: true,
        creator: true,
        defaultRole: true,
      },
    });
  }

  async getApplicationsByOrganization(organizationId, filters = {}) {
    return await this.prisma.application.findMany({
      where: {
        organizationId,
        ...filters,
      },
      include: {
        creator: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        defaultRole: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApplicationById(applicationId, organizationId) {
    return await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        organizationId,
      },
      include: {
        creator: true,
        defaultRole: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  async findApplicationByApiKey(apiKeyHash) {
    return await this.prisma.application.findUnique({
      where: { apiKeyHash },
      include: {
        organization: true,
        defaultRole: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  // ==========================================
  // ROLE OPERATIONS
  // ==========================================

  async createRole(organizationId, serviceId, roleData) {
    return await this.prisma.role.create({
      data: {
        ...roleData,
        organizationId,
        serviceId,
      },
      include: {
        organization: true,
        service: true,
      },
    });
  }

  async getRolesByService(serviceId, organizationId, filters = {}) {
    return await this.prisma.role.findMany({
      where: {
        serviceId,
        organizationId,
        ...filters,
      },
      include: {
        service: true,
        applications: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRoleById(roleId, organizationId) {
    return await this.prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
      include: {
        service: true,
        applications: true,
      },
    });
  }

  // ==========================================
  // NOTIFICATION OPERATIONS
  // ==========================================

  async createNotification(organizationId, userId, notificationData) {
    return await this.prisma.notification.create({
      data: {
        ...notificationData,
        organizationId,
        userId,
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async getNotificationsByUser(userId, organizationId, filters = {}) {
    const { page = 1, limit = 10, isRead } = filters;

    const where = {
      userId,
      organizationId,
    };

    if (typeof isRead === 'boolean') {
      where.isRead = isRead;
    }

    return await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async markNotificationAsRead(notificationId, userId) {
    return await this.prisma.notification.update({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadNotificationCount(userId, organizationId) {
    return await this.prisma.notification.count({
      where: {
        userId,
        organizationId,
        isRead: false,
      },
    });
  }

  // ==========================================
  // API ACTIVITY LOG OPERATIONS
  // ==========================================

  async createApiActivityLog(organizationId, logData) {
    return await this.prisma.apiActivityLog.create({
      data: {
        ...logData,
        organizationId,
      },
    });
  }

  async getApiActivityLogs(organizationId, filters = {}) {
    const { page = 1, limit = 50, startDate, endDate, endpoint, statusCode } = filters;

    const where = { organizationId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    if (endpoint) where.endpoint = { contains: endpoint };
    if (statusCode) where.statusCode = statusCode;

    return await this.prisma.apiActivityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  // ==========================================
  // DATABASE OBJECT OPERATIONS
  // ==========================================

  async createDatabaseObject(organizationId, serviceId, objectData) {
    return await this.prisma.databaseObject.create({
      data: {
        ...objectData,
        organizationId,
        serviceId,
      },
      include: {
        service: true,
      },
    });
  }

  async getDatabaseObjectsByService(serviceId, organizationId, filters = {}) {
    return await this.prisma.databaseObject.findMany({
      where: {
        serviceId,
        organizationId,
        ...filters,
      },
      include: {
        service: true,
      },
      orderBy: [{ schema: 'asc' }, { name: 'asc' }],
    });
  }

  // ==========================================
  // DASHBOARD METRICS
  // ==========================================

  async getDashboardMetrics(organizationId, filters = {}) {
    const { days = 30 } = filters;

    // Get counts in parallel
    const [
      servicesCount,
      applicationsCount,
      activeWorkflowsCount,
      totalApiCallsCount,
      recentActivity,
    ] = await Promise.all([
      this.prisma.service.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.application.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.workflow.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.apiActivityLog.count({
        where: {
          organizationId,
          timestamp: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.apiActivityLog.findMany({
        where: {
          organizationId,
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      services: { total: servicesCount, active: servicesCount },
      applications: { total: applicationsCount, active: applicationsCount },
      workflows: { total: activeWorkflowsCount, active: activeWorkflowsCount },
      apiCalls: { total: totalApiCallsCount, today: recentActivity.length },
      recentActivity,
    };
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  async disconnect() {
    await this.prisma.$disconnect();
  }

  async testConnection() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const dataService = new DataService();
module.exports = dataService;
