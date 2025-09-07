export interface AuditLogData {
    adminId?: string;
    action: string;
    resource?: string;
    resourceType?: string;
    details?: any;
    ipAddress: string;
    userAgent?: string;
}
export declare class AdminAuditLogger {
    /**
     * Log admin action for audit trail
     */
    static log(data: AuditLogData): Promise<void>;
    /**
     * Get recent audit logs with pagination
     */
    static getRecentLogs(limit?: number, offset?: number): Promise<any>;
    /**
     * Get audit logs for specific admin
     */
    static getAdminLogs(adminId: string, limit?: number, offset?: number): Promise<any>;
    /**
     * Get audit logs for specific action
     */
    static getActionLogs(action: string, limit?: number, offset?: number): Promise<any>;
    /**
     * Search audit logs
     */
    static searchLogs(filters: {
        adminId?: string;
        action?: string;
        resourceType?: string;
        startDate?: Date;
        endDate?: Date;
    }, limit?: number, offset?: number): Promise<any>;
    /**
     * Get audit log statistics
     */
    static getLogStats(startDate?: Date, endDate?: Date): Promise<{
        totalLogs: any;
        topActions: any;
        topAdmins: any;
    }>;
}
//# sourceMappingURL=auditService.d.ts.map