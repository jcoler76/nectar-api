import SecureSessionStorage from './secureStorage';

const secureStorage = new SecureSessionStorage();

// Migration utility to handle old authentication tokens
export const migrateAuthTokens = () => {
  try {
    // Check if we already have data in secure storage
    const secureData = secureStorage.getItem();
    if (secureData && secureData.token) {
      return secureData; // Already migrated
    }

    // Check for old localStorage format
    const oldUserData = localStorage.getItem('user');
    if (oldUserData) {
      try {
        const userData = JSON.parse(oldUserData);
        if (userData && userData.token) {
          // Migrate to secure storage
          secureStorage.setItem(userData);

          // Clean up old storage
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');

          return userData;
        }
      } catch (error) {
        console.error('Error parsing old user data:', error);
        // Clear corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Error during auth migration:', error);
    return null;
  }
};

// Clear all authentication data (for logout or corruption)
export const clearAllAuthData = () => {
  try {
    // Clear secure storage
    secureStorage.removeItem();

    // Clear legacy storage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const validateToken = token => {
  try {
    if (!token) return false;

    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    // Add buffer but be more conservative about clearing tokens
    const isExpired = payload.exp && payload.exp < currentTime - 60; // Only clear if expired by more than 1 minute

    // Reject tokens minted for a different app/audience or issuer
    const expectedAud = 'nectar-client';
    const expectedIss = 'nectar-api';
    const wrongAudience = payload.aud && payload.aud !== expectedAud;
    const wrongIssuer = payload.iss && payload.iss !== expectedIss;

    if (wrongAudience || wrongIssuer) {
      console.warn('Token issuer/audience mismatch, clearing auth data', {
        aud: payload.aud,
        iss: payload.iss,
      });
      clearAllAuthData();
      return false;
    }

    if (isExpired) {
      console.warn('Token expired, clearing auth data');
      clearAllAuthData();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    // Be much more conservative about clearing auth data
    // Only clear on clear parsing errors, not validation issues
    if (
      error.name === 'SyntaxError' ||
      (error.message && error.message.includes('Unexpected token'))
    ) {
      console.warn('Malformed token detected, clearing auth data');
      clearAllAuthData();
    }
    return false;
  }
};

export const checkAuthStatus = () => {
  try {
    const userData = secureStorage.getItem();
    if (!userData || !userData.token) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('No auth data found in secure storage');
      }
      return { isAuthenticated: false, user: null };
    }

    if (!validateToken(userData.token)) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Token validation failed');
      }
      return { isAuthenticated: false, user: null };
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Auth status check successful');
    }
    return { isAuthenticated: true, user: userData };
  } catch (error) {
    console.error('Error checking auth status:', error);
    // Be more cautious about clearing data - only clear if it's clearly corrupted
    if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
      console.warn('Corrupted auth data detected, clearing');
      clearAllAuthData();
    }
    return { isAuthenticated: false, user: null };
  }
};

const authMigration = {
  migrateAuthTokens,
  clearAllAuthData,
  checkAuthStatus,
};

export default authMigration;
