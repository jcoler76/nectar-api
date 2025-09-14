import axios from 'axios';

import { clearAllAuthData } from '../utils/authMigration';
import SecureSessionStorage from '../utils/secureStorage';

// Ensure we have a valid API_URL
const getApiUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;

  // If environment URL is not set or is empty, use localhost
  if (!envUrl || envUrl.trim() === '') {
    return 'http://localhost:3001';
  }

  // Validate the URL format
  try {
    new URL(envUrl);
    return envUrl.trim();
  } catch (error) {
    console.warn('Invalid REACT_APP_API_URL, falling back to localhost:', envUrl);
    return 'http://localhost:3001';
  }
};

const API_URL = getApiUrl();

const secureStorage = new SecureSessionStorage();

// Import getToken from authService to avoid circular dependency issues
let getToken = null;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CSRF
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

// CSRF token storage
let csrfToken = null;

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Helper function to get current token
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

// Add request interceptor to include auth token and CSRF token
api.interceptors.request.use(
  async config => {
    try {
      // Ensure config.url is defined
      if (!config.url) {
        console.error('Request URL is undefined');
        return config;
      }

      // Add auth token
      const token = getCurrentToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Skip CSRF for auth endpoints entirely
      if (config.url.startsWith('/api/auth')) {
        return config;
      }

      // Add CSRF token for state-changing requests
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
        // Skip CSRF for excluded paths and patterns
        const excludedPaths = [
          '/api/auth',
          '/api/v1',
          '/api/v2',
          '/api/webhooks',
          '/api/forms',
          '/api/email',
          '/api/files',
        ];
        const excludedPatterns = [
          /\/refresh-schema$/,
          /\/databases\/refresh$/,
          /\/refresh-databases$/,
          /\/test$/,
        ];

        const pathExcluded = excludedPaths.some(path => config.url.startsWith(path));
        const patternExcluded = excludedPatterns.some(pattern => pattern.test(config.url));
        const needsCSRF = !pathExcluded && !patternExcluded;

        if (needsCSRF && token) {
          // Always get a fresh CSRF token for state-changing requests to avoid stale tokens
          try {
            // Use a separate axios instance to avoid interceptor recursion
            const csrfResponse = await axios
              .create({
                baseURL: API_URL,
                withCredentials: true,
              })
              .get('/api/csrf-token', {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 3000, // Add timeout to prevent hanging
              });
            csrfToken = csrfResponse.data.csrfToken;

            if (csrfToken) {
              config.headers['x-csrf-token'] = csrfToken;
            }
          } catch (err) {
            // Don't fail the main request if CSRF token fetch fails
            console.warn('Could not get CSRF token, proceeding without it:', err.message);
            // Try to use existing token if we have one
            if (csrfToken) {
              config.headers['x-csrf-token'] = csrfToken;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in request interceptor:', error);
    }
    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Store original console.error to restore later if needed
const originalConsoleError = console.error;

// Override console.error to filter out expected errors in production
console.error = (...args) => {
  const message = args.join(' ');

  // In production, suppress all axios errors except in development
  if (process.env.NODE_ENV !== 'development') {
    // Filter out axios errors that show up as unprofessional in console
    if (
      message.includes('AxiosError') ||
      message.includes('Request failed with status code') ||
      message.includes('Error creating service:') ||
      message.includes('Error updating service') ||
      message.includes('Error fetching service') ||
      message.includes('Error testing connection:') ||
      message.includes('Error refreshing schema') ||
      message.includes('Delete operation failed:') ||
      message.includes('Error deleting endpoint') ||
      message.includes('Failed to delete service') ||
      (message.includes('DELETE') && message.includes('400')) ||
      (message.includes('delete') && message.includes('xhr.js'))
    ) {
      return; // Suppress these errors in production
    }
  }

  // Filter out expected CSRF 403 errors
  if (
    message.includes('403') &&
    message.includes('Forbidden') &&
    (message.includes('users') ||
      message.includes('workflows') ||
      message.includes('DELETE') ||
      message.includes('refresh-schema'))
  ) {
    // This is likely a CSRF-related 403 error that will be retried automatically
    // Suppress it to keep console clean
    return;
  }

  // Log all other errors normally
  originalConsoleError(...args);
};

// Add response interceptor to handle auth errors with token refresh
api.interceptors.response.use(
  response => {
    // Extract CSRF token from response headers if present
    const newCsrfToken = response.headers['x-csrf-token'];
    if (newCsrfToken) {
      csrfToken = newCsrfToken;
    }
    return response;
  },
  async error => {
    const originalRequest = error.config;

    // Check if the error is a 401 Unauthorized and we haven't already tried to refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const currentToken = getCurrentToken();
        if (currentToken) {
          // Try to refresh the token
          const refreshResponse = await axios.post(
            `${API_URL}/api/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${currentToken}`,
              },
            }
          );

          const newToken = refreshResponse.data.accessToken || refreshResponse.data.token;

          // Update stored user data with new token
          const userData = secureStorage.getItem();
          if (userData) {
            const updatedUserData = {
              ...userData,
              token: newToken,
            };
            secureStorage.setItem(updatedUserData);
          }

          // Update the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Process queued requests
          processQueue(null, newToken);

          isRefreshing = false;

          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear user data but don't force reload - let React handle the redirect
        clearAllAuthData();
        csrfToken = null; // Clear CSRF token

        // Instead of window.location.reload(), emit a storage event to trigger auth context update
        // This allows React to handle the logout gracefully without losing component state
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'mirabel_session',
            newValue: null,
            oldValue: 'cleared',
          })
        );

        return Promise.reject(refreshError);
      }
    }

    // Enhanced CSRF token error handling - be more conservative about retries
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data &&
      (error.response.data.message === 'Invalid CSRF token' ||
        error.response.data.message === 'CSRF token missing')
    ) {
      // Clear CSRF token and retry once, but only for genuine CSRF errors
      if (!originalRequest._csrfRetry) {
        originalRequest._csrfRetry = true;
        csrfToken = null; // Force refresh on next request

        // Try to get a fresh CSRF token
        try {
          await refreshCSRFToken();
          return api(originalRequest);
        } catch (csrfError) {
          console.warn('Failed to refresh CSRF token, proceeding with original error:', csrfError);
          return Promise.reject(error);
        }
      }
    }

    // For 403 Forbidden that's NOT CSRF-related, don't retry
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data &&
      error.response.data.message === 'Forbidden' &&
      !error.response.data.message.includes('CSRF')
    ) {
      // This is likely an authorization issue, not CSRF
      return Promise.reject(error);
    }

    // If we get a 429 (rate limit), don't retry
    if (error.response?.status === 429) {
      return Promise.reject(error);
    }

    // For non-401 errors or if refresh failed, return the error
    return Promise.reject(error);
  }
);

// Function to manually refresh CSRF token
export const refreshCSRFToken = async () => {
  try {
    const token = getCurrentToken();
    if (token) {
      // Use a separate axios instance to avoid interceptor recursion
      const response = await axios
        .create({
          baseURL: API_URL,
          withCredentials: true,
        })
        .get('/api/csrf-token', {
          headers: { Authorization: `Bearer ${token}` },
        });
      csrfToken = response.data.csrfToken;
      return csrfToken;
    }
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error);
    throw error;
  }
};

// Function to clear CSRF token (useful for logout)
export const clearCSRFToken = () => {
  csrfToken = null;
};

// Function to restore original console.error if needed for debugging
export const restoreConsoleError = () => {
  console.error = originalConsoleError;
};

export default api;
