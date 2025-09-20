import { useAuth } from '../hooks/useAuth';
import { userHasPermission, canPerformAction, isRoleHigher } from '../utils/rolePermissions';

/**
 * Hook version of RoleGuard for use in conditional logic
 */
export const useRoleGuard = ({ permission, roles, minRole, organizationId, action, resource }) => {
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
    return userRoles.some(userRole => isRoleHigher(userRole, minRole) || userRole === minRole);
  }

  return false;
};
