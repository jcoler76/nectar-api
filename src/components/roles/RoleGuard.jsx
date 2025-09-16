import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { userHasPermission, canPerformAction, isRoleHigher } from '../../utils/rolePermissions';

/**
 * RoleGuard Component - Conditional rendering based on user permissions/roles
 *
 * Usage examples:
 * <RoleGuard permission="member:invite">
 *   <InviteButton />
 * </RoleGuard>
 *
 * <RoleGuard roles={['ORGANIZATION_ADMIN', 'SUPER_ADMIN']}>
 *   <AdminPanel />
 * </RoleGuard>
 *
 * <RoleGuard minRole="ORGANIZATION_ADMIN">
 *   <Settings />
 * </RoleGuard>
 */
const RoleGuard = ({
  children,
  permission,
  roles,
  minRole,
  organizationId,
  action,
  resource,
  fallback = null,
  inverse = false,
}) => {
  const { user } = useAuth();

  if (!user) {
    return inverse ? children : fallback;
  }

  let hasAccess = false;

  // Check by specific permission
  if (permission) {
    hasAccess = userHasPermission(user, permission, organizationId);
  }

  // Check by action and resource
  else if (action && resource) {
    hasAccess = canPerformAction(user, action, resource, organizationId);
  }

  // Check by specific roles
  else if (roles && Array.isArray(roles)) {
    const userRoles = user.roles || user.memberships?.map(m => m.role) || [];
    hasAccess = roles.some(role => userRoles.includes(role));
  }

  // Check by minimum role level
  else if (minRole) {
    const userRoles = user.roles || user.memberships?.map(m => m.role) || [];
    hasAccess = userRoles.some(userRole =>
      isRoleHigher(userRole, minRole) || userRole === minRole
    );
  }

  // If organization-specific check, verify user is member
  if (organizationId && hasAccess) {
    const isMember = user.memberships?.some(m => m.organizationId === organizationId);
    const isSuperAdmin = user.isSuperAdmin || user.roles?.includes('SUPER_ADMIN');
    hasAccess = isMember || isSuperAdmin;
  }

  // Return based on inverse flag
  if (inverse) {
    return hasAccess ? fallback : children;
  }

  return hasAccess ? children : fallback;
};

/**
 * Hook version of RoleGuard for use in conditional logic
 */
export const useRoleGuard = ({
  permission,
  roles,
  minRole,
  organizationId,
  action,
  resource,
}) => {
  const { user } = useAuth();

  if (!user) {
    return false;
  }

  // Check by specific permission
  if (permission) {
    return userHasPermission(user, permission, organizationId);
  }

  // Check by action and resource
  if (action && resource) {
    return canPerformAction(user, action, resource, organizationId);
  }

  // Check by specific roles
  if (roles && Array.isArray(roles)) {
    const userRoles = user.roles || user.memberships?.map(m => m.role) || [];
    return roles.some(role => userRoles.includes(role));
  }

  // Check by minimum role level
  if (minRole) {
    const userRoles = user.roles || user.memberships?.map(m => m.role) || [];
    return userRoles.some(userRole =>
      isRoleHigher(userRole, minRole) || userRole === minRole
    );
  }

  return false;
};

/**
 * Higher-order component version
 */
export const withRoleGuard = (WrappedComponent, guardConfig) => {
  return function RoleGuardedComponent(props) {
    return (
      <RoleGuard {...guardConfig} fallback={<div>Access Denied</div>}>
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };
};

export default RoleGuard;