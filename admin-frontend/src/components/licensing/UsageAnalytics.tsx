import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Activity,
  Database,
  TrendingUp,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import ActivityChart from '../dashboard/ActivityChart';
import MetricCard from '../dashboard/MetricCard';
import { licenseService, type UsageData } from '../../services/licenseService';

interface UsageStats {
  totalActiveUsers: number;
  totalWorkflowRuns: number;
  totalApiCalls: number;
  totalStorageUsed: number;
  totalIntegrationsUsed: number;
  totalDataProcessed: number;
  dailyUsage: {
    date: string;
    activeUsers: number;
    workflowRuns: number;
    apiCalls: number;
    storageUsed: number;
  }[];
}

export default function UsageAnalytics() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('activeUsers');

  useEffect(() => {
    loadUsageAnalytics();
  }, [timeRange]);

  const loadUsageAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // For demo purposes, we'll generate mock data
      // In real implementation, this would call the license server API
      const mockData: UsageStats = {
        totalActiveUsers: Math.floor(Math.random() * 500) + 100,
        totalWorkflowRuns: Math.floor(Math.random() * 10000) + 5000,
        totalApiCalls: Math.floor(Math.random() * 100000) + 50000,
        totalStorageUsed: Math.floor(Math.random() * 1000000000) + 500000000, // bytes
        totalIntegrationsUsed: Math.floor(Math.random() * 50) + 10,
        totalDataProcessed: Math.floor(Math.random() * 10000000000) + 5000000000, // bytes
        dailyUsage: generateMockDailyUsage(days)
      };

      setUsageStats(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage analytics');
    } finally {
      setLoading(false);
    }
  };

  const generateMockDailyUsage = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        activeUsers: Math.floor(Math.random() * 100) + 20,
        workflowRuns: Math.floor(Math.random() * 500) + 100,
        apiCalls: Math.floor(Math.random() * 5000) + 1000,
        storageUsed: Math.floor(Math.random() * 10000000) + 5000000,
      });
    }
    return data;
  };

  const formatMetricValue = (value: number, metric: string) => {
    switch (metric) {
      case 'storageUsed':
      case 'dataProcessed':
        return licenseService.formatBytes(value);
      case 'apiCalls':
      case 'workflowRuns':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const getChartData = () => {
    if (!usageStats) return [];

    return usageStats.dailyUsage.map(day => ({
      name: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: day[selectedMetric as keyof typeof day] as number,
    }));
  };

  const getMetricGrowth = (metric: string) => {
    if (!usageStats || usageStats.dailyUsage.length < 2) return 0;

    const recent = usageStats.dailyUsage.slice(-7);
    const earlier = usageStats.dailyUsage.slice(-14, -7);

    if (recent.length === 0 || earlier.length === 0) return 0;

    const recentAvg = recent.reduce((sum, day) => sum + (day[metric as keyof typeof day] as number), 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, day) => sum + (day[metric as keyof typeof day] as number), 0) / earlier.length;

    if (earlierAvg === 0) return 0;

    return Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100);
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
          <div className="flex-shrink-0">
            <Activity className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Analytics</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor customer usage patterns and system performance
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Users"
          value={usageStats?.totalActiveUsers || 0}
          change={getMetricGrowth('activeUsers')}
          icon={<Users className="h-6 w-6 text-blue-600" />}
          trend={getMetricGrowth('activeUsers') >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Workflow Runs"
          value={usageStats?.totalWorkflowRuns.toLocaleString() || '0'}
          change={getMetricGrowth('workflowRuns')}
          icon={<Activity className="h-6 w-6 text-green-600" />}
          trend={getMetricGrowth('workflowRuns') >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="API Calls"
          value={usageStats?.totalApiCalls.toLocaleString() || '0'}
          change={getMetricGrowth('apiCalls')}
          icon={<BarChart3 className="h-6 w-6 text-purple-600" />}
          trend={getMetricGrowth('apiCalls') >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Storage Used"
          value={formatMetricValue(usageStats?.totalStorageUsed || 0, 'storageUsed')}
          change={getMetricGrowth('storageUsed')}
          icon={<Database className="h-6 w-6 text-orange-600" />}
          trend={getMetricGrowth('storageUsed') >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Usage Trends</h3>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="mt-2 sm:mt-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="activeUsers">Active Users</option>
            <option value="workflowRuns">Workflow Runs</option>
            <option value="apiCalls">API Calls</option>
            <option value="storageUsed">Storage Used</option>
          </select>
        </div>

        <div className="h-80">
          <ActivityChart
            data={getChartData()}
            height={320}
            color="#3B82F6"
          />
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage by Feature */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Usage by Feature</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Workflows</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {usageStats?.totalWorkflowRuns.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">API Calls</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {usageStats?.totalApiCalls.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Integrations</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {usageStats?.totalIntegrationsUsed || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Data Processed</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatMetricValue(usageStats?.totalDataProcessed || 0, 'dataProcessed')}
              </span>
            </div>
          </div>
        </div>

        {/* Top Customers by Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Customers by Usage</h3>
          <div className="space-y-4">
            {[
              { name: 'Acme Corp', usage: '2.5M API calls', growth: '+15%' },
              { name: 'TechStart Inc', usage: '1.8M API calls', growth: '+23%' },
              { name: 'Global Solutions', usage: '1.2M API calls', growth: '-5%' },
              { name: 'Innovation Labs', usage: '850K API calls', growth: '+8%' },
              { name: 'Future Systems', usage: '620K API calls', growth: '+12%' },
            ].map((customer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                  <div className="text-sm text-gray-500">{customer.usage}</div>
                </div>
                <div className={`text-sm font-medium ${
                  customer.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {customer.growth}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Summary Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Usage Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow Runs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usageStats?.dailyUsage.slice(-7).reverse().map((day, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(day.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {day.activeUsers.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {day.workflowRuns.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {day.apiCalls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {licenseService.formatBytes(day.storageUsed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}