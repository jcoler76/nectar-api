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
  canManageOrgSettings: false, // Cannot change org settings
  canViewOrgReports: true,
  canManageOrgBilling: false,  // Cannot manage billing
  canExportData: true,
  canImportData: true,
  canDeleteData: false,        // Cannot delete data
} as const;

/**
 * Organization Member permissions - standard access
 */
export const ORG_MEMBER_PERMISSIONS: CustomerPermissions = {
  canViewDashboard: true,
  canManageConnections: false,
  canManageServices: false,
  canManageApplications: false,
  canManageWorkflows: true,     // Can create/edit workflows
  canManageOrgUsers: false,
  canManageOrgSettings: false,
  canViewOrgReports: false,
  canManageOrgBilling: false,
  canExportData: false,
  canImportData: false,
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
