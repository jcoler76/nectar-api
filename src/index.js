import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { PermissionProvider } from './context/PermissionContext';
import { ThemeProvider } from './context/ThemeContext';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <PermissionProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </PermissionProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Web Vitals logging (basic). Logs to console; can be extended to POST to backend.
if (process.env.REACT_APP_ENABLE_PWA === 'true') {
  reportWebVitals(metric => {
    try {
      const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
      if (!isMobile) return;
      const payload = {
        n: metric.name,
        v: Math.round(metric.value),
        l: metric.label,
        t: metric.startTime ? Math.round(metric.startTime) : undefined,
      };
      // eslint-disable-next-line no-console
      console.log('[web-vitals]', payload);
    } catch (_) {}
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(err => {
        // eslint-disable-next-line no-console
        console.warn('Service worker registration failed:', err);
      });
    });
  }
}
