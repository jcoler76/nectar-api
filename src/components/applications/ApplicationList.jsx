import { Tooltip } from '@mui/material';
import { Copy, Edit, HelpCircle, Info, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useApplications } from '../../hooks/useApplications';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useFormDialog } from '../../hooks/useFormDialog';
import { BaseListView } from '../common/BaseListView';
import ConfirmDialog from '../common/ConfirmDialog';
import FormDialog from '../common/FormDialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Switch } from '../ui/switch';

import ApplicationForm from './ApplicationForm';

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
          <Tooltip
            title={
              row.description ||
              "No description provided - consider adding one to document the application's purpose"
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
          <Tooltip
            title={
              row.defaultRole?.name
                ? `Default role: ${row.defaultRole.name}`
                : 'No default role assigned - users will have limited access'
            }
          >
            <div
              className={`font-medium cursor-help ${!row.defaultRole?.name ? 'text-gray-400 italic' : ''}`}
            >
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
            <Tooltip title="Secure authentication key for API access. Click copy to access your key securely. Keys are never stored in your browser.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        className: 'hidden lg:table-cell min-w-[200px] w-auto',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {row.isNewKey ? 'New key generated' : 'mapi_••••••••••••'}
              </code>
              {row.isNewKey && (
                <Badge variant="success" className="text-xs">
                  Ready to Copy
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Tooltip title="Copy API key to clipboard - key will be retrieved securely">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    if (operationInProgress[`copy-${row.id}`]) {
                      return;
                    }
                    handleCopyApiKey(row.id);
                  }}
                  disabled={operationInProgress[`copy-${row.id}`]}
                  aria-label="Copy API key to clipboard"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </Tooltip>
              <Tooltip title="Generate a new API key for this application. The old key will be immediately invalidated.">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    if (operationInProgress[`regenerate-${row.id}`]) {
                      return;
                    }
                    handleRegenerateApiKey(row.id);
                  }}
                  disabled={operationInProgress[`regenerate-${row.id}`]}
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
          <Tooltip
            title={
              value
                ? 'Application is active and accepting API requests'
                : 'Application is inactive and will reject API requests'
            }
          >
            <div className="flex items-center gap-2">
              <Switch
                checked={value}
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
            tooltip:
              'Modify application name, description, role assignments, and other configuration settings',
            onClick: handleEdit,
          },
          {
            label: 'Regenerate API Key',
            icon: RefreshCw,
            tooltip:
              'Generate a new API key - the current key will be immediately invalidated and all clients must update',
            onClick: application => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`regenerate-${application.id}`]) {
                return;
              }
              handleRegenerateApiKey(application.id);
            },
            separator: true,
          },
          {
            label: 'Delete Application',
            icon: Trash2,
            tooltip:
              'Permanently remove this application - all API keys will be invalidated and cannot be recovered',
            onClick: application => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`delete-${application.id}`]) {
                return;
              }
              openConfirm(application.id, {
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
      handleEdit,
      openConfirm,
      user,
      operationInProgress,
    ]
  );

  return (
    <>
      <BaseListView
        title="Applications"
        description="Manage your API applications and access keys"
        data={applications}
        columns={columns}
        loading={loading}
        error={error}
        onAdd={() => handleAdd()}
        prepareExportData={prepareExportData}
        exportFilename="applications-list.csv"
        searchable={true}
        filterable={true}
        customActions={[
          {
            label: 'App Info',
            icon: Info,
            variant: 'ghost',
            onClick: () => {},
            tooltip:
              'Applications represent different systems or integrations that access your API. Each application has unique API keys for secure authentication and can be assigned specific roles and permissions.',
            mobileHidden: true,
          },
        ]}
      >
        {/* Mobile Card List - Custom Content */}
        <div className="sm:hidden space-y-3">
          {applications.map(app => (
            <Card key={app.id}>
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
                      onCheckedChange={() => {
                        if (operationInProgress[`toggle-${app.id}`]) {
                          return;
                        }
                        handleToggleActive(app);
                      }}
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
                      {app.isNewKey ? 'New key generated' : 'mapi_••••••••••••'}
                    </code>
                    {app.isNewKey && (
                      <Badge variant="success" className="text-[10px] ml-2 align-middle">
                        Ready to Copy
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyApiKey(app.id)}
                      disabled={operationInProgress[`copy-${app.id}`]}
                      aria-label="Copy API key to clipboard"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (operationInProgress[`regenerate-${app.id}`]) return;
                        handleRegenerateApiKey(app.id);
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
                        openConfirm(app.id, {
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
      </BaseListView>

      <FormDialog open={openForm} onClose={handleClose} maxWidth="sm:max-w-md" scrollable={false}>
        <ApplicationForm
          application={editApplication}
          onSubmitted={() => {
            handleClose();
            fetchApplications();
          }}
          onCancel={handleClose}
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

export default ApplicationList;
