import api from './api';

/**
 * Creates a standardized CRUD service for any resource
 * Eliminates code duplication across service files
 *
 * @param {string} endpoint - The API endpoint (e.g., 'services', 'connections')
 * @param {string} itemName - Human-readable name for error messages (e.g., 'service', 'connection')
 * @returns {Object} Service object with CRUD operations
 */
export const createCRUDService = (endpoint, itemName) => {
  return {
    /**
     * Get all items
     */
    getAll: async () => {
      try {
        const response = await api.get(`/api/${endpoint}`);
        // Handle different response formats
        if (Array.isArray(response.data)) {
          return response.data;
        }
        // Handle nested data (e.g., response.data.users)
        if (response.data[itemName + 's']) {
          return response.data[itemName + 's'];
        }
        if (response.data[endpoint]) {
          return response.data[endpoint];
        }
        return [];
      } catch (error) {
        console.error(`Error fetching ${itemName}s:`, error);
        throw error.response?.data?.message || `Error fetching ${itemName}s`;
      }
    },

    /**
     * Get item by ID
     */
    getById: async id => {
      try {
        const response = await api.get(`/api/${endpoint}/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching ${itemName} ${id}:`, error);
        throw error.response?.data?.message || `Error fetching ${itemName}`;
      }
    },

    /**
     * Create new item
     */
    create: async data => {
      try {
        const response = await api.post(`/api/${endpoint}`, data);
        return response.data;
      } catch (error) {
        console.error(`Error creating ${itemName}:`, error);
        const message = error.response?.data?.message || `Failed to create ${itemName}`;
        throw new Error(message);
      }
    },

    /**
     * Update existing item
     */
    update: async (id, data) => {
      try {
        const response = await api.put(`/api/${endpoint}/${id}`, data);
        return response.data;
      } catch (error) {
        console.error(`Error updating ${itemName} ${id}:`, error);
        const message = error.response?.data?.message || `Failed to update ${itemName}`;
        throw new Error(message);
      }
    },

    /**
     * Delete item
     */
    delete: async id => {
      try {
        const response = await api.delete(`/api/${endpoint}/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error deleting ${itemName} ${id}:`, error);
        // Preserve full error for special handling (like 404 checks)
        throw error;
      }
    },

    /**
     * Generic action method for custom operations
     */
    action: async (id, actionName, data = null) => {
      try {
        const url = id ? `/api/${endpoint}/${id}/${actionName}` : `/api/${endpoint}/${actionName}`;
        const method = data ? 'post' : 'get';
        const response = await api[method](url, data);
        return response.data;
      } catch (error) {
        console.error(`Error executing ${actionName} on ${itemName}:`, error);
        const message = error.response?.data?.message || `Failed to ${actionName} ${itemName}`;
        throw new Error(message);
      }
    },
  };
};

/**
 * Helper function to create service with common extensions
 */
export const createExtendedService = (endpoint, itemName, extensions = {}) => {
  const baseService = createCRUDService(endpoint, itemName);

  return {
    ...baseService,
    ...extensions,
  };
};

export default createCRUDService;
