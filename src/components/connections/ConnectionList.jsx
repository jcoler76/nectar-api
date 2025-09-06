import { AlertCircle, Edit, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { memo, useEffect, useMemo } from 'react';

import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useConnectionOperations } from '../../hooks/useConnectionOperations';
import { useFormDialog } from '../../hooks/useFormDialog';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DataTable } from '../ui/data-table';

import ConnectionForm from './ConnectionForm';

const ConnectionList = () => {
  const {
    connections,
    loading,
    error,
    operationInProgress,
    fetchConnections,
    handleSave,
    handleDelete,
    handleTest,
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

  const { confirmState, openConfirm, closeConfirm, handleConfirm } = useConfirmDialog();

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
        header: 'Name',
        sortable: true,
        width: '20%',
        cell: ({ row }) => <div className="font-medium">{row.name}</div>,
      },
      {
        accessorKey: 'host',
        header: 'Host',
        width: '30%',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.host}</div>
            {row.failoverHost && (
              <div className="text-xs text-muted-foreground">Mirror: {row.failoverHost}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        width: '15%',
        cell: ({ row }) => {
          const isActive = row.isActive;
          const variant = isActive ? 'active' : 'secondary';
          return (
            <Badge variant={variant} className="text-xs">
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
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
            onClick: connection => handleTest(connection._id),
          },
          {
            label: 'Refresh Databases',
            icon: RefreshCw,
            onClick: connection => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`refresh-${connection._id}`]) {
                return;
              }
              handleRefreshDatabases(connection._id);
            },
          },
          {
            label: 'Edit Connection',
            icon: Edit,
            onClick: handleEdit,
            separator: true,
          },
          {
            label: 'Delete Connection',
            icon: Trash2,
            onClick: connection =>
              openConfirm(connection._id, {
                title: 'Delete Connection',
                message:
                  'Are you sure you want to delete this connection? This action cannot be undone.',
              }),
            destructive: true,
          },
        ],
      },
    ],
    [handleTest, handleRefreshDatabases, handleEdit, openConfirm, operationInProgress]
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">
            Database Connections
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your database connections and test connectivity
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          <Button
            size="sm"
            className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
            onClick={() => handleAdd()}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Connection</span>
          </Button>
        </div>
      </div>

      {/* Connection Form */}
      <ConnectionForm
        open={isFormOpen}
        onClose={handleClose}
        onSave={handleSaveConnection}
        connection={selectedConnection}
        onTestConnection={handleTestConnectionDetails}
      />

      {/* Modern Data Table or Empty State */}
      {connections.length === 0 && !loading ? (
        <Card className="border-info/50 bg-info/10">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-info" />
            <div>
              <h3 className="text-lg font-semibold text-ocean-800">No Database Connections</h3>
              <p className="text-muted-foreground mt-1">
                No database connections configured yet. Click &quot;Add Connection&quot; to create
                your first stored connection.
              </p>
            </div>
            <Button
              onClick={() => handleAdd()}
              className="mt-2 bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={connections.sort((a, b) => a.name.localeCompare(b.name))}
          columns={columns}
          searchable={true}
          filterable={true}
          exportable={false}
          loading={loading}
        />
      )}

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

export default memo(ConnectionList);
