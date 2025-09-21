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
  Legend,
  Sankey,
  FunnelChart,
  Funnel,
  Cell
} from 'recharts';
import {
  ArrowRightIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowDownIcon,
  TrendingDownIcon,
  TrendingUpIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { graphqlRequest } from '../../services/graphql';

interface UserJourney {
  journeyId: string;
  journeyName: string;
  totalUsers: number;
  completedUsers: number;
  completionRate: number;
  averageDuration: number;
  steps: Array<{
    stepName: string;
    stepOrder: number;
    usersEntered: number;
    usersCompleted: number;
    dropoffRate: number;
    averageTimeSpent: number;
  }>;
}

interface Funnel {
  funnelName: string;
  totalEntries: number;
  finalConversions: number;
  conversionRate: number;
  stages: Array<{
    stageName: string;
    stageOrder: number;
    users: number;
    conversionFromPrevious: number;
    dropoffCount: number;
    dropoffRate: number;
  }>;
}

interface PathAnalysis {
  path: string;
  userCount: number;
  conversionRate: number;
  averageDuration: number;
  bounceRate: number;
}

interface CohortData {
  cohortDate: string;
  cohortSize: number;
  retention: Array<{
    period: number;
    retainedUsers: number;
    retentionRate: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const UserJourneyAnalytics: React.FC = () => {
  const [journeys, setJourneys] = useState<UserJourney[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [topPaths, setTopPaths] = useState<PathAnalysis[]>([]);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<string>('all');
  const [selectedFunnel, setSelectedFunnel] = useState<string>('signup');
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJourneyAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
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
        query GetUserJourneyAnalytics($startDate: String!, $endDate: String!, $journey: String, $funnel: String) {
          userJourneys(startDate: $startDate, endDate: $endDate, journey: $journey) {
            journeyId
            journeyName
            totalUsers
            completedUsers
            completionRate
            averageDuration
            steps {
              stepName
              stepOrder
              usersEntered
              usersCompleted
              dropoffRate
              averageTimeSpent
            }
          }
          conversionFunnels(startDate: $startDate, endDate: $endDate, funnel: $funnel) {
            funnelName
            totalEntries
            finalConversions
            conversionRate
            stages {
              stageName
              stageOrder
              users
              conversionFromPrevious
              dropoffCount
              dropoffRate
            }
          }
          topUserPaths(startDate: $startDate, endDate: $endDate, limit: 10) {
            path
            userCount
            conversionRate
            averageDuration
            bounceRate
          }
          cohortAnalysis(startDate: $startDate, endDate: $endDate) {
            cohortDate
            cohortSize
            retention {
              period
              retainedUsers
              retentionRate
            }
          }
        }
      `;

      const variables = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        journey: selectedJourney !== 'all' ? selectedJourney : null,
        funnel: selectedFunnel
      };

      const result = await graphqlRequest(query, variables);

      setJourneys(result.userJourneys || []);
      setFunnels(result.conversionFunnels || []);
      setTopPaths(result.topUserPaths || []);
      setCohortData(result.cohortAnalysis || []);
    } catch (err) {
      console.error('Failed to load user journey analytics:', err);
      setError('Failed to load journey analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJourneyAnalytics();
  }, [timeRange, selectedJourney, selectedFunnel]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getDropoffSeverity = (dropoffRate: number) => {
    if (dropoffRate > 70) return { color: 'text-red-600', bg: 'bg-red-100', severity: 'High' };
    if (dropoffRate > 40) return { color: 'text-yellow-600', bg: 'bg-yellow-100', severity: 'Medium' };
    return { color: 'text-green-600', bg: 'bg-green-100', severity: 'Low' };
  };

  if (loading && journeys.length === 0) {
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
          onClick={loadJourneyAnalytics}
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
        <h1 className="text-2xl font-bold text-gray-900">User Journey Analytics</h1>
        <div className="flex space-x-4">
          <select
            value={selectedJourney}
            onChange={(e) => setSelectedJourney(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Journeys</option>
            <option value="onboarding">Onboarding</option>
            <option value="feature_adoption">Feature Adoption</option>
            <option value="workflow_creation">Workflow Creation</option>
            <option value="integration_setup">Integration Setup</option>
          </select>
          <select
            value={selectedFunnel}
            onChange={(e) => setSelectedFunnel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="signup">Signup Funnel</option>
            <option value="onboarding">Onboarding Funnel</option>
            <option value="workflow_creation">Workflow Creation</option>
            <option value="integration_setup">Integration Setup</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Journey Overview */}
      {journeys.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {journeys.reduce((sum, j) => sum + j.totalUsers, 0).toLocaleString()}
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
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {journeys.reduce((sum, j) => sum + j.completedUsers, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Avg Completion</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {journeys.length > 0
                      ? (journeys.reduce((sum, j) => sum + j.completionRate, 0) / journeys.length).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-orange-100">
                  <ClockIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {journeys.length > 0
                      ? formatDuration(journeys.reduce((sum, j) => sum + j.averageDuration, 0) / journeys.length)
                      : '0s'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conversion Funnel */}
      {funnels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel: {funnels[0].funnelName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnels[0].stages.map((stage, index) => (
                <div key={index} className="relative">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        {stage.stageOrder}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-lg overflow-hidden">
                        <div
                          className="bg-blue-600 h-8 flex items-center justify-between px-4 text-white text-sm font-medium"
                          style={{
                            width: `${(stage.users / funnels[0].totalEntries) * 100}%`,
                            minWidth: '150px'
                          }}
                        >
                          <span>{stage.stageName}</span>
                          <span>{stage.users.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-gray-600">
                          {((stage.users / funnels[0].totalEntries) * 100).toFixed(1)}% of total
                        </span>
                        {index > 0 && (
                          <span className={`text-sm ${
                            stage.dropoffRate > 50 ? 'text-red-600' : stage.dropoffRate > 25 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {stage.dropoffRate.toFixed(1)}% dropoff
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < funnels[0].stages.length - 1 && (
                    <div className="flex justify-center mt-2">
                      <ArrowDownIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Total Entries</p>
                  <p className="text-lg font-semibold">{funnels[0].totalEntries.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Final Conversions</p>
                  <p className="text-lg font-semibold">{funnels[0].finalConversions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overall Conversion Rate</p>
                  <p className="text-lg font-semibold text-blue-600">{funnels[0].conversionRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Journey Step Analysis */}
      {journeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Journey Step Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {journeys.map((journey) => (
                <div key={journey.journeyId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{journey.journeyName}</h3>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {journey.totalUsers.toLocaleString()} users
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        journey.completionRate >= 80
                          ? 'bg-green-100 text-green-800'
                          : journey.completionRate >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {journey.completionRate.toFixed(1)}% completion
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {journey.steps.map((step, index) => {
                      const dropoffSeverity = getDropoffSeverity(step.dropoffRate);
                      return (
                        <div key={index} className="border rounded p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-sm">{step.stepName}</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${dropoffSeverity.bg} ${dropoffSeverity.color}`}>
                              {dropoffSeverity.severity}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span>Entered:</span>
                              <span className="font-medium">{step.usersEntered.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Completed:</span>
                              <span className="font-medium">{step.usersCompleted.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Dropoff:</span>
                              <span className={`font-medium ${dropoffSeverity.color}`}>
                                {step.dropoffRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Avg Time:</span>
                              <span className="font-medium">{formatDuration(step.averageTimeSpent)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top User Paths */}
      {topPaths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Common User Paths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Path
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bounce Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topPaths.map((path, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs">
                        <div className="truncate" title={path.path}>
                          {path.path.split(' → ').slice(0, 3).join(' → ')}
                          {path.path.split(' → ').length > 3 && ' ...'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {path.userCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          path.conversionRate >= 80
                            ? 'bg-green-100 text-green-800'
                            : path.conversionRate >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {path.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDuration(path.averageDuration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          path.bounceRate > 70
                            ? 'bg-red-100 text-red-800'
                            : path.bounceRate > 40
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {path.bounceRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cohort Retention Analysis */}
      {cohortData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>User Retention Cohort Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Cohort
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Size
                    </th>
                    {[1, 7, 14, 30, 60, 90].map(period => (
                      <th key={period} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        Day {period}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohortData.slice(0, 10).map((cohort, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {new Date(cohort.cohortDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {cohort.cohortSize.toLocaleString()}
                      </td>
                      {[1, 7, 14, 30, 60, 90].map(period => {
                        const retention = cohort.retention.find(r => r.period === period);
                        const rate = retention ? retention.retentionRate : 0;
                        return (
                          <td key={period} className="px-4 py-2 text-center">
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                              rate >= 80
                                ? 'bg-green-100 text-green-800'
                                : rate >= 60
                                ? 'bg-yellow-100 text-yellow-800'
                                : rate >= 40
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {rate.toFixed(0)}%
                            </span>
                          </td>
                        );
                      })}
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

export default UserJourneyAnalytics;