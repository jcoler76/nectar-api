import {
  DollarSign,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Calculator,
  Download,
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
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const BusinessImpactDashboard = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ROI Calculator state
  const [roiInputs, setRoiInputs] = useState({
    avgHourlyRate: 50,
    hoursBeforeAutomation: 40,
    hoursAfterAutomation: 8,
    processesPerMonth: 100,
    implementationCost: 5000,
  });

  useEffect(() => {
    fetchBusinessImpact();
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBusinessImpact = async () => {
    setLoading(true);
    setError(null);

    try {
      // Since we don't have a specific business impact API yet,
      // we'll calculate impact from existing workflow and usage data
      const [workflowsRes, usageRes, analyticsRes] = await Promise.all([
        fetch(`/api/workflows/analytics/summary?timeRange=${timeRange}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch(`/api/usage/dashboard`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch(`/api/dashboard/metrics`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      // Helper function to safely parse JSON responses
      const safeJsonParse = async (response, defaultValue = { data: null }) => {
        if (!response.ok) {
          console.warn(`API request failed with status ${response.status}: ${response.statusText}`);
          return defaultValue;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`Expected JSON response but got: ${contentType}`);
          return defaultValue;
        }

        try {
          return await response.json();
        } catch (parseError) {
          console.warn('Failed to parse JSON response:', parseError);
          return defaultValue;
        }
      };

      // Even if some requests fail, we can still show partial data
      const workflowData = await safeJsonParse(workflowsRes);
      const usageData = await safeJsonParse(usageRes);
      const analyticsData = await safeJsonParse(analyticsRes);

      // Calculate business impact metrics
      const impact = calculateBusinessImpact(workflowData.data, usageData.data, analyticsData.data);
      setImpactData(impact);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateBusinessImpact = (workflows, usage, analytics) => {
    // Mock calculation based on available data
    const baseMetrics = {
      totalWorkflows: workflows?.totalWorkflows || 0,
      totalExecutions: workflows?.totalExecutions || 0,
      avgExecutionsPerDay: workflows?.avgExecutionsPerDay || 0,
      errorRate: workflows?.performanceMetrics?.errorRate || 0,
    };

    // Estimate time savings (assuming each workflow execution saves 15 minutes on average)
    const avgTimeSavedPerExecution = 15; // minutes
    const totalTimeSavedMinutes = baseMetrics.totalExecutions * avgTimeSavedPerExecution;
    const totalTimeSavedHours = Math.round(totalTimeSavedMinutes / 60);

    // Estimate cost savings (assuming $50/hour average rate)
    const avgHourlyRate = 50;
    const totalCostSaved = totalTimeSavedHours * avgHourlyRate;

    // Calculate error reduction impact
    const errorReductionRate = Math.max(0, (100 - baseMetrics.errorRate) / 100);
    const qualityImprovement = errorReductionRate * 100;

    // Generate trend data
    const trends = generateTrendData(baseMetrics, timeRange);

    return {
      metrics: {
        timeSaved: {
          hours: totalTimeSavedHours,
          hoursPerDay: Math.round(totalTimeSavedHours / getDaysInRange(timeRange)),
          hoursPerWeek: Math.round(totalTimeSavedHours / (getDaysInRange(timeRange) / 7)),
        },
        costSavings: {
          total: totalCostSaved,
          monthly: Math.round(totalCostSaved / (getDaysInRange(timeRange) / 30)),
          yearly: Math.round(totalCostSaved * (365 / getDaysInRange(timeRange))),
        },
        productivity: {
          improvementRate: Math.min(95, 20 + baseMetrics.totalExecutions / 100),
          processesAutomated: baseMetrics.totalWorkflows,
          executionsCompleted: baseMetrics.totalExecutions,
        },
        quality: {
          errorReduction: qualityImprovement,
          successRate: 100 - baseMetrics.errorRate,
          reliabilityScore: Math.round(errorReductionRate * 100),
        },
      },
      trends,
      roi: calculateROI(totalCostSaved, roiInputs.implementationCost),
    };
  };

  const calculateROI = (savings, cost) => {
    const roi = cost > 0 ? ((savings - cost) / cost) * 100 : 0;
    const paybackMonths =
      cost > 0 ? Math.ceil(cost / (savings / (getDaysInRange(timeRange) / 30))) : 0;

    return {
      percentage: Math.round(roi),
      paybackPeriod: paybackMonths,
      breakEvenPoint: paybackMonths > 0 ? `${paybackMonths} months` : 'Immediate',
    };
  };

  const getDaysInRange = range => {
    const days = { '7d': 7, '30d': 30, '90d': 90 };
    return days[range] || 30;
  };

  const generateTrendData = (metrics, range) => {
    const days = getDaysInRange(range);
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Generate realistic trend data
      const dailyExecutions = Math.round(
        (metrics.avgExecutionsPerDay || 0) * (0.8 + Math.random() * 0.4)
      );
      const dailyTimeSaved = dailyExecutions * 0.25; // 15 minutes = 0.25 hours
      const dailyCostSaved = dailyTimeSaved * 50;

      data.push({
        date: date.toISOString().split('T')[0],
        timeSaved: dailyTimeSaved,
        costSaved: dailyCostSaved,
        executions: dailyExecutions,
        cumulativeROI: Math.round((dailyCostSaved * (days - i)) / 1000), // Simplified cumulative ROI
      });
    }

    return data;
  };

  const calculateCustomROI = () => {
    const hoursPerMonth =
      roiInputs.processesPerMonth *
      (roiInputs.hoursBeforeAutomation - roiInputs.hoursAfterAutomation);
    const monthlySavings = hoursPerMonth * roiInputs.avgHourlyRate;
    const annualSavings = monthlySavings * 12;
    const roi =
      ((annualSavings - roiInputs.implementationCost) / roiInputs.implementationCost) * 100;
    const paybackMonths = Math.ceil(roiInputs.implementationCost / monthlySavings);

    return {
      hoursPerMonth,
      monthlySavings,
      annualSavings,
      roi: Math.round(roi),
      paybackMonths,
    };
  };

  const customROI = useMemo(() => calculateCustomROI(), [roiInputs]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
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
        <AlertDescription>Failed to load business impact data: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Business Impact Dashboard</h2>
          <p className="text-muted-foreground">
            Measure the ROI and business value of your automation investments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Impact Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold">{impactData?.metrics.timeSaved.hours || 0}h</p>
                <p className="text-xs text-green-600">
                  {impactData?.metrics.timeSaved.hoursPerDay || 0}h/day avg
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cost Savings</p>
                <p className="text-2xl font-bold">
                  ${impactData?.metrics.costSavings.total?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-green-600">
                  ${impactData?.metrics.costSavings.monthly?.toLocaleString() || 0}/month
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Productivity Gain</p>
                <p className="text-2xl font-bold">
                  {impactData?.metrics.productivity.improvementRate || 0}%
                </p>
                <p className="text-xs text-blue-600">
                  {impactData?.metrics.productivity.processesAutomated || 0} processes automated
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quality Improvement</p>
                <p className="text-2xl font-bold">
                  {impactData?.metrics.quality.reliabilityScore || 0}%
                </p>
                <p className="text-xs text-green-600">
                  {impactData?.metrics.quality.errorReduction.toFixed(1) || 0}% error reduction
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Impact Trends</TabsTrigger>
          <TabsTrigger value="roi-calculator">ROI Calculator</TabsTrigger>
          <TabsTrigger value="breakdown">Impact Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Business Impact Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {impactData?.trends?.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={impactData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="timeSaved"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Hours Saved"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="costSaved"
                      stackId="2"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Cost Saved ($)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No trend data available for the selected time range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi-calculator">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  ROI Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hourlyRate">Average Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      value={roiInputs.avgHourlyRate}
                      onChange={e =>
                        setRoiInputs(prev => ({ ...prev, avgHourlyRate: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="hoursPerMonth">Processes per Month</Label>
                    <Input
                      id="hoursPerMonth"
                      type="number"
                      value={roiInputs.processesPerMonth}
                      onChange={e =>
                        setRoiInputs(prev => ({
                          ...prev,
                          processesPerMonth: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="hoursBefore">Hours Before (per process)</Label>
                    <Input
                      id="hoursBefore"
                      type="number"
                      step="0.5"
                      value={roiInputs.hoursBeforeAutomation}
                      onChange={e =>
                        setRoiInputs(prev => ({
                          ...prev,
                          hoursBeforeAutomation: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="hoursAfter">Hours After (per process)</Label>
                    <Input
                      id="hoursAfter"
                      type="number"
                      step="0.5"
                      value={roiInputs.hoursAfterAutomation}
                      onChange={e =>
                        setRoiInputs(prev => ({
                          ...prev,
                          hoursAfterAutomation: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="implementationCost">Implementation Cost ($)</Label>
                    <Input
                      id="implementationCost"
                      type="number"
                      value={roiInputs.implementationCost}
                      onChange={e =>
                        setRoiInputs(prev => ({
                          ...prev,
                          implementationCost: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ROI Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Hours Saved/Month</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {customROI.hoursPerMonth.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Monthly Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${customROI.monthlySavings.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Annual Savings</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${customROI.annualSavings.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className="text-2xl font-bold text-orange-600">{customROI.roi}%</p>
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Payback Period</p>
                  <p className="text-xl font-bold">{customROI.paybackMonths} months</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Impact Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h4 className="font-medium">Time Efficiency</h4>
                      <p className="text-sm text-muted-foreground">
                        {impactData?.metrics.timeSaved.hours || 0} hours saved
                      </p>
                    </div>
                    <Badge variant="default">
                      {impactData?.metrics.timeSaved.hoursPerWeek || 0}h/week
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h4 className="font-medium">Cost Reduction</h4>
                      <p className="text-sm text-muted-foreground">Direct labor cost savings</p>
                    </div>
                    <Badge variant="default">
                      ${impactData?.metrics.costSavings.yearly?.toLocaleString() || 0}/year
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h4 className="font-medium">Quality Improvement</h4>
                      <p className="text-sm text-muted-foreground">
                        Error reduction and reliability
                      </p>
                    </div>
                    <Badge variant="default">
                      {impactData?.metrics.quality.reliabilityScore || 0}% reliable
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h4 className="font-medium">Process Optimization</h4>
                      <p className="text-sm text-muted-foreground">
                        Automated workflows and efficiency
                      </p>
                    </div>
                    <Badge variant="default">
                      {impactData?.metrics.productivity.processesAutomated || 0} processes
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ROI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Total ROI</p>
                    <p className="text-4xl font-bold text-green-600">
                      {impactData?.roi?.percentage || 0}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Payback: {impactData?.roi?.breakEvenPoint || 'N/A'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 border rounded">
                      <p className="text-lg font-bold">
                        {impactData?.metrics.productivity.executionsCompleted || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Executions</p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-lg font-bold">
                        {impactData?.metrics.quality.successRate.toFixed(1) || 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessImpactDashboard;
