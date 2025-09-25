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
      const token = response.data.accessToken || response.data.token;

      // Decode JWT to extract user info including isAdmin flag
      let decodedToken = null;
      try {
        const payload = token.split('.')[1];
        decodedToken = JSON.parse(atob(payload));
      } catch (error) {
        console.warn('Could not decode JWT token:', error);
      }

      const userData = {
        token: token,
        refreshToken: response.data.refreshToken,
        ...response.data.user,
        // Extract admin flags from JWT token payload
        isAdmin: decodedToken?.isAdmin || false,
        isSuperAdmin: decodedToken?.isSuperAdmin || false,
        // Also include organization info from JWT
        organizationId: decodedToken?.organizationId || response.data.organization?.id,
        organizationSlug: decodedToken?.organizationSlug || response.data.organization?.slug,
        role: decodedToken?.role || response.data.membership?.role,
      };

      // For super admins, store in plain localStorage FIRST for org selection
      // This must happen before secureStorage.setItem to avoid race conditions
      if (userData.isSuperAdmin) {
        const sessionData = {
          user: userData,
          token: token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        localStorage.setItem('superadmin_temp_session', JSON.stringify(sessionData));
        localStorage.setItem('superadmin_temp_user', JSON.stringify(userData));
      }

      secureStorage.setItem(userData);

      // Return the enriched response with JWT-decoded fields
      return {
        ...response.data,
        user: userData,
      };
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

  // If userData doesn't have isAdmin flag, decode JWT to extract it
  if (userData.isAdmin === undefined && userData.token) {
    try {
      const payload = userData.token.split('.')[1];
      const decodedToken = JSON.parse(atob(payload));

      // Update userData with missing JWT payload info
      userData = {
        ...userData,
        isAdmin: decodedToken?.isAdmin || false,
        isSuperAdmin: userData.isSuperAdmin || decodedToken?.isSuperAdmin || false,
        organizationId: userData.organizationId || decodedToken?.organizationId,
        organizationSlug: userData.organizationSlug || decodedToken?.organizationSlug,
        role: userData.role || decodedToken?.role,
      };

      // Update stored data with the new info
      secureStorage.setItem(userData);
    } catch (error) {
      console.warn('Could not decode stored JWT token:', error);
    }
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

export const setPassword = async (token, password) => {
  try {
    const response = await api.post('/api/auth/set-password', { token, password });

    // If successful, store the returned auth data
    if (response.data && response.data.token) {
      const userData = {
        token: response.data.token,
        ...response.data.user,
        organizationId: response.data.organization?.id,
        organizationSlug: response.data.organization?.slug,
        role: response.data.membership?.role,
        isAdmin: response.data.membership?.role === 'OWNER',
      };

      secureStorage.setItem(userData);
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const verifyEmailToken = async token => {
  try {
    const response = await api.get(`/api/auth/verify-email/${token}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
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
      const accessToken = response.data.accessToken;

      // Decode JWT to extract user info including isAdmin flag
      let decodedToken = null;
      try {
        const payload = accessToken.split('.')[1];
        decodedToken = JSON.parse(atob(payload));
      } catch (error) {
        console.warn('Could not decode JWT token:', error);
      }

      const userData = {
        token: accessToken,
        refreshToken: response.data.refreshToken,
        ...response.data.user,
        // Extract admin flags from JWT token payload
        isAdmin: decodedToken?.isAdmin || false,
        isSuperAdmin: decodedToken?.isSuperAdmin || false,
        organizationId: decodedToken?.organizationId || response.data.organization?.id,
        organizationSlug: decodedToken?.organizationSlug || response.data.organization?.slug,
        role: decodedToken?.role || response.data.membership?.role,
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
      const accessToken = response.data.accessToken;

      // Decode JWT to extract user info including isAdmin flag
      let decodedToken = null;
      try {
        const payload = accessToken.split('.')[1];
        decodedToken = JSON.parse(atob(payload));
      } catch (error) {
        console.warn('Could not decode JWT token:', error);
      }

      const userData = {
        token: accessToken,
        refreshToken: response.data.refreshToken,
        ...response.data.user,
        // Extract admin flags from JWT token payload
        isAdmin: decodedToken?.isAdmin || false,
        isSuperAdmin: decodedToken?.isSuperAdmin || false,
        organizationId: decodedToken?.organizationId || response.data.organization?.id,
        organizationSlug: decodedToken?.organizationSlug || response.data.organization?.slug,
        role: decodedToken?.role || response.data.membership?.role,
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
  setPassword,
  verifyEmailToken,
  isTokenExpired,
};

export default authService;
