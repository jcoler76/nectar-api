import { Copy, Edit, Plus, Trash2, Workflow } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { DataTable } from '../../components/ui/data-table';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useFormDialog } from '../../hooks/useFormDialog';
import { useWorkflows } from '../../hooks/useWorkflows';
import { formatDate } from '../../utils/dateUtils';

import AddWorkflowDialog from './components/AddWorkflowDialog';

const WorkflowList = () => {
  const {
    workflows,
    isLoading,
    operationInProgress,
    fetchWorkflows,
    handleCreate,
    handleDuplicate,
    handleDelete,
    handleEdit,
  } = useWorkflows();

  const { openForm: isFormOpen, handleAdd, handleClose } = useFormDialog();

  const { confirmState, openConfirm, closeConfirm, handleConfirm } = useConfirmDialog();

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Define columns for the modern data table - memoized to prevent re-creation
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        sortable: true,
        width: '30%',
        cell: ({ row }) => (
          <div
            className="font-medium cursor-pointer hover:text-primary"
            onClick={() => handleEdit(row._id)}
          >
            {row.name}
          </div>
        ),
      },
      {
        accessorKey: 'active',
        header: 'Status',
        width: '15%',
        cell: ({ row }) => (
          <Badge variant={row.active ? 'active' : 'inactive'} className="text-xs">
            {row.active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        accessorKey: 'nodes',
        header: 'Nodes',
        width: '15%',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.nodes?.length || 0}</span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Last Updated',
        width: '25%',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate.full(row.updatedAt)}</span>
        ),
      },
      {
        accessorKey: 'actions',
        header: 'Actions',
        type: 'actions',
        width: '15%',
        actions: [
          {
            label: 'Edit Workflow',
            icon: Edit,
            onClick: workflow => handleEdit(workflow._id),
          },
          {
            label: 'Duplicate Workflow',
            icon: Copy,
            onClick: workflow => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`duplicate-${workflow._id}`]) {
                return;
              }
              handleDuplicate(workflow._id);
            },
          },
          {
            label: 'Delete Workflow',
            icon: Trash2,
            onClick: workflow => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`delete-${workflow._id}`]) {
                return;
              }
              openConfirm(workflow._id, {
                title: 'Delete Workflow',
                message:
                  'Are you sure you want to delete this workflow? This action cannot be undone.',
              });
            },
            destructive: true,
            separator: true,
          },
        ],
      },
    ],
    [handleEdit, handleDuplicate, openConfirm, operationInProgress]
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">
            Workflows
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Create and manage your automated workflows
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
            <span className="hidden sm:inline">Add Workflow</span>
          </Button>
        </div>
      </div>

      {/* Workflows Table or Empty State */}
      {workflows.length === 0 && !isLoading ? (
        <Card className="border-info/50 bg-info/10">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Workflow className="h-12 w-12 text-info" />
            <div>
              <h3 className="text-lg font-semibold text-info">No Workflows</h3>
              <p className="text-muted-foreground mt-1">
                No workflows found. Create your first workflow to get started.
              </p>
            </div>
            <Button
              onClick={() => handleAdd()}
              className="mt-2 bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={workflows}
          columns={columns}
          searchable={true}
          filterable={true}
          exportable={false}
          loading={isLoading}
        />
      )}

      <AddWorkflowDialog open={isFormOpen} onClose={handleClose} onSave={handleCreate} />

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

export default WorkflowList;
