import SecureSessionStorage from '../utils/secureStorage';

import api, { clearCSRFToken } from './api';

const secureStorage = new SecureSessionStorage();

export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', {
      email,
      password,
    });

    // Store user and token securely
    if (response.data && (response.data.token || response.data.accessToken)) {
      const userData = {
        token: response.data.accessToken || response.data.token,
        refreshToken: response.data.refreshToken,
        ...response.data.user,
      };

      secureStorage.setItem(userData);
    }

    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = () => {
  secureStorage.removeItem();

  // Clear any other auth-related storage
  sessionStorage.clear();

  // Clear CSRF token
  clearCSRFToken();

  // Optional: Call logout endpoint to blacklist tokens
  const userData = secureStorage.getItem();
  if (userData && userData.token) {
    api
      .post('/api/auth/logout', {
        token: userData.token,
        refreshToken: userData.refreshToken,
      })
      .catch(error => {
        console.warn('Logout API call failed:', error);
      });
  }
};

export const getCurrentUser = () => {
  let userData = secureStorage.getItem();

  // If no data in secure storage, try migration
  if (!userData || !userData.token) {
    const { migrateAuthTokens } = require('../utils/authMigration');
    userData = migrateAuthTokens();
  }

  if (!userData || !userData.token) {
    return null;
  }

  // Check if token is expired
  if (secureStorage.isTokenExpired(userData.token)) {
    secureStorage.removeItem();
    return null;
  }

  return userData;
};

export const getToken = () => {
  const userData = getCurrentUser();
  return userData ? userData.token : null;
};

export const isAuthenticated = () => {
  return !!getCurrentUser();
};

export const isTokenExpired = token => {
  return secureStorage.isTokenExpired(token);
};

export const registerUser = async userData => {
  try {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const verifyRegistration = async (userId, token) => {
  try {
    const response = await api.post('/api/auth/register/verify', { userId, token });

    if (response.data.accessToken) {
      const userData = {
        token: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        ...response.data.user,
      };
      secureStorage.setItem(userData);
    }

    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const setupAccount = async (token, password) => {
  try {
    const response = await api.post('/api/auth/setup-account', { token, password });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const verify2FA = async (email, token, trustDevice = false) => {
  try {
    const response = await api.post('/api/auth/2fa/verify', {
      email,
      token,
      trustDevice,
    });
    if (response.data.accessToken) {
      // Upon successful 2FA verification, the user object and token are returned.
      // We need to store them securely
      const userData = {
        token: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        ...response.data.user,
      };
      secureStorage.setItem(userData);
    }
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const requestOtp = async (email, method) => {
  try {
    const response = await api.post('/api/auth/2fa/request-otp', { email, method });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const verify2FASetup = async (email, token) => {
  try {
    const response = await api.post('/api/auth/2fa/setup-verify', { email, token });
    if (response.data.accessToken) {
      // Upon successful 2FA setup verification, store user data securely
      const userData = {
        token: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        ...response.data.user,
      };
      secureStorage.setItem(userData);
    }
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

const authService = {
  loginUser,
  logoutUser,
  getCurrentUser,
  registerUser,
  isAuthenticated,
  getToken,
  verifyRegistration,
  verify2FA,
  verify2FASetup,
  requestOtp,
  setupAccount,
  isTokenExpired,
};

export default authService;
