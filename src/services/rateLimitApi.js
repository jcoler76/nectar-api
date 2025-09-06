import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Import getToken function to avoid circular dependency and use same token logic as main API
let getToken = null;

const getCurrentToken = () => {
  try {
    // Lazy load getToken to avoid circular dependency
    if (!getToken) {
      const authService = require('./authService');
      getToken = authService.getToken;
    }
    return getToken();
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// CSRF token storage
let csrfToken = null;

// Create axios instance with default config
const rateLimitApi = axios.create({
  baseURL: `${API_BASE_URL}/api/admin/rate-limits`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CSRF
});

// Request interceptor to add auth token and CSRF token
rateLimitApi.interceptors.request.use(
  async config => {
    try {
      // Add auth token
      const token = getCurrentToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add CSRF token for state-changing requests
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
        if (token) {
          // Always get a fresh CSRF token for each request to avoid stale token issues
          try {
            const response = await axios.get(`${API_BASE_URL}/api/csrf-token`, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
            });
            csrfToken = response.data.csrfToken;
            config.headers['x-csrf-token'] = csrfToken;
          } catch (err) {
            console.error('Failed to get CSRF token:', err);
            // Don't include CSRF token if we can't get one
          }
        }
      }
    } catch (error) {
      console.error('Error in rate limit API request interceptor:', error);
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
rateLimitApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn('Rate Limit API: 401 Unauthorized - User needs admin privileges');
      // Don't auto-redirect, let the component handle the error
      // The ProtectedRoute with requiredPermission="isAdmin" should handle this
    } else if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
      // Invalid CSRF token, clear it to get a fresh one on next request
      csrfToken = null;
    }
    return Promise.reject(error);
  }
);

const rateLimitApiService = {
  // Configuration management
  getConfigs: (params = {}) => {
    return rateLimitApi.get('/configs', { params });
  },

  getConfig: id => {
    return rateLimitApi.get(`/configs/${id}`);
  },

  createConfig: data => {
    return rateLimitApi.post('/configs', data);
  },

  updateConfig: (id, data) => {
    return rateLimitApi.put(`/configs/${id}`, data);
  },

  deleteConfig: id => {
    return rateLimitApi.delete(`/configs/${id}`);
  },

  toggleConfig: (id, data = {}) => {
    return rateLimitApi.post(`/configs/${id}/toggle`, data);
  },

  // Rate limit monitoring
  getActiveLimits: () => {
    return rateLimitApi.get('/active');
  },

  getRateLimitStatus: (configName, key) => {
    return rateLimitApi.get(`/status/${configName}/${key}`);
  },

  resetRateLimit: (configName, key) => {
    return rateLimitApi.post(`/reset/${configName}/${key}`);
  },

  // Related data for forms
  getApplications: () => {
    return rateLimitApi.get('/applications');
  },

  getRoles: () => {
    return rateLimitApi.get('/roles');
  },

  getServices: () => {
    return rateLimitApi.get('/services');
  },

  // Analytics
  getAnalytics: (params = {}) => {
    return rateLimitApi.get('/analytics', { params });
  },

  // Historical data
  getHistory: (params = {}) => {
    return rateLimitApi.get('/history', { params });
  },
};

// Export as default for backward compatibility
export default rateLimitApiService;
export { rateLimitApiService as rateLimitApi };
