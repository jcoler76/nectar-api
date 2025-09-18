import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
  Settings,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const WorkflowPerformanceDashboard = ({ workflowId = null, showSummary = false }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, workflowId, showSummary]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      if (showSummary) {
        // Fetch summary data for all workflows
        const [summaryRes, trendsRes] = await Promise.all([
          fetch(`/api/workflows/analytics/summary?timeRange=${timeRange}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          fetch(`/api/workflows/analytics/trends?timeRange=${timeRange}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);

        if (!summaryRes.ok || !trendsRes.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const summaryData = await summaryRes.json();
        const trendsData = await trendsRes.json();

        setSummary(summaryData.data);
        setTrends(trendsData.data);
      } else if (workflowId) {
        // Fetch specific workflow analytics
        const [analyticsRes, recommendationsRes] = await Promise.all([
          fetch(`/api/workflows/${workflowId}/analytics?timeRange=${timeRange}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          fetch(`/api/workflows/${workflowId}/optimization`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);

        if (!analyticsRes.ok) {
          throw new Error('Failed to fetch workflow analytics');
        }

        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.data);

        if (recommendationsRes.ok) {
          const recommendationsData = await recommendationsRes.json();
          setRecommendations(recommendationsData.data);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const performanceMetrics = useMemo(() => {
    if (showSummary && summary) {
      return [
        {
          title: 'Total Workflows',
          value: summary.totalWorkflows,
          icon: <Activity className="h-5 w-5 text-blue-500" />,
          change: null,
        },
        {
          title: 'Total Executions',
          value: summary.totalExecutions.toLocaleString(),
          icon: <Zap className="h-5 w-5 text-green-500" />,
          change: `${summary.avgExecutionsPerDay}/day avg`,
        },
        {
          title: 'Avg Response Time',
          value: `${summary.performanceMetrics.avgResponseTime}ms`,
          icon: <Clock className="h-5 w-5 text-orange-500" />,
          change: null,
        },
        {
          title: 'Error Rate',
          value: `${summary.performanceMetrics.errorRate}%`,
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          change: null,
        },
      ];
    } else if (analytics) {
      return [
        {
          title: 'Success Rate',
          value: `${analytics.successRate.toFixed(1)}%`,
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          change:
            analytics.successRate >= 95
              ? 'Excellent'
              : analytics.successRate >= 85
                ? 'Good'
                : 'Needs Improvement',
        },
        {
          title: 'Avg Execution Time',
          value: `${analytics.avgExecutionTime}ms`,
          icon: <Clock className="h-5 w-5 text-blue-500" />,
          change:
            analytics.avgExecutionTime < 5000
              ? 'Fast'
              : analytics.avgExecutionTime < 15000
                ? 'Moderate'
                : 'Slow',
        },
        {
          title: 'Total Executions',
          value: analytics.totalExecutions.toLocaleString(),
          icon: <Activity className="h-5 w-5 text-purple-500" />,
          change: `${timeRange} period`,
        },
        {
          title: 'Failed Executions',
          value: analytics.failedExecutions.toLocaleString(),
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          change: analytics.failedExecutions === 0 ? 'Perfect' : 'Has Failures',
        },
      ];
    }
    return [];
  }, [analytics, summary, timeRange, showSummary]);

  const chartData = useMemo(() => {
    if (showSummary && trends) {
      return trends;
    } else if (analytics && analytics.trends) {
      return analytics.trends;
    }
    return [];
  }, [analytics, trends, showSummary]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {showSummary ? 'Workflow Performance Overview' : 'Workflow Analytics'}
          </h2>
          <p className="text-muted-foreground">
            {showSummary
              ? 'Performance metrics across all workflows'
              : 'Detailed performance analysis'}
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last Day</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  {metric.change && (
                    <p className="text-xs text-muted-foreground mt-1">{metric.change}</p>
                  )}
                </div>
                {metric.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Execution Trends</TabsTrigger>
          {!showSummary && <TabsTrigger value="performance">Performance Details</TabsTrigger>}
          {showSummary && <TabsTrigger value="top-workflows">Top Workflows</TabsTrigger>}
          {recommendations.length > 0 && (
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Execution Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="executions"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Total Executions"
                    />
                    <Area
                      type="monotone"
                      dataKey="successful"
                      stackId="2"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Successful"
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      stackId="3"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Failed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No execution data available for the selected time range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {!showSummary && (
          <TabsContent value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Node Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Node Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.nodePerformance?.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.nodePerformance.map((node, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <span className="font-medium">{node.nodeType}</span>
                          <Badge variant="secondary">{node.avgDuration}ms</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No node performance data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Error Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle>Error Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.errorPatterns?.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.errorPatterns.map((error, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <span className="font-medium">{error.errorType}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">{error.count}</Badge>
                            <span className="text-sm text-muted-foreground">
                              ({error.percentage}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No errors in the selected time range</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {showSummary && (
          <TabsContent value="top-workflows">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                {summary?.topPerformingWorkflows?.length > 0 ? (
                  <div className="space-y-3">
                    {summary.topPerformingWorkflows.map((workflow, index) => (
                      <div
                        key={workflow.id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div>
                          <h4 className="font-medium">{workflow.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {workflow.executions} executions
                          </p>
                        </div>
                        <Badge variant="default">{workflow.successRate}% success</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No workflow data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {recommendations.length > 0 && (
          <TabsContent value="recommendations">
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Settings className="h-5 w-5 text-blue-500 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{rec.title}</h4>
                          <Badge
                            variant={
                              rec.priority === 'high'
                                ? 'destructive'
                                : rec.priority === 'medium'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                        <p className="text-sm">{rec.suggestion}</p>
                        {rec.impact && (
                          <p className="text-xs text-green-600 mt-1">Impact: {rec.impact}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default WorkflowPerformanceDashboard;
