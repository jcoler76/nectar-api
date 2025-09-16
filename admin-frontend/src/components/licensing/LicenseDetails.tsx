import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Calendar,
  User,
  Building,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  RefreshCw,
  Download,
  Settings,
  Shield,
  BarChart3,
  Clock,
  FileText,
  ExternalLink
} from 'lucide-react';
import { licenseService, type LicenseData, type CustomerData, type UsageData } from '../../services/licenseService';
import { Modal } from '../ui/modal';
import ActivityChart from '../dashboard/ActivityChart';

interface LicenseDetailsProps {
  licenseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onLicenseUpdated?: () => void;
}

interface LicenseEditData {
  plan: string;
  features: string[];
  maxUsers?: number;
  maxWorkflows?: number;
  maxIntegrations?: number;
  expiresAt?: string;
  isActive: boolean;
}

const FEATURE_OPTIONS = [
  { id: 'basic_workflows', label: 'Basic Workflows', category: 'Core' },
  { id: 'advanced_workflows', label: 'Advanced Workflows', category: 'Core' },
  { id: 'unlimited_workflows', label: 'Unlimited Workflows', category: 'Core' },
  { id: 'email_integration', label: 'Email Integration', category: 'Integrations' },
  { id: 'all_integrations', label: 'All Integrations', category: 'Integrations' },
  { id: 'custom_integrations', label: 'Custom Integrations', category: 'Integrations' },
  { id: 'basic_analytics', label: 'Basic Analytics', category: 'Analytics' },
  { id: 'advanced_analytics', label: 'Advanced Analytics', category: 'Analytics' },
  { id: 'enterprise_analytics', label: 'Enterprise Analytics', category: 'Analytics' },
  { id: 'api_access', label: 'API Access', category: 'Developer' },
  { id: 'webhooks', label: 'Webhooks', category: 'Developer' },
  { id: 'priority_support', label: 'Priority Support', category: 'Support' },
  { id: 'sso', label: 'Single Sign-On', category: 'Security' },
  { id: 'audit_logs', label: 'Audit Logs', category: 'Security' },
];

export default function LicenseDetails({ licenseId, isOpen, onClose, onLicenseUpdated }: LicenseDetailsProps) {
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<LicenseEditData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (licenseId && isOpen) {
      loadLicenseDetails();
    }
  }, [licenseId, isOpen]);

  const loadLicenseDetails = async () => {
    if (!licenseId) return;

    try {
      setLoading(true);
      setError(null);

      const [licenseData, usageData] = await Promise.all([
        licenseService.getLicense(licenseId),
        licenseService.getLicenseUsage(licenseId, {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          granularity: 'daily'
        }).catch(() => []) // Usage might not be available
      ]);

      setLicense(licenseData);
      setUsage(Array.isArray(usageData) ? usageData : []);

      // Load customer details if needed
      if (licenseData.customerId) {
        try {
          const customerData = await licenseService.getCustomer(licenseData.customerId);
          setCustomer(customerData);
        } catch (err) {
          console.error('Failed to load customer:', err);
        }
      }

      // Initialize edit data
      setEditData({
        plan: licenseData.plan,
        features: licenseData.features || [],
        maxUsers: licenseData.maxUsers,
        maxWorkflows: licenseData.maxWorkflows,
        maxIntegrations: licenseData.maxIntegrations,
        expiresAt: licenseData.expiresAt?.split('T')[0],
        isActive: licenseData.isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load license details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!license || !editData) return;

    try {
      setLoading(true);
      await licenseService.updateLicense(license.id, editData);
      await loadLicenseDetails(); // Reload to get updated data
      setIsEditing(false);
      if (onLicenseUpdated) {
        onLicenseUpdated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update license');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!license) return;

    const reason = prompt('Reason for suspension (optional):');
    if (reason === null) return; // User cancelled

    try {
      setLoading(true);
      await licenseService.suspendLicense(license.id, reason);
      await loadLicenseDetails();
      if (onLicenseUpdated) {
        onLicenseUpdated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend license');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!license) return;

    try {
      setLoading(true);
      await licenseService.reactivateLicense(license.id);
      await loadLicenseDetails();
      if (onLicenseUpdated) {
        onLicenseUpdated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate license');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    if (!editData) return;

    setEditData(prev => ({
      ...prev!,
      features: prev!.features.includes(featureId)
        ? prev!.features.filter(f => f !== featureId)
        : [...prev!.features, featureId],
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusInfo = () => {
    if (!license) return { status: 'unknown', color: 'gray', icon: Server };

    const statusInfo = licenseService.getLicenseStatus(license);
    const iconMap = {
      active: CheckCircle,
      suspended: Pause,
      expired: Clock,
      inactive: X,
    };

    return {
      ...statusInfo,
      icon: iconMap[statusInfo.status] || Server,
    };
  };

  const getUsageChart = () => {
    if (!usage.length) return [];

    return usage.map(day => ({
      name: new Date(day.recordDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'Active Users': day.activeUsers,
      'Workflow Runs': day.workflowRuns,
      'API Calls': day.apiCalls / 1000, // Scale down for better visualization
    }));
  };

  if (!license || !isOpen) return null;

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="extra-large">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="mr-4 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">License Details</h2>
              <p className="text-gray-500 font-mono text-sm">
                {license.licenseKey.substring(0, 40)}...
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              statusInfo.status === 'active' ? 'bg-green-100 text-green-800' :
              statusInfo.status === 'suspended' ? 'bg-red-100 text-red-800' :
              statusInfo.status === 'expired' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              <StatusIcon className="h-4 w-4 mr-2" />
              {statusInfo.label}
            </div>

            {!isEditing ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit2 className="h-4 w-4 mr-1 inline" />
                  Edit
                </button>
                {license.isSuspended ? (
                  <button
                    onClick={handleReactivate}
                    disabled={loading}
                    className="px-3 py-1 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4 mr-1 inline" />
                    Reactivate
                  </button>
                ) : (
                  <button
                    onClick={handleSuspend}
                    disabled={loading}
                    className="px-3 py-1 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    <Pause className="h-4 w-4 mr-1 inline" />
                    Suspend
                  </button>
                )}
              </div>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-1 inline" />
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-1 inline" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'usage', label: 'Usage & Analytics', icon: BarChart3 },
              { id: 'configuration', label: 'Configuration', icon: Settings },
              { id: 'security', label: 'Security & Audit', icon: Shield },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                {customer ? (
                  <div className="space-y-3">
                    <div className="flex items-center">
                      {customer.companyName ? (
                        <Building className="h-5 w-5 text-gray-400 mr-3" />
                      ) : (
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.companyName || customer.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.companyName ? customer.email : 'Individual Customer'}
                        </div>
                      </div>
                    </div>
                    {customer.contactName && (
                      <div className="text-sm text-gray-600">
                        Contact: {customer.contactName}
                      </div>
                    )}
                    {customer.phone && (
                      <div className="text-sm text-gray-600">
                        Phone: {customer.phone}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Loading customer information...</div>
                )}
              </div>

              {/* License Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">License Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Plan</span>
                    <span className="text-sm font-medium text-gray-900">
                      {license.plan} ({license.licenseType})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Issued</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(license.issuedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Expires</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(license.expiresAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Activity</span>
                    <span className="text-sm font-medium text-gray-900">
                      {license.lastHeartbeat ? licenseService.formatRelativeTime(license.lastHeartbeat) : 'No activity'}
                    </span>
                  </div>
                  {license.billingCycle && license.amount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Billing</span>
                      <span className="text-sm font-medium text-gray-900">
                        {licenseService.formatCurrency(license.amount, license.currency)} / {license.billingCycle.toLowerCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage Limits */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Limits</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Max Users</span>
                    <span className="text-sm font-medium text-gray-900">
                      {license.maxUsers || 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Max Workflows</span>
                    <span className="text-sm font-medium text-gray-900">
                      {license.maxWorkflows || 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Max Integrations</span>
                    <span className="text-sm font-medium text-gray-900">
                      {license.maxIntegrations || 'Unlimited'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Enabled Features</h3>
                {license.features && license.features.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {license.features.map(featureId => {
                      const feature = FEATURE_OPTIONS.find(f => f.id === featureId);
                      return feature ? (
                        <span key={featureId} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {feature.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No features enabled</div>
                )}
              </div>
            </div>
          )}

          {/* Usage & Analytics Tab */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              {usage.length > 0 ? (
                <>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Trends (Last 30 Days)</h3>
                    <div className="h-80">
                      <ActivityChart
                        data={getUsageChart()}
                        height={320}
                        color="#3B82F6"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center">
                        <User className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold text-gray-900">
                            {usage.reduce((sum, day) => sum + day.activeUsers, 0)}
                          </div>
                          <div className="text-sm text-gray-600">Total Active Users</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center">
                        <Activity className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold text-gray-900">
                            {usage.reduce((sum, day) => sum + day.workflowRuns, 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Workflow Runs</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center">
                        <BarChart3 className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold text-gray-900">
                            {usage.reduce((sum, day) => sum + day.apiCalls, 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">API Calls</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No usage data</h3>
                  <p className="mt-1 text-sm text-gray-500">Usage analytics will appear here once the license is active.</p>
                </div>
              )}
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'configuration' && (
            <div className="space-y-6">
              {isEditing && editData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Settings */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Plan
                        </label>
                        <select
                          value={editData.plan}
                          onChange={(e) => setEditData(prev => ({ ...prev!, plan: e.target.value }))}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="STARTER">Starter</option>
                          <option value="PROFESSIONAL">Professional</option>
                          <option value="ENTERPRISE">Enterprise</option>
                          <option value="CUSTOM">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expires At
                        </label>
                        <input
                          type="date"
                          value={editData.expiresAt || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev!, expiresAt: e.target.value }))}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editData.isActive}
                            onChange={(e) => setEditData(prev => ({ ...prev!, isActive: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">License Active</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Usage Limits */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Limits</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Users
                        </label>
                        <input
                          type="number"
                          value={editData.maxUsers || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev!, maxUsers: parseInt(e.target.value) || undefined }))}
                          placeholder="Unlimited"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Workflows
                        </label>
                        <input
                          type="number"
                          value={editData.maxWorkflows || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev!, maxWorkflows: parseInt(e.target.value) || undefined }))}
                          placeholder="Unlimited"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Integrations
                        </label>
                        <input
                          type="number"
                          value={editData.maxIntegrations || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev!, maxIntegrations: parseInt(e.target.value) || undefined }))}
                          placeholder="Unlimited"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(
                        FEATURE_OPTIONS.reduce((groups, feature) => {
                          if (!groups[feature.category]) groups[feature.category] = [];
                          groups[feature.category].push(feature);
                          return groups;
                        }, {} as Record<string, typeof FEATURE_OPTIONS>)
                      ).map(([category, features]) => (
                        <div key={category}>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">{category}</h5>
                          <div className="space-y-2">
                            {features.map((feature) => (
                              <label key={feature.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editData.features.includes(feature.id)}
                                  onChange={() => handleFeatureToggle(feature.id)}
                                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{feature.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                  <Settings className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Configuration</h3>
                  <p className="mt-1 text-sm text-gray-500">Click Edit to modify license configuration.</p>
                </div>
              )}
            </div>
          )}

          {/* Security & Audit Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Deployment Info */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Deployment Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Deployment ID</span>
                      <span className="text-sm font-medium text-gray-900 font-mono">
                        {license.deploymentId || 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Instance URL</span>
                      <span className="text-sm font-medium text-gray-900">
                        {license.instanceUrl ? (
                          <a
                            href={license.instanceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {license.instanceUrl}
                            <ExternalLink className="h-3 w-3 ml-1 inline" />
                          </a>
                        ) : (
                          'Not set'
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Version</span>
                      <span className="text-sm font-medium text-gray-900">
                        {license.version || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Status */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Security Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">License Key</span>
                      <span className="text-sm font-medium text-green-600">Valid</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Signature</span>
                      <span className="text-sm font-medium text-green-600">Verified</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Heartbeat</span>
                      <span className={`text-sm font-medium ${
                        license.lastHeartbeat &&
                        new Date(license.lastHeartbeat) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                          ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {license.lastHeartbeat ? 'Active' : 'No Signal'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full License Key Display */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">License Key</h3>
                <div className="bg-gray-50 rounded-md p-4">
                  <code className="text-sm font-mono text-gray-900 break-all">
                    {license.licenseKey}
                  </code>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(license.licenseKey)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  Copy to clipboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}