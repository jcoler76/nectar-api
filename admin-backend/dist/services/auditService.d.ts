/**
 * Audit Service for RBAC System - Admin Backend Version
 * Handles logging of admin actions, role changes, and security events
 */
/**
 * Log a general audit event
 * @param options - Audit event options
 */
declare function logAuditEvent(options: {
    action: string;
    entityType: string;
    entityId: string;
    userId?: string;
    adminUserId?: string;
    organizationId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}): Promise<void>;
/**
 * Log a role change event with detailed tracking
 * @param options - Role change options
 */
declare function logRoleChange(options: {
    targetUserId?: string;
    targetAdminId?: string;
    organizationId?: string;
    oldRole: string;
    newRole: string;
    reason?: string;
    performedById?: string;
    adminPerformedById?: string;
    approvedById?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    ipAddress?: string;
    userAgent?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
    organizationId: string | null;
    adminPerformedById: string | null;
    targetUserId: string | null;
    targetAdminId: string | null;
    oldRole: string;
    newRole: string;
    reason: string | null;
    performedById: string | null;
    approvedById: string | null;
    status: import(".prisma/client").$Enums.RoleChangeStatus;
}>;
/**
 * Log admin user login events
 * @param options - Login event options
 */
declare function logUserLogin(options: {
    userId?: string;
    adminUserId?: string;
    success?: boolean;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}): Promise<void>;
export { logAuditEvent, logRoleChange, logUserLogin };
export interface AuditLogData {
    userId?: string;
    action: string;
    resource?: string;
    resourceType?: string;
    details?: any;
    ipAddress: string;
    userAgent?: string;
}
export declare class AdminAuditLogger {
    static log(data: AuditLogData): Promise<void>;
}
//# sourceMappingURL=auditService.d.ts.map