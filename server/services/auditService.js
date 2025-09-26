/**
 * Audit Service for RBAC System
 * Handles logging of user actions, role changes, and security events
 */

const prismaService = require('../services/prismaService');

/**
 * Log a general audit event
 * @param {Object} options - Audit event options
 * @param {string} options.action - Action performed (from AuditAction enum)
 * @param {string} options.entityType - Type of entity affected (from EntityType enum)
 * @param {string} options.entityId - ID of the affected entity
 * @param {string} [options.userId] - ID of the user performing the action
 * @param {string} [options.adminUserId] - ID of the admin user performing the action
 * @param {string} [options.organizationId] - Organization context
 * @param {Object} [options.oldValues] - Previous values before change
 * @param {Object} [options.newValues] - New values after change
 * @param {Object} [options.metadata] - Additional metadata
 * @param {string} [options.ipAddress] - IP address of the performer
 * @param {string} [options.userAgent] - User agent string
 */
async function logAuditEvent(options) {
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
      userAgent,
    } = options;

    await prismaService.withTenantContext(organizationId, async tx => {
      await tx.auditLog.create({
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
          userAgent,
        },
      });
    });

    console.log(`Audit log created: ${action} on ${entityType} ${entityId}`);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging failures shouldn't break the main functionality
  }
}

/**
 * Log a role change event with detailed tracking
 * @param {Object} options - Role change options
 * @param {string} [options.targetUserId] - ID of the user whose role is changing
 * @param {string} [options.targetAdminId] - ID of the admin user whose role is changing
 * @param {string} [options.organizationId] - Organization context
 * @param {string} options.oldRole - Previous role
 * @param {string} options.newRole - New role
 * @param {string} [options.reason] - Reason for the change
 * @param {string} [options.performedById] - ID of the user performing the change
 * @param {string} [options.adminPerformedById] - ID of the admin performing the change
 * @param {string} [options.approvedById] - ID of the user who approved the change
 * @param {string} [options.status] - Status of the role change (from RoleChangeStatus enum)
 * @param {string} [options.ipAddress] - IP address
 * @param {string} [options.userAgent] - User agent
 */
async function logRoleChange(options) {
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
      userAgent,
    } = options;

    // Create detailed role change log
    const roleChangeLog = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.roleChangeLog.create({
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
          userAgent,
        },
      });
    });

    // Also log as general audit event
    await logAuditEvent({
      action: 'ROLE_CHANGE',
      entityType: targetUserId ? 'USER' : 'ADMIN_USER',
      entityId: targetUserId || targetAdminId,
      userId: performedById,
      adminUserId: adminPerformedById,
      organizationId,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
      metadata: {
        reason,
        roleChangeLogId: roleChangeLog.id,
        status,
      },
      ipAddress,
      userAgent,
    });

    console.log(
      `Role change logged: ${oldRole} -> ${newRole} for ${targetUserId || targetAdminId}`
    );
    return roleChangeLog;
  } catch (error) {
    console.error('Failed to log role change:', error);
    throw error; // Role change logging failures should be surfaced
  }
}

/**
 * Log user login events
 * @param {Object} options - Login event options
 * @param {string} options.userId - ID of the user logging in
 * @param {string} [options.adminUserId] - ID of the admin user logging in
 * @param {boolean} [options.success] - Whether login was successful
 * @param {string} [options.ipAddress] - IP address
 * @param {string} [options.userAgent] - User agent
 * @param {Object} [options.metadata] - Additional metadata
 */
async function logUserLogin(options) {
  const { userId, adminUserId, success = true, ipAddress, userAgent, metadata = {} } = options;

  await logAuditEvent({
    action: success ? 'LOGIN' : 'LOGIN_FAILED',
    entityType: adminUserId ? 'ADMIN_USER' : 'USER',
    entityId: userId || adminUserId,
    userId,
    adminUserId,
    metadata: {
      success,
      ...metadata,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Log API key creation/management events
 * @param {Object} options - API key event options
 * @param {string} options.action - Action performed (CREATE, REVOKE, etc.)
 * @param {string} options.apiKeyId - ID of the API key
 * @param {string} options.userId - ID of the user performing the action
 * @param {string} [options.organizationId] - Organization context
 * @param {string} [options.ipAddress] - IP address
 * @param {string} [options.userAgent] - User agent
 * @param {Object} [options.metadata] - Additional metadata
 */
async function logApiKeyEvent(options) {
  const { action, apiKeyId, userId, organizationId, ipAddress, userAgent, metadata = {} } = options;

  await logAuditEvent({
    action: `API_KEY_${action}`,
    entityType: 'API_KEY',
    entityId: apiKeyId,
    userId,
    organizationId,
    metadata,
    ipAddress,
    userAgent,
  });
}

/**
 * Log invitation events
 * @param {Object} options - Invitation event options
 * @param {string} options.action - Action performed (INVITE_SENT, INVITE_ACCEPTED, etc.)
 * @param {string} options.invitationId - ID of the invitation
 * @param {string} options.invitedEmail - Email of the invited user
 * @param {string} [options.invitedById] - ID of the user sending the invitation
 * @param {string} [options.organizationId] - Organization context
 * @param {string} [options.role] - Role being assigned
 * @param {string} [options.ipAddress] - IP address
 * @param {string} [options.userAgent] - User agent
 */
async function logInvitationEvent(options) {
  const {
    action,
    invitationId,
    invitedEmail,
    invitedById,
    organizationId,
    role,
    ipAddress,
    userAgent,
  } = options;

  await logAuditEvent({
    action,
    entityType: 'MEMBERSHIP',
    entityId: invitationId,
    userId: invitedById,
    organizationId,
    metadata: {
      invitedEmail,
      role,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Get audit logs with filtering and pagination
 * @param {Object} options - Query options
 * @param {string} [options.organizationId] - Filter by organization
 * @param {string} [options.userId] - Filter by user
 * @param {string} [options.entityType] - Filter by entity type
 * @param {string} [options.action] - Filter by action
 * @param {Date} [options.startDate] - Filter by date range start
 * @param {Date} [options.endDate] - Filter by date range end
 * @param {number} [options.page] - Page number (default: 1)
 * @param {number} [options.limit] - Results per page (default: 50)
 * @param {string} [options.orderBy] - Order by field (default: 'timestamp')
 * @param {string} [options.orderDir] - Order direction (default: 'desc')
 */
async function getAuditLogs(options = {}) {
  const {
    organizationId,
    userId,
    entityType,
    action,
    startDate,
    endDate,
    page = 1,
    limit = 50,
    orderBy = 'timestamp',
    orderDir = 'desc',
  } = options;

  const where = {};

  if (organizationId) where.organizationId = organizationId;
  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const [logs, total] = await prismaService.withTenantContext(organizationId, async tx => {
    return await Promise.all([
      tx.auditLog.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          adminPerformedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      tx.auditLog.count({ where }),
    ]);
  });

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get role change logs with filtering and pagination
 * @param {Object} options - Query options
 * @param {string} [options.organizationId] - Filter by organization
 * @param {string} [options.targetUserId] - Filter by target user
 * @param {string} [options.targetAdminId] - Filter by target admin
 * @param {string} [options.performedById] - Filter by performer
 * @param {string} [options.status] - Filter by status
 * @param {Date} [options.startDate] - Filter by date range start
 * @param {Date} [options.endDate] - Filter by date range end
 * @param {number} [options.page] - Page number (default: 1)
 * @param {number} [options.limit] - Results per page (default: 50)
 */
async function getRoleChangeLogs(options = {}) {
  const {
    organizationId,
    targetUserId,
    targetAdminId,
    performedById,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = options;

  const where = {};

  if (organizationId) where.organizationId = organizationId;
  if (targetUserId) where.targetUserId = targetUserId;
  if (targetAdminId) where.targetAdminId = targetAdminId;
  if (performedById) where.performedById = performedById;
  if (status) where.status = status;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await prismaService.withTenantContext(organizationId, async tx => {
    return await Promise.all([
      tx.roleChangeLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          targetUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          targetAdmin: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          performedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          adminPerformedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          approvedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      tx.roleChangeLog.count({ where }),
    ]);
  });

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  logAuditEvent,
  logRoleChange,
  logUserLogin,
  logApiKeyEvent,
  logInvitationEvent,
  getAuditLogs,
  getRoleChangeLogs,
};
