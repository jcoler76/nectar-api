import { Tooltip } from '@mui/material';
import { Copy, Edit, HelpCircle, Info, Plus, Trash2, Workflow } from 'lucide-react';
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
        header: (
          <div className="flex items-center gap-1">
            Name
            <Tooltip title="Workflow name used to identify and organize your automation processes. Click on any workflow name to edit its configuration and node connections.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        width: '30%',
        cell: ({ row }) => (
          <Tooltip
            title={`Click to edit workflow: ${row.name}. This will open the workflow designer where you can modify nodes, connections, and automation logic.`}
          >
            <div
              className="font-medium cursor-pointer hover:text-primary"
              onClick={() => handleEdit(row.id)}
            >
              {row.name}
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'isActive',
        header: (
          <div className="flex items-center gap-1">
            Status
            <Tooltip title="Workflow execution status - Active workflows can run automatically when triggered, Inactive workflows are paused and will not execute until reactivated.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        width: '15%',
        cell: ({ row }) => (
          <Tooltip
            title={
              row.isActive
                ? 'Workflow is active and will execute when triggered by events or schedules'
                : 'Workflow is inactive and paused. It will not run until activated again.'
            }
          >
            <Badge variant={row.isActive ? 'active' : 'inactive'} className="text-xs cursor-help">
              {row.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'nodes',
        header: (
          <div className="flex items-center gap-1">
            Nodes
            <Tooltip title="Number of workflow nodes (steps) configured in this automation. Each node represents an action, condition, or integration point in the workflow process.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        width: '15%',
        cell: ({ row }) => (
          <Tooltip
            title={`This workflow contains ${row.nodes?.length || 0} nodes. ${row.nodes?.length === 0 ? 'Empty workflows need nodes to function properly.' : 'Each node performs a specific action or decision in the automation process.'}`}
          >
            <span className="text-sm text-muted-foreground cursor-help">
              {row.nodes?.length || 0}
            </span>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: (
          <div className="flex items-center gap-1">
            Last Updated
            <Tooltip title="Date and time when this workflow was last modified. This helps track recent changes and identify workflows that may need updates or review.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        width: '25%',
        cell: ({ row }) => (
          <Tooltip
            title={`Workflow last modified: ${formatDate.full(row.updatedAt)}. This includes any changes to nodes, connections, settings, or activation status.`}
          >
            <span className="text-sm text-muted-foreground cursor-help">
              {formatDate.full(row.updatedAt)}
            </span>
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
            label: 'Edit Workflow',
            icon: Edit,
            tooltip:
              'Open the workflow designer to modify nodes, connections, triggers, and automation logic. You can add, remove, or reconfigure workflow steps.',
            onClick: workflow => handleEdit(workflow.id),
          },
          {
            label: 'Duplicate Workflow',
            icon: Copy,
            tooltip:
              'Create an exact copy of this workflow with all nodes and connections. The copy will be inactive by default and can be modified independently.',
            onClick: workflow => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`duplicate-${workflow.id}`]) {
                return;
              }
              handleDuplicate(workflow.id);
            },
          },
          {
            label: 'Delete Workflow',
            icon: Trash2,
            tooltip:
              'Permanently remove this workflow and all its nodes, connections, and execution history. This action cannot be undone and will stop all future executions.',
            onClick: workflow => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`delete-${workflow.id}`]) {
                return;
              }
              openConfirm(workflow.id, {
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
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">
              Workflows
            </h1>
            <Tooltip title="Workflows are automated processes that connect different services and systems to perform complex tasks without manual intervention. Create workflows to automate data synchronization, notifications, approvals, and business processes across your connected databases and applications.">
              <Info className="h-5 w-5 text-ocean-600 cursor-help" />
            </Tooltip>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Create and manage your automated workflows
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          <Tooltip title="Create a new automated workflow by defining triggers, actions, and conditions. Start with a blank workflow or choose from pre-built templates for common automation scenarios.">
            <Button
              size="sm"
              className="flex-1 sm:flex-none bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
              onClick={() => handleAdd()}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Workflow</span>
            </Button>
          </Tooltip>
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
            <Tooltip title="Create your first workflow to start automating business processes and data operations across your connected systems">
              <Button
                onClick={() => handleAdd()}
                className="mt-2 bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Workflow
              </Button>
            </Tooltip>
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
