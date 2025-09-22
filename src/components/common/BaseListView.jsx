import { AlertCircle, Download } from 'lucide-react';
import React from 'react';

import { useCsvExport } from '../../hooks/useCsvExport';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DataTable } from '../ui/data-table';

import { StatusMessages } from './StatusMessages';

/**
 * Reusable base component for list views
 * Eliminates duplicate code across all list components
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Page title
 * @param {string} props.description - Page description
 * @param {Array} props.data - Data array for the table
 * @param {Array} props.columns - Column definitions for DataTable
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 * @param {string} props.success - Success message
 * @param {Function} props.onAdd - Add button click handler
 * @param {Function} props.prepareExportData - Function to prepare export data
 * @param {string} props.exportFilename - Export filename
 * @param {React.ReactNode} props.children - Additional content between header and table
 * @param {Array} props.customActions - Additional header buttons
 * @param {React.ReactNode} props.emptyState - Custom empty state component
 */
const BaseListViewComponent = ({
  title,
  description,
  data = [],
  columns = [],
  loading = false,
  error = '',
  success = '',
  onAdd,
  prepareExportData,
  exportFilename = 'export.csv',
  children,
  customActions = [],
  emptyState,
  enableVirtualization = false, // Enable virtual scrolling for large datasets
  ...tableProps
}) => {
  const { exportToCsv } = useCsvExport();

  const handleExport = async () => {
    if (prepareExportData) {
      const exportData = prepareExportData();
      const filenameWithoutExtension = exportFilename.replace(/\.csv$/, '');
      await exportToCsv(exportData, filenameWithoutExtension);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Status Messages */}
      <StatusMessages error={error} success={success} />

      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm sm:text-base">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          {/* Export Button */}
          {prepareExportData && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={handleExport}
              disabled={data.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}

          {/* Custom Actions */}
          {customActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              <span className={action.mobileHidden ? 'hidden sm:inline' : ''}>{action.label}</span>
            </Button>
          ))}

          {/* Add Button */}
          {onAdd && (
            <Button size="sm" variant="ocean" className="flex-1 sm:flex-none" onClick={onAdd}>
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add {title.slice(0, -1)}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Custom Content */}
      {children}

      {/* Empty State or Data Table */}
      {data.length === 0 && !loading ? (
        emptyState || (
          <Card className="border-info/50 bg-info/10">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <AlertCircle className="h-12 w-12 text-info" />
              <div>
                <h3 className="text-lg font-semibold text-ocean-800">No {title}</h3>
                <p className="text-muted-foreground mt-1">
                  No {title.toLowerCase()} found.{' '}
                  {onAdd && `Click "Add ${title.slice(0, -1)}" to create your first one.`}
                </p>
              </div>
              {onAdd && (
                <Button onClick={onAdd} variant="ocean" className="mt-2">
                  Add {title.slice(0, -1)}
                </Button>
              )}
            </CardContent>
          </Card>
        )
      ) : (
        <DataTable
          data={data}
          columns={columns}
          searchable={true}
          filterable={true}
          exportable={false} // We handle export in header
          loading={loading}
          enableVirtualization={enableVirtualization}
          {...tableProps}
        />
      )}
    </div>
  );
};

// Custom comparison function for React.memo
// Only re-render if data, columns, loading, error, or success changes
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.columns === nextProps.columns &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    prevProps.success === nextProps.success &&
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description
  );
};

export const BaseListView = React.memo(BaseListViewComponent, arePropsEqual);
export default BaseListView;
