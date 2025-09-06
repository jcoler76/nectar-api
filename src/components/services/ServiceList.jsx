import { AlertCircle, CheckCircle, Download, Edit, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
        header: 'Name',
        sortable: true,
        width: '15%',
        cell: ({ row }) => <div className="font-medium">{row.name}</div>,
      },
      {
        accessorKey: 'label',
        header: 'Label',
        sortable: true,
        width: '15%',
        cell: ({ row }) => <div>{row.label || ''}</div>,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        width: '25%',
        cell: ({ row }) => <div className="text-muted-foreground">{row.description || ''}</div>,
      },
      {
        accessorKey: 'database',
        header: 'Database',
        sortable: true,
        width: '10%',
        cell: ({ row }) => <div className="font-medium">{row.database}</div>,
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        type: 'switch',
        width: '10%',
        cell: ({ row, value }) => (
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
            onClick: service => handleEdit(service, fetchConnections),
          },
          {
            label: 'Refresh Schema',
            icon: RefreshCw,
            onClick: service => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`refresh-${service._id}`]) {
                return;
              }
              handleRefreshSchema(service._id, fetchConnections);
            },
          },
          {
            label: 'Delete',
            icon: Trash2,
            onClick: service => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`delete-${service._id}`]) {
                return;
              }
              openConfirm(service._id, {
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">Services</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your database services and connections
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
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
          <Button
            size="sm"
            className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
            onClick={() => handleAdd(fetchConnections)}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Service</span>
          </Button>
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
