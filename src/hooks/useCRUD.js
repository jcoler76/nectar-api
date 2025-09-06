import { useState, useEffect, useCallback, useMemo } from 'react';

import { useNotification } from '../context/NotificationContext';

import { useOperationTracking } from './useOperationTracking';

/**
 * Shared CRUD hook providing standardized create, read, update, delete operations
 *
 * @param {Object} config - Configuration object
 * @param {Object} config.service - Service object with CRUD methods (getAll, create, update, delete, etc.)
 * @param {string} config.itemName - Item name for error messages (e.g., 'user', 'application')
 * @param {boolean} config.initialFetch - Whether to fetch data on mount (default: true)
 * @param {boolean} config.enableNotifications - Whether to show notifications (default: true)
 * @param {boolean} config.enableOperationTracking - Whether to use operation tracking (default: true)
 * @param {Object} config.customActions - Additional operations specific to the resource
 * @param {Object} config.transformers - Data transformation functions
 * @param {Object} config.permissions - Operation permissions
 * @param {Function} config.onSuccess - Callback for successful operations
 * @param {Function} config.onError - Custom error handler
 */
export const useCRUD = config => {
  const {
    service,
    itemName = 'item',
    initialFetch = true,
    enableNotifications = true,
    enableOperationTracking = true,
    customActions = {},
    transformers = {},
    permissions = {},
    onSuccess,
    onError,
  } = config;

  // State management
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hooks (must always be called in the same order)
  const notification = useNotification();
  const operationTracking = useOperationTracking();

  const { showNotification } = enableNotifications ? notification : { showNotification: () => {} };
  const { createProtectedHandler, operationInProgress } = enableOperationTracking
    ? operationTracking
    : { createProtectedHandler: (key, handler) => handler, operationInProgress: {} };

  // Utility functions
  const handleError = useCallback(
    (error, operation = 'operation') => {
      console.error(`Error during ${operation}:`, error);
      const message =
        error.response?.data?.message || error.message || `Failed to ${operation} ${itemName}`;
      setError(message);

      if (enableNotifications) {
        showNotification(message, 'error');
      }

      if (onError) {
        onError(error, operation);
      }
    },
    [itemName, enableNotifications, showNotification, onError]
  );

  const handleSuccess = useCallback(
    (message, data, operation) => {
      if (enableNotifications && message) {
        showNotification(message, 'success');
      }

      if (onSuccess) {
        onSuccess(data, operation);
      }
    },
    [enableNotifications, showNotification, onSuccess]
  );

  // Core CRUD operations
  const fetch = useCallback(
    async (params = {}) => {
      if (!service?.getAll) {
        console.warn('Service does not support getAll operation');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await service.getAll(params);
        setItems(Array.isArray(data) ? data : []);
        return data;
      } catch (error) {
        handleError(error, 'fetch');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [service, handleError]
  );

  const create = useCallback(
    async itemData => {
      return createProtectedHandler('create', async () => {
        if (!service?.create) {
          throw new Error('Service does not support create operation');
        }

        if (permissions.create === false) {
          throw new Error('Not authorized to create items');
        }

        try {
          const newItem = await service.create(itemData);

          // Update local state optimistically
          setItems(prevItems => [...prevItems, newItem]);

          handleSuccess(
            `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} created successfully`,
            newItem,
            'create'
          );
          return newItem;
        } catch (error) {
          handleError(error, 'create');
          throw error;
        }
      })();
    },
    [service, itemName, permissions, handleSuccess, handleError, createProtectedHandler]
  );

  const update = useCallback(
    (id, itemData) => {
      return createProtectedHandler(`update-${id}`, async () => {
        if (!service?.update) {
          throw new Error('Service does not support update operation');
        }

        if (permissions.update === false) {
          throw new Error('Not authorized to update items');
        }

        // Store original item for potential rollback
        const originalItem = items.find(item => item._id === id || item.id === id);

        try {
          // Optimistic update
          setItems(prevItems =>
            prevItems.map(item =>
              item._id === id || item.id === id ? { ...item, ...itemData } : item
            )
          );

          const updatedItem = await service.update(id, itemData);

          // Update with server response
          setItems(prevItems =>
            prevItems.map(item => (item._id === id || item.id === id ? updatedItem : item))
          );

          handleSuccess(
            `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} updated successfully`,
            updatedItem,
            'update'
          );
          return updatedItem;
        } catch (error) {
          // Rollback optimistic update
          if (originalItem) {
            setItems(prevItems =>
              prevItems.map(item => (item._id === id || item.id === id ? originalItem : item))
            );
          }

          handleError(error, 'update');
          throw error;
        }
      })();
    },
    [service, itemName, items, permissions, handleSuccess, handleError, createProtectedHandler]
  );

  const deleteItem = useCallback(
    id => {
      return createProtectedHandler(`delete-${id}`, async () => {
        if (!service?.delete) {
          throw new Error('Service does not support delete operation');
        }

        if (permissions.delete === false) {
          throw new Error('Not authorized to delete items');
        }

        // Store original item for potential rollback
        const originalItem = items.find(item => item._id === id || item.id === id);

        try {
          // Optimistic removal
          setItems(prevItems => prevItems.filter(item => item._id !== id && item.id !== id));

          await service.delete(id);

          handleSuccess(
            `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted successfully`,
            null,
            'delete'
          );
          return true;
        } catch (error) {
          // Rollback optimistic removal (unless 404 - item was already deleted)
          if (error.response?.status !== 404 && originalItem) {
            setItems(prevItems => [...prevItems, originalItem]);
          }

          // 404 is actually success for deletes
          if (error.response?.status === 404) {
            handleSuccess(
              `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted successfully`,
              null,
              'delete'
            );
            return true;
          }

          handleError(error, 'delete');
          throw error;
        }
      })();
    },
    [service, itemName, items, permissions, handleSuccess, handleError, createProtectedHandler]
  );

  // Common operations
  const toggleActive = useCallback(
    id => {
      return createProtectedHandler(`toggle-${id}`, async () => {
        const item = items.find(item => item._id === id || item.id === id);
        if (!item) {
          throw new Error('Item not found');
        }

        const newActiveState = !item.active;

        try {
          // Optimistic update
          setItems(prevItems =>
            prevItems.map(item =>
              item._id === id || item.id === id ? { ...item, active: newActiveState } : item
            )
          );

          if (service.action) {
            await service.action(id, newActiveState ? 'activate' : 'deactivate');
          } else if (service.update) {
            await service.update(id, { active: newActiveState });
          } else {
            throw new Error('Service does not support toggle operation');
          }

          const action = newActiveState ? 'activated' : 'deactivated';
          handleSuccess(
            `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} ${action} successfully`,
            null,
            'toggle'
          );
          return true;
        } catch (error) {
          // Rollback optimistic update
          setItems(prevItems =>
            prevItems.map(item =>
              item._id === id || item.id === id ? { ...item, active: !newActiveState } : item
            )
          );

          handleError(error, 'toggle active state');
          throw error;
        }
      })();
    },
    [service, itemName, items, handleSuccess, handleError, createProtectedHandler]
  );

  const bulkDelete = useCallback(
    async ids => {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('No items selected for deletion');
      }

      if (permissions.delete === false) {
        throw new Error('Not authorized to delete items');
      }

      return createProtectedHandler('bulk-delete', async () => {
        // Store original items for rollback
        const originalItems = [...items];

        try {
          // Optimistic removal
          setItems(prevItems => prevItems.filter(item => !ids.includes(item._id || item.id)));

          // Delete all items
          const deletePromises = ids.map(id => service.delete(id));
          await Promise.all(deletePromises);

          handleSuccess(
            `${ids.length} ${itemName}${ids.length > 1 ? 's' : ''} deleted successfully`,
            null,
            'bulk-delete'
          );
          return true;
        } catch (error) {
          // Rollback on error
          setItems(originalItems);
          handleError(error, 'bulk delete');
          throw error;
        }
      })();
    },
    [service, itemName, items, permissions, handleSuccess, handleError, createProtectedHandler]
  );

  // Data transformation
  const prepareExportData = useCallback(() => {
    if (transformers.export && typeof transformers.export === 'function') {
      return transformers.export(items);
    }
    return items;
  }, [items, transformers]);

  // Utility methods
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refresh = useCallback(() => {
    return fetch();
  }, [fetch]);

  const getById = useCallback(
    id => {
      return items.find(item => item._id === id || item.id === id);
    },
    [items]
  );

  // Initialize data on mount
  useEffect(() => {
    if (initialFetch) {
      fetch();
    }
  }, [initialFetch, fetch]);

  // Create custom action handlers using useMemo to avoid hooks in loops
  const customActionHandlers = useMemo(() => {
    const handlers = {};

    Object.keys(customActions).forEach(actionName => {
      handlers[actionName] = async (id, ...args) => {
        return createProtectedHandler(`${actionName}-${id}`, async () => {
          try {
            const result = await customActions[actionName](id, ...args);
            handleSuccess(`${actionName} completed successfully`, result, actionName);
            return result;
          } catch (error) {
            handleError(error, actionName);
            throw error;
          }
        })();
      };
    });

    return handlers;
  }, [customActions, createProtectedHandler, handleSuccess, handleError]);

  return {
    // State
    items,
    loading,
    error,
    operationInProgress,

    // Core CRUD operations
    fetch,
    create,
    update,
    delete: deleteItem,

    // Common operations
    toggleActive,
    bulkDelete,

    // Custom actions
    ...customActionHandlers,

    // Utilities
    prepareExportData,
    clearError,
    refresh,
    getById,

    // State helpers
    isEmpty: items.length === 0,
    count: items.length,
  };
};
