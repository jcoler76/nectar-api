/**
 * Super Admin Dashboard
 * Full platform overview with system-wide controls
 */

import React from 'react';
import {
  SystemHealth,
  PlatformAnalytics,
  UserManagement,
  OrganizationManagement,
  LicenseManagement,
  AdminUserManagement,
  AuditLogs,
  SystemSettings
} from './widgets';

const SuperAdminDashboard = ({ user }) => {
  return (
    <div className="super-admin-dashboard">
      <div className="dashboard-header">
        <h1>Platform Administration</h1>
        <p>System-wide overview and controls</p>
        <div className="admin-badge super-admin">SUPER ADMIN</div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Organizations</h3>
          <div className="stat-value">1,247</div>
          <div className="stat-change positive">+12 this month</div>
        </div>
        <div className="stat-card">
          <h3>Active Users</h3>
          <div className="stat-value">15,692</div>
          <div className="stat-change positive">+8.5%</div>
        </div>
        <div className="stat-card">
          <h3>API Calls Today</h3>
          <div className="stat-value">2.1M</div>
          <div className="stat-change neutral">Normal</div>
        </div>
        <div className="stat-card">
          <h3>System Health</h3>
          <div className="stat-value">99.9%</div>
          <div className="stat-change positive">All systems operational</div>
        </div>
      </div>

      <div className="admin-grid">
        {/* System Health Monitoring */}
        <div className="widget-container full-width">
          <SystemHealth />
        </div>

        {/* Platform Analytics */}
        <div className="widget-container half-width">
          <PlatformAnalytics />
        </div>

        {/* Recent Audit Events */}
        <div className="widget-container half-width">
          <AuditLogs limit={10} realtime={true} />
        </div>

        {/* Organization Management */}
        <div className="widget-container full-width">
          <OrganizationManagement />
        </div>

        {/* User Management */}
        <div className="widget-container half-width">
          <UserManagement showGlobalUsers={true} />
        </div>

        {/* Admin User Management */}
        <div className="widget-container half-width">
          <AdminUserManagement />
        </div>

        {/* License Management */}
        <div className="widget-container full-width">
          <LicenseManagement showAllLicenses={true} />
        </div>

        {/* System Settings */}
        <div className="widget-container half-width">
          <SystemSettings />
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn primary">Create Organization</button>
          <button className="action-btn secondary">Add Admin User</button>
          <button className="action-btn secondary">View System Logs</button>
          <button className="action-btn warning">System Maintenance</button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;