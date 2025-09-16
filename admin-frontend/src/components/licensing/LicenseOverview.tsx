import React, { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Calendar,
  Server
} from 'lucide-react';
import MetricCard from '../dashboard/MetricCard';
import ActivityChart from '../dashboard/ActivityChart';
import { licenseService, type DashboardStats, type SystemHealth } from '../../services/licenseService';
import LicenseWizard from './LicenseWizard';

export default function LicenseOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, healthData] = await Promise.all([
        licenseService.getDashboardStats(),
        licenseService.getSystemHealth()
      ]);
      setStats(statsData);
      setHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <XCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={loadDashboardData}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'unhealthy': return <XCircle className="h-5 w-5" />;
      default: return <Server className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">License Overview</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor license usage, system health, and customer activity
        </p>
      </div>

      {/* System Health Alert */}
      {health && health.status !== 'healthy' && (
        <div className={`rounded-md p-4 ${health.status === 'warning' ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex">
            <div className={`flex-shrink-0 ${health.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}>
              {getHealthIcon(health.status)}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${health.status === 'warning' ? 'text-yellow-800' : 'text-red-800'}`}>
                System Health: {health.status === 'warning' ? 'Warning' : 'Unhealthy'}
              </h3>
              <div className={`mt-2 text-sm ${health.status === 'warning' ? 'text-yellow-700' : 'text-red-700'}`}>
                <ul className="list-disc pl-5 space-y-1">
                  {health.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Licenses"
          value={stats?.licenses.total || 0}
          change={0}
          icon={<FileText className="h-6 w-6 text-blue-600" />}
          trend="up"
        />
        <MetricCard
          title="Active Licenses"
          value={stats?.licenses.active || 0}
          change={0}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          trend="up"
        />
        <MetricCard
          title="Total Customers"
          value={stats?.customers.total || 0}
          change={0}
          icon={<Users className="h-6 w-6 text-purple-600" />}
          trend="up"
        />
        <MetricCard
          title="Validations (30d)"
          value={stats?.activity.validationsLast30Days || 0}
          change={0}
          icon={<Activity className="h-6 w-6 text-orange-600" />}
          trend="up"
        />
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* License Status Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">License Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Active</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats?.licenses.active || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Suspended</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats?.licenses.suspended || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Inactive</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats?.licenses.inactive || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Active Customers</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats?.customers.active || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Inactive Customers</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats?.customers.inactive || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics (Last 30 Days)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.activity.totalUsageLast30Days.activeUsers || 0}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats?.activity.totalUsageLast30Days.workflowRuns || 0}
            </div>
            <div className="text-sm text-gray-600">Workflow Runs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {(stats?.activity.totalUsageLast30Days.apiCalls || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">API Calls</div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${getHealthStatusColor(health?.status || 'unknown')}`}>
              {getHealthIcon(health?.status || 'unknown')}
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900 capitalize">
                {health?.status || 'Unknown'}
              </div>
              <div className="text-sm text-gray-600">
                Database: {health?.database || 'Unknown'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Last Updated</div>
            <div className="text-sm font-medium text-gray-900">
              {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <FileText className="h-4 w-4 mr-2" />
            Create License
          </button>
          <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Users className="h-4 w-4 mr-2" />
            Add Customer
          </button>
          <button
            onClick={loadDashboardData}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* License Creation Wizard */}
      <LicenseWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onLicenseCreated={() => {
          setShowWizard(false);
          loadDashboardData(); // Refresh stats
        }}
      />
    </div>
  );
}