import { useCallback, useState } from 'react';

import api from '../../../services/api';
import { formatDateForAPI } from '../../../utils/dateUtils';

const useReportData = (endpoint, initialFilters = {}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');

  const handleError = useCallback(err => {
    if (err.response?.status === 401) {
      setError('Your session has expired. Please log in again.');
    } else {
      setError(err.response?.data?.message || 'Failed to fetch data');
      console.error('Error:', err);
    }
  }, []);

  const fetchData = useCallback(
    async filters => {
      if (!filters.startDate || !filters.endDate) {
        setError('Please select both start and end dates');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const params = {
          startDate: formatDateForAPI(filters.startDate),
          endDate: formatDateForAPI(filters.endDate),
          ...filters,
        };

        // Remove undefined and 'all' values
        Object.keys(params).forEach(key => {
          if (params[key] === undefined || params[key] === 'all' || params[key] === '') {
            delete params[key];
          }
        });

        const response = await api.get(endpoint, { params });
        setData(response.data);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [endpoint, handleError]
  );

  const refresh = useCallback(
    async filters => {
      await fetchData(filters);
    },
    [fetchData]
  );

  const reset = useCallback(() => {
    setData([]);
    setError('');
  }, []);

  return {
    loading,
    data,
    error,
    fetchData,
    refresh,
    reset,
    setError,
  };
};

export default useReportData;
