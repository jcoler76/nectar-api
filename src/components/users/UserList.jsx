import Tooltip from '@mui/material/Tooltip';
import { Edit, HelpCircle, Info, Shield, Trash2, UserCheck, UserX } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useFormDialog } from '../../hooks/useFormDialog';
import { useUsers } from '../../hooks/useUsers';
import { formatTimestampEST } from '../../utils/dateUtils';
import { BaseListView } from '../common/BaseListView';
import ConfirmDialog from '../common/ConfirmDialog';
import FormDialog from '../common/FormDialog';
import { Badge } from '../ui/badge';
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

  const success = ''; // Keep for UI compatibility

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Define columns for the modern data table - memoized to prevent re-creation
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: (
          <div className="flex items-center gap-1">
            Name
            <Tooltip title="User's full name as displayed in the system. This combines first and last name when available, or falls back to the username if no full name is provided.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        width: '20%',
        cell: ({ row }) => (
          <Tooltip
            title={
              row.firstName && row.lastName
                ? `Full name: ${row.firstName} ${row.lastName}`
                : row.name
                  ? `Username: ${row.name}`
                  : 'No name information available'
            }
          >
            <div className="font-medium cursor-help">
              {row.firstName && row.lastName
                ? `${row.firstName} ${row.lastName}`
                : row.name || 'N/A'}
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'email',
        header: (
          <div className="flex items-center gap-1">
            Email
            <Tooltip title="User's email address used for login, notifications, and account recovery. This must be unique across the system and serves as the primary identifier for authentication.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        width: '25%',
        cell: ({ row }) => (
          <Tooltip
            title={`Login email: ${row.email}. Used for authentication and system notifications.`}
          >
            <div className="text-muted-foreground cursor-help">{row.email}</div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'role',
        header: (
          <div className="flex items-center gap-1">
            Role
            <Tooltip title="User's permission level in the system. Administrators have full access to all features, while regular users have limited access based on their assigned permissions and role configurations.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        width: '15%',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.isAdmin ? (
              <Tooltip title="Administrator - Has full system access including user management, system configuration, and all data operations. Can perform all actions across the platform.">
                <Badge variant="gradient" className="text-xs cursor-help">
                  <Shield className="mr-1 h-3 w-3" />
                  Administrator
                </Badge>
              </Tooltip>
            ) : (
              <Tooltip title="Standard User - Has limited access based on assigned roles and permissions. Can access features according to their role configuration.">
                <Badge variant="secondary" className="text-xs cursor-help">
                  User
                </Badge>
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: (
          <div className="flex items-center gap-1">
            Status
            <Tooltip title="Toggle user account status - Active users can log in and access the system, Inactive users are blocked from logging in but their account data is preserved for future reactivation.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        type: 'switch',
        width: '15%',
        cell: ({ row, value }) => (
          <Tooltip
            title={
              value
                ? 'User account is active and can log in to access the system'
                : 'User account is inactive and login is blocked. Toggle to reactivate the account.'
            }
          >
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
                aria-label={`Toggle status for ${row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : row.name || row.email}`}
                className="data-[state=checked]:bg-ocean-500 data-[state=unchecked]:bg-gray-200"
              />
              <Badge variant={value ? 'active' : 'inactive'} className="text-xs cursor-help">
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
          </Tooltip>
        ),
      },
      {
        accessorKey: 'lastLogin',
        header: (
          <div className="flex items-center gap-1">
            Last Login
            <Tooltip title="Date of the user's most recent successful login to the system. This helps track user activity and identify inactive accounts that may need attention.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        width: '15%',
        cell: ({ row }) => (
          <Tooltip
            title={
              row.lastLogin
                ? `Last logged in: ${formatTimestampEST(row.lastLogin, 'MM/DD/YYYY')}. This shows recent user activity.`
                : 'This user has never logged in. They may need to activate their account or reset their password.'
            }
          >
            <div className="text-sm text-muted-foreground cursor-help">
              {row.lastLogin ? formatTimestampEST(row.lastLogin, 'MM/DD/YYYY') : 'Never'}
            </div>
          </Tooltip>
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
            tooltip:
              'Modify user information, permissions, and account settings. You can update names, email, admin status, and other profile details.',
            onClick: handleEdit,
          },
          {
            label: 'Delete User',
            icon: Trash2,
            tooltip:
              'Permanently remove this user account from the system. All user data, permissions, and login access will be deleted and cannot be recovered.',
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

  return (
    <>
      <BaseListView
        title="Users"
        description="Manage user accounts and permissions"
        data={users}
        columns={columns}
        loading={loading}
        error={error}
        success={success}
        onAdd={() => handleAdd()}
        prepareExportData={prepareExportData}
        exportFilename="users-list.csv"
        searchable={true}
        filterable={true}
        enableVirtualization={true} // Enable virtual scrolling for large user lists
        customActions={[
          {
            label: 'System Info',
            icon: Info,
            variant: 'ghost',
            onClick: () => {},
            tooltip:
              'User management allows you to create, edit, and manage user accounts across your system. Control user access, assign administrator privileges, and monitor user activity.',
            mobileHidden: true,
          },
        ]}
      ></BaseListView>

      <FormDialog
        open={openForm}
        onClose={handleClose}
        title={editUser ? 'Edit User' : 'Add User'}
        description={
          editUser
            ? 'Edit user information and permissions'
            : 'Create a new user account and send an invitation'
        }
      >
        <UserForm
          user={editUser}
          hideHeader={true}
          onUserSubmitted={() => {
            handleClose();
            fetchUsers();
          }}
        />
      </FormDialog>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => handleConfirm(handleDelete)}
        onCancel={closeConfirm}
      />
    </>
  );
};

export default UserList;
