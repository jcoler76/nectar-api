/**
 * Role-based permission validation utilities
 * Centralized permission logic for the RBAC system
 */

/**
 * Permission constants for easy management
 */
const PERMISSIONS = {
  // Platform-level permissions
  PLATFORM_ADMIN: 'platform:admin',
  SYSTEM_ADMIN: 'system:admin',

  // Organization management
  ORG_CREATE: 'organization:create',
  ORG_READ: 'organization:read',
  ORG_UPDATE: 'organization:update',
  ORG_DELETE: 'organization:delete',
  ORG_ADMIN: 'organization:admin',
  ORG_SETTINGS: 'organization:settings',

  // User management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE: 'user:manage',

  // Member management
  MEMBER_INVITE: 'member:invite',
  MEMBER_REMOVE: 'member:remove',
  MEMBER_UPDATE: 'member:update',

  // API management
  API_MANAGE: 'api:manage',
  API_KEYS: 'api:keys',
  API_USE: 'api:use',
  API_VIEW: 'api:view',

  // Billing and subscriptions
  BILLING_MANAGE: 'billing:manage',
  BILLING_VIEW: 'billing:view',

  // Audit and monitoring
  AUDIT_READ: 'audit:read',
  AUDIT_WRITE: 'audit:write',
};

/**
 * Role hierarchy for permission inheritance
 */
const ROLE_HIERARCHY = {
  SUPER_ADMIN: {
    level: 100,
    inherits: ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER'],
  },
  ORGANIZATION_OWNER: {
    level: 80,
    inherits: ['ORGANIZATION_ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER'],
  },
  ORGANIZATION_ADMIN: {
    level: 60,
    inherits: ['DEVELOPER', 'MEMBER', 'VIEWER'],
  },
  DEVELOPER: {
    level: 40,
    inherits: ['MEMBER', 'VIEWER'],
  },
  MEMBER: {
    level: 20,
    inherits: ['VIEWER'],
  },
  VIEWER: {
    level: 10,
    inherits: [],
  },
  // Legacy roles for backward compatibility
  OWNER: {
    level: 80,
    inherits: ['ADMIN', 'MEMBER', 'VIEWER'],
  },
  ADMIN: {
    level: 60,
    inherits: ['MEMBER', 'VIEWER'],
  },
};

/**
 * Permission mappings for each role
 */
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    PERMISSIONS.PLATFORM_ADMIN,
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.ORG_CREATE,
    PERMISSIONS.ORG_DELETE,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.AUDIT_WRITE,
  ],
  ORGANIZATION_OWNER: [
    PERMISSIONS.ORG_ADMIN,
    PERMISSIONS.ORG_SETTINGS,
    PERMISSIONS.MEMBER_INVITE,
    PERMISSIONS.MEMBER_REMOVE,
    PERMISSIONS.API_MANAGE,
    PERMISSIONS.BILLING_VIEW,
  ],
  ORGANIZATION_ADMIN: [
    PERMISSIONS.ORG_SETTINGS,
    PERMISSIONS.MEMBER_INVITE,
    PERMISSIONS.MEMBER_UPDATE,
    PERMISSIONS.API_MANAGE,
    PERMISSIONS.BILLING_VIEW,
  ],
  DEVELOPER: [PERMISSIONS.API_MANAGE, PERMISSIONS.API_KEYS],
  MEMBER: [PERMISSIONS.API_USE, PERMISSIONS.ORG_READ],
  VIEWER: [PERMISSIONS.API_VIEW, PERMISSIONS.ORG_READ],
  // Legacy role mappings
  OWNER: [
    PERMISSIONS.ORG_ADMIN,
    PERMISSIONS.ORG_SETTINGS,
    PERMISSIONS.MEMBER_INVITE,
    PERMISSIONS.MEMBER_REMOVE,
    PERMISSIONS.API_MANAGE,
    PERMISSIONS.BILLING_VIEW,
  ],
  ADMIN: [
    PERMISSIONS.ORG_SETTINGS,
    PERMISSIONS.MEMBER_INVITE,
    PERMISSIONS.API_MANAGE,
    PERMISSIONS.BILLING_VIEW,
  ],
};

/**
 * Get all permissions for a given role, including inherited permissions
 * @param {string} role - The role to get permissions for
 * @returns {string[]} Array of permission strings
 */
function getRolePermissions(role) {
  if (!role || !ROLE_PERMISSIONS[role]) {
    return [];
  }

  const directPermissions = ROLE_PERMISSIONS[role] || [];
  const inheritedRoles = ROLE_HIERARCHY[role]?.inherits || [];

  const inheritedPermissions = inheritedRoles.reduce((acc, inheritedRole) => {
    return acc.concat(ROLE_PERMISSIONS[inheritedRole] || []);
  }, []);

  // Remove duplicates and return
  return [...new Set([...directPermissions, ...inheritedPermissions])];
}

/**
 * Check if a role has a specific permission
 * @param {string} role - The role to check
 * @param {string} permission - The permission to check for
 * @returns {boolean} True if role has permission
 */
function hasPermission(role, permission) {
  const rolePermissions = getRolePermissions(role);
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has permission based on their roles and memberships
 * @param {Object} user - User object with memberships
 * @param {string} permission - The permission to check for
 * @param {string} organizationId - Optional organization ID for org-specific permissions
 * @returns {boolean} True if user has permission
 */
function userHasPermission(user, permission, organizationId = null) {
  // Super admin platform access
  if (user.isSuperAdmin || user.roles?.includes('SUPER_ADMIN')) {
    return true;
  }

  // Check organization-specific permissions
  if (organizationId) {
    const orgMembership = user.memberships?.find(m => m.organizationId === organizationId);
    if (orgMembership && hasPermission(orgMembership.role, permission)) {
      return true;
    }
  }

  // Check all user roles for platform-level permissions
  if (user.roles) {
    return user.roles.some(role => hasPermission(role, permission));
  }

  // Fallback to memberships if roles array not available
  if (user.memberships) {
    return user.memberships.some(membership => hasPermission(membership.role, permission));
  }

  return false;
}

/**
 * Check if one role is higher than another in the hierarchy
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean} True if role1 is higher than role2
 */
function isRoleHigher(role1, role2) {
  const level1 = ROLE_HIERARCHY[role1]?.level || 0;
  const level2 = ROLE_HIERARCHY[role2]?.level || 0;
  return level1 > level2;
}

/**
 * Get the highest role from an array of roles
 * @param {string[]} roles - Array of role names
 * @returns {string|null} The highest role or null if no valid roles
 */
function getHighestRole(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return null;
  }

  return roles.reduce((highest, current) => {
    if (!highest) return current;
    return isRoleHigher(current, highest) ? current : highest;
  }, null);
}

/**
 * Validate if a user can perform an action on a resource
 * @param {Object} user - User object
 * @param {string} action - Action to perform (e.g., 'read', 'write', 'delete')
 * @param {string} resource - Resource type (e.g., 'organization', 'user', 'api')
 * @param {string} organizationId - Optional organization context
 * @returns {boolean} True if action is allowed
 */
function canPerformAction(user, action, resource, organizationId = null) {
  const permission = `${resource}:${action}`;
  return userHasPermission(user, permission, organizationId);
}

/**
 * Get all organizations a user has admin access to
 * @param {Object} user - User object with memberships
 * @returns {string[]} Array of organization IDs
 */
function getUserAdminOrganizations(user) {
  if (user.isSuperAdmin || user.roles?.includes('SUPER_ADMIN')) {
    // Super admin has access to all organizations
    return ['*'];
  }

  const adminRoles = ['OWNER', 'ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'];

  return (
    user.memberships
      ?.filter(membership => adminRoles.includes(membership.role))
      ?.map(membership => membership.organizationId) || []
  );
}

/**
 * Express middleware factory for permission checking
 * @param {string} permission - Required permission
 * @param {string} organizationIdParam - Request parameter name for organization ID
 * @returns {Function} Express middleware function
 */
function requirePermission(permission, organizationIdParam = 'organizationId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const organizationId = req.params[organizationIdParam] || req.body[organizationIdParam];

    if (userHasPermission(req.user, permission, organizationId)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions',
      requiredPermission: permission,
    });
  };
}

module.exports = {
  PERMISSIONS,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  getRolePermissions,
  hasPermission,
  userHasPermission,
  isRoleHigher,
  getHighestRole,
  canPerformAction,
  getUserAdminOrganizations,
  requirePermission,
};
