import type { BaseEntity, CRUDService, ExtendedCRUDService } from '../types/api';

import api from './api';

/**
 * Creates a standardized CRUD service for any resource with full TypeScript support
 * Eliminates code duplication across service files
 *
 * @param endpoint - The API endpoint (e.g., 'services', 'connections')
 * @param itemName - Human-readable name for error messages (e.g., 'service', 'connection')
 * @returns Service object with CRUD operations
 */
export const createCRUDService = <
  TEntity extends BaseEntity,
  TCreateRequest = Partial<Omit<TEntity, '_id' | 'createdAt' | 'updatedAt'>>,
  TUpdateRequest = Partial<Omit<TEntity, '_id' | 'createdAt' | 'updatedAt'>>,
>(
  endpoint: string,
  itemName: string
): CRUDService<TEntity, TCreateRequest, TUpdateRequest> => {
  return {
    /**
     * Get all items
     */
    getAll: async (): Promise<TEntity[]> => {
      try {
        const response = await api.get(`/api/${endpoint}`);

        // Handle different response formats
        if (Array.isArray(response.data)) {
          return response.data as TEntity[];
        }

        // Handle nested data (e.g., response.data.users)
        if (response.data[itemName + 's']) {
          return response.data[itemName + 's'] as TEntity[];
        }

        if (response.data[endpoint]) {
          return response.data[endpoint] as TEntity[];
        }

        return [];
      } catch (error: any) {
        console.error(`Error fetching ${itemName}s:`, error);
        const message = error.response?.data?.message || `Error fetching ${itemName}s`;
        throw new Error(message);
      }
    },

    /**
     * Get item by ID
     */
    getById: async (id: string): Promise<TEntity> => {
      try {
        const response = await api.get(`/api/${endpoint}/${id}`);
        return response.data as TEntity;
      } catch (error: any) {
        console.error(`Error fetching ${itemName} ${id}:`, error);
        const message = error.response?.data?.message || `Error fetching ${itemName}`;
        throw new Error(message);
      }
    },

    /**
     * Create new item
     */
    create: async (data: TCreateRequest): Promise<TEntity> => {
      try {
        const response = await api.post(`/api/${endpoint}`, data);
        return response.data as TEntity;
      } catch (error: any) {
        console.error(`Error creating ${itemName}:`, error);
        const message = error.response?.data?.message || `Failed to create ${itemName}`;
        throw new Error(message);
      }
    },

    /**
     * Update existing item
     */
    update: async (id: string, data: TUpdateRequest): Promise<TEntity> => {
      try {
        const response = await api.put(`/api/${endpoint}/${id}`, data);
        return response.data as TEntity;
      } catch (error: any) {
        console.error(`Error updating ${itemName} ${id}:`, error);
        const message = error.response?.data?.message || `Failed to update ${itemName}`;
        throw new Error(message);
      }
    },

    /**
     * Delete item
     */
    delete: async (id: string): Promise<void> => {
      try {
        await api.delete(`/api/${endpoint}/${id}`);
      } catch (error: any) {
        console.error(`Error deleting ${itemName} ${id}:`, error);
        // Preserve full error for special handling (like 404 checks)
        throw error;
      }
    },
  };
};

/**
 * Helper function to create service with common extensions and proper typing
 */
export const createExtendedService = <
  TEntity extends BaseEntity,
  TCreateRequest = Partial<Omit<TEntity, '_id' | 'createdAt' | 'updatedAt'>>,
  TUpdateRequest = Partial<Omit<TEntity, '_id' | 'createdAt' | 'updatedAt'>>,
  TExtensions extends Record<string, any> = {},
>(
  endpoint: string,
  itemName: string,
  extensions: TExtensions = {} as TExtensions
): ExtendedCRUDService<TEntity, TCreateRequest, TUpdateRequest> & TExtensions => {
  const baseService = createCRUDService<TEntity, TCreateRequest, TUpdateRequest>(
    endpoint,
    itemName
  );

  return {
    ...baseService,
    ...extensions,

    /**
     * Generic action method for custom operations
     */
    action: async (id: string, actionName: string, data: any = null): Promise<any> => {
      try {
        const url = id ? `/api/${endpoint}/${id}/${actionName}` : `/api/${endpoint}/${actionName}`;
        const method = data ? 'post' : 'get';
        const response = await api[method](url, data);
        return response.data;
      } catch (error: any) {
        console.error(`Error executing ${actionName} on ${itemName}:`, error);
        const message = error.response?.data?.message || `Failed to ${actionName} ${itemName}`;
        throw new Error(message);
      }
    },
  };
};

/**
 * Generic action method that can be added to any service
 */
export const createActionMethod = (endpoint: string, itemName: string) => {
  return async (id: string, actionName: string, data: any = null): Promise<any> => {
    try {
      const url = id ? `/api/${endpoint}/${id}/${actionName}` : `/api/${endpoint}/${actionName}`;
      const method = data ? 'post' : 'get';
      const response = await api[method](url, data);
      return response.data;
    } catch (error: any) {
      console.error(`Error executing ${actionName} on ${itemName}:`, error);
      const message = error.response?.data?.message || `Failed to ${actionName} ${itemName}`;
      throw new Error(message);
    }
  };
};

export default createCRUDService;
