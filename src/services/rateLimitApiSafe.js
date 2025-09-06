import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const rateLimitApi = axios.create({
  baseURL: `${API_BASE_URL}/api/admin/rate-limits`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
rateLimitApi.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling - NO AUTO REDIRECT
rateLimitApi.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // Don't auto-redirect on 401 errors
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

  // Analytics
  getStats: (params = {}) => {
    return rateLimitApi.get('/analytics', { params });
  },
};

// Export as default for backward compatibility
export default rateLimitApiService;
export { rateLimitApiService as rateLimitApi };
