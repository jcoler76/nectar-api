import React, { createContext, useContext, useState, useCallback } from 'react';

const BreadcrumbContext = createContext();

export const useBreadcrumbs = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
  }
  return context;
};

export const BreadcrumbProvider = ({ children }) => {
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState(null);

  const setBreadcrumbs = useCallback(breadcrumbs => {
    setCustomBreadcrumbs(breadcrumbs);
  }, []);

  const clearBreadcrumbs = useCallback(() => {
    setCustomBreadcrumbs(null);
  }, []);

  const updateBreadcrumbSegment = useCallback((index, label) => {
    setCustomBreadcrumbs(prev => {
      if (!prev) return null;
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], label };
      }
      return updated;
    });
  }, []);

  const value = {
    customBreadcrumbs,
    setBreadcrumbs,
    clearBreadcrumbs,
    updateBreadcrumbSegment,
  };

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
};
