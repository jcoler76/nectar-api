import { useState, useEffect, useCallback, useMemo } from 'react';

import { useNotification } from '../context/NotificationContext';
import type { BaseEntity, ExtendedCRUDService, CRUDService } from '../types/api';

import { useOperationTracking } from './useOperationTracking';

// Type definitions for better type safety
export type FetchParams = Record<string, string | number | boolean | undefined>;
export type CustomActionHandler<T = unknown> = (id: string, ...args: any[]) => Promise<T>;
export type TransformFunction<TEntity, TResult = unknown> = (items: TEntity[]) => TResult;
export type ErrorType =
  | Error
  | { message?: string; response?: { data?: { message?: string } } }
  | unknown;
export type SuccessData<TEntity> = TEntity | TEntity[] | boolean | void | null | unknown;

/**
 * Configuration for the useCRUD hook with full type safety
 */
export interface UseCRUDConfig<
  TEntity extends BaseEntity,
  TCreateRequest = Partial<Omit<TEntity, '_id' | 'createdAt' | 'updatedAt'>>,
  TUpdateRequest = Partial<Omit<TEntity, '_id' | 'createdAt' | 'updatedAt'>>,
> {
  /** Service object with CRUD methods (getAll, create, update, delete, etc.) */
  service:
    | CRUDService<TEntity, TCreateRequest, TUpdateRequest>
    | ExtendedCRUDService<TEntity, TCreateRequest, TUpdateRequest>;

  /** Item name for error messages (e.g., 'user', 'application') */
  itemName?: string;

  /** Whether to fetch data on mount (default: true) */
  initialFetch?: boolean;

  /** Whether to show notifications (default: true) */
  enableNotifications?: boolean;

  /** Whether to use operation tracking (default: true) */
  enableOperationTracking?: boolean;

  /** Additional operations specific to the resource */
  customActions?: Record<string, CustomActionHandler>;

  /** Data transformation functions */
  transformers?: {
    export?: TransformFunction<TEntity>;
    [key: string]: TransformFunction<TEntity> | undefined;
  };

  /** Operation permissions */
  permissions?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };

  /** Callback for successful operations */
  onSuccess?: (data: SuccessData<TEntity>, operation: string) => void;

  /** Custom error handler */
  onError?: (error: ErrorType, operation: string) => void;
}

/**
 * Return type for the useCRUD hook with proper typing
 */
export interface UseCRUDReturn<
  TEntity extends BaseEntity,
  TCreateRequest = Partial<Omit<TEntity, '_id' | 'createdAt' | 'updatedAt'>>,
  TUpdateRequest = Partial<Omit<TEntity, '_id' | 'createdAt' | 'updatedAt'>>,
> {
  // State
  items: TEntity[];
  loading: boolean;
  error: string | null;
  operationInProgress: Record<string, boolean>;

  // Core CRUD operations
  fetch: (params?: FetchParams) => Promise<TEntity[] | null>;
  create: (itemData: TCreateRequest) => Promise<TEntity>;
  update: (id: string, itemData: TUpdateRequest) => Promise<TEntity>;
  delete: (id: string) => Promise<boolean>;

  // Common operations
  toggleActive: (id: string) => Promise<boolean>;
  bulkDelete: (ids: string[]) => Promise<boolean>;

  // Utilities
  prepareExportData: () => unknown;
  clearError: () => void;
  refresh: () => Promise<TEntity[] | null>;
  getById: (id: string) => TEntity | undefined;

  // State helpers
  isEmpty: boolean;
  count: number;

  // Custom actions (dynamically added)
  [key: string]: unknown;
}

/**
 * Shared CRUD hook providing standardized create, read, update, delete operations
 * with full TypeScript support and type safety
 */
export const useCRUD = <
  TEntity extends BaseEntity,
  TCreateRequest = Partial<Omit<TEntity, '_id' | 'createdAt' | 'updatedAt'>>,
  TUpdateRequest = Partial<Omit<TEntity, '_id' | 'createdAt' | 'updatedAt'>>,
>(
  config: UseCRUDConfig<TEntity, TCreateRequest, TUpdateRequest>
): UseCRUDReturn<TEntity, TCreateRequest, TUpdateRequest> => {
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
  const [items, setItems] = useState<TEntity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Hooks (must always be called in the same order)
  const notification = useNotification() as any;
  const operationTracking = useOperationTracking() as any;

  // Safe access to methods with fallbacks (memoized for stable references)
  const showNotification = useMemo(
    () =>
      enableNotifications && notification?.showNotification
        ? notification.showNotification
        : () => {},
    [enableNotifications, notification?.showNotification]
  );

  const createProtectedHandler = useMemo(
    () =>
      enableOperationTracking && operationTracking?.createProtectedHandler
        ? operationTracking.createProtectedHandler
        : (key: string, handler: () => Promise<any>) => handler,
    [enableOperationTracking, operationTracking?.createProtectedHandler]
  );

  const operationInProgress =
    enableOperationTracking && operationTracking?.operationInProgress
      ? operationTracking.operationInProgress
      : {};

  // Utility functions
  const handleError = useCallback(
    (error: ErrorType, operation: string = 'operation'): void => {
      console.error(`Error during ${operation}:`, error);
      const errorObj = error as any;
      const message =
        errorObj?.response?.data?.message ||
        errorObj?.message ||
        `Failed to ${operation} ${itemName}`;
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
    (message: string, data: SuccessData<TEntity>, operation: string): void => {
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
    async (params: FetchParams = {}): Promise<TEntity[] | null> => {
      if (!service?.getAll) {
        console.warn('Service does not support getAll operation');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await service.getAll();
        const itemsArray = Array.isArray(data) ? data : [];
        setItems(itemsArray);
        return itemsArray;
      } catch (error) {
        handleError(error as ErrorType, 'fetch');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [service, handleError]
  );

  const create = useCallback(
    async (itemData: TCreateRequest): Promise<TEntity> => {
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
          handleError(error as ErrorType, 'create');
          throw error;
        }
      })();
    },
    [service, itemName, permissions, handleSuccess, handleError, createProtectedHandler]
  );

  const update = useCallback(
    (id: string, itemData: TUpdateRequest): Promise<TEntity> => {
      return createProtectedHandler(`update-${id}`, async () => {
        if (!service?.update) {
          throw new Error('Service does not support update operation');
        }

        if (permissions.update === false) {
          throw new Error('Not authorized to update items');
        }

        // Store original item for potential rollback
        const originalItem = items.find(item => item._id === id);

        try {
          // Optimistic update
          setItems(prevItems =>
            prevItems.map(item => (item._id === id ? ({ ...item, ...itemData } as TEntity) : item))
          );

          const updatedItem = await service.update(id, itemData);

          // Update with server response
          setItems(prevItems => prevItems.map(item => (item._id === id ? updatedItem : item)));

          handleSuccess(
            `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} updated successfully`,
            updatedItem,
            'update'
          );
          return updatedItem;
        } catch (error) {
          // Rollback optimistic update
          if (originalItem) {
            setItems(prevItems => prevItems.map(item => (item._id === id ? originalItem : item)));
          }

          handleError(error, 'update');
          throw error;
        }
      })();
    },
    [service, itemName, items, permissions, handleSuccess, handleError, createProtectedHandler]
  );

  const deleteItem = useCallback(
    (id: string): Promise<boolean> => {
      return createProtectedHandler(`delete-${id}`, async () => {
        if (!service?.delete) {
          throw new Error('Service does not support delete operation');
        }

        if (permissions.delete === false) {
          throw new Error('Not authorized to delete items');
        }

        // Store original item for potential rollback
        const originalItem = items.find(item => item._id === id);

        try {
          // Optimistic removal
          setItems(prevItems => prevItems.filter(item => item._id !== id));

          await service.delete(id);

          handleSuccess(
            `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted successfully`,
            null,
            'delete'
          );
          return true;
        } catch (error) {
          // Rollback optimistic removal (unless 404 - item was already deleted)
          const errorObj = error as any;
          if (errorObj?.response?.status !== 404 && originalItem) {
            setItems(prevItems => [...prevItems, originalItem]);
          }

          // 404 is actually success for deletes
          if (errorObj?.response?.status === 404) {
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
    (id: string): Promise<boolean> => {
      return createProtectedHandler(`toggle-${id}`, async () => {
        const item = items.find(item => item._id === id);
        if (!item) {
          throw new Error('Item not found');
        }

        const newActiveState = !('active' in item &&
        typeof (item as Record<string, unknown>).active === 'boolean'
          ? (item as Record<string, unknown>).active
          : false);

        try {
          // Optimistic update
          setItems(prevItems =>
            prevItems.map(item =>
              item._id === id ? ({ ...item, active: newActiveState } as TEntity) : item
            )
          );

          const extendedService = service as ExtendedCRUDService<
            TEntity,
            TCreateRequest,
            TUpdateRequest
          >;

          if (extendedService.action) {
            await extendedService.action(id, newActiveState ? 'activate' : 'deactivate');
          } else if (service.update) {
            await service.update(id, { active: newActiveState } as TUpdateRequest);
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
              item._id === id ? ({ ...item, active: !newActiveState } as TEntity) : item
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
    async (ids: string[]): Promise<boolean> => {
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
          setItems(prevItems => prevItems.filter(item => !ids.includes(item._id)));

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
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const refresh = useCallback((): Promise<TEntity[] | null> => {
    return fetch();
  }, [fetch]);

  const getById = useCallback(
    (id: string): TEntity | undefined => {
      return items.find(item => item._id === id);
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
    const handlers: Record<string, CustomActionHandler> = {};

    Object.keys(customActions).forEach(actionName => {
      handlers[actionName] = async (id: string, ...args: any[]) => {
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
