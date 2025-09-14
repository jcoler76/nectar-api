import { useState, useCallback } from 'react';

/**
 * Custom hook for tracking operations to prevent React.StrictMode double-invocation issues
 *
 * @returns {Object} Operation tracking state and utilities
 */
export const useOperationTracking = () => {
  const [operationInProgress, setOperationInProgress] = useState({});

  /**
   * Check if an operation is in progress for a specific item
   */
  const isOperationInProgress = useCallback(
    (operationType, itemId) => {
      return Boolean(operationInProgress[`${operationType}-${itemId}`]);
    },
    [operationInProgress]
  );

  /**
   * Start tracking an operation
   */
  const startOperation = useCallback((operationType, itemId) => {
    setOperationInProgress(prev => ({ ...prev, [`${operationType}-${itemId}`]: true }));
  }, []);

  /**
   * Stop tracking an operation
   */
  const stopOperation = useCallback((operationType, itemId) => {
    setOperationInProgress(prev => {
      const newState = { ...prev };
      delete newState[`${operationType}-${itemId}`];
      return newState;
    });
  }, []);

  /**
   * Create a protected handler that prevents concurrent operations
   */
  const createProtectedHandler = useCallback(
    (operationType, handler, getItemId = arg => arg) => {
      return async (...args) => {
        const itemId = getItemId(...args);
        const operationKey = `${operationType}-${itemId}`;

        // Prevent concurrent operations for the same item
        if (operationInProgress[operationKey]) {
          return { success: false, error: `${operationType} operation already in progress` };
        }

        try {
          startOperation(operationType, itemId);
          return await handler(...args);
        } finally {
          stopOperation(operationType, itemId);
        }
      };
    },
    [operationInProgress, startOperation, stopOperation]
  );

  return {
    operationInProgress,
    isOperationInProgress,
    startOperation,
    stopOperation,
    createProtectedHandler,
  };
};
