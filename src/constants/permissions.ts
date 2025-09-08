/**
 * Customer application permission settings
 * Organization-scoped permissions for customer users only
 */

// Define the customer permission structure type
export interface CustomerPermissions {
  // Core permissions
  canViewDashboard: boolean;
  canManageConnections: boolean;
  canManageServices: boolean;
  canManageApplications: boolean;
  canManageWorkflows: boolean;
  
  // User management within organization
  canManageOrgUsers: boolean;
  canManageOrgSettings: boolean;
  canViewOrgReports: boolean;
  canManageOrgBilling: boolean;
  
  // Data permissions
  canExportData: boolean;
  canImportData: boolean;
  canDeleteData: boolean;
}

export const DEFAULT_PERMISSIONS: CustomerPermissions = {
  canViewDashboard: false,
  canManageConnections: false,
  canManageServices: false,
  canManageApplications: false,
  canManageWorkflows: false,
  canManageOrgUsers: false,
  canManageOrgSettings: false,
  canViewOrgReports: false,
  canManageOrgBilling: false,
  canExportData: false,
  canImportData: false,
  canDeleteData: false,
} as const;

/**
 * Organization Owner permissions - full access within organization
 */
export const ORG_OWNER_PERMISSIONS: CustomerPermissions = {
  canViewDashboard: true,
  canManageConnections: true,
  canManageServices: true,
  canManageApplications: true,
  canManageWorkflows: true,
  canManageOrgUsers: true,
  canManageOrgSettings: true,
  canViewOrgReports: true,
  canManageOrgBilling: true,
  canExportData: true,
  canImportData: true,
  canDeleteData: true,
} as const;

/**
 * Organization Admin permissions - most access within organization
 */
export const ORG_ADMIN_PERMISSIONS: CustomerPermissions = {
  canViewDashboard: true,
  canManageConnections: true,
  canManageServices: true,
  canManageApplications: true,
  canManageWorkflows: true,
  canManageOrgUsers: true,
  canManageOrgSettings: false,
  canViewOrgReports: true,
  canManageOrgBilling: false,
  canExportData: true,
  canImportData: true,
  canDeleteData: false,
} as const;

/**
 * Organization Member permissions - standard user access
 */
export const ORG_MEMBER_PERMISSIONS: CustomerPermissions = {
  canViewDashboard: true,
  canManageConnections: true,
  canManageServices: true,
  canManageApplications: true,
  canManageWorkflows: true,
  canManageOrgUsers: false,
  canManageOrgSettings: false,
  canViewOrgReports: false,
  canManageOrgBilling: false,
  canExportData: true,
  canImportData: true,
  canDeleteData: false,
} as const;

/**
 * Organization Viewer permissions - read-only access
 */
export const ORG_VIEWER_PERMISSIONS: CustomerPermissions = {
  canViewDashboard: true,
  canManageConnections: false,
  canManageServices: false,
  canManageApplications: false,
  canManageWorkflows: false,
  canManageOrgUsers: false,
  canManageOrgSettings: false,
  canViewOrgReports: false,
  canManageOrgBilling: false,
  canExportData: false,
  canImportData: false,
  canDeleteData: false,
} as const;

// Platform admin permissions type (for admin portal)
export interface UserPermissions {
  canViewDashboard: boolean;
  canManageServices: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canViewDocs: boolean;
  canManageApplications: boolean;
  canAccessSettings: boolean;
  canViewAllOrganizations?: boolean;
  canManagePlatform?: boolean;
  canViewSystemLogs?: boolean;
}

export const SUPERADMIN_PERMISSIONS: UserPermissions = {
  canViewDashboard: true,
  canManageServices: true,
  canManageUsers: true,
  canManageRoles: true,
  canViewDocs: true,
  canManageApplications: true,
  canAccessSettings: true,
  canViewAllOrganizations: true,
  canManagePlatform: true,
  canViewSystemLogs: true,
} as const;
