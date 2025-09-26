import axios from 'axios';

// SECURITY: Enhanced API URL validation with security checks
const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;

  // If environment URL is not set or is empty, use localhost
  if (!envUrl || envUrl.trim() === '') {
    return 'http://localhost:3001';
  }

  try {
    const url = new URL(envUrl.trim());

    // SECURITY: Block dangerous protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.warn('Invalid protocol in REACT_APP_API_URL, falling back to localhost:', envUrl);
      return 'http://localhost:3001';
    }

    // SECURITY: In production, require HTTPS
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      console.warn('HTTPS required in production, falling back to secure localhost:', envUrl);
      return 'https://localhost:3001';
    }

    // SECURITY: Block suspicious hostnames
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /localhost\.localdomain/i,
      /169\.254\./, // Link-local addresses
      /127\./, // Loopback except 127.0.0.1
      /10\./, // Private network (in production)
      /192\.168\./, // Private network (in production)
      /172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network (in production)
    ];

    // In production, block private network access
    if (process.env.NODE_ENV === 'production') {
      const hostname = url.hostname.toLowerCase();
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        for (const pattern of suspiciousPatterns.slice(5)) {
          // Skip non-production checks
          if (pattern.test(url.href)) {
            console.warn('Private network access blocked in production, falling back:', envUrl);
            return 'https://api.production.domain'; // Replace with actual production domain
          }
        }
      }
    }

    for (const pattern of suspiciousPatterns.slice(0, 5)) {
      // Common dangerous patterns
      if (pattern.test(url.href)) {
        console.warn('Suspicious URL pattern detected, falling back to localhost:', envUrl);
        return 'http://localhost:3001';
      }
    }

    return url.href.replace(/\/$/, ''); // Remove trailing slash
  } catch (error) {
    console.warn('Invalid REACT_APP_API_URL, falling back to localhost:', envUrl);
    return 'http://localhost:3001';
  }
};

const API_BASE_URL = getApiBaseUrl();

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

// SECURITY: Secure CSRF token storage with expiration
let csrfTokenCache = {
  token: null,
  expires: null,
  nonce: null,
};

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

      // SECURITY: Add CSRF token for state-changing requests with caching
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
        if (token) {
          try {
            const now = Date.now();

            // SECURITY: Check if cached token is still valid (5-minute expiration)
            if (!csrfTokenCache.token || !csrfTokenCache.expires || now >= csrfTokenCache.expires) {
              // Generate nonce for this token request
              const nonce = btoa(
                String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))
              );

              const response = await axios.get(`${API_BASE_URL}/api/csrf-token`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'X-CSRF-Nonce': nonce,
                },
                withCredentials: true,
              });

              // SECURITY: Cache token with expiration and nonce
              csrfTokenCache = {
                token: response.data.csrfToken,
                expires: now + 5 * 60 * 1000, // 5 minutes
                nonce: nonce,
              };
            }

            config.headers['x-csrf-token'] = csrfTokenCache.token;
          } catch (err) {
            console.error('Failed to get CSRF token:', err);
            // Clear cache on error
            csrfTokenCache = { token: null, expires: null, nonce: null };
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
      // SECURITY: Invalid CSRF token, clear cache to get a fresh one on next request
      csrfTokenCache = { token: null, expires: null, nonce: null };
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
