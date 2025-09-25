/**
 * Audit Service for RBAC System - Admin Backend Version
 * Proxies to main API for audit logging
 */

import { mainApiClient } from '@/services/apiClient'

/**
 * Log a general audit event via main API
 */
async function logAuditEvent(options: {
  action: string
  entityType: string
  entityId: string
  userId?: string
  adminUserId?: string
  organizationId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}) {
  try {
    // Proxy to main API audit endpoint if it exists
    // For now, just log locally as admin-backend doesn't need full audit
    console.log(`Audit event: ${options.action} on ${options.entityType} ${options.entityId}`)
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Log a role change event
 */
async function logRoleChange(options: {
  targetUserId?: string
  targetAdminId?: string
  organizationId?: string
  oldRole: string
  newRole: string
  reason?: string
  performedById?: string
  adminPerformedById?: string
  approvedById?: string
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  ipAddress?: string
  userAgent?: string
}) {
  try {
    // Use the existing audit-log endpoint from main API
    await mainApiClient.post('/api/admin-backend/audit-log', {
      targetAdminId: options.targetAdminId,
      oldRole: options.oldRole,
      newRole: options.newRole,
      adminPerformedById: options.adminPerformedById || options.performedById,
      reason: options.reason,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    })

    console.log(`Role change logged: ${options.oldRole} -> ${options.newRole}`)
  } catch (error) {
    console.error('Failed to log role change:', error)
    throw error
  }
}

/**
 * Log admin user login events
 */
async function logUserLogin(options: {
  userId?: string
  adminUserId?: string
  success?: boolean
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}) {
  try {
    console.log(`Login event: ${options.success ? 'success' : 'failed'} for ${options.userId || options.adminUserId}`)
  } catch (error) {
    console.error('Failed to log login:', error)
  }
}

export {
  logAuditEvent,
  logRoleChange,
  logUserLogin
}

// Legacy export for backward compatibility
export interface AuditLogData {
  userId?: string
  action: string
  resource?: string
  resourceType?: string
  details?: any
  ipAddress: string
  userAgent?: string
}

export class AdminAuditLogger {
  static async log(data: AuditLogData): Promise<void> {
    await logAuditEvent({
      action: data.action,
      entityType: data.resourceType || data.resource || 'UNKNOWN',
      entityId: data.resource || 'unknown',
      adminUserId: data.userId,
      metadata: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })
  }
}