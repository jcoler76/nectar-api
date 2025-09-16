import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../services/api';
import {
  loginUser,
  logoutUser,
  requestOtp,
  verify2FA,
  verify2FASetup,
} from '../services/authService';
import { checkAuthStatus } from '../utils/authMigration';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [setupTwoFactorRequired, setSetupTwoFactorRequired] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const navigate = useNavigate();

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Use the migration utility to handle auth data properly
        const authStatus = checkAuthStatus();
        if (authStatus.isAuthenticated && authStatus.user) {
          setUser(authStatus.user);
          setIsAuthenticated(true);
          // Ensure axios instance carries Authorization for immediate API calls
          try {
            if (authStatus.user?.token) {
              api.defaults.headers.common.Authorization = `Bearer ${authStatus.user.token}`;
            }
          } catch (_) {}
        } else {
          // Token was expired or invalid, but don't log this as an error
          setUser(null);
          setIsAuthenticated(false);
          try {
            delete api.defaults.headers.common.Authorization;
          } catch (_) {}
        }
      } catch (error) {
        // Only log actual errors, not auth state issues
        if (error.name !== 'TokenExpiredError') {
          console.error('Error checking auth status:', error);
        }
        setUser(null);
        setIsAuthenticated(false);
        try {
          delete api.defaults.headers.common.Authorization;
        } catch (_) {}
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Listen for storage changes (logout from another tab)
  useEffect(() => {
    const handleStorageChange = e => {
      // Watch for both old 'user' key and new 'mirabel_session' key
      if (e.key === 'user' || e.key === 'mirabel_session') {
        if (!e.newValue) {
          // User was logged out from another tab
          setUser(null);
          setIsAuthenticated(false);
        } else {
          // User was logged in from another tab - check auth status
          try {
            const authStatus = checkAuthStatus();
            if (authStatus.isAuthenticated && authStatus.user) {
              setUser(authStatus.user);
              setIsAuthenticated(true);
            } else {
              setUser(null);
              setIsAuthenticated(false);
            }
          } catch (error) {
            console.error('Error checking auth status from storage event:', error);
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback(
    async (email, password) => {
      try {
        setTwoFactorRequired(false); // Reset on new login attempt
        setSetupTwoFactorRequired(false);
        const data = await loginUser(email, password);

        if (data.twoFactorRequired) {
          setTwoFactorRequired(true);
          setTwoFactorEmail(data.email);
        } else if (data.setupTwoFactorRequired) {
          setSetupTwoFactorRequired(true);
          setTwoFactorEmail(data.email);
          setQrCode(data.qrCode);
          setSecret(data.secret);
        } else if (data.token || data.accessToken) {
          // Regular login with token
          setUser(data.user);
          setIsAuthenticated(true);
          try {
            const token = data.accessToken || data.token || data.user?.token;
            if (token) {
              api.defaults.headers.common.Authorization = `Bearer ${token}`;
            }
          } catch (_) {}
          navigate('/dashboard');
        } else {
          // Unexpected response format
          console.error('Login response missing token:', data);
          throw new Error('Invalid login response');
        }
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    },
    [navigate]
  );

  const verifyTwoFactor = useCallback(
    async (token, trustDevice = false) => {
      try {
        let data;
        if (setupTwoFactorRequired) {
          // This is 2FA setup verification
          data = await verify2FASetup(twoFactorEmail, token);
        } else {
          // This is regular 2FA verification
          data = await verify2FA(twoFactorEmail, token, trustDevice);
        }

        setUser(data.user);
        setIsAuthenticated(true);
        try {
          const token = data.accessToken || data.token || data.user?.token;
          if (token) {
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
          }
        } catch (_) {}
        setTwoFactorRequired(false);
        setSetupTwoFactorRequired(false);
        setTwoFactorEmail('');
        setOtpRequested(false);
        setQrCode('');
        setSecret('');
        navigate('/dashboard');
      } catch (error) {
        console.error('2FA verification failed:', error);
        throw error;
      }
    },
    [twoFactorEmail, setupTwoFactorRequired, navigate]
  );

  const requestTwoFactorCode = useCallback(
    async method => {
      if (!twoFactorEmail) return;
      await requestOtp(twoFactorEmail, method);
      setOtpRequested(true);
    },
    [twoFactorEmail]
  );

  const logout = useCallback(
    (redirect = true) => {
      logoutUser();
      setUser(null);
      setIsAuthenticated(false);
      setTwoFactorRequired(false);
      setSetupTwoFactorRequired(false);
      setTwoFactorEmail('');
      try {
        delete api.defaults.headers.common.Authorization;
      } catch (_) {}
      if (redirect) {
        navigate('/login');
      }
    },
    [navigate]
  );

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/api/auth/update-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update password');
    }
  };

  const getAllUsers = async () => {
    try {
      const response = await api.get('/api/users');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch users');
    }
  };

  const updateUserRole = async (userId, isAdmin) => {
    try {
      const response = await api.patch(`/api/users/${userId}/role`, {
        isAdmin,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update user role');
    }
  };

  const resetUserAuth = async userId => {
    try {
      const response = await api.post(`/api/users/${userId}/reset-auth`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reset user authentication');
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    twoFactorRequired,
    setupTwoFactorRequired,
    qrCode,
    secret,
    twoFactorEmail,
    otpRequested,
    login,
    logout,
    verifyTwoFactor,
    requestTwoFactorCode,
    updatePassword,
    getAllUsers,
    updateUserRole,
    resetUserAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
