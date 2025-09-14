import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  RefreshCw,
  Server,
  Shield,
  Users,
  XCircle,
} from 'lucide-react';
import { memo, useMemo, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDashboardData } from '../../hooks/useDashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

import {
  MetricCardSkeleton,
  ServiceHealthSkeleton,
  StatisticsCardSkeleton,
} from './DashboardSkeleton';
import IntersectionChart from './IntersectionChart';
import ServiceHealthList from './ServiceHealthList';

const Dashboard = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [isPending, startTransition] = useTransition();
  const navigate = useNavigate();

  const { metrics, statistics, metricsLoading, statisticsLoading, hasError, error, refetchAll } =
    useDashboardData(dateRange);

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

  // Handle refresh action
  const handleRefresh = () => {
    startTransition(() => {
      refetchAll();
    });
  };

  const filteredActivityData = useMemo(() => {
    const raw = metrics?.activityData || [];
    const rangeDays = { '7d': 7, '30d': 30, '90d': 90 }[dateRange] || 30;
    if (raw.length <= rangeDays) return raw;
    return raw.slice(-rangeDays);
  }, [metrics, dateRange]);

  // Dashboard shell renders immediately
  const showFullError = hasError && !metricsLoading && !statisticsLoading;

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4 sm:space-y-6 bg-gradient-subtle min-h-screen">
      <div className="max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">
        <header className="text-center sm:text-left">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">
                Dashboard
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Monitor your system metrics and activity
              </p>
            </div>
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={metricsLoading || statisticsLoading || isPending}
              className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
              title="Refresh dashboard data"
            >
              <RefreshCw
                className={`h-4 w-4 ${metricsLoading || statisticsLoading || isPending ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* Global error message */}
          {showFullError && (
            <Card className="border-destructive/50 bg-destructive/10 mt-4">
              <CardContent className="flex items-center gap-2 p-4">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-medium">
                  {error?.message || 'Failed to load some dashboard data. Please try refreshing.'}
                </span>
              </CardContent>
            </Card>
          )}

          {/* Time range selector */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {['7d', '30d', '90d'].map(range => (
              <button
                key={range}
                onClick={() => {
                  startTransition(() => {
                    setDateRange(range);
                  });
                }}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${dateRange === range ? 'bg-ocean-600 text-white border-ocean-600 hover:bg-ocean-700' : 'bg-background text-foreground hover:bg-muted border-border'}`}
                aria-pressed={dateRange === range}
                disabled={isPending}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        {/* API Activity Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statisticsLoading ? (
            <>
              <StatisticsCardSkeleton />
              <StatisticsCardSkeleton />
              <StatisticsCardSkeleton />
              <StatisticsCardSkeleton />
            </>
          ) : statistics ? (
            <>
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
            </>
          ) : null}
        </div>

        {/* Metric Cards Grid - Responsive */}
        <section aria-label="System metrics overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metricsLoading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                <Card
                  onClick={() => handleTileClick('services')}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
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

                <Card
                  onClick={() => handleTileClick('applications')}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
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

                <Card
                  onClick={() => handleTileClick('roles')}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
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

                <Card
                  onClick={() => handleTileClick('api')}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
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
              </>
            )}
          </div>
        </section>

        {/* Activity Charts - Lazy loaded with intersection observer */}
        <section aria-label="Activity charts" className={isPending ? 'opacity-70' : ''}>
          <div className="grid grid-cols-1 gap-6">
            <IntersectionChart
              title="API Calls"
              data={filteredActivityData}
              xKey="time"
              yKey="calls"
              height={320}
            />
            <IntersectionChart
              title="Records Processed"
              data={filteredActivityData}
              xKey="time"
              yKey="totalRecords"
              height={320}
            />
            <IntersectionChart
              title="Failed Requests"
              data={filteredActivityData}
              xKey="time"
              yKey="failures"
              height={320}
            />
          </div>
        </section>

        {/* Service health panel */}
        <section aria-label="Service health" className="mt-6">
          {metricsLoading ? (
            <ServiceHealthSkeleton />
          ) : Array.isArray(metrics?.servicesList) && metrics.servicesList.length > 0 ? (
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
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default memo(Dashboard);
