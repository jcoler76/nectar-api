import api from './api';

// Cache for service components to reduce API calls
const componentCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const createService = async serviceData => {
  try {
    const response = await api.post('/api/services', serviceData);
    // Clear component cache when service is created
    componentCache.clear();
    return response.data;
  } catch (error) {
    // Only log errors in development environment
    if (process.env.NODE_ENV === 'development') {
      console.error('Error creating service:', error);
    }

    // Handle specific error cases
    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }
    if (error.response?.status === 403) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (error.response?.data?.code === 11000) {
      throw new Error('A service with this name already exists. Please choose a different name.');
    }

    throw new Error(error.response?.data?.message || 'Failed to create service');
  }
};

export const updateService = async (id, serviceData) => {
  try {
    const response = await api.put(`/api/services/${id}`, serviceData);
    return response.data;
  } catch (error) {
    // Only log errors in development environment
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error updating service ${id}:`, error);
    }
    throw new Error(error.response?.data?.message || 'Failed to update service');
  }
};

export const getServices = async () => {
  try {
    const response = await api.get('/api/services');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    // Only log errors in development environment
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching services:', error);
    }
    throw error;
  }
};

export const getService = async id => {
  try {
    const response = await api.get(`/api/services/${id}`);
    return response.data;
  } catch (error) {
    // Only log errors in development environment
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error fetching service ${id}:`, error);
    }
    throw error;
  }
};

export const deleteService = async (id, force = false) => {
  try {
    const response = await api.delete(`/api/services/${id}`, {
      params: { force },
    });
    return {
      ...response.data,
      success: true,
      deletedId: id,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return {
        success: true,
        message: 'Service already removed',
        deletedId: id,
      };
    }

    // Check if error is due to dependencies (409 status or message contains dependent records)
    if (
      error.response?.status === 409 ||
      error.response?.data?.message?.includes('dependent records')
    ) {
      // Extract dependency information from error message
      const match = error.response.data.message.match(/\(([^)]+)\)/);
      const dependencies = match ? match[1] : 'dependent records';

      const result = {
        success: false,
        hasDependencies: true,
        dependencies,
        message: error.response.data.message,
        error: error.response.data.message,
      };

      return result;
    }

    // Only log errors in development environment
    if (process.env.NODE_ENV === 'development') {
      console.error('Delete operation failed:', {
        id,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }
    throw error;
  }
};

export const testConnection = async connectionData => {
  try {
    const response = await api.post('/api/services/test', {
      ...connectionData,
      failoverHost: connectionData.failoverHost,
    });
    return response.data;
  } catch (error) {
    // Only log errors in development environment
    if (process.env.NODE_ENV === 'development') {
      console.error('Error testing connection:', error);
    }
    throw new Error(error.response?.data?.message || 'Failed to test connection');
  }
};

export const refreshServiceSchema = async id => {
  try {
    const response = await api.post(`/api/services/${id}/refresh-schema`, {});
    return {
      service: response.data.serviceName,
      objectCount: {
        total: response.data.totalObjects,
        tables: response.data.tables.length,
        views: response.data.views.length,
        procedures: response.data.procedures.length,
      },
    };
  } catch (error) {
    // Only log errors in development environment
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error refreshing schema for service ${id}:`, error);
    }
    throw new Error(error.response?.data?.message || 'Failed to refresh service schema');
  }
};

export const getDatabaseObjectSelections = async serviceId => {
  try {
    const response = await api.get(`/api/database-objects/${serviceId}/selections`);
    return response.data;
  } catch (error) {
    // Only log errors in development environment
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error fetching selections for service ${serviceId}:`, error);
    }
    throw error;
  }
};

export const getServiceComponents = async serviceId => {
  try {
    // Check cache first
    const cacheKey = `components_${serviceId}`;
    const cached = componentCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const startTime = Date.now();

    let response,
      transformedData = [];

    // Implement retry logic for the primary cached endpoint
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Try the faster cached endpoint first (reads from MongoDB)
        response = await api.get(`/api/roles/service/${serviceId}/schema`);

        // Transform the response to match the expected format
        transformedData = [];

        // Process tables
        const tables = (response.data.tables || []).map(table => ({
          name: table.name,
          schema_name: 'dbo',
          object_category: 'TABLE',
          type_desc: 'USER_TABLE',
          displayName: `dbo.${table.name}`,
          description: 'TABLE',
        }));

        // Process views
        const views = (response.data.views || []).map(view => ({
          name: view.name,
          schema_name: 'dbo',
          object_category: 'VIEW',
          type_desc: 'VIEW',
          displayName: `dbo.${view.name}`,
          description: 'VIEW',
        }));

        // Process procedures
        const procedures = (response.data.procedures || []).map(proc => ({
          name: proc.name,
          schema_name: 'dbo',
          object_category: 'PROCEDURE',
          type_desc: 'SQL_STORED_PROCEDURE',
          displayName: `dbo.${proc.name}`,
          description: 'PROCEDURE',
        }));

        // Combine all transformed data
        transformedData = [...tables, ...views, ...procedures];

        // Success - break out of retry loop
        break;
      } catch (cachedEndpointError) {
        lastError = cachedEndpointError;
        console.warn(
          `Cached endpoint attempt ${attempt}/${maxRetries} failed for service ${serviceId}:`,
          cachedEndpointError.message
        );

        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        } else {
          // All retries failed, log comprehensive error for debugging
          console.error(
            `Cached endpoint failed after ${maxRetries} attempts for service ${serviceId}. Last error:`,
            {
              message: cachedEndpointError.message,
              status: cachedEndpointError.response?.status,
              statusText: cachedEndpointError.response?.statusText,
              url: cachedEndpointError.config?.url,
            }
          );

          // Now try the fallback endpoint with explicit logging
          console.warn(
            `Using fallback direct SQL endpoint for service ${serviceId} - this indicates a cached endpoint reliability issue that should be investigated`
          );

          try {
            response = await api.get(`/api/services/${serviceId}/objects`);
            transformedData = response.data || [];

            const requestTime = Date.now() - startTime;

            // Log this fallback usage for monitoring
            console.warn('FALLBACK_USED', {
              service: 'serviceService',
              function: 'getServiceComponents',
              serviceId,
              reason: 'cached_endpoint_failure',
              attempts: maxRetries,
              fallbackSuccess: true,
              responseTime: requestTime,
            });
          } catch (fallbackError) {
            // Log comprehensive failure information
            console.error(`Complete failure for service ${serviceId}:`, {
              cachedEndpointError: {
                message: lastError.message,
                status: lastError.response?.status,
              },
              fallbackError: {
                message: fallbackError.message,
                status: fallbackError.response?.status,
              },
              serviceId,
              attempts: maxRetries,
            });

            throw new Error(
              `Failed to fetch service components for service ${serviceId}: Both cached endpoint (after ${maxRetries} attempts) and fallback endpoint failed. Last errors: Cached: ${lastError.message}, Fallback: ${fallbackError.response?.data?.message || fallbackError.message}`
            );
          }
        }
      }
    }

    // Cache the response (from either endpoint)
    componentCache.set(cacheKey, {
      data: transformedData,
      timestamp: Date.now(),
    });

    return transformedData;
  } catch (error) {
    // Only log errors in development environment
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error fetching service components for ${serviceId}:`, error);
    }
    throw new Error(error.response?.data?.message || 'Failed to fetch service components');
  }
};

// Clear component cache for a specific service
export const clearServiceComponentsCache = serviceId => {
  if (serviceId) {
    componentCache.delete(`components_${serviceId}`);
  } else {
    componentCache.clear();
  }
};
