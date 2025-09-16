import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  FileText,
  PieChart,
  Activity,
  Clock,
  AlertCircle
} from 'lucide-react';
import ActivityChart from '../dashboard/ActivityChart';
import { licenseService } from '../../services/licenseService';

interface AnalyticsData {
  revenue: {
    total: number;
    monthly: number;
    growth: number;
    breakdown: {
      plan: string;
      revenue: number;
      count: number;
    }[];
  };
  licenses: {
    total: number;
    active: number;
    suspended: number;
    expired: number;
    growth: number;
    byPlan: {
      plan: string;
      count: number;
      percentage: number;
    }[];
  };
  customers: {
    total: number;
    active: number;
    churn: number;
    acquisitionRate: number;
  };
  usage: {
    totalUsers: number;
    totalApiCalls: number;
    avgUsagePerLicense: number;
    topCustomers: {
      name: string;
      usage: number;
      trend: 'up' | 'down' | 'stable';
    }[];
  };
  timeline: {
    date: string;
    revenue: number;
    licenses: number;
    customers: number;
    activeUsers: number;
  }[];
  forecasting: {
    nextMonthRevenue: number;
    nextMonthLicenses: number;
    confidenceScore: number;
  };
}

export default function AdvancedAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // For demo purposes, we'll generate comprehensive mock data
      // In real implementation, this would call multiple API endpoints
      const mockData: AnalyticsData = generateMockAnalytics();
      setAnalytics(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = (): AnalyticsData => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

    return {
      revenue: {
        total: 125400,
        monthly: 42800,
        growth: 15.3,
        breakdown: [
          { plan: 'ENTERPRISE', revenue: 89200, count: 12 },
          { plan: 'PROFESSIONAL', revenue: 28600, count: 34 },
          { plan: 'STARTER', revenue: 7600, count: 28 },
        ],
      },
      licenses: {
        total: 74,
        active: 68,
        suspended: 4,
        expired: 2,
        growth: 8.1,
        byPlan: [
          { plan: 'ENTERPRISE', count: 12, percentage: 16.2 },
          { plan: 'PROFESSIONAL', count: 34, percentage: 45.9 },
          { plan: 'STARTER', count: 28, percentage: 37.9 },
        ],
      },
      customers: {
        total: 58,
        active: 54,
        churn: 3.4,
        acquisitionRate: 12.5,
      },
      usage: {
        totalUsers: 1247,
        totalApiCalls: 2850000,
        avgUsagePerLicense: 18.3,
        topCustomers: [
          { name: 'Acme Corp', usage: 285000, trend: 'up' },
          { name: 'TechStart Inc', usage: 198000, trend: 'up' },
          { name: 'Global Solutions', usage: 156000, trend: 'down' },
          { name: 'Innovation Labs', usage: 134000, trend: 'stable' },
          { name: 'Future Systems', usage: 98000, trend: 'up' },
        ],
      },
      timeline: generateTimelineData(days),
      forecasting: {
        nextMonthRevenue: 47200,
        nextMonthLicenses: 82,
        confidenceScore: 0.85,
      },
    };
  };

  const generateTimelineData = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 2000) + 1000,
        licenses: Math.floor(Math.random() * 5) + 70,
        customers: Math.floor(Math.random() * 3) + 55,
        activeUsers: Math.floor(Math.random() * 100) + 1200,
      });
    }
    return data;
  };

  const getChartData = () => {
    if (!analytics) return [];

    return analytics.timeline.map(day => ({
      name: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: day[selectedMetric as keyof typeof day] as number,
    }));
  };

  const exportData = () => {
    if (!analytics) return;

    const csvData = [
      ['Date', 'Revenue', 'Licenses', 'Customers', 'Active Users'],
      ...analytics.timeline.map(day => [
        day.date,
        day.revenue,
        day.licenses,
        day.customers,
        day.activeUsers,
      ]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licensing-analytics-${timeRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Analytics</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Comprehensive licensing business intelligence and forecasting
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
          <button
            onClick={loadAnalytics}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">
                  ${analytics.revenue.monthly.toLocaleString()}
                </p>
                <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {analytics.revenue.growth}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Active Licenses</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{analytics.licenses.active}</p>
                <p className="ml-2 flex items-baseline text-sm font-semibold text-blue-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {analytics.licenses.growth}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{analytics.customers.active}</p>
                <p className="ml-2 flex items-baseline text-sm font-semibold text-red-600">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  {analytics.customers.churn}% churn
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-100">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{analytics.usage.totalUsers.toLocaleString()}</p>
                <p className="ml-2 text-sm text-gray-500">across all licenses</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Trends & Performance</h3>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="mt-2 sm:mt-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="revenue">Revenue</option>
            <option value="licenses">Licenses</option>
            <option value="customers">Customers</option>
            <option value="activeUsers">Active Users</option>
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

      {/* Detailed Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Plan</h3>
          <div className="space-y-4">
            {analytics.revenue.breakdown.map((item) => (
              <div key={item.plan} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    item.plan === 'ENTERPRISE' ? 'bg-purple-500' :
                    item.plan === 'PROFESSIONAL' ? 'bg-blue-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm text-gray-700">{item.plan}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    ${item.revenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">{item.count} licenses</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* License Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">License Distribution</h3>
          <div className="space-y-4">
            {analytics.licenses.byPlan.map((item) => (
              <div key={item.plan}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.plan}</span>
                  <span className="font-medium text-gray-900">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      item.plan === 'ENTERPRISE' ? 'bg-purple-500' :
                      item.plan === 'PROFESSIONAL' ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers by Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Customers by Usage</h3>
          <div className="space-y-4">
            {analytics.usage.topCustomers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 w-3">{index + 1}.</span>
                  <span className="text-sm text-gray-700 ml-2">{customer.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">
                    {customer.usage.toLocaleString()}
                  </span>
                  {customer.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {customer.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  {customer.trend === 'stable' && <div className="w-4 h-0.5 bg-gray-400"></div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Forecasting */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Next Month Forecast</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Projected Revenue</span>
              <span className="text-sm font-medium text-gray-900">
                ${analytics.forecasting.nextMonthRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Projected Licenses</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.forecasting.nextMonthLicenses}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Confidence Score</span>
              <span className="text-sm font-medium text-gray-900">
                {Math.round(analytics.forecasting.confidenceScore * 100)}%
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                Based on {timeRange} historical data
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* License Health Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">License Health Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{analytics.licenses.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{analytics.licenses.suspended}</div>
            <div className="text-sm text-gray-600">Suspended</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{analytics.licenses.expired}</div>
            <div className="text-sm text-gray-600">Expired</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {Math.round((analytics.licenses.active / analytics.licenses.total) * 100)}%
            </div>
            <div className="text-sm text-gray-600">Health Score</div>
          </div>
        </div>
      </div>
    </div>
  );
}