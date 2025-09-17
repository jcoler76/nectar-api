import { BarChart3, Download, Table, TrendingUp } from 'lucide-react';
import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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
import { DataTable } from '../ui/data-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const QueryResultsViz = ({ data, visualization, query }) => {
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    // Handle different data formats
    if (typeof data[0] === 'object') {
      return data.slice(0, 100); // Limit to 100 items for performance
    }

    return data;
  }, [data]);

  const chartConfig = useMemo(() => {
    if (!visualization || !processedData.length) return null;

    const config = {
      type: visualization.type || 'table',
      chartType: visualization.chartType || 'bar',
      xAxis: visualization.xAxis,
      yAxis: visualization.yAxis,
    };

    // Auto-detect axes if not specified
    if (!config.xAxis || !config.yAxis) {
      const firstItem = processedData[0];
      const keys = Object.keys(firstItem || {});

      // Find likely X axis (time, date, name, id)
      const timeKeys = keys.filter(
        key =>
          key.toLowerCase().includes('time') ||
          key.toLowerCase().includes('date') ||
          key.toLowerCase().includes('created') ||
          key.toLowerCase().includes('updated')
      );

      const nameKeys = keys.filter(
        key =>
          key.toLowerCase().includes('name') ||
          key.toLowerCase().includes('title') ||
          key.toLowerCase().includes('label')
      );

      // Find likely Y axis (numbers)
      const numberKeys = keys.filter(key => {
        const value = firstItem[key];
        return typeof value === 'number' || !isNaN(Number(value));
      });

      config.xAxis = config.xAxis || timeKeys[0] || nameKeys[0] || keys[0];
      config.yAxis = config.yAxis || numberKeys[0] || keys[1];
    }

    return config;
  }, [visualization, processedData]);

  const tableColumns = useMemo(() => {
    if (!processedData.length) return [];

    const firstItem = processedData[0];
    return Object.keys(firstItem).map(key => ({
      accessorKey: key,
      header: key.charAt(0).toUpperCase() + key.slice(1),
      sortable: true,
      cell: ({ value }) => {
        if (typeof value === 'number') {
          return <Badge variant="secondary">{value.toLocaleString()}</Badge>;
        }
        if (typeof value === 'boolean') {
          return <Badge variant={value ? 'default' : 'secondary'}>{String(value)}</Badge>;
        }
        return String(value || '');
      },
    }));
  }, [processedData]);

  const handleExport = () => {
    const csv = [
      Object.keys(processedData[0] || {}).join(','),
      ...processedData.map(row =>
        Object.values(row)
          .map(value =>
            typeof value === 'string' && value.includes(',') ? `"${value}"` : String(value || '')
          )
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    if (!chartConfig || !processedData.length) return null;

    const { chartType, xAxis, yAxis } = chartConfig;
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

    const commonProps = {
      data: processedData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={yAxis}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey={yAxis}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={processedData}
                dataKey={yAxis}
                nameKey={xAxis}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#3b82f6"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxis} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderMetric = () => {
    if (!processedData.length) return null;

    // For single value results
    if (processedData.length === 1 && Object.keys(processedData[0]).length === 1) {
      const value = Object.values(processedData[0])[0];
      const label = Object.keys(processedData[0])[0];

      return (
        <div className="text-center py-8">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {typeof value === 'number' ? value.toLocaleString() : String(value)}
          </div>
          <div className="text-lg text-muted-foreground capitalize">
            {label.replace(/([A-Z])/g, ' $1').trim()}
          </div>
        </div>
      );
    }

    // For aggregate results
    const firstItem = processedData[0];
    const numericKeys = Object.keys(firstItem).filter(key => {
      const value = firstItem[key];
      return typeof value === 'number' || !isNaN(Number(value));
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {numericKeys.slice(0, 6).map(key => {
          const value = firstItem[key];
          return (
            <Card key={key}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </div>
                <div className="text-sm text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (!processedData || processedData.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No data returned from your query. The query was processed successfully but returned empty
          results.
        </AlertDescription>
      </Alert>
    );
  }

  const showChart = chartConfig && chartConfig.type === 'chart' && processedData.length > 1;
  const showMetric = chartConfig && chartConfig.type === 'metric';

  return (
    <div className="space-y-4">
      {/* Header with export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <span className="font-medium">
            {processedData.length} result{processedData.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Results Visualization */}
      {showMetric ? (
        renderMetric()
      ) : showChart ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visualization
            </CardTitle>
          </CardHeader>
          <CardContent>{renderChart()}</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="table" className="w-full">
          <TabsList>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Table
            </TabsTrigger>
            {processedData.length > 1 && (
              <TabsTrigger value="chart" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Chart
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="table">
            <DataTable
              data={processedData}
              columns={tableColumns}
              title="Query Results"
              description={`Results for: "${query}"`}
              searchable={true}
              filterable={true}
              exportable={false} // We handle export above
            />
          </TabsContent>

          {processedData.length > 1 && (
            <TabsContent value="chart">
              <Card>
                <CardContent className="p-6">{renderChart()}</CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
};

export default QueryResultsViz;
