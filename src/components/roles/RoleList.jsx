import { AlertCircle, Download, Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useCsvExport } from '../../hooks/useCsvExport';
import { useRoles } from '../../hooks/useRoles';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DataTable } from '../ui/data-table';
import { Switch } from '../ui/switch';

const RoleList = () => {
  const {
    roles,
    loading,
    error,
    operationInProgress,
    fetchRoles,
    handleDelete,
    handleToggleActive,
    handleEdit,
    handleAdd,
    prepareExportData,
  } = useRoles();

  const { confirmState, openConfirm, closeConfirm, handleConfirm } = useConfirmDialog();

  const { exportToCsv } = useCsvExport();

  useEffect(() => {
    const abortController = new AbortController();
    fetchRoles();
    return () => abortController.abort();
  }, [fetchRoles]);

  // Define columns for the modern data table - memoized to prevent re-creation
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        sortable: true,
        width: '25%',
        cell: ({ row }) => <div className="font-medium">{row.name}</div>,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        width: '40%',
        cell: ({ row }) => <div className="text-muted-foreground">{row.description || ''}</div>,
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        type: 'switch',
        width: '20%',
        cell: ({ row, value }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={value || false}
              onCheckedChange={() => {
                // Prevent multiple rapid clicks
                if (operationInProgress[`toggle-${row._id}`]) {
                  return;
                }
                handleToggleActive(row);
              }}
              aria-label={`Toggle status for ${row.name}`}
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
        width: '15%',
        actions: [
          {
            label: 'Edit Role',
            icon: Edit,
            onClick: handleEdit,
          },
          {
            label: 'Delete Role',
            icon: Trash2,
            onClick: role => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`delete-${role._id}`]) {
                return;
              }
              openConfirm(role._id, {
                title: 'Delete Role',
                message: 'Are you sure you want to delete this role? This action cannot be undone.',
              });
            },
            destructive: true,
            separator: true,
          },
        ],
      },
    ],
    [handleToggleActive, handleEdit, openConfirm, operationInProgress]
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Error Messages */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-2 p-4">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">Roles</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage user roles and permissions
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          <Button
            variant="ocean"
            size="sm"
            className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
            onClick={() => exportToCsv(prepareExportData(), 'roles-list.csv')}
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
            onClick={handleAdd}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Role</span>
          </Button>
        </div>
      </div>

      {/* Modern Data Table */}
      <DataTable
        data={roles.sort((a, b) => a.name.localeCompare(b.name))}
        columns={columns}
        searchable={true}
        filterable={true}
        exportable={false} // We handle export in header
        loading={loading}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => handleConfirm(handleDelete)}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default RoleList;
