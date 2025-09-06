import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Server,
  Shield,
  Users,
  XCircle,
} from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../services/api';
import { getDashboardMetrics } from '../../services/dashboardService';
import LoadingSpinner from '../common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

import ActivityChart from './ActivityChart';
import MetricCard from './MetricCard';
import ServiceHealthList from './ServiceHealthList';

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [dateRange, setDateRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleTileClick = tileType => {
    switch (tileType) {
      case 'services':
        navigate('/services');
        break;
      case 'applications':
        navigate('/applications');
        break;
      case 'roles':
        navigate('/roles');
        break;
      case 'api': {
        // Navigate to API usage report with today's date filter (Eastern Time)
        const today = new Date().toLocaleDateString('en-CA', {
          timeZone: 'America/New_York',
        });
        navigate(`/reports/api-usage?date=${today}`);
        break;
      }
      default:
        break;
    }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setError(null);
        const data = await getDashboardMetrics(parseInt(dateRange));
        // Use data as-is; backend provides categorical `time` labels
        setMetrics(data);

        // Fetch activity logs statistics based on selected date range
        const timeframeMap = { '7d': '7d', '30d': '30d', '90d': '90d' };
        const response = await api.get('/api/activity-logs/statistics', {
          params: {
            timeframe: timeframeMap[dateRange] || '30d',
            onlyImportant: true, // Only show important API calls
            _t: new Date().getTime(), // Cache-busting parameter
          },
        });
        setStatistics(response.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
        setError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [dateRange]);

  const filteredActivityData = useMemo(() => {
    const raw = metrics?.activityData || [];
    const rangeDays = { '7d': 7, '30d': 30, '90d': 90 }[dateRange] || 30;
    if (raw.length <= rangeDays) return raw;
    return raw.slice(-rangeDays);
  }, [metrics, dateRange]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex flex-col h-full p-6 space-y-6 bg-gradient-subtle min-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ocean-800">Dashboard</h1>
            <p className="text-muted-foreground">Monitor your system metrics and activity</p>
          </div>

          {/* Error Message */}
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="flex items-center gap-2 p-4">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive font-medium">{error}</span>
            </CardContent>
          </Card>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Services"
              value="--"
              icon="services"
              onClick={() => handleTileClick('services')}
            />
            <MetricCard
              title="Applications"
              value="--"
              icon="apps"
              onClick={() => handleTileClick('applications')}
            />
            <MetricCard
              title="Roles"
              value="--"
              icon="roles"
              onClick={() => handleTileClick('roles')}
            />
            <MetricCard
              title="API Calls Today"
              value="--"
              icon="api"
              onClick={() => handleTileClick('api')}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4 sm:space-y-6 bg-gradient-subtle min-h-screen">
      <div className="max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">
        <header className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Monitor your system metrics and activity
          </p>
          {/* Time range selector */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {['7d', '30d', '90d'].map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${dateRange === range ? 'bg-ocean-600 text-white border-ocean-600 hover:bg-ocean-700' : 'bg-background text-foreground hover:bg-muted border-border'}`}
                aria-pressed={dateRange === range}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        {/* API Activity Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                    <p className="text-2xl font-bold">
                      {statistics.summary.totalRequests.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">
                      {statistics.summary.totalRequests > 0
                        ? (
                            (statistics.summary.successfulRequests /
                              statistics.summary.totalRequests) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                    <p className="text-2xl font-bold">
                      {statistics.summary.averageResponseTime
                        ? statistics.summary.averageResponseTime < 1000
                          ? `${Math.round(statistics.summary.averageResponseTime)}ms`
                          : `${(statistics.summary.averageResponseTime / 1000).toFixed(2)}s`
                        : '0ms'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Failed Requests</p>
                    <p className="text-2xl font-bold">
                      {statistics.summary.failedRequests.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Metric Cards Grid - Responsive */}
        <section aria-label="System metrics overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Services</p>
                    <p className="text-2xl font-bold">{metrics?.services || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Applications</p>
                    <p className="text-2xl font-bold">{metrics?.applications || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Roles</p>
                    <p className="text-2xl font-bold">{metrics?.roles || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">API Calls Today</p>
                    <p className="text-2xl font-bold">{metrics?.apiCalls || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Activity Chart - Full Width with responsive padding */}
        <section aria-label="Activity charts">
          <div className="grid grid-cols-1 gap-6">
            <Card gradient className="w-full">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">API Calls</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="w-full overflow-x-auto">
                  <ActivityChart
                    data={filteredActivityData}
                    xKey="time"
                    yKey="calls"
                    height={320}
                  />
                </div>
              </CardContent>
            </Card>
            <Card gradient className="w-full">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Records Processed</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="w-full overflow-x-auto">
                  <ActivityChart
                    data={filteredActivityData}
                    xKey="time"
                    yKey="totalRecords"
                    height={320}
                  />
                </div>
              </CardContent>
            </Card>
            <Card gradient className="w-full">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Failed Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="w-full overflow-x-auto">
                  <ActivityChart
                    data={filteredActivityData}
                    xKey="time"
                    yKey="failures"
                    height={320}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Optional: Service health panel if data available */}
        {Array.isArray(metrics?.servicesList) && metrics.servicesList.length > 0 && (
          <section aria-label="Service health" className="mt-6">
            <Card gradient className="w-full">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg sm:text-xl">Service Health</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <ServiceHealthList services={metrics.servicesList} />
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
};

export default memo(Dashboard);
