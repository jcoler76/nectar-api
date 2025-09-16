/**
 * Role-Based Dashboard Component
 * Renders different dashboard views based on user role and permissions
 */

import React, { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/utils/rolePermissions';
import { RoleGuard } from '@/components/roles/RoleGuard';

// Import dashboard components
import SuperAdminDashboard from './SuperAdminDashboard';
import OrganizationOwnerDashboard from './OrganizationOwnerDashboard';
import OrganizationAdminDashboard from './OrganizationAdminDashboard';
import DeveloperDashboard from './DeveloperDashboard';
import MemberDashboard from './MemberDashboard';
import ViewerDashboard from './ViewerDashboard';

// Import shared widgets
import {
  OrganizationOverview,
  TeamMembers,
  ApiKeyManagement,
  BillingWidget,
  AnalyticsWidget,
  ActivityFeed,
  QuickActions,
  SystemHealth,
  UserManagement,
  LicenseManagement
} from './widgets';

const RoleBasedDashboard = () => {
  const { user, organization, permissions } = useAuth();

  // Determine the primary dashboard to render based on highest role
  const primaryDashboard = useMemo(() => {
    if (!user?.memberships?.length) return 'viewer';

    // Get the highest role level
    const roles = user.memberships.map(m => m.role);

    if (roles.includes('SUPER_ADMIN')) return 'super-admin';
    if (roles.includes('ORGANIZATION_OWNER') || roles.includes('OWNER')) return 'org-owner';
    if (roles.includes('ORGANIZATION_ADMIN') || roles.includes('ADMIN')) return 'org-admin';
    if (roles.includes('DEVELOPER')) return 'developer';
    if (roles.includes('MEMBER')) return 'member';

    return 'viewer';
  }, [user]);

  // Custom dashboard layouts based on role
  const renderCustomDashboard = () => {
    switch (primaryDashboard) {
      case 'super-admin':
        return <SuperAdminDashboard user={user} />;

      case 'org-owner':
        return <OrganizationOwnerDashboard user={user} organization={organization} />;

      case 'org-admin':
        return <OrganizationAdminDashboard user={user} organization={organization} />;

      case 'developer':
        return <DeveloperDashboard user={user} organization={organization} />;

      case 'member':
        return <MemberDashboard user={user} organization={organization} />;

      case 'viewer':
      default:
        return <ViewerDashboard user={user} organization={organization} />;
    }
  };

  // Shared dashboard with role-based widgets
  const renderSharedDashboard = () => (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.firstName || user?.email}</h1>
        <div className="user-role-badge">
          {primaryDashboard.replace('-', ' ').toUpperCase()}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Organization Overview - Available to all roles */}
        <div className="widget-container">
          <OrganizationOverview organization={organization} />
        </div>

        {/* System Health - Super Admin only */}
        <RoleGuard role="SUPER_ADMIN">
          <div className="widget-container">
            <SystemHealth />
          </div>
        </RoleGuard>

        {/* User Management - Admin level and above */}
        <RoleGuard permission="user:manage">
          <div className="widget-container">
            <UserManagement />
          </div>
        </RoleGuard>

        {/* License Management - Admin level and above */}
        <RoleGuard permission="license:manage">
          <div className="widget-container">
            <LicenseManagement />
          </div>
        </RoleGuard>

        {/* Team Members - Member level and above */}
        <RoleGuard permission="organization:view">
          <div className="widget-container">
            <TeamMembers
              canInvite={hasPermission(user?.role, 'member:invite')}
              canManageRoles={hasPermission(user?.role, 'member:manage_roles')}
            />
          </div>
        </RoleGuard>

        {/* API Key Management - Developer level and above */}
        <RoleGuard permission="apikey:view">
          <div className="widget-container">
            <ApiKeyManagement
              canCreate={hasPermission(user?.role, 'apikey:create')}
              canRevoke={hasPermission(user?.role, 'apikey:revoke')}
            />
          </div>
        </RoleGuard>

        {/* Billing Widget - Admin level and above */}
        <RoleGuard permission="billing:view">
          <div className="widget-container">
            <BillingWidget
              canManage={hasPermission(user?.role, 'billing:manage')}
            />
          </div>
        </RoleGuard>

        {/* Analytics Widget - Developer level and above */}
        <RoleGuard permission="analytics:view">
          <div className="widget-container">
            <AnalyticsWidget />
          </div>
        </RoleGuard>

        {/* Activity Feed - Member level and above */}
        <RoleGuard permission="organization:view">
          <div className="widget-container">
            <ActivityFeed />
          </div>
        </RoleGuard>

        {/* Quick Actions - Based on permissions */}
        <div className="widget-container">
          <QuickActions permissions={permissions} role={primaryDashboard} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="role-based-dashboard">
      {/* Choose between custom layout or shared layout */}
      {process.env.REACT_APP_USE_CUSTOM_DASHBOARDS === 'true'
        ? renderCustomDashboard()
        : renderSharedDashboard()
      }
    </div>
  );
};

export default RoleBasedDashboard;