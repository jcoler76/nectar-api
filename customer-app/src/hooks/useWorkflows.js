import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useNotification } from '../context/NotificationContext';
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflows,
} from '../features/workflows/api/workflowApi';

import { useOperationTracking } from './useOperationTracking';

export const useWorkflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { operationInProgress, createProtectedHandler } = useOperationTracking();

  const fetchWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getWorkflows();
      setWorkflows(data);
    } catch (err) {
      showNotification(err.message || 'Failed to fetch workflows.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  const handleCreate = createProtectedHandler(
    'create',
    async name => {
      try {
        const newWorkflow = await createWorkflow({ name, nodes: [], edges: [] });
        showNotification('Workflow created successfully!', 'success');
        await fetchWorkflows();
        // Redirect to the new builder page for the created workflow
        navigate(`/workflows/edit/${newWorkflow.id}`);
        return { success: true, workflow: newWorkflow };
      } catch (err) {
        showNotification(err.message || 'Failed to create workflow.', 'error');
        return { success: false, error: err };
      }
    },
    () => 'new'
  );

  const handleDuplicate = createProtectedHandler('duplicate', async (id, e) => {
    e?.stopPropagation();
    try {
      const workflowToDuplicate = workflows.find(w => w.id === id);
      if (!workflowToDuplicate) {
        showNotification('Workflow not found.', 'error');
        return { success: false };
      }

      const newWorkflowData = {
        name: `${workflowToDuplicate.name} - Copy`,
        nodes: workflowToDuplicate.nodes,
        edges: workflowToDuplicate.edges,
      };

      await createWorkflow(newWorkflowData);
      showNotification('Workflow duplicated successfully!', 'success');
      await fetchWorkflows();
      return { success: true };
    } catch (err) {
      showNotification(err.message || 'Failed to duplicate workflow.', 'error');
      return { success: false, error: err };
    }
  });

  const handleDelete = createProtectedHandler('delete', async id => {
    try {
      await deleteWorkflow(id);
      showNotification('Workflow deleted successfully!', 'success');
      setWorkflows(prev => prev.filter(w => w.id !== id));
      return { success: true };
    } catch (err) {
      showNotification(err.message || 'Failed to delete workflow.', 'error');
      return { success: false, error: err };
    }
  });

  const handleEdit = useCallback(
    id => {
      navigate(`/workflows/edit/${id}`);
    },
    [navigate]
  );

  return {
    // State
    workflows,
    isLoading,
    operationInProgress,

    // Actions
    fetchWorkflows,
    handleCreate,
    handleDuplicate,
    handleDelete,
    handleEdit,
  };
};
