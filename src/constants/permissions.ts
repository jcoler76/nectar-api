/**
 * Default permission settings for the application
 * These are used when user permissions are not available or context is not initialized
 */

// Define the permission structure type
export interface UserPermissions {
  canViewDashboard: boolean;
  canManageServices: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canViewDocs: boolean;
  canManageApplications: boolean;
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  canViewDashboard: false,
  canManageServices: false,
  canManageUsers: false,
  canManageRoles: false,
  canViewDocs: true,
  canManageApplications: false,
} as const;

/**
 * Admin user permissions - full access to all features
 */
export const ADMIN_PERMISSIONS: UserPermissions = {
  canViewDashboard: true,
  canManageServices: true,
  canManageUsers: true,
  canManageRoles: true,
  canViewDocs: true,
  canManageApplications: true,
} as const;

/**
 * Standard user permissions - limited access
 */
export const STANDARD_USER_PERMISSIONS: UserPermissions = {
  canViewDashboard: true,
  canManageServices: false,
  canManageUsers: false,
  canManageRoles: false,
  canViewDocs: true,
  canManageApplications: false,
} as const;
