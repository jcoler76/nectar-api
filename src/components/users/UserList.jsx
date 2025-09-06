import {
  AlertCircle,
  CheckCircle,
  Download,
  Edit,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useCsvExport } from '../../hooks/useCsvExport';
import { useFormDialog } from '../../hooks/useFormDialog';
import { useUsers } from '../../hooks/useUsers';
import { formatTimestampEST } from '../../utils/dateUtils';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DataTable } from '../ui/data-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Switch } from '../ui/switch';

import UserForm from './UserForm';

const UserList = () => {
  const {
    users,
    loading,
    error,
    operationInProgress,
    fetchUsers,
    handleDelete,
    handleToggleActive,
    prepareExportData,
  } = useUsers();

  const { openForm, editItem: editUser, handleAdd, handleEdit, handleClose } = useFormDialog();

  const { confirmState, openConfirm, closeConfirm, handleConfirm } = useConfirmDialog();

  const { exportToCsv } = useCsvExport();
  const success = ''; // Keep for UI compatibility

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Define columns for the modern data table - memoized to prevent re-creation
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        sortable: true,
        width: '20%',
        cell: ({ row }) => (
          <div className="font-medium">
            {row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : row.name || 'N/A'}
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        sortable: true,
        width: '25%',
        cell: ({ row }) => <div className="text-muted-foreground">{row.email}</div>,
      },
      {
        accessorKey: 'role',
        header: 'Role',
        width: '15%',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.isAdmin ? (
              <Badge variant="gradient" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Administrator
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                User
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        type: 'switch',
        width: '15%',
        cell: ({ row, value }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={value}
              onCheckedChange={() => {
                // Prevent multiple rapid clicks
                if (operationInProgress[`toggle-${row._id}`]) {
                  return;
                }
                handleToggleActive(row);
              }}
              className="data-[state=checked]:bg-ocean-500 data-[state=unchecked]:bg-gray-200"
            />
            <Badge variant={value ? 'active' : 'inactive'} className="text-xs">
              {value ? (
                <>
                  <UserCheck className="mr-1 h-3 w-3" />
                  Active
                </>
              ) : (
                <>
                  <UserX className="mr-1 h-3 w-3" />
                  Inactive
                </>
              )}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: 'lastLogin',
        header: 'Last Login',
        sortable: true,
        width: '15%',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.lastLogin ? formatTimestampEST(row.lastLogin, 'MM/DD/YYYY') : 'Never'}
          </div>
        ),
      },
      {
        accessorKey: 'actions',
        header: 'Actions',
        type: 'actions',
        width: '10%',
        actions: [
          {
            label: 'Edit User',
            icon: Edit,
            onClick: handleEdit,
          },
          {
            label: 'Delete User',
            icon: Trash2,
            onClick: user => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`delete-${user._id}`]) {
                return;
              }
              openConfirm(user._id, {
                title: 'Delete User',
                message: 'Are you sure you want to delete this user? This action cannot be undone.',
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">Users</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          <Button
            variant="ocean"
            size="sm"
            className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
            onClick={() => exportToCsv(prepareExportData(), 'users-list.csv')}
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
            onClick={() => handleAdd()}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add User</span>
          </Button>
        </div>
      </div>

      {/* Modern Data Table */}
      <DataTable
        data={users}
        columns={columns}
        searchable={true}
        filterable={true}
        exportable={false} // We handle export in header
        loading={loading}
      />

      <Dialog open={openForm} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editUser
                ? 'Edit user information and permissions'
                : 'Create a new user account and send an invitation'}
            </DialogDescription>
          </DialogHeader>
          <UserForm
            user={editUser}
            hideHeader={true}
            onUserSubmitted={() => {
              handleClose();
              fetchUsers();
            }}
          />
        </DialogContent>
      </Dialog>

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

export default UserList;
