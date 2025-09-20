import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Activity, Filter } from 'lucide-react';
import moment from 'moment-timezone';
import { memo, useEffect, useState } from 'react';

import LoadingSpinner from '../common/LoadingSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { DataTable } from '../ui/data-table';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

import useActivityLogColumns from './hooks/useActivityLogColumns';
import useActivityLogs from './hooks/useActivityLogs';
import useReportFilters from './hooks/useReportFilters';
import ActivityStatisticsCards from './shared/ActivityStatisticsCards';
import CustomPagination from './shared/CustomPagination';
import ReportFiltersCard from './shared/ReportFiltersCard';
import ReportLayout from './shared/ReportLayout';

const ActivityLogsReport = () => {
  // Filter state management
  const { filters, updateFilter, resetFilters } = useReportFilters({
    startDate: moment.tz('America/New_York').subtract(24, 'hours'),
    endDate: moment.tz('America/New_York'),
    success: 'all',
    method: 'all',
    category: 'all',
    endpointType: 'all',
    errorType: 'all',
    search: '',
  });

  // Local state for activity-specific features
  const [filterType, setFilterType] = useState('all');
  const [timeframe, setTimeframe] = useState('24h');

  // Activity logs custom hook with pagination and statistics
  const {
    logs,
    statistics,
    loading,
    error,
    page,
    totalPages,
    recordsPerPage,
    totalRecords,
    fetchLogs,
    fetchStatistics,
    handleSearch,
    handleReset: resetLogs,
    handleExport,
    handlePageChange,
    handleRecordsPerPageChange,
  } = useActivityLogs(filters, filterType);

  // Table columns
  const columns = useActivityLogColumns();

  // Initialize data
  useEffect(() => {
    fetchStatistics(timeframe);
    fetchLogs(true);
  }, [timeframe, fetchStatistics, fetchLogs]);

  const handleReset = () => {
    resetFilters();
    resetLogs();
    setFilterType('all');
    setTimeframe('24h');
  };

  if (loading && logs.length === 0) return <LoadingSpinner />;

  return (
    <ReportLayout
      title="API Activity Logs"
      subtitle="Monitor and analyze API activity, performance, and errors"
      icon={Activity}
    >
      {/* Statistics Cards */}
      <ActivityStatisticsCards statistics={statistics} />

      {/* Filters and Controls */}
      <ReportFiltersCard
        title="Filters & Search"
        icon={Filter}
        error={error}
        loading={loading}
        hasData={logs.length > 0}
        onSearch={handleSearch}
        onReset={handleReset}
        onExport={handleExport}
      >
        {/* Filter Row 1 - Date Range, Timeframe, and Records Per Page */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <LocalizationProvider dateAdapter={AdapterMoment}>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker
                value={filters.startDate}
                onChange={newDate => {
                  if (newDate) {
                    updateFilter('startDate', moment.tz(newDate, 'America/New_York'));
                  } else {
                    updateFilter('startDate', null);
                  }
                }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker
                value={filters.endDate}
                onChange={newDate => {
                  if (newDate) {
                    updateFilter('endDate', moment.tz(newDate, 'America/New_York'));
                  } else {
                    updateFilter('endDate', null);
                  }
                }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </div>
          </LocalizationProvider>

          <div className="space-y-2">
            <Label>Statistics Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Records per Page</Label>
            <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 records</SelectItem>
                <SelectItem value="25">25 records</SelectItem>
                <SelectItem value="50">50 records</SelectItem>
                <SelectItem value="100">100 records</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Smart Filter Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="space-y-2">
            <Label className="text-blue-800 font-semibold">Smart Filter</Label>
            <Select
              value={filterType}
              onValueChange={value => {
                setFilterType(value);
                fetchLogs(true); // Auto-apply filter
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity (Including Internal)</SelectItem>
                <SelectItem value="important">Important Only (Public APIs + Workflows)</SelectItem>
                <SelectItem value="critical">Critical Only (Auth + API Procedures)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-blue-800 text-sm">What this shows:</Label>
            <div className="text-xs text-blue-700">
              {filterType === 'all' && 'Everything including internal reports, dashboards'}
              {filterType === 'important' &&
                'Client APIs, Workflows, Webhooks (High business value)'}
              {filterType === 'critical' &&
                'Authentication, Public API procedures (Security critical)'}
            </div>
          </div>
        </div>

        {/* Filter Row 2 - Status and Method Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filters.success} onValueChange={value => updateFilter('success', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Success</SelectItem>
                <SelectItem value="false">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={filters.method} onValueChange={value => updateFilter('method', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={filters.category}
              onValueChange={value => updateFilter('category', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="workflow">Workflow</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Endpoint Type</Label>
            <Select
              value={filters.endpointType}
              onValueChange={value => updateFilter('endpointType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Error Type</Label>
            <Select
              value={filters.errorType}
              onValueChange={value => updateFilter('errorType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="validation">Validation</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="rate_limit">Rate Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1">
          <Label htmlFor="search">Search</Label>
          <div className="flex gap-2 mt-2">
            <input
              id="search"
              type="text"
              placeholder="Search URLs, user agents, error messages..."
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              className="flex-1 px-3 py-2 border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
            />
          </div>
        </div>
      </ReportFiltersCard>

      {/* Results Table */}
      {logs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>
              Showing {(page - 1) * recordsPerPage + 1} to{' '}
              {Math.min(page * recordsPerPage, totalRecords)} of {totalRecords.toLocaleString()}{' '}
              total records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={logs}
              columns={columns}
              searchable={false} // We handle search in filters
              filterable={false} // We handle filtering in filters section
              exportable={false} // We handle export in filters section
              pagination={false} // Disable built-in pagination
              loading={loading}
            />

            {/* Custom Server-Side Pagination */}
            <CustomPagination
              page={page}
              totalPages={totalPages}
              totalRecords={totalRecords}
              recordsPerPage={recordsPerPage}
              loading={loading}
              onPageChange={handlePageChange}
            />
          </CardContent>
        </Card>
      ) : (
        !loading && (
          <Card className="border-info/50 bg-info/10">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <Activity className="h-12 w-12 text-info" />
              <div>
                <h3 className="text-lg font-semibold text-info">No Logs Found</h3>
                <p className="text-muted-foreground mt-1">
                  No activity logs found for the selected criteria. Try adjusting your filters and
                  date range.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </ReportLayout>
  );
};

export default memo(ActivityLogsReport);
