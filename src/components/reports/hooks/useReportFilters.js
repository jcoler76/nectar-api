import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { nowInTimezone, subtractDaysFromDate, parseISODate } from '../../../utils/dateUnified';

const useReportFilters = (defaultFilters = {}) => {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const dateParam = urlParams.get('date');

  // Initialize dates based on URL parameter or defaults
  const defaultStartDate = dateParam
    ? parseISODate(dateParam)
    : defaultFilters.startDate || subtractDaysFromDate(nowInTimezone(), 7);
  const defaultEndDate = dateParam
    ? parseISODate(dateParam)
    : defaultFilters.endDate || nowInTimezone();

  const [filters, setFilters] = useState({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    showDetails: false,
    ...defaultFilters,
  });

  // Auto-search flag for when coming from dashboard
  const [shouldAutoSearch, setShouldAutoSearch] = useState(!!dateParam);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateFilters = useCallback(updates => {
    setFilters(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      startDate: subtractDaysFromDate(nowInTimezone(), 7),
      endDate: nowInTimezone(),
      showDetails: false,
      ...defaultFilters,
    });
    setShouldAutoSearch(false);
  }, [defaultFilters]);

  const getFilterParams = useCallback(() => {
    const params = { ...filters };

    // Clean up the params for API
    Object.keys(params).forEach(key => {
      if (params[key] === 'all' || params[key] === '' || params[key] === undefined) {
        delete params[key];
      }
    });

    // Convert showDetails to string for API
    if ('showDetails' in params) {
      params.showDetails = params.showDetails ? 'true' : 'false';
    }

    return params;
  }, [filters]);

  // Effect to handle auto-search when shouldAutoSearch is true
  useEffect(() => {
    if (shouldAutoSearch) {
      const timer = setTimeout(() => {
        setShouldAutoSearch(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoSearch]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    getFilterParams,
    shouldAutoSearch,
  };
};

export default useReportFilters;
