import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Check if gtag is available and GA measurement ID is configured
    if (typeof window.gtag === 'function' && process.env.REACT_APP_GA_MEASUREMENT_ID) {
      // Send page view to Google Analytics
      window.gtag('config', process.env.REACT_APP_GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search + location.hash,
        page_title: document.title,
      });
    }
  }, [location]);
};

export default usePageTracking;