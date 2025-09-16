/**
 * Audit Service for RBAC System - Admin Backend Version
 * Handles logging of admin actions, role changes, and security events
 */

import { prisma } from '@/utils/database'

/**
 * Log a general audit event
 * @param options - Audit event options
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
    const {
      action,
      entityType,
      entityId,
      userId,
      adminUserId,
      organizationId,
      oldValues,
      newValues,
      metadata,
      ipAddress,
      userAgent
    } = options

    // Skip audit logging only if no organizationId is provided and it's not an admin operation
    if (!organizationId && !adminUserId) {
      console.log(`Audit log skipped (no org or admin context): ${action}`)
      return
    }

    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        adminPerformedById: adminUserId,
        organizationId,
        oldValues,
        newValues,
        metadata,
        ipAddress,
        userAgent
      }
    })

    console.log(`Audit log created: ${action} on ${entityType} ${entityId}`)
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging failures shouldn't break the main functionality
  }
}

/**
 * Log a role change event with detailed tracking
 * @param options - Role change options
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
    const {
      targetUserId,
      targetAdminId,
      organizationId,
      oldRole,
      newRole,
      reason,
      performedById,
      adminPerformedById,
      approvedById,
      status = 'COMPLETED',
      ipAddress,
      userAgent
    } = options

    // Create detailed role change log
    const roleChangeLog = await prisma.roleChangeLog.create({
      data: {
        targetUserId,
        targetAdminId,
        organizationId,
        oldRole,
        newRole,
        reason,
        performedById,
        adminPerformedById,
        approvedById,
        status,
        ipAddress,
        userAgent
      }
    })

    // Also log as general audit event
    await logAuditEvent({
      action: 'ROLE_CHANGE',
      entityType: targetUserId ? 'USER' : 'ADMIN_USER',
      entityId: targetUserId || targetAdminId || '',
      userId: performedById,
      adminUserId: adminPerformedById,
      organizationId,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
      metadata: {
        reason,
        roleChangeLogId: roleChangeLog.id,
        status
      },
      ipAddress,
      userAgent
    })

    console.log(`Role change logged: ${oldRole} -> ${newRole} for ${targetUserId || targetAdminId}`)
    return roleChangeLog
  } catch (error) {
    console.error('Failed to log role change:', error)
    throw error // Role change logging failures should be surfaced
  }
}

/**
 * Log admin user login events
 * @param options - Login event options
 */
async function logUserLogin(options: {
  userId?: string
  adminUserId?: string
  success?: boolean
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}) {
  const {
    userId,
    adminUserId,
    success = true,
    ipAddress,
    userAgent,
    metadata = {}
  } = options

  await logAuditEvent({
    action: success ? 'LOGIN' : 'LOGIN_FAILED',
    entityType: adminUserId ? 'ADMIN_USER' : 'USER',
    entityId: userId || adminUserId || '',
    userId,
    adminUserId,
    metadata: {
      success,
      ...metadata
    },
    ipAddress,
    userAgent
  })
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
    // Try to get organization context for the admin user
    let organizationId: string | undefined

    if (data.userId) {
      try {
        const userWithMembership = await prisma.user.findFirst({
          where: { id: data.userId },
          include: {
            memberships: {
              take: 1,
              orderBy: { joinedAt: 'asc' }, // Use the first (oldest) organization membership
              select: {
                organizationId: true
              }
            }
          }
        })

        organizationId = userWithMembership?.memberships[0]?.organizationId
      } catch (error) {
        console.error('Failed to get organization context for admin audit log:', error)
      }
    }

    await logAuditEvent({
      action: data.action,
      entityType: data.resourceType || data.resource || 'UNKNOWN',
      entityId: data.resource || 'unknown',
      adminUserId: data.userId,
      organizationId,
      metadata: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })
  }
}