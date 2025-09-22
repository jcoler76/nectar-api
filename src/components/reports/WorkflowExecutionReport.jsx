import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ChevronDown, Workflow } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';

import api from '../../services/api';
import { formatTimestampEST } from '../../utils/dateUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import JsonViewer from '../ui/JsonViewer';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DataTable } from '../ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

import useReportData from './hooks/useReportData';
import useReportExport from './hooks/useReportExport';
import useReportFilters from './hooks/useReportFilters';
import ReportFiltersCard from './shared/ReportFiltersCard';
import ReportLayout from './shared/ReportLayout';

const statusVariants = {
  succeeded: 'active',
  failed: 'destructive',
  running: 'default',
};

const formatDuration = milliseconds => {
  if (milliseconds === null || milliseconds === undefined) return 'N/A';
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
};

const ExecutionDetailsModal = ({ row }) => {
  if (!row) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-2">
          <ChevronDown className="h-4 w-4" />
          <span className="ml-2">View Details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execution Details - {row.workflowName || 'Unknown Workflow'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <JsonViewer
              data={row.trigger || {}}
              title="Trigger Data"
              collapsed={false}
              maxHeight="300px"
              enableActions={true}
            />
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Execution Steps</h4>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Node ID</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Result / Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.steps &&
                        Object.entries(row.steps).map(([nodeId, step]) => (
                          <tr key={nodeId} className="border-b last:border-b-0">
                            <td className="p-3 font-mono text-xs">{nodeId}</td>
                            <td className="p-3">
                              <Badge
                                variant={statusVariants[step.status] || 'secondary'}
                                className="text-xs"
                              >
                                {step.status}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="max-h-[200px] overflow-y-auto">
                                <SyntaxHighlighter
                                  language="json"
                                  style={coy}
                                  customStyle={{ margin: 0, fontSize: '11px' }}
                                >
                                  {JSON.stringify(step.result || step.error, null, 2)}
                                </SyntaxHighlighter>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const WorkflowExecutionReport = () => {
  // Custom hooks for shared functionality
  const { filters, updateFilter, resetFilters, getFilterParams, shouldAutoSearch } =
    useReportFilters({
      workflowId: 'all',
      status: 'all',
    });

  const {
    loading,
    data: usageData,
    error,
    fetchData,
    reset,
    setError,
  } = useReportData('/api/reports/workflow-executions');

  // Local state for filter options
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await api.get('/api/workflows');
        setWorkflows(response.data);
      } catch (err) {
        setError('Failed to fetch workflows');
      }
    };
    fetchWorkflows();
  }, [setError]);

  const handleSearch = async () => {
    await fetchData(getFilterParams());
  };

  const handleReset = () => {
    resetFilters();
    reset();
  };

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
  const prepareExportData = useCallback(data => {
    return data.map(row => ({
      Workflow: row.workflowName,
      Status: row.status,
      'Started At': formatTimestampEST(row.startedAt),
      'Finished At': formatTimestampEST(row.finishedAt),
      Duration: formatDuration(row.duration),
    }));
  }, []);

  // Export hook
  const { exportToCSV } = useReportExport(prepareExportData, 'workflow_execution_report.csv');

  // Auto-search effect
  useEffect(() => {
    if (shouldAutoSearch) {
      handleSearch();
    }
  }, [shouldAutoSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Define columns for the modern data table
  const columns = [
    {
      accessorKey: 'workflowName',
      header: 'Workflow',
      sortable: true,
      width: '25%',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      sortable: true,
      width: '15%',
      cell: ({ value }) => (
        <Badge variant={statusVariants[value] || 'secondary'} className="text-xs">
          {value}
        </Badge>
      ),
    },
    {
      accessorKey: 'startedAt',
      header: 'Started At',
      sortable: true,
      width: '20%',
      cell: ({ value }) => (
        <span className="text-sm text-muted-foreground">{formatTimestampEST(value)}</span>
      ),
    },
    {
      accessorKey: 'finishedAt',
      header: 'Finished At',
      sortable: true,
      width: '20%',
      cell: ({ value }) => (
        <span className="text-sm text-muted-foreground">{formatTimestampEST(value)}</span>
      ),
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      sortable: true,
      width: '15%',
      cell: ({ value }) => <span className="text-sm font-mono">{formatDuration(value)}</span>,
    },
    ...(filters.showDetails
      ? [
          {
            accessorKey: 'details',
            header: 'Details',
            width: '10%',
            cell: ({ row }) => <ExecutionDetailsModal row={row} />,
          },
        ]
      : []),
  ];

  if (loading && usageData.length === 0) return <LoadingSpinner />;

  return (
    <ReportLayout
      title="Workflow Execution Report"
      subtitle="Monitor workflow execution performance and analyze results"
      icon={Workflow}
    >
      {/* Filters and Controls */}
      <ReportFiltersCard
        title="Report Filters"
        icon={Workflow}
        error={error}
        loading={loading}
        hasData={usageData.length > 0}
        onSearch={handleSearch}
        onReset={handleReset}
        onExport={() => exportToCSV(usageData)}
      >
        {/* Filter Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="workflow-select">Workflow</Label>
            <Select
              value={filters.workflowId}
              onValueChange={value => updateFilter('workflowId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Workflows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                {workflows.map(wf => (
                  <SelectItem key={wf.id || wf._id} value={wf.id || wf._id}>
                    {wf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-select">Status</Label>
            <Select value={filters.status} onValueChange={value => updateFilter('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
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
          title="Workflow Execution Data"
          description={`Showing ${usageData.length} execution records`}
          searchable={true}
          filterable={true}
          exportable={false} // We handle export in the filters section
          loading={loading}
        />
      ) : (
        !loading && (
          <Card className="border-info/50 bg-info/10">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <Workflow className="h-12 w-12 text-info" />
              <div>
                <h3 className="text-lg font-semibold text-info">No Executions Found</h3>
                <p className="text-muted-foreground mt-1">
                  No workflow execution data found for the selected criteria. Try adjusting your
                  filters and date range.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </ReportLayout>
  );
};

export default WorkflowExecutionReport;
