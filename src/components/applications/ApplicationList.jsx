import { AlertCircle, Copy, Download, Edit, HelpCircle, Info, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Tooltip } from '@mui/material';

import { useApplications } from '../../hooks/useApplications';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useCsvExport } from '../../hooks/useCsvExport';
import { useFormDialog } from '../../hooks/useFormDialog';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DataTable } from '../ui/data-table';
import { Dialog, DialogContent } from '../ui/dialog';
import { Switch } from '../ui/switch';

import ApplicationFormShadcn from './ApplicationFormShadcn';

const ApplicationList = () => {
  const {
    applications,
    loading,
    error,
    user,
    operationInProgress,
    fetchApplications,
    handleDelete,
    handleToggleActive,
    handleCopyApiKey,
    handleRegenerateApiKey,
    handleRevealApiKey,
    prepareExportData,
  } = useApplications();

  const {
    openForm,
    editItem: editApplication,
    handleAdd,
    handleEdit,
    handleClose,
  } = useFormDialog();

  const { confirmState, openConfirm, closeConfirm, handleConfirm } = useConfirmDialog();

  const { exportToCsv } = useCsvExport();

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Define columns for the modern data table - memoized to prevent re-creation
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: (
          <div className="flex items-center gap-1">
            Name
            <Tooltip title="Unique application identifier used for API access. Choose descriptive names to easily identify different applications or integrations.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        className: 'min-w-[120px] w-auto',
        cell: ({ row }) => (
          <Tooltip title={`Application name: ${row.name}`}>
            <div className="font-medium cursor-help">{row.name}</div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'description',
        header: (
          <div className="flex items-center gap-1">
            Description
            <Tooltip title="Detailed explanation of the application's purpose and functionality. This helps identify what each application is used for and by whom.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        className: 'hidden md:table-cell min-w-[200px] w-auto',
        cell: ({ row }) => (
          <Tooltip title={row.description || 'No description provided - consider adding one to document the application\'s purpose'}>
            <div className={`text-muted-foreground cursor-help truncate ${!row.description ? 'italic text-gray-400' : ''}`}>
              {row.description || 'No description'}
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'defaultRole.name',
        header: (
          <div className="flex items-center gap-1">
            Role
            <Tooltip title="Default role assigned to users accessing the API through this application. This determines the permissions and access levels for API requests.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        className: 'hidden sm:table-cell min-w-[100px] w-auto',
        cell: ({ row }) => (
          <Tooltip title={row.defaultRole?.name ? `Default role: ${row.defaultRole.name}` : 'No default role assigned - users will have limited access'}>
            <div className={`font-medium cursor-help ${!row.defaultRole?.name ? 'text-gray-400 italic' : ''}`}>
              {row.defaultRole?.name || 'None'}
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'apiKey',
        header: (
          <div className="flex items-center gap-1">
            API Key
            <Tooltip title="Secure authentication key for API access. Keys are masked for security - use the copy button to retrieve the full key. Regenerate keys regularly for security.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        className: 'hidden lg:table-cell min-w-[250px] w-auto',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded max-w-[150px] truncate">
              {row.apiKey}
            </code>
            {row.isNewKey && (
              <Badge variant="warning" className="text-xs">
                New Key
              </Badge>
            )}
            <div className="flex items-center gap-1">
              <Tooltip title={user?.isAdmin ? 'Copy full API key to clipboard (Admin access)' : row.isNewKey ? 'Copy API key to clipboard' : 'Key is masked - only admins can copy existing keys'}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    // If user is admin, always use reveal (which copies automatically)
                    // If not admin, use the basic copy (only works for new keys)
                    if (user?.isAdmin) {
                      handleRevealApiKey(row._id);
                    } else {
                      handleCopyApiKey(row.apiKey);
                    }
                  }}
                  disabled={!user?.isAdmin && !row.isNewKey && row.apiKey.includes('•')}
                  aria-label={user?.isAdmin ? 'Copy full API key (Admin)' : 'Copy API key'}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </Tooltip>
              <Tooltip title="Generate a new API key for this application. The old key will be immediately invalidated and cannot be recovered.">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    // Prevent multiple rapid clicks
                    if (operationInProgress[`regenerate-${row._id}`]) {
                      return;
                    }
                    handleRegenerateApiKey(row._id);
                  }}
                  aria-label="Regenerate API key"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </Tooltip>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: (
          <div className="flex items-center gap-1">
            Status
            <Tooltip title="Toggle application availability - Active applications can accept API requests, Inactive applications are blocked from API access">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        type: 'switch',
        className: 'min-w-[100px] w-auto',
        cell: ({ row, value }) => (
          <Tooltip title={value ? 'Application is active and accepting API requests' : 'Application is inactive and will reject API requests'}>
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
                aria-label={`Toggle status for ${row.name}`}
                className="data-[state=checked]:bg-ocean-500 data-[state=unchecked]:bg-gray-200"
              />
              <Badge
                variant={value ? 'active' : 'inactive'}
                className="text-xs hidden sm:inline-flex"
              >
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
        className: 'min-w-[80px] w-auto',
        actions: [
          {
            label: 'Edit Application',
            icon: Edit,
            tooltip: 'Modify application name, description, role assignments, and other configuration settings',
            onClick: handleEdit,
          },
          {
            label: 'Regenerate API Key',
            icon: RefreshCw,
            tooltip: 'Generate a new API key - the current key will be immediately invalidated and all clients must update',
            onClick: application => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`regenerate-${application._id}`]) {
                return;
              }
              handleRegenerateApiKey(application._id);
            },
            separator: true,
          },
          {
            label: 'Delete Application',
            icon: Trash2,
            tooltip: 'Permanently remove this application - all API keys will be invalidated and cannot be recovered',
            onClick: application => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`delete-${application._id}`]) {
                return;
              }
              openConfirm(application._id, {
                title: 'Delete Application',
                message:
                  'Are you sure you want to delete this application? This action cannot be undone.',
              });
            },
            destructive: true,
          },
        ],
      },
    ],
    [
      handleToggleActive,
      handleCopyApiKey,
      handleRegenerateApiKey,
      handleRevealApiKey,
      handleEdit,
      openConfirm,
      user,
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

      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">
              Applications
            </h1>
            <Tooltip title="Applications represent different systems or integrations that access your API. Each application has unique API keys for secure authentication and can be assigned specific roles and permissions.">
              <Info className="h-5 w-5 text-ocean-600 cursor-help" />
            </Tooltip>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your API applications and access keys
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          <Tooltip title="Export all applications to CSV format for backup, reporting, or external analysis of API usage patterns">
            <Button
              variant="ocean"
              size="sm"
              className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
              onClick={() => exportToCsv(prepareExportData(), 'applications-list.csv')}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </Tooltip>
          <Tooltip title="Create a new API application with unique authentication keys and role-based permissions">
            <Button
              size="sm"
              className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
              onClick={() => handleAdd()}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Application</span>
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-3">
        {applications.map(app => (
          <Card key={app._id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-base">{app.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Role: {app.defaultRole?.name || 'None'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!app.isActive}
                    onCheckedChange={() => handleToggleActive(app._id, !app.isActive)}
                    aria-label={app.isActive ? 'Disable application' : 'Enable application'}
                  />
                </div>
              </div>

              {app.description && (
                <p className="text-sm text-muted-foreground">{app.description}</p>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <code className="font-mono text-xs bg-muted px-2 py-1 rounded max-w-[160px] truncate inline-block">
                    {app.apiKey}
                  </code>
                  {app.isNewKey && (
                    <Badge variant="warning" className="text-[10px] ml-2 align-middle">
                      New Key
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      user?.isAdmin ? handleRevealApiKey(app._id) : handleCopyApiKey(app.apiKey)
                    }
                    disabled={!user?.isAdmin && !app.isNewKey && app.apiKey?.includes('�?�')}
                    aria-label={user?.isAdmin ? 'Copy full API key (Admin)' : 'Copy API key'}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (operationInProgress[`regenerate-${app._id}`]) return;
                      handleRegenerateApiKey(app._id);
                    }}
                    aria-label="Regenerate API key"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(app)}
                    aria-label="Edit"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      openConfirm(app._id, {
                        title: 'Delete Application',
                        message:
                          'Are you sure you want to delete this application? This action cannot be undone.',
                      })
                    }
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table for >= sm screens */}
      <div className="hidden sm:block">
        <DataTable
          data={applications}
          columns={columns}
          searchable={true}
          filterable={true}
          exportable={false} // We handle export in header
          loading={loading}
          defaultSort={{ key: 'name', direction: 'asc' }}
        />
      </div>

      <Dialog open={openForm} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <ApplicationFormShadcn
            application={editApplication}
            onSubmitted={() => {
              handleClose();
              fetchApplications();
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
      />
    </div>
  );
};

export default ApplicationList;
