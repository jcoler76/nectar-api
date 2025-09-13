import Tooltip from '@mui/material/Tooltip';
import { Edit, HelpCircle, Play, RefreshCw, Trash2 } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useConnectionOperations } from '../../hooks/useConnectionOperations';
import { useFormDialog } from '../../hooks/useFormDialog';
import { BaseListView } from '../common/BaseListView';
import ConfirmDialog from '../common/ConfirmDialog';
import DependencyWarningDialog from '../common/DependencyWarningDialog';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';

import ConnectionForm from './ConnectionForm';

const ConnectionList = () => {
  const [dependencyConfirm, setDependencyConfirm] = useState({
    open: false,
    connection: null,
    message: '',
    dependentServices: [],
  });

  // State for deletion dependency warning
  const [deleteDependencyWarning, setDeleteDependencyWarning] = useState({
    open: false,
    connectionId: null,
    connectionName: '',
    dependencies: '',
    serviceNames: '',
  });

  const {
    connections,
    loading,
    error,
    operationInProgress,
    fetchConnections,
    handleSave,
    handleDelete,
    handleTest,
    handleToggleActive,
    handleRefreshDatabases,
    handleTestDetails,
  } = useConnectionOperations();

  const {
    openForm: isFormOpen,
    editItem: selectedConnection,
    handleAdd,
    handleEdit,
    handleClose,
  } = useFormDialog();

  const { confirmState, openConfirm, closeConfirm } = useConfirmDialog();

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleSaveConnection = async connectionData => {
    const result = await handleSave(connectionData, selectedConnection);
    if (result.success) {
      handleClose();
    }
    // Keep form open on error
  };

  const handleTestConnectionDetails = connectionData => {
    return handleTestDetails(connectionData, selectedConnection);
  };

  // Define columns for the modern data table - memoized to prevent re-creation
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: (
          <div className="flex items-center gap-1">
            Name
            <Tooltip title="Unique identifier for this database connection. Used to reference this connection when creating services.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        width: '20%',
        cell: ({ row }) => (
          <Tooltip title={`Connection name: ${row.name}`}>
            <div className="font-medium cursor-help">{row.name}</div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'host',
        header: (
          <div className="flex items-center gap-1">
            Host
            <Tooltip title="Database server address. Can be an IP address, hostname, or FQDN. Failover hosts provide automatic backup connectivity.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        width: '30%',
        cell: ({ row }) => (
          <Tooltip
            title={
              row.failoverHost
                ? `Primary: ${row.host}\nFailover: ${row.failoverHost}`
                : `Server: ${row.host}`
            }
          >
            <div className="cursor-help">
              <div className="font-medium">{row.host}</div>
              {row.failoverHost && (
                <div className="text-xs text-muted-foreground">Mirror: {row.failoverHost}</div>
              )}
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'isActive',
        header: (
          <div className="flex items-center gap-1">
            Status
            <Tooltip title="Toggle connection availability - Active connections can be used for services, Inactive connections are disabled.">
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
                ? 'Connection is active and available for services'
                : 'Connection is inactive and cannot be used'
            }
          >
            <div className="flex items-center gap-2">
              <Switch
                checked={value || false}
                onCheckedChange={async () => {
                  // Prevent multiple rapid clicks
                  if (operationInProgress[`toggle-${row.id}`]) {
                    return;
                  }

                  const result = await handleToggleActive(row);

                  // Handle dependency confirmation
                  if (result && result.requiresConfirmation) {
                    setDependencyConfirm({
                      open: true,
                      connection: row,
                      message: result.message,
                      dependentServices: result.dependentServices,
                    });
                  }
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
        width: '25%',
        actions: [
          {
            label: 'Test Connection',
            icon: Play,
            tooltip: 'Verify connectivity to the database server and validate credentials',
            onClick: connection => handleTest(connection.id),
          },
          {
            label: 'Refresh Databases',
            icon: RefreshCw,
            tooltip:
              'Update the list of available databases on this server (required before creating services)',
            onClick: connection => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`refresh-${connection.id}`]) {
                return;
              }
              handleRefreshDatabases(connection.id);
            },
          },
          {
            label: 'Edit Connection',
            icon: Edit,
            tooltip: 'Modify connection settings including host, credentials, and configuration',
            onClick: handleEdit,
            separator: true,
          },
          {
            label: 'Delete Connection',
            icon: Trash2,
            tooltip:
              'Permanently remove this connection - this will break any services that depend on it',
            onClick: async connection => {
              // Try to delete first to check for dependencies
              const result = await handleDelete(connection.id || connection._id);

              if (result && result.hasDependencies) {
                // Show dependency warning dialog directly
                setDeleteDependencyWarning({
                  open: true,
                  connectionId: connection.id || connection._id,
                  connectionName: connection.name,
                  dependencies: result.dependencies,
                  serviceNames: result.serviceNames,
                });
              } else if (result && result.success) {
                // Connection deleted successfully (no dependencies)
                // Nothing more to do, handleDelete already handled the UI updates
              } else {
                // Show regular confirmation for connections without dependencies
                openConfirm(connection, {
                  title: 'Delete Connection',
                  message:
                    'Are you sure you want to delete this connection? This action cannot be undone.',
                });
              }
            },
            destructive: true,
          },
        ],
      },
    ],
    [
      handleTest,
      handleToggleActive,
      handleRefreshDatabases,
      handleEdit,
      handleDelete,
      openConfirm,
      operationInProgress,
    ]
  );

  return (
    <>
      <BaseListView
        title="Database Connections"
        description="Manage your database connections and test connectivity"
        data={connections.sort((a, b) => a.name.localeCompare(b.name))}
        columns={columns}
        loading={loading}
        error={error}
        onAdd={() => handleAdd()}
        searchable={true}
        filterable={true}
      >
        {/* Connection Form */}
        <ConnectionForm
          open={isFormOpen}
          onClose={handleClose}
          onSave={handleSaveConnection}
          connection={selectedConnection}
          onTestConnection={handleTestConnectionDetails}
        />
      </BaseListView>

      {/* Dependency Confirmation Dialog */}
      <ConfirmDialog
        open={dependencyConfirm.open}
        title="Deactivate Connection with Dependencies"
        message={dependencyConfirm.message}
        onConfirm={async () => {
          if (dependencyConfirm.connection) {
            await handleToggleActive(dependencyConfirm.connection, true); // Skip confirmation
          }
          setDependencyConfirm({
            open: false,
            connection: null,
            message: '',
            dependentServices: [],
          });
        }}
        onCancel={() => {
          setDependencyConfirm({
            open: false,
            connection: null,
            message: '',
            dependentServices: [],
          });
        }}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={async () => {
          const connection = confirmState.itemId; // This is the full connection object
          const result = await handleDelete(connection.id || connection._id);

          if (result && result.success) {
            closeConfirm();
          }
        }}
        onCancel={closeConfirm}
      />

      {/* Deletion Dependency Warning Dialog */}
      <DependencyWarningDialog
        open={deleteDependencyWarning.open}
        onClose={() => setDeleteDependencyWarning({ ...deleteDependencyWarning, open: false })}
        onConfirm={async () => {
          const result = await handleDelete(deleteDependencyWarning.connectionId, true);
          if (!result.success) {
            throw new Error(result.error || 'Failed to delete connection');
          }
        }}
        resourceType="connection"
        resourceName={deleteDependencyWarning.connectionName}
        dependencies={deleteDependencyWarning.dependencies}
        additionalWarning={
          deleteDependencyWarning.serviceNames
            ? `Services to be deleted: ${deleteDependencyWarning.serviceNames}`
            : 'All associated services and endpoints will be permanently deleted.'
        }
      />
    </>
  );
};

export default memo(ConnectionList);
