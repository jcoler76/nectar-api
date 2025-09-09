import { Tooltip } from '@mui/material';
import {
  AlertCircle,
  CheckCircle,
  Download,
  Edit,
  HelpCircle,
  Info,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo } from 'react';

import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useConnections } from '../../hooks/useConnections';
import { useFormDialog } from '../../hooks/useFormDialog';
import { useServices } from '../../hooks/useServices';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DataTable } from '../ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Switch } from '../ui/switch';

import ServiceFormShadcn from './ServiceFormShadcn';

const ServiceList = () => {
  const {
    services,
    loading,
    error,
    success,
    operationInProgress,
    fetchServices,
    handleDelete,
    handleToggleActive,
    handleRefreshSchema,
  } = useServices();

  const { connections, fetchConnections, getConnectionName } = useConnections();

  const { openForm, editItem: editService, handleAdd, handleEdit, handleClose } = useFormDialog();

  const { confirmState, openConfirm, closeConfirm, handleConfirm } = useConfirmDialog();

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Load connections in background after services are loaded
  useEffect(() => {
    if (services.length > 0 && connections.length === 0) {
      setTimeout(() => {
        fetchConnections();
      }, 100);
    }
  }, [services.length, connections.length, fetchConnections]);

  const prepareExportData = useCallback(() => {
    return services.map(service => ({
      Name: service.name,
      Label: service.label || '',
      Description: service.description || '',
      Connection: getConnectionName(service),
      Database: service.database,
      Status: service.isActive ? 'Active' : 'Inactive',
      CreatedAt: new Date(service.createdAt).toLocaleString(),
      UpdatedAt: new Date(service.updatedAt).toLocaleString(),
    }));
  }, [services, getConnectionName]);

  // Define columns for the modern data table - memoized to prevent re-creation
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: (
          <div className="flex items-center gap-1">
            Name
            <Tooltip title="Unique identifier for the service used in API endpoints and workflows">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        width: '15%',
        cell: ({ row }) => (
          <Tooltip title={`Service identifier: ${row.name}`}>
            <div className="font-medium cursor-help">{row.name}</div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'label',
        header: (
          <div className="flex items-center gap-1">
            Label
            <Tooltip title="Human-readable display name for better organization and identification">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        width: '15%',
        cell: ({ row }) => (
          <Tooltip
            title={
              row.label
                ? `Display name: ${row.label}`
                : 'No label set - consider adding one for better organization'
            }
          >
            <div className={`cursor-help ${!row.label ? 'text-gray-400 italic' : ''}`}>
              {row.label || 'No label'}
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'description',
        header: (
          <div className="flex items-center gap-1">
            Description
            <Tooltip title="Detailed explanation of the service purpose and usage">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        width: '25%',
        cell: ({ row }) => (
          <Tooltip
            title={
              row.description ||
              'No description provided - consider adding one to document the service purpose'
            }
          >
            <div
              className={`text-muted-foreground cursor-help truncate ${!row.description ? 'italic text-gray-400' : ''}`}
            >
              {row.description || 'No description'}
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'database',
        header: (
          <div className="flex items-center gap-1">
            Database
            <Tooltip title="The specific database this service connects to">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        width: '10%',
        cell: ({ row }) => (
          <Tooltip title={`Connected database: ${row.database}`}>
            <div className="font-medium cursor-help">{row.database}</div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'isActive',
        header: (
          <div className="flex items-center gap-1">
            Status
            <Tooltip title="Toggle service availability - Active services are accessible via API, Inactive services are blocked">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        type: 'switch',
        width: '10%',
        cell: ({ row, value }) => (
          <Tooltip
            title={
              value
                ? 'Service is active and accessible via API endpoints'
                : 'Service is inactive and blocked from API access'
            }
          >
            <div className="flex items-center gap-2">
              <Switch
                checked={value}
                onCheckedChange={() => handleToggleActive(row)}
                className="data-[state=checked]:bg-ocean-500 data-[state=unchecked]:bg-gray-200"
              />
              <Badge variant={value ? 'active' : 'inactive'} className="text-xs">
                {value ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'actions',
        header: 'Actions',
        type: 'actions',
        width: '200px',
        actions: [
          {
            label: 'Edit',
            icon: Edit,
            tooltip: 'Modify service configuration, connection settings, and metadata',
            onClick: service => handleEdit(service, fetchConnections),
          },
          {
            label: 'Refresh Schema',
            icon: RefreshCw,
            tooltip: 'Update database schema information to reflect recent structural changes',
            onClick: service => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`refresh-${service.id}`]) {
                return;
              }
              handleRefreshSchema(service.id, fetchConnections);
            },
          },
          {
            label: 'Delete',
            icon: Trash2,
            tooltip:
              'Permanently remove this service - this action cannot be undone and will break any dependent workflows',
            onClick: service => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`delete-${service.id}`]) {
                return;
              }
              openConfirm(service.id, {
                title: 'Delete Service',
                message:
                  'Are you sure you want to delete this service? This action cannot be undone.',
              });
            },
            destructive: true,
            separator: true,
          },
        ],
      },
    ],
    [
      handleToggleActive,
      handleEdit,
      handleRefreshSchema,
      openConfirm,
      fetchConnections,
      operationInProgress,
    ]
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Error and Success Messages */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-2 p-4">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">{error}</span>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-500/50 bg-green-50">
          <CardContent className="flex items-center gap-2 p-4">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-green-700 font-medium">{success}</span>
          </CardContent>
        </Card>
      )}

      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">
              Services
            </h1>
            <Tooltip title="Services are database connections that expose your data through secure API endpoints. Create, manage, and monitor your database integrations here.">
              <Info className="h-5 w-5 text-ocean-600 cursor-help" />
            </Tooltip>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your database services and connections
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          <Tooltip title="Export all services to CSV format for backup, reporting, or external analysis">
            <Button
              variant="ocean"
              size="sm"
              className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
              onClick={() => {
                const csvContent = prepareExportData();
                // Simple CSV export functionality
                const csv = [
                  Object.keys(csvContent[0]).join(','),
                  ...csvContent.map(row => Object.values(row).join(',')),
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob); // eslint-disable-line no-undef
                const a = document.createElement('a'); // eslint-disable-line no-undef
                a.href = url;
                a.download = 'services-list.csv';
                a.click();
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </Tooltip>
          <Tooltip title="Create a new database service by connecting to an existing database connection">
            <Button
              size="sm"
              className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
              onClick={() => handleAdd(fetchConnections)}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Service</span>
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Services Data Table */}
      <DataTable
        data={services}
        columns={columns}
        searchable={true}
        filterable={true}
        exportable={false}
        loading={loading}
        defaultSort={{ key: 'name', direction: 'asc' }}
      />

      <Dialog open={openForm} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
            <DialogDescription>
              {editService
                ? 'Update the service configuration'
                : 'Create a new service configuration'}
            </DialogDescription>
          </DialogHeader>
          <ServiceFormShadcn
            service={editService}
            onServiceSubmitted={() => {
              handleClose();
              fetchServices();
            }}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => handleConfirm(handleDelete)}
        onCancel={closeConfirm}
        aria-modal="true"
      />
    </div>
  );
};

export default memo(ServiceList);
