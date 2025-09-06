import { Alert, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useState } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          variant="outlined"
          sx={{
            width: '100%',
            boxShadow: '0 10px 20px rgba(2, 6, 23, 0.15)',
            backdropFilter: 'blur(6px)',
            borderWidth: 1,
            ...(notification.severity === 'success' && {
              backgroundColor: 'rgba(56, 189, 248, 0.12)', // sky-400 at ~12%
              color: '#0c4a6e', // cyan-900
              borderColor: '#38bdf8', // sky-400
            }),
            ...(notification.severity === 'error' && {
              backgroundColor: 'rgba(248, 113, 113, 0.12)', // red-400
              color: '#7f1d1d', // red-900
              borderColor: '#ef4444', // red-500
            }),
            ...(notification.severity === 'warning' && {
              backgroundColor: 'rgba(251, 191, 36, 0.12)', // amber-400
              color: '#78350f', // amber-900
              borderColor: '#f59e0b', // amber-500
            }),
            ...(notification.severity === 'info' && {
              backgroundColor: 'rgba(96, 165, 250, 0.12)', // blue-400
              color: '#1e3a8a', // blue-900
              borderColor: '#60a5fa', // blue-400
            }),
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
