import Tooltip from '@mui/material/Tooltip';
import { Edit, HelpCircle, Info, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useRoles } from '../../hooks/useRoles';
import { getToken } from '../../services/authService';
import { BaseListView } from '../common/BaseListView';
import ConfirmDialog from '../common/ConfirmDialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Switch } from '../ui/switch';

// Get API URL from environment, same logic as api.js
const getApiUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (!envUrl || envUrl.trim() === '') {
    return 'http://localhost:3001';
  }
  try {
    new URL(envUrl);
    return envUrl.trim();
  } catch (error) {
    console.warn('Invalid REACT_APP_API_URL, falling back to localhost:', envUrl);
    return 'http://localhost:3001';
  }
};

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

  // Swagger dialog state
  const [swaggerDialog, setSwaggerDialog] = useState({
    open: false,
    selectedRole: null,
  });

  const openSwaggerDialog = useCallback(role => {
    setSwaggerDialog({
      open: true,
      selectedRole: role,
    });
  }, []);

  // Documentation viewer state
  const [docViewer, setDocViewer] = useState({
    open: false,
    url: '',
    title: '',
  });

  const handleOpenSwaggerForRole = () => {
    if (!swaggerDialog.selectedRole?.id) return;
    const apiUrl = getApiUrl();
    const url = `${apiUrl}/api/documentation/openapi/${encodeURIComponent(swaggerDialog.selectedRole.id)}/ui`;
    setDocViewer({
      open: true,
      url,
      title: `Swagger Documentation - ${swaggerDialog.selectedRole.name}`,
    });
    setSwaggerDialog(prev => ({ ...prev, open: false }));
  };

  const handleOpenBlueprintsDoc = () => {
    const apiUrl = getApiUrl();
    setDocViewer({
      open: true,
      url: `${apiUrl}/api/documentation/blueprints/ui`,
      title: 'Blueprints Documentation',
    });
    setSwaggerDialog(prev => ({ ...prev, open: false }));
  };

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
          <Tooltip
            title={
              row.description ||
              "No description provided - consider adding one to document the role's purpose and permissions"
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
          <Tooltip
            title={
              value
                ? 'Role is active and can be assigned to users'
                : 'Role is inactive and cannot be assigned to new users'
            }
          >
            <div className="flex items-center gap-2">
              <Switch
                checked={value || false}
                onCheckedChange={() => {
                  // Prevent multiple rapid clicks
                  if (operationInProgress[`toggle-${row.id}`]) {
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
            label: 'Swagger',
            icon: Info,
            tooltip: 'Open Swagger UI documentation for this role or view Blueprints documentation',
            onClick: role => openSwaggerDialog(role),
          },
          {
            label: 'Delete Role',
            icon: Trash2,
            tooltip:
              'Permanently remove this role - users with this role will lose associated permissions',
            onClick: role => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`delete-${role.id}`]) {
                return;
              }
              openConfirm(role.id, {
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
    [handleToggleActive, handleEdit, openConfirm, openSwaggerDialog, operationInProgress]
  );

  return (
    <>
      <BaseListView
        title="Roles"
        description="Manage user roles and permissions"
        data={roles.sort((a, b) => a.name.localeCompare(b.name))}
        columns={columns}
        loading={loading}
        error={error}
        onAdd={handleAdd}
        prepareExportData={prepareExportData}
        exportFilename="roles-list.csv"
        searchable={true}
        filterable={true}
        customActions={[
          {
            label: 'Role Info',
            icon: Info,
            variant: 'ghost',
            onClick: () => {},
            tooltip:
              'Roles define sets of permissions that can be assigned to users. Use roles to control access to different parts of the system and manage user capabilities efficiently.',
            mobileHidden: true,
          },
        ]}
      ></BaseListView>

      {/* Swagger Role Documentation Dialog */}
      <Dialog
        open={swaggerDialog.open}
        onOpenChange={open => setSwaggerDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Role Documentation</DialogTitle>
            <DialogDescription>
              Access documentation for the "{swaggerDialog.selectedRole?.name}" role. Documentation
              will be embedded below using session-based authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleOpenBlueprintsDoc}>
                Open Blueprints Docs
              </Button>
              <Button onClick={handleOpenSwaggerForRole} disabled={!swaggerDialog.selectedRole?.id}>
                Open Role Swagger
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Documentation Viewer */}
      <Dialog
        open={docViewer.open}
        onOpenChange={open => setDocViewer(prev => ({ ...prev, open }))}
        className="max-w-7xl w-full h-[90vh]"
      >
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>{docViewer.title}</DialogTitle>
            <DialogDescription>
              Interactive API documentation using session-based authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full h-full min-h-[70vh]">
            <iframe
              src={docViewer.url}
              className="w-full h-full border-0 rounded-b-lg"
              title={docViewer.title}
              style={{ minHeight: '70vh' }}
            />
          </div>
        </DialogContent>
      </Dialog>

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

export default RoleList;
