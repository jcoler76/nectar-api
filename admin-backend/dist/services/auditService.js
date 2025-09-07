"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuditLogger = void 0;
const database_1 = require("@/utils/database");
class AdminAuditLogger {
    /**
     * Log admin action for audit trail
     */
    static async log(data) {
        try {
            await database_1.prisma.adminAuditLog.create({
                data: {
                    adminId: data.adminId || 'system',
                    action: data.action,
                    resource: data.resource,
                    resourceType: data.resourceType,
                    details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                },
            });
        }
        catch (error) {
            console.error('Failed to create audit log:', error);
        }
    }
    /**
     * Get recent audit logs with pagination
     */
    static async getRecentLogs(limit = 50, offset = 0) {
        return database_1.prisma.adminAuditLog.findMany({
            take: limit,
            skip: offset,
            orderBy: { timestamp: 'desc' },
            include: {
                admin: {
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
    /**
     * Get audit logs for specific admin
     */
    static async getAdminLogs(adminId, limit = 50, offset = 0) {
        return database_1.prisma.adminAuditLog.findMany({
            where: { adminId },
            take: limit,
            skip: offset,
            orderBy: { timestamp: 'desc' },
        });
    }
    /**
     * Get audit logs for specific action
     */
    static async getActionLogs(action, limit = 50, offset = 0) {
        return database_1.prisma.adminAuditLog.findMany({
            where: { action },
            take: limit,
            skip: offset,
            orderBy: { timestamp: 'desc' },
            include: {
                admin: {
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
    /**
     * Search audit logs
     */
    static async searchLogs(filters, limit = 50, offset = 0) {
        const where = {};
        if (filters.adminId)
            where.adminId = filters.adminId;
        if (filters.action)
            where.action = { contains: filters.action, mode: 'insensitive' };
        if (filters.resourceType)
            where.resourceType = filters.resourceType;
        if (filters.startDate || filters.endDate) {
            where.timestamp = {};
            if (filters.startDate)
                where.timestamp.gte = filters.startDate;
            if (filters.endDate)
                where.timestamp.lte = filters.endDate;
        }
        return database_1.prisma.adminAuditLog.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { timestamp: 'desc' },
            include: {
                admin: {
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
    /**
     * Get audit log statistics
     */
    static async getLogStats(startDate, endDate) {
        const where = {};
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate)
                where.timestamp.gte = startDate;
            if (endDate)
                where.timestamp.lte = endDate;
        }
        const [totalLogs, actionStats, adminStats] = await Promise.all([
            database_1.prisma.adminAuditLog.count({ where }),
            database_1.prisma.adminAuditLog.groupBy({
                by: ['action'],
                where,
                _count: true,
                orderBy: { _count: { action: 'desc' } },
                take: 10,
            }),
            database_1.prisma.adminAuditLog.groupBy({
                by: ['adminId'],
                where,
                _count: true,
                orderBy: { _count: { adminId: 'desc' } },
                take: 10,
            }),
        ]);
        return {
            totalLogs,
            topActions: actionStats,
            topAdmins: adminStats,
        };
    }
}
exports.AdminAuditLogger = AdminAuditLogger;
//# sourceMappingURL=auditService.js.map