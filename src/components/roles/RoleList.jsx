import { AlertCircle, Download, Edit, HelpCircle, Info, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Tooltip } from '@mui/material';

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
        header: (
          <div className="flex items-center gap-1">
            Name
            <Tooltip title="Unique role identifier used throughout the system. Role names should be descriptive and follow your organization's naming conventions.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        width: '25%',
        cell: ({ row }) => (
          <Tooltip title={`Role name: ${row.name}`}>
            <div className="font-medium cursor-help">{row.name}</div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'description',
        header: (
          <div className="flex items-center gap-1">
            Description
            <Tooltip title="Detailed explanation of the role's purpose, responsibilities, and permissions. This helps administrators understand what access this role provides.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        width: '40%',
        cell: ({ row }) => (
          <Tooltip title={row.description || 'No description provided - consider adding one to document the role\'s purpose and permissions'}>
            <div className={`text-muted-foreground cursor-help truncate ${!row.description ? 'italic text-gray-400' : ''}`}>
              {row.description || 'No description'}
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'isActive',
        header: (
          <div className="flex items-center gap-1">
            Status
            <Tooltip title="Toggle role availability - Active roles can be assigned to users, Inactive roles are disabled but preserved for future use">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        type: 'switch',
        width: '20%',
        cell: ({ row, value }) => (
          <Tooltip title={value ? 'Role is active and can be assigned to users' : 'Role is inactive and cannot be assigned to new users'}>
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
          </Tooltip>
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
            tooltip: 'Modify role name, description, and permission settings',
            onClick: handleEdit,
          },
          {
            label: 'Delete Role',
            icon: Trash2,
            tooltip: 'Permanently remove this role - users with this role will lose associated permissions',
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
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">Roles</h1>
            <Tooltip title="Roles define sets of permissions that can be assigned to users. Use roles to control access to different parts of the system and manage user capabilities efficiently.">
              <Info className="h-5 w-5 text-ocean-600 cursor-help" />
            </Tooltip>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage user roles and permissions
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          <Tooltip title="Export all roles to CSV format for backup, reporting, or external analysis of role configurations">
            <Button
              variant="ocean"
              size="sm"
              className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
              onClick={() => exportToCsv(prepareExportData(), 'roles-list.csv')}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </Tooltip>
          <Tooltip title="Create a new role with custom permissions and access levels for your organization">
            <Button
              size="sm"
              className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
              onClick={handleAdd}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Role</span>
            </Button>
          </Tooltip>
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
