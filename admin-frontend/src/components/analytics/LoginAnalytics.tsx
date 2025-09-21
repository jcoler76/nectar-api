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
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { graphqlRequest } from '../../services/graphql';

interface LoginMetrics {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsers: number;
  suspiciousActivity: number;
  loginsByHour: Array<{
    hour: string;
    successful: number;
    failed: number;
  }>;
  loginsByDay: Array<{
    date: string;
    successful: number;
    failed: number;
    suspicious: number;
  }>;
  failureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  topCountries: Array<{
    country: string;
    count: number;
    successRate: number;
  }>;
  deviceTypes: Array<{
    deviceType: string;
    count: number;
    percentage: number;
  }>;
  recentSuspiciousActivity: Array<{
    id: string;
    email: string;
    ipAddress: string;
    reason: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface SecurityAlert {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const LoginAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<LoginMetrics | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLoginAnalytics = async () => {
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
        query GetLoginAnalytics($startDate: String!, $endDate: String!) {
          loginAnalytics(startDate: $startDate, endDate: $endDate) {
            totalLogins
            successfulLogins
            failedLogins
            uniqueUsers
            suspiciousActivity
            loginsByHour {
              hour
              successful
              failed
            }
            loginsByDay {
              date
              successful
              failed
              suspicious
            }
            failureReasons {
              reason
              count
              percentage
            }
            topCountries {
              country
              count
              successRate
            }
            deviceTypes {
              deviceType
              count
              percentage
            }
            recentSuspiciousActivity {
              id
              email
              ipAddress
              reason
              timestamp
              severity
            }
          }
          securityAlerts(limit: 10) {
            id
            type
            message
            severity
            timestamp
            resolved
          }
        }
      `;

      const variables = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };

      const result = await graphqlRequest(query, variables);

      setMetrics(result.loginAnalytics);
      setSecurityAlerts(result.securityAlerts || []);
    } catch (err) {
      console.error('Failed to load login analytics:', err);
      setError('Failed to load login analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoginAnalytics();

    // Set up real-time updates every 2 minutes
    const interval = setInterval(() => {
      loadLoginAnalytics();
    }, 120000);

    return () => clearInterval(interval);
  }, [timeRange]);

  const formatFailureReason = (reason: string) => {
    const reasonMap: { [key: string]: string } = {
      'user_not_found': 'User Not Found',
      'invalid_password': 'Invalid Password',
      'account_inactive': 'Account Inactive',
      'no_password_set': 'No Password Set',
      'no_organization_access': 'No Organization Access',
      'rate_limited': 'Rate Limited',
      'suspicious_activity': 'Suspicious Activity',
      'two_factor_required': 'Two Factor Required',
      'two_factor_failed': 'Two Factor Failed'
    };

    return reasonMap[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return DevicePhoneMobileIcon;
      case 'desktop':
        return ComputerDesktopIcon;
      default:
        return GlobeAltIcon;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateSuccessRate = () => {
    if (!metrics || metrics.totalLogins === 0) return 0;
    return ((metrics.successfulLogins / metrics.totalLogins) * 100);
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
          onClick={loadLoginAnalytics}
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
        <h1 className="text-2xl font-bold text-gray-900">Login Analytics & Security</h1>
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

      {/* Security Status Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Logins</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.totalLogins.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.successfulLogins.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">
                    {calculateSuccessRate().toFixed(1)}% success rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-red-100">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.failedLogins.toLocaleString()}
                  </p>
                  <p className="text-xs text-red-600">
                    {((metrics.failedLogins / metrics.totalLogins) * 100).toFixed(1)}% failure rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100">
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Unique Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.uniqueUsers.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-orange-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Suspicious</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.suspiciousActivity.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldExclamationIcon className="h-5 w-5 mr-2 text-orange-600" />
              Recent Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)} ${
                    alert.resolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{alert.type}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        {alert.resolved && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            RESOLVED
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Login Trends */}
        {metrics && metrics.loginsByDay.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Login Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.loginsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="successful" stackId="1" stroke="#10B981" fill="#10B981" name="Successful" />
                  <Area type="monotone" dataKey="failed" stackId="1" stroke="#EF4444" fill="#EF4444" name="Failed" />
                  <Area type="monotone" dataKey="suspicious" stackId="1" stroke="#F59E0B" fill="#F59E0B" name="Suspicious" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Failure Reasons */}
        {metrics && metrics.failureReasons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Failure Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.failureReasons}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ reason, percentage }) =>
                      percentage > 5 ? `${formatFailureReason(reason)} (${percentage.toFixed(0)}%)` : ''
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="reason"
                  >
                    {metrics.failureReasons.map((entry, index) => (
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
      </div>

      {/* Hourly Login Patterns */}
      {metrics && metrics.loginsByHour.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Login Patterns by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.loginsByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successful" fill="#10B981" name="Successful" />
                <Bar dataKey="failed" fill="#EF4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        {metrics && metrics.topCountries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Login Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.topCountries.slice(0, 8).map((country, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                      <span className="font-medium">{country.country}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        {country.count} logins
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        country.successRate >= 90
                          ? 'bg-green-100 text-green-800'
                          : country.successRate >= 70
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {country.successRate.toFixed(1)}% success
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Device Types */}
        {metrics && metrics.deviceTypes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Device Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.deviceTypes.map((device, index) => {
                  const DeviceIcon = getDeviceIcon(device.deviceType);
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <DeviceIcon className="h-5 w-5 text-gray-400" />
                        <span className="font-medium capitalize">{device.deviceType}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                          {device.count} logins
                        </span>
                        <span className="text-sm font-medium">
                          {device.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Suspicious Activity */}
      {metrics && metrics.recentSuspiciousActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldExclamationIcon className="h-5 w-5 mr-2 text-red-600" />
              Recent Suspicious Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.recentSuspiciousActivity.slice(0, 10).map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {activity.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.ipAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFailureReason(activity.reason)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(activity.severity)}`}>
                          {activity.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LoginAnalytics;