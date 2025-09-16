/**
 * Developer Dashboard
 * Focus on API management, documentation, and technical resources
 */

import React from 'react';
import {
  ApiKeyManagement,
  AnalyticsWidget,
  ApiDocumentation,
  CodeExamples,
  WebhookManagement,
  RateLimitMonitor,
  ErrorLogs,
  TestingTools
} from './widgets';

const DeveloperDashboard = ({ user, organization }) => {
  return (
    <div className="developer-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Developer Console</h1>
          <p>API management and development tools</p>
        </div>
        <div className="role-badge developer">DEVELOPER</div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>API Keys</h3>
          <div className="stat-value">8</div>
          <div className="stat-change">3 production, 5 dev</div>
        </div>
        <div className="stat-card">
          <h3>Requests Today</h3>
          <div className="stat-value">45.2K</div>
          <div className="stat-change positive">+12%</div>
        </div>
        <div className="stat-card">
          <h3>Success Rate</h3>
          <div className="stat-value">99.8%</div>
          <div className="stat-change positive">Excellent</div>
        </div>
        <div className="stat-card">
          <h3>Avg Response</h3>
          <div className="stat-value">145ms</div>
          <div className="stat-change positive">Fast</div>
        </div>
      </div>

      <div className="developer-grid">
        {/* API Key Management - Primary focus */}
        <div className="widget-container full-width">
          <ApiKeyManagement
            canCreate={true}
            canRevoke={true}
            showUsageStats={true}
            showEnvironments={true}
          />
        </div>

        {/* API Analytics */}
        <div className="widget-container half-width">
          <AnalyticsWidget
            showTechnicalMetrics={true}
            focusOnAPI={true}
          />
        </div>

        {/* Rate Limit Monitor */}
        <div className="widget-container half-width">
          <RateLimitMonitor />
        </div>

        {/* Error Logs & Debugging */}
        <div className="widget-container full-width">
          <ErrorLogs
            canViewDetails={true}
            showTrends={true}
          />
        </div>

        {/* Webhook Management */}
        <div className="widget-container half-width">
          <WebhookManagement
            canCreate={true}
            canTest={true}
          />
        </div>

        {/* Testing Tools */}
        <div className="widget-container half-width">
          <TestingTools />
        </div>

        {/* API Documentation */}
        <div className="widget-container half-width">
          <ApiDocumentation
            showInteractive={true}
          />
        </div>

        {/* Code Examples */}
        <div className="widget-container half-width">
          <CodeExamples
            showLanguageOptions={true}
          />
        </div>
      </div>

      <div className="quick-actions">
        <h3>Developer Actions</h3>
        <div className="action-buttons">
          <button className="action-btn primary">Create API Key</button>
          <button className="action-btn secondary">Test Endpoints</button>
          <button className="action-btn secondary">View Docs</button>
          <button className="action-btn secondary">Download SDKs</button>
          <button className="action-btn warning">Debug Issues</button>
        </div>
      </div>

      <div className="developer-tools">
        <h3>Development Tools</h3>
        <div className="tools-grid">
          <div className="tool-card">
            <h4>API Explorer</h4>
            <p>Interactive API testing and exploration</p>
            <button className="tool-action">Launch Explorer</button>
          </div>
          <div className="tool-card">
            <h4>Webhook Tester</h4>
            <p>Test webhook endpoints and payloads</p>
            <button className="tool-action">Test Webhooks</button>
          </div>
          <div className="tool-card">
            <h4>Rate Limit Calculator</h4>
            <p>Calculate and optimize your API usage</p>
            <button className="tool-action">Open Calculator</button>
          </div>
          <div className="tool-card">
            <h4>Log Analysis</h4>
            <p>Deep dive into API logs and patterns</p>
            <button className="tool-action">Analyze Logs</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;