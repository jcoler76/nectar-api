/**
 * Centralized token getter for all API requests
 * This ensures consistent token retrieval across REST API, GraphQL, and other services
 */

// Import the API instance to access its default headers
import api from '../services/api';

/**
 * Get the current authentication token
 * Tries multiple sources in order of reliability:
 * 1. Axios default headers (set by AuthContext after login)
 * 2. SecureStorage (fallback for direct reads)
 *
 * @returns {string|null} The bearer token or null if not found
 */
export const getAuthToken = () => {
  try {
    // First, try to get from axios default headers (most reliable after login)
    const authHeader = api.defaults.headers.common.Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token && token.length > 0) {
        return token;
      }
    }

    // Fallback: Try to get from secure storage
    const SecureSessionStorage = require('./secureStorage').default;
    const storage = new SecureSessionStorage();
    const userData = storage.getItem();

    if (userData && userData.token) {
      return userData.token;
    }

    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export default getAuthToken;
