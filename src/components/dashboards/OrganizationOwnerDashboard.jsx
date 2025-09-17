/**
 * Organization Owner Dashboard
 * Full organization control and management
 */

import React from 'react';

import {
  OrganizationOverview,
  TeamMembers,
  BillingWidget,
  AnalyticsWidget,
  ApiKeyManagement,
  OrganizationSettings,
  ActivityFeed,
  UsageMetrics,
} from './widgets';

const OrganizationOwnerDashboard = ({ user, organization }) => {
  return (
    <div className="org-owner-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>{organization?.name || 'Your Organization'}</h1>
          <p>Complete organization management and oversight</p>
        </div>
        <div className="role-badge owner">ORGANIZATION OWNER</div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Team Members</h3>
          <div className="stat-value">{organization?.memberCount || 0}</div>
          <div className="stat-change">Across all roles</div>
        </div>
        <div className="stat-card">
          <h3>API Usage</h3>
          <div className="stat-value">847K</div>
          <div className="stat-change positive">+15% this month</div>
        </div>
        <div className="stat-card">
          <h3>Monthly Spend</h3>
          <div className="stat-value">${organization?.monthlyBill || 0}</div>
          <div className="stat-change neutral">Current cycle</div>
        </div>
        <div className="stat-card">
          <h3>Active Keys</h3>
          <div className="stat-value">{organization?.activeKeys || 0}</div>
          <div className="stat-change">Production & Development</div>
        </div>
      </div>

      <div className="owner-grid">
        {/* Organization Overview */}
        <div className="widget-container full-width">
          <OrganizationOverview organization={organization} showManagement={true} />
        </div>

        {/* Team Management */}
        <div className="widget-container half-width">
          <TeamMembers
            organization={organization}
            canInvite={true}
            canManageRoles={true}
            canRemove={true}
            showRoleDistribution={true}
          />
        </div>

        {/* Billing & Subscription */}
        <div className="widget-container half-width">
          <BillingWidget canManage={true} showDetailed={true} organization={organization} />
        </div>

        {/* Usage Analytics */}
        <div className="widget-container full-width">
          <AnalyticsWidget showAdvanced={true} canExport={true} timeRange="30d" />
        </div>

        {/* API Key Management */}
        <div className="widget-container half-width">
          <ApiKeyManagement
            canCreate={true}
            canRevoke={true}
            canRotate={true}
            showUsageStats={true}
          />
        </div>

        {/* Organization Settings */}
        <div className="widget-container half-width">
          <OrganizationSettings canEdit={true} showAdvancedSettings={true} />
        </div>

        {/* Usage Metrics */}
        <div className="widget-container half-width">
          <UsageMetrics showTrends={true} showPredictions={true} />
        </div>

        {/* Activity Feed */}
        <div className="widget-container half-width">
          <ActivityFeed showAllActivities={true} canManageNotifications={true} />
        </div>
      </div>

      <div className="quick-actions">
        <h3>Owner Actions</h3>
        <div className="action-buttons">
          <button className="action-btn primary">Invite Team Members</button>
          <button className="action-btn secondary">Generate API Key</button>
          <button className="action-btn secondary">View Billing Details</button>
          <button className="action-btn secondary">Organization Settings</button>
          <button className="action-btn warning">Export Data</button>
        </div>
      </div>

      <div className="insights-panel">
        <h3>Organization Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Growth Trends</h4>
            <p>API usage up 15% this month. Consider upgrading plan.</p>
            <button className="insight-action">View Details</button>
          </div>
          <div className="insight-card">
            <h4>Team Activity</h4>
            <p>3 new members added this week. 2 pending invitations.</p>
            <button className="insight-action">Manage Team</button>
          </div>
          <div className="insight-card">
            <h4>Security</h4>
            <p>All API keys rotated within last 90 days. Good security posture.</p>
            <button className="insight-action">Security Review</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationOwnerDashboard;
