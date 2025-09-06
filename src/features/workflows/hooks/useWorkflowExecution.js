import { useCallback, useState } from 'react';

import { sanitizeErrorMessage } from '../../../utils/xssProtection';
import { testWorkflow } from '../api/workflowApi';

/**
 * Custom hook for handling workflow test execution
 * @param {string} workflowId - The workflow ID
 * @param {Function} onSave - Function to save the workflow before testing
 * @param {Function} setNodes - Function to update nodes state
 * @param {Function} showNotification - Function to show notifications
 * @returns {Object} Execution handlers and state
 */
export const useWorkflowExecution = (workflowId, onSave, setNodes, showNotification) => {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleTestExecution = useCallback(async () => {
    setIsExecuting(true);

    // Clear any previous execution status from nodes
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: null, error: null } })));

    try {
      // Save the workflow first
      await onSave();
      showNotification('Starting test run...', 'info');

      // Execute the test
      const results = await testWorkflow(workflowId, {});

      // Update nodes with execution results
      setNodes(nds =>
        nds.map(node => {
          const result = results[node.id];
          if (result) {
            return {
              ...node,
              data: {
                ...node.data,
                status: result.status,
                error: result.error,
              },
            };
          }
          return {
            ...node,
            data: {
              ...node.data,
              status: 'skipped',
            },
          };
        })
      );

      // Show appropriate notification based on results
      const hasFailed = Object.values(results).some(r => r.status === 'failed');
      if (hasFailed) {
        showNotification('Test run finished with errors.', 'error');
      } else {
        showNotification('Test run finished successfully.', 'success');
      }
    } catch (err) {
      const sanitizedError = sanitizeErrorMessage(err.message || 'Failed to execute test run.');
      showNotification(sanitizedError, 'error');
    } finally {
      setIsExecuting(false);

      // Clear execution status after 7 seconds
      setTimeout(() => {
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: null, error: null } })));
      }, 7000);
    }
  }, [workflowId, onSave, setNodes, showNotification]);

  return {
    isExecuting,
    handleTestExecution,
  };
};
