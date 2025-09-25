/**
 * Unified Data Service Layer
 *
 * This service provides a clean interface for all database operations,
 * replacing MongoDB models with Prisma-based operations.
 * Organized by domain for maintainability.
 *
 * IMPORTANT: All methods now use transaction-based RLS for true tenant isolation.
 * No WHERE clauses for organizationId are needed - PostgreSQL RLS handles filtering.
 */

const prismaService = require('./prismaService');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

class DataService {
  constructor() {
    this.rlsClient = prismaService.getRLSClient();
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

    if (password) {
      data.passwordEncrypted = encryptDatabasePassword(password);
    }

    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.service.create({
        data,
        include: {
          organization: true,
          creator: true,
          connection: true,
        },
      });
    });
  }

  async getServicesByOrganization(organizationId, filters = {}) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.service.findMany({
        where: filters,
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
    });
  }

  async getServiceById(serviceId, organizationId) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.service.findFirst({
        where: { id: serviceId },
        include: {
          creator: true,
          connection: true,
          roles: { include: { applications: true } },
          databaseObjects: true,
        },
      });
    });
  }

  async updateService(serviceId, organizationId, updateData) {
    const { password, ...otherData } = updateData;
    const data = { ...otherData };

    if (password) {
      data.passwordEncrypted = encryptDatabasePassword(password);
    }

    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.service.update({
        where: { id: serviceId },
        data,
        include: {
          creator: true,
          connection: true,
          roles: true,
        },
      });
    });
  }

  async deleteService(serviceId, organizationId) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.service.delete({
        where: { id: serviceId },
      });
    });
  }

  // ==========================================
  // APPLICATION OPERATIONS
  // ==========================================

  async createApplication(organizationId, createdBy, applicationData) {
    const { apiKey, defaultRoleId, ...otherData } = applicationData;

    const apiKeyHash = await bcrypt.hash(apiKey, 12);
    const apiKeyPrefix = apiKey.substring(0, 8);
    const apiKeyHint = apiKey.substring(apiKey.length - 4);

    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.application.create({
        data: {
          ...otherData,
          organizationId,
          createdBy,
          defaultRoleId,
          apiKeyHash,
          apiKeyEncrypted: apiKey,
          apiKeyPrefix,
          apiKeyHint,
        },
        include: {
          organization: true,
          creator: true,
          defaultRole: true,
        },
      });
    });
  }

  async getApplicationsByOrganization(organizationId, filters = {}) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.application.findMany({
        where: filters,
        include: {
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          defaultRole: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async getApplicationById(applicationId, organizationId) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.application.findFirst({
        where: { id: applicationId },
        include: {
          creator: true,
          defaultRole: {
            include: {
              service: true,
            },
          },
        },
      });
    });
  }

  async findApplicationByApiKey(apiKeyHash) {
    const rawClient = prismaService.getClient();
    return await rawClient.application.findUnique({
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
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.role.create({
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
    });
  }

  async getRolesByService(serviceId, organizationId, filters = {}) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.role.findMany({
        where: {
          serviceId,
          ...filters,
        },
        include: {
          service: true,
          applications: true,
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async getRoleById(roleId, organizationId) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.role.findFirst({
        where: { id: roleId },
        include: {
          service: true,
          applications: true,
        },
      });
    });
  }

  // ==========================================
  // NOTIFICATION OPERATIONS
  // ==========================================

  async createNotification(organizationId, userId, notificationData) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.notification.create({
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
    });
  }

  async getNotificationsByUser(userId, organizationId, filters = {}) {
    const { page = 1, limit = 10, isRead } = filters;

    const where = { userId };

    if (typeof isRead === 'boolean') {
      where.isRead = isRead;
    }

    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.notification.findMany({
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
    });
  }

  async markNotificationAsRead(notificationId, userId, organizationId) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.notification.update({
        where: { id: notificationId, userId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    });
  }

  async getUnreadNotificationCount(userId, organizationId) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });
    });
  }

  // ==========================================
  // API ACTIVITY LOG OPERATIONS
  // ==========================================

  async createApiActivityLog(organizationId, logData) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.apiActivityLog.create({
        data: {
          ...logData,
          organizationId,
        },
      });
    });
  }

  async getApiActivityLogs(organizationId, filters = {}) {
    const { page = 1, limit = 50, startDate, endDate, endpoint, statusCode } = filters;

    const where = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    if (endpoint) where.endpoint = { contains: endpoint };
    if (statusCode) where.statusCode = statusCode;

    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.apiActivityLog.findMany({
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
    });
  }

  // ==========================================
  // DATABASE OBJECT OPERATIONS
  // ==========================================

  async createDatabaseObject(organizationId, serviceId, objectData) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.databaseObject.create({
        data: {
          ...objectData,
          organizationId,
          serviceId,
        },
        include: {
          service: true,
        },
      });
    });
  }

  async getDatabaseObjectsByService(serviceId, organizationId, filters = {}) {
    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      return await tx.databaseObject.findMany({
        where: {
          serviceId,
          ...filters,
        },
        include: {
          service: true,
        },
        orderBy: [{ schema: 'asc' }, { name: 'asc' }],
      });
    });
  }

  // ==========================================
  // DASHBOARD METRICS
  // ==========================================

  async getDashboardMetrics(organizationId, filters = {}) {
    const { days = 30 } = filters;

    return await this.rlsClient.withRLS({ organizationId }, async tx => {
      const [
        servicesCount,
        applicationsCount,
        activeWorkflowsCount,
        totalApiCallsCount,
        recentActivity,
      ] = await Promise.all([
        tx.service.count({
          where: { isActive: true },
        }),
        tx.application.count({
          where: { isActive: true },
        }),
        tx.workflow.count({
          where: { isActive: true },
        }),
        tx.apiActivityLog.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
            },
          },
        }),
        tx.apiActivityLog.findMany({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
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
    });
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  async disconnect() {
    const rawClient = prismaService.getClient();
    await rawClient.$disconnect();
  }

  async testConnection() {
    try {
      const rawClient = prismaService.getClient();
      await rawClient.$queryRaw`SELECT 1`;
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
