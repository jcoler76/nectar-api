import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  CogIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  TrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { graphqlRequest } from '../../services/graphql';

interface FeatureMetrics {
  totalFeatureEvents: number;
  uniqueUsersUsingFeatures: number;
  averageSessionDuration: number;
  featuresByUsage: Array<{
    featureName: string;
    totalUsage: number;
    uniqueUsers: number;
    avgDuration: number;
    completionRate: number;
  }>;
  featureAdoption: Array<{
    featureName: string;
    adoptionRate: number;
    newUsers: number;
    returningUsers: number;
  }>;
  featureTrends: Array<{
    date: string;
    [key: string]: number | string;
  }>;
  featureErrors: Array<{
    featureName: string;
    errorCount: number;
    errorRate: number;
  }>;
}

interface FeatureJourney {
  stepName: string;
  usersEntered: number;
  usersCompleted: number;
  dropoffRate: number;
  avgTimeSpent: number;
}

interface PopularFeaturePath {
  path: string;
  count: number;
  completionRate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const FeatureUsageAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<FeatureMetrics | null>(null);
  const [featureJourneys, setFeatureJourneys] = useState<FeatureJourney[]>([]);
  const [popularPaths, setPopularPaths] = useState<PopularFeaturePath[]>([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeatureAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const query = `
        query GetFeatureUsageAnalytics($startDate: String!, $endDate: String!, $feature: String) {
          featureUsageAnalytics(startDate: $startDate, endDate: $endDate, feature: $feature) {
            totalFeatureEvents
            uniqueUsersUsingFeatures
            averageSessionDuration
            featuresByUsage {
              featureName
              totalUsage
              uniqueUsers
              avgDuration
              completionRate
            }
            featureAdoption {
              featureName
              adoptionRate
              newUsers
              returningUsers
            }
            featureTrends {
              date
              workflows
              connections
              services
              analytics
              reports
              settings
            }
            featureErrors {
              featureName
              errorCount
              errorRate
            }
          }
          featureJourneys(startDate: $startDate, endDate: $endDate, feature: $feature) {
            stepName
            usersEntered
            usersCompleted
            dropoffRate
            avgTimeSpent
          }
          popularFeaturePaths(startDate: $startDate, endDate: $endDate) {
            path
            count
            completionRate
          }
        }
      `;

      const variables = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        feature: selectedFeature !== 'all' ? selectedFeature : null
      };

      const result = await graphqlRequest(query, variables);

      setMetrics(result.featureUsageAnalytics);
      setFeatureJourneys(result.featureJourneys || []);
      setPopularPaths(result.popularFeaturePaths || []);
    } catch (err) {
      console.error('Failed to load feature usage analytics:', err);
      setError('Failed to load feature analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatureAnalytics();
  }, [timeRange, selectedFeature]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatFeatureName = (feature: string) => {
    const featureNames: { [key: string]: string } = {
      'workflows': 'Workflows',
      'connections': 'Connections',
      'services': 'Services',
      'dashboard': 'Dashboard',
      'analytics': 'Analytics',
      'reports': 'Reports',
      'settings': 'Settings',
      'users': 'User Management',
      'roles': 'Role Management',
      'applications': 'Applications',
      'endpoints': 'Endpoints',
      'api-builder': 'API Builder',
      'integrations': 'Integrations',
      'documentation': 'Documentation',
      'billing': 'Billing'
    };

    return featureNames[feature] || feature.charAt(0).toUpperCase() + feature.slice(1);
  };

  const getHealthStatus = (completionRate: number, errorRate: number) => {
    if (errorRate > 10) return { status: 'poor', color: 'text-red-600', icon: XCircleIcon };
    if (completionRate < 50) return { status: 'warning', color: 'text-yellow-600', icon: ExclamationTriangleIcon };
    return { status: 'good', color: 'text-green-600', icon: CheckCircleIcon };
  };

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadFeatureAnalytics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Feature Usage Analytics</h1>
        <div className="flex space-x-4">
          <select
            value={selectedFeature}
            onChange={(e) => setSelectedFeature(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Features</option>
            <option value="workflows">Workflows</option>
            <option value="connections">Connections</option>
            <option value="services">Services</option>
            <option value="analytics">Analytics</option>
            <option value="reports">Reports</option>
            <option value="settings">Settings</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <CogIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Feature Events</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.totalFeatureEvents.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <UserGroupIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.uniqueUsersUsingFeatures.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100">
                  <ClockIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Avg Session</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatDuration(metrics.averageSessionDuration)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-orange-100">
                  <TrendingUpIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Top Feature</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {metrics.featuresByUsage.length > 0
                      ? formatFeatureName(metrics.featuresByUsage[0].featureName)
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Usage Distribution */}
        {metrics && metrics.featuresByUsage.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.featuresByUsage.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ featureName, totalUsage, percent }) =>
                      percent > 5 ? `${formatFeatureName(featureName)} (${(percent * 100).toFixed(0)}%)` : ''
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalUsage"
                    nameKey="featureName"
                  >
                    {metrics.featuresByUsage.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Feature Adoption Rates */}
        {metrics && metrics.featureAdoption.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Feature Adoption Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.featureAdoption.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="featureName"
                    tickFormatter={formatFeatureName}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => formatFeatureName(value as string)}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Adoption Rate']}
                  />
                  <Bar dataKey="adoptionRate" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Feature Trends */}
      {metrics && metrics.featureTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={metrics.featureTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="workflows" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="connections" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                <Area type="monotone" dataKey="services" stackId="1" stroke="#ffc658" fill="#ffc658" />
                <Area type="monotone" dataKey="analytics" stackId="1" stroke="#ff7300" fill="#ff7300" />
                <Area type="monotone" dataKey="reports" stackId="1" stroke="#00ff00" fill="#00ff00" />
                <Area type="monotone" dataKey="settings" stackId="1" stroke="#ff0000" fill="#ff0000" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Feature Performance Table */}
      {metrics && metrics.featuresByUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unique Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Health
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.featuresByUsage.slice(0, 10).map((feature, index) => {
                    const errorMetric = metrics.featureErrors.find(e => e.featureName === feature.featureName);
                    const errorRate = errorMetric?.errorRate || 0;
                    const health = getHealthStatus(feature.completionRate, errorRate);
                    const HealthIcon = health.icon;

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatFeatureName(feature.featureName)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {feature.totalUsage.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {feature.uniqueUsers.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDuration(feature.avgDuration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            feature.completionRate >= 80
                              ? 'bg-green-100 text-green-800'
                              : feature.completionRate >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {feature.completionRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <HealthIcon className={`h-5 w-5 ${health.color}`} />
                            <span className={`ml-2 capitalize ${health.color}`}>
                              {health.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Journey Analysis */}
      {featureJourneys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Journey Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {featureJourneys.map((step, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{step.stepName}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {step.usersEntered} entered → {step.usersCompleted} completed
                      </span>
                      <span className="text-xs text-gray-500">
                        Avg: {formatDuration(step.avgTimeSpent)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      step.dropoffRate < 10
                        ? 'bg-green-100 text-green-800'
                        : step.dropoffRate < 25
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {step.dropoffRate.toFixed(1)}% dropoff
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeatureUsageAnalytics;