import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { BarChart3 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import api from '../../services/api';
import { formatFileSize, formatTimestampEST } from '../../utils/dateUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { DataTable } from '../ui/data-table';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

import useReportData from './hooks/useReportData';
import useReportExport from './hooks/useReportExport';
import useReportFilters from './hooks/useReportFilters';
import ReportFiltersCard from './shared/ReportFiltersCard';
import ReportLayout from './shared/ReportLayout';

const ApiUsageReport = () => {
  // Custom hooks for shared functionality
  const { filters, updateFilter, resetFilters, getFilterParams, shouldAutoSearch } =
    useReportFilters({
      service: 'all',
      role: 'all',
      application: 'all',
      component: 'all',
    });

  const {
    loading,
    data: usageData,
    error,
    fetchData,
    reset,
    setError,
  } = useReportData('/api/reports/api-usage');

  // Local state for filter options
  const [services, setServices] = useState([]);
  const [roles, setRoles] = useState([]);
  const [applications, setApplications] = useState([]);
  const [components, setComponents] = useState([]);

  // Fetch initial data and handle cascading filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        // Build query params based on selections
        const params = {};
        if (filters.service && filters.service !== 'all') params.service = filters.service;

        // Fetch services (always)
        const servicesRes = await api.get('/api/services');
        setServices(servicesRes.data);

        // Fetch roles based on selected service
        const rolesRes = await api.get('/api/roles', { params });
        setRoles(rolesRes.data);

        // Fetch applications based on selected service and role
        if (filters.role && filters.role !== 'all') params.role = filters.role;
        const appsRes = await api.get('/api/applications', { params });
        setApplications(appsRes.data);

        // Fetch unique components based on current filters
        const componentsRes = await api.get('/api/reports/components', { params });
        setComponents(componentsRes.data);
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError('Failed to fetch filter data');
        }
      }
    };

    fetchFilters();
  }, [filters.service, filters.role, setError]);

  const handleServiceChange = value => {
    updateFilter('service', value);
    updateFilter('role', 'all');
    updateFilter('application', 'all');
    updateFilter('component', 'all');
  };

  const handleRoleChange = value => {
    updateFilter('role', value);
    updateFilter('application', 'all');
    updateFilter('component', 'all');
  };

  const handleSearch = async () => {
    await fetchData(getFilterParams());
  };

  const handleReset = () => {
    resetFilters();
    reset();
  };

  // Auto-search when coming from dashboard with date parameter
  useEffect(() => {
    if (shouldAutoSearch) {
      handleSearch();
    }
  }, [shouldAutoSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShowDetailsChange = async checked => {
    updateFilter('showDetails', checked);

    if (usageData.length > 0) {
      await fetchData({
        ...getFilterParams(),
        showDetails: checked ? 'true' : 'false',
      });
    }
  };

  // Prepare export data function
  const prepareExportData = useCallback(
    data => {
      return data.map(row => ({
        Service: row.serviceName,
        Component: row.component,
        Role: row.roleName,
        Application: row.applicationName,
        Method: row.method,
        ...(filters.showDetails
          ? { Timestamp: formatTimestampEST(row.timestamp, 'YYYY-MM-DD h:mm:ss A') }
          : { Count: row.count }),
      }));
    },
    [filters.showDetails]
  );

  // Export hook
  const { exportToCSV } = useReportExport(prepareExportData, 'api_usage_report.csv');

  // Define columns for the modern data table
  const columns = [
    {
      accessorKey: 'serviceName',
      header: 'Service',
      sortable: true,
      width: '15%',
    },
    {
      accessorKey: 'component',
      header: 'Component',
      sortable: true,
      width: '15%',
    },
    {
      accessorKey: 'roleName',
      header: 'Role',
      sortable: true,
      width: '15%',
    },
    {
      accessorKey: 'applicationName',
      header: 'Application',
      sortable: true,
      width: '15%',
    },
    {
      accessorKey: 'method',
      header: 'Method',
      sortable: true,
      width: '15%',
    },
    ...(filters.showDetails
      ? [
          {
            accessorKey: 'timestamp',
            header: 'Timestamp',
            sortable: true,
            width: '20%',
            cell: ({ value }) => (
              <span className="text-sm text-muted-foreground">
                {formatTimestampEST(value, 'MM/DD/YY h:mm:ss A')}
              </span>
            ),
          },
          {
            accessorKey: 'dataSize',
            header: 'Data Size',
            sortable: true,
            width: '15%',
            cell: ({ row }) => {
              // The data is directly in row, not row.original for this table implementation
              const rowData = row.original || row;
              const requestSize = rowData.requestSize || 0;
              const responseSize = rowData.responseSize || 0;
              const totalSize = requestSize + responseSize;

              return (
                <span
                  className="text-sm"
                  title={`Request: ${formatFileSize(requestSize)}, Response: ${formatFileSize(responseSize)}`}
                >
                  {formatFileSize(totalSize)}
                </span>
              );
            },
          },
        ]
      : [
          {
            accessorKey: 'count',
            header: 'Count',
            sortable: true,
            width: '25%',
            cell: ({ value }) => (
              <Badge variant="secondary" className="text-sm">
                {value}
              </Badge>
            ),
          },
        ]),
  ];

  if (loading && usageData.length === 0) return <LoadingSpinner />;

  return (
    <ReportLayout
      title="API Usage Report"
      subtitle="Analyze API usage patterns and performance metrics"
      icon={BarChart3}
    >
      {/* Filters and Controls */}
      <ReportFiltersCard
        title="Report Filters"
        icon={BarChart3}
        error={error}
        loading={loading}
        hasData={usageData.length > 0}
        onSearch={handleSearch}
        onReset={handleReset}
        onExport={() => exportToCSV(usageData)}
      >
        {/* Filter Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="service-select">Service</Label>
            <Select value={filters.service} onValueChange={handleServiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map(service => (
                  <SelectItem key={service._id} value={service._id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-select">Role</Label>
            <Select value={filters.role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role._id} value={role._id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-select">Application</Label>
            <Select
              value={filters.application}
              onValueChange={value => updateFilter('application', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Applications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                {applications.map(app => (
                  <SelectItem key={app._id} value={app._id}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="component-select">Component</Label>
            <Select
              value={filters.component}
              onValueChange={value => updateFilter('component', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Components" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Components</SelectItem>
                {components.map((component, index) => (
                  <SelectItem key={`component-${index}-${component}`} value={component}>
                    {component}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Row 2 - Date Pickers and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker
                  value={filters.startDate}
                  onChange={value => updateFilter('startDate', value)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <DatePicker
                  value={filters.endDate}
                  onChange={value => updateFilter('endDate', value)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </div>
            </LocalizationProvider>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-details"
              checked={filters.showDetails}
              onCheckedChange={handleShowDetailsChange}
            />
            <Label htmlFor="show-details">Show Details</Label>
          </div>
        </div>
      </ReportFiltersCard>

      {/* Results Table */}
      {usageData.length > 0 ? (
        <DataTable
          data={usageData}
          columns={columns}
          title="API Usage Data"
          description={`Showing ${usageData.length} ${filters.showDetails ? 'detailed records' : 'aggregated results'}`}
          searchable={true}
          filterable={true}
          exportable={false} // We handle export in the filters section
          loading={loading}
        />
      ) : (
        !loading && (
          <Card className="border-info/50 bg-info/10">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <BarChart3 className="h-12 w-12 text-info" />
              <div>
                <h3 className="text-lg font-semibold text-info">No Data Found</h3>
                <p className="text-muted-foreground mt-1">
                  No API usage data found for the selected criteria. Try adjusting your filters and
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

export default ApiUsageReport;
