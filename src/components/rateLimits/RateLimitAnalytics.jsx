import {
  Activity,
  Shield,
  Timer,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Download,
  TrendingUp,
  Users,
  Settings,
  Clock,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';

import { useNotification } from '../../context/NotificationContext';
import { rateLimitApi } from '../../services/rateLimitApi';
import { formatTimestampEST } from '../../utils/dateUtils';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const RateLimitAnalytics = () => {
  const [analytics, setAnalytics] = useState({});
  const [activeLimits, setActiveLimits] = useState([]);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState('overview');
  const { showNotification } = useNotification();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsRes, activeLimitsRes] = await Promise.all([
        rateLimitApi.getAnalytics({ timeRange }),
        rateLimitApi.getActiveLimits(),
      ]);

      setAnalytics(analyticsRes?.data || {});
      setActiveLimits(Array.isArray(activeLimitsRes?.data) ? activeLimitsRes.data : []);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      showNotification('Failed to fetch analytics data', 'error');
      setAnalytics({});
      setActiveLimits([]);
    } finally {
      setLoading(false);
    }
  }, [timeRange, showNotification]);

  const fetchHistoryData = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const response = await rateLimitApi.getHistory({
        timeRange,
        granularity: timeRange === '1h' || timeRange === '6h' ? 'hour' : 'day',
      });

      setHistoryData(response?.data || null);
    } catch (error) {
      console.error('Failed to fetch history data:', error);
      showNotification('Failed to fetch history data', 'error');
      setHistoryData(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [timeRange, showNotification]);

  useEffect(() => {
    fetchAnalytics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  // Fetch history data when history tab is active
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryData();
    }
  }, [activeTab, fetchHistoryData]);

  const exportAnalytics = () => {
    const data = {
      analytics,
      activeLimits,
      generatedAt: new Date().toISOString(),
      timeRange,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rate-limit-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const configTypeData = analytics.configsByType
    ? Object.entries(analytics.configsByType).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count,
        percentage: ((count / analytics.totalConfigs) * 100).toFixed(1),
      }))
    : [];

  const topLimitedData =
    analytics.topLimitedKeys?.slice(0, 10).map(limit => ({
      key: limit.key.length > 20 ? `${limit.key.substring(0, 20)}...` : limit.key,
      fullKey: limit.key,
      current: limit.currentCount,
      max: limit.maxAllowed,
      usage: ((limit.currentCount / limit.maxAllowed) * 100).toFixed(1),
      config: limit.configName,
    })) || [];

  const usageDistribution = activeLimits.map(limit => {
    const usage = (limit.currentCount / limit.maxAllowed) * 100;
    let category;
    if (usage >= 90) category = 'Critical (90%+)';
    else if (usage >= 75) category = 'High (75-89%)';
    else if (usage >= 50) category = 'Medium (50-74%)';
    else if (usage >= 25) category = 'Low (25-49%)';
    else category = 'Minimal (0-24%)';

    return { ...limit, usage, category };
  });

  const usageCategories = usageDistribution.reduce((acc, limit) => {
    acc[limit.category] = (acc[limit.category] || 0) + 1;
    return acc;
  }, {});

  const usageCategoryData = Object.entries(usageCategories).map(([category, count]) => ({
    category,
    count,
    percentage: ((count / activeLimits.length) * 100).toFixed(1),
  }));

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
  ];

  const overviewCards = [
    {
      title: 'Total Configurations',
      value: analytics.totalConfigs || 0,
      change: null,
      icon: Timer,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Configurations',
      value: analytics.enabledConfigs || 0,
      change: analytics.totalConfigs
        ? `${((analytics.enabledConfigs / analytics.totalConfigs) * 100).toFixed(1)}% enabled`
        : null,
      icon: Activity,
      color: 'bg-green-500',
    },
    {
      title: 'Currently Limited',
      value: analytics.activeLimits || 0,
      change:
        activeLimits.length > 0
          ? `${activeLimits.filter(l => l.currentCount >= l.maxAllowed * 0.8).length} near limit`
          : null,
      icon: Shield,
      color: analytics.activeLimits > 0 ? 'bg-red-500' : 'bg-gray-500',
    },
    {
      title: 'Recent Changes',
      value: analytics.recentChanges?.length || 0,
      change:
        analytics.recentChanges?.length > 0
          ? `Last: ${formatTimestampEST(analytics.recentChanges[0]?.updatedAt, 'MM/DD/YYYY')}`
          : 'No recent changes',
      icon: AlertTriangle,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ocean-800">Rate Limit Analytics</h1>
          <p className="text-gray-600">Monitor rate limiting performance and usage patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-md ${card.color} text-white`}>
                  <IconComponent className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                {card.change && <p className="text-xs text-gray-500 mt-1">{card.change}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alerts */}
      {activeLimits.filter(l => l.currentCount >= l.maxAllowed).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{activeLimits.filter(l => l.currentCount >= l.maxAllowed).length}</strong> rate
            limit(s) are currently at their maximum threshold and may be blocking requests.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Types */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration Types</CardTitle>
                <CardDescription>Distribution of rate limit configurations by type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={configTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ type, percentage }) => `${type} (${percentage}%)`}
                    >
                      {configTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Usage Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Distribution</CardTitle>
                <CardDescription>Current rate limit usage across all active limits</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={usageCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Changes */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Configuration Changes</CardTitle>
              <CardDescription>Latest modifications to rate limit configurations</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.recentChanges?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recentChanges.slice(0, 5).map((change, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{change.name}</div>
                        <div className="text-sm text-gray-500 capitalize">
                          {change.type} configuration
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={change.enabled ? 'success' : 'secondary'}>
                          {change.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <div className="text-sm text-gray-500">
                          {formatTimestampEST(change.updatedAt, 'MM/DD/YYYY')}
                        </div>
                        <div className="text-sm text-gray-500">
                          by {change.updatedBy?.firstName} {change.updatedBy?.lastName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent configuration changes
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          {/* Top Limited Keys */}
          <Card>
            <CardHeader>
              <CardTitle>Most Active Rate Limits</CardTitle>
              <CardDescription>Keys with highest request counts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topLimitedData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="key" type="category" width={150} />
                  <Tooltip
                    formatter={(value, name) => [
                      value,
                      name === 'current' ? 'Current Requests' : 'Max Allowed',
                    ]}
                    labelFormatter={label => {
                      const item = topLimitedData.find(d => d.key === label);
                      return item ? `${item.fullKey} (${item.config})` : label;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="current" fill="#ef4444" name="Current Requests" />
                  <Bar dataKey="max" fill="#94a3b8" name="Max Allowed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Usage Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Usage Breakdown</CardTitle>
              <CardDescription>All active rate limits with current usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Key</th>
                      <th className="text-left p-2">Configuration</th>
                      <th className="text-right p-2">Current</th>
                      <th className="text-right p-2">Max</th>
                      <th className="text-right p-2">Usage</th>
                      <th className="text-center p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageDistribution.slice(0, 20).map((limit, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-sm">
                          {limit.key.length > 30 ? `${limit.key.substring(0, 30)}...` : limit.key}
                        </td>
                        <td className="p-2">{limit.configName}</td>
                        <td className="p-2 text-right">{limit.currentCount}</td>
                        <td className="p-2 text-right">{limit.maxAllowed}</td>
                        <td className="p-2 text-right">{limit.usage.toFixed(1)}%</td>
                        <td className="p-2 text-center">
                          <Badge
                            variant={
                              limit.usage >= 90
                                ? 'destructive'
                                : limit.usage >= 75
                                  ? 'warning'
                                  : limit.usage >= 50
                                    ? 'secondary'
                                    : 'success'
                            }
                          >
                            {limit.category.split(' ')[0]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Rate limiting performance and efficiency metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {analytics.totalConfigs > 0
                      ? ((analytics.enabledConfigs / analytics.totalConfigs) * 100).toFixed(1)
                      : '0'}
                    %
                  </div>
                  <div className="text-sm text-gray-500">Configuration Utilization</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {activeLimits.length > 0
                      ? (
                          activeLimits.reduce((sum, limit) => sum + limit.currentCount, 0) /
                          activeLimits.length
                        ).toFixed(1)
                      : '0'}
                  </div>
                  <div className="text-sm text-gray-500">Average Requests per Limit</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {activeLimits.filter(l => l.currentCount > 0).length}
                  </div>
                  <div className="text-sm text-gray-500">Active Rate Limits</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {historyLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
                <span>Loading historical data...</span>
              </CardContent>
            </Card>
          ) : historyData ? (
            <>
              {/* History Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Changes This Period</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {historyData.summary?.totalChanges || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Configuration modifications</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {historyData.trends?.totalRequests || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {historyData.trends?.avgSuccessRate}% success rate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Config Trend</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {historyData.trends?.configsChange >= 0 ? '+' : ''}
                      {historyData.trends?.configsChange || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Configuration count change</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Contributors</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Object.keys(historyData.summary?.mostActiveUser || {}).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Users making changes</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuration Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration Trends</CardTitle>
                    <CardDescription>Total and enabled configurations over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={historyData.configStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={value => {
                            const date = new Date(value);
                            return timeRange === '1h' || timeRange === '6h'
                              ? formatTimestampEST(date, 'HH:mm')
                              : formatTimestampEST(date, 'MMM DD');
                          }}
                        />
                        <YAxis />
                        <Tooltip labelFormatter={value => new Date(value).toLocaleString()} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="totalConfigs"
                          stroke="#3b82f6"
                          name="Total Configs"
                        />
                        <Line
                          type="monotone"
                          dataKey="enabledConfigs"
                          stroke="#22c55e"
                          name="Enabled Configs"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Request Volume */}
                {historyData.usageData?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Request Volume</CardTitle>
                      <CardDescription>API requests over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={historyData.usageData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="_id"
                            tickFormatter={value => {
                              const date = new Date(value);
                              return timeRange === '1h' || timeRange === '6h'
                                ? formatTimestampEST(date, 'HH:mm')
                                : formatTimestampEST(date, 'MMM DD');
                            }}
                          />
                          <YAxis />
                          <Tooltip labelFormatter={value => new Date(value).toLocaleString()} />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="requestCount"
                            stackId="1"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.6}
                            name="Total Requests"
                          />
                          <Area
                            type="monotone"
                            dataKey="errorCount"
                            stackId="2"
                            stroke="#ef4444"
                            fill="#ef4444"
                            fillOpacity={0.6}
                            name="Error Requests"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Most Active Configurations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Most Modified Configurations</CardTitle>
                    <CardDescription>Configurations with most changes this period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(historyData.summary?.mostActiveConfig || {}).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(historyData.summary.mostActiveConfig)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([configName, changeCount]) => (
                            <div key={configName} className="flex items-center justify-between">
                              <div className="font-medium text-sm">{configName}</div>
                              <Badge variant="secondary">{changeCount} changes</Badge>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No configuration changes in this period
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Most Active Users */}
                <Card>
                  <CardHeader>
                    <CardTitle>Most Active Contributors</CardTitle>
                    <CardDescription>Users making configuration changes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(historyData.summary?.mostActiveUser || {}).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(historyData.summary.mostActiveUser)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([userName, changeCount]) => (
                            <div key={userName} className="flex items-center justify-between">
                              <div className="font-medium text-sm">{userName}</div>
                              <Badge variant="secondary">{changeCount} changes</Badge>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No user activity in this period
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Changes Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Configuration Changes</CardTitle>
                  <CardDescription>
                    Detailed timeline of configuration modifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historyData.changes?.length > 0 ? (
                    <div className="space-y-4">
                      {historyData.changes.slice(0, 10).map((change, index) => (
                        <div key={index} className="border-l-2 border-blue-200 pl-4 pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {change.configType}
                                </Badge>
                                <span className="font-medium text-sm">
                                  {change.configDisplayName}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                {change.changedBy
                                  ? `${change.changedBy.firstName} ${change.changedBy.lastName}`
                                  : 'System'}{' '}
                                • {new Date(change.changedAt).toLocaleString()}
                              </div>
                              {change.reason && (
                                <div className="text-sm text-gray-700 mb-2">
                                  <strong>Reason:</strong> {change.reason}
                                </div>
                              )}
                              <div className="text-xs">
                                <strong>Changes:</strong>
                                <div className="mt-1 pl-2 border-l border-gray-200">
                                  {Object.entries(change.changes).map(([field, changeData]) => (
                                    <div key={field} className="text-xs text-gray-600">
                                      <span className="font-medium">{field}:</span>
                                      <span className="text-red-600 line-through ml-1">
                                        {typeof changeData.from === 'object'
                                          ? JSON.stringify(changeData.from)
                                          : String(changeData.from)}
                                      </span>
                                      <span className="mx-1">→</span>
                                      <span className="text-green-600">
                                        {typeof changeData.to === 'object'
                                          ? JSON.stringify(changeData.to)
                                          : String(changeData.to)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <Clock className="h-4 w-4 text-gray-400 mt-1" />
                          </div>
                        </div>
                      ))}
                      {historyData.changes.length > 10 && (
                        <div className="text-center pt-4 border-t">
                          <span className="text-sm text-gray-500">
                            Showing 10 of {historyData.changes.length} changes
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No configuration changes found in the selected time period.</p>
                      <p className="text-sm mt-2">Try selecting a different time range.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Historical Data</CardTitle>
                <CardDescription>Unable to load historical data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Historical data could not be loaded.</p>
                  <p className="text-sm mt-2">
                    Please try refreshing or contact support if the issue persists.
                  </p>
                  <Button
                    onClick={fetchHistoryData}
                    variant="outline"
                    className="mt-4"
                    disabled={historyLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RateLimitAnalytics;
