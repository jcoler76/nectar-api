import { useEffect, useCallback } from 'react';

import { useAuth } from '../context/AuthContext';

// Warning time: 5 minutes before logout
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes
// Session timeout: 30 minutes of inactivity
const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes

export const useSessionTimeout = () => {
  const { logout, isAuthenticated } = useAuth();

  const handleSessionWarning = useCallback(() => {
    if (isAuthenticated) {
      const userResponse = window.confirm(
        'Your session will expire in 5 minutes due to inactivity. Click OK to stay logged in.'
      );
      if (!userResponse) {
        logout();
      }
    }
  }, [logout, isAuthenticated]);

  const handleSessionTimeout = useCallback(() => {
    if (isAuthenticated) {
      alert('Your session has expired due to inactivity. You will be logged out.');
      logout();
    }
  }, [logout, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let warningTimeoutId;
    let logoutTimeoutId;

    const resetTimeouts = () => {
      clearTimeout(warningTimeoutId);
      clearTimeout(logoutTimeoutId);

      // Set warning timeout
      warningTimeoutId = setTimeout(handleSessionWarning, TIMEOUT_DURATION - WARNING_TIME);
      // Set logout timeout
      logoutTimeoutId = setTimeout(handleSessionTimeout, TIMEOUT_DURATION);
    };

    const handleActivity = () => {
      resetTimeouts();
    };

    // Set up event listeners for user activity
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timeouts
    resetTimeouts();

    return () => {
      clearTimeout(warningTimeoutId);
      clearTimeout(logoutTimeoutId);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, handleSessionWarning, handleSessionTimeout]);
};
