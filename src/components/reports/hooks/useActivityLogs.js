import moment from 'moment-timezone';
import { useCallback, useEffect, useState } from 'react';

import api from '../../../services/api';

import useReportData from './useReportData';

const useActivityLogs = (filters, filterType) => {
  const {
    loading,
    data: logs,
    error,
    fetchData,
    reset,
    setError,
  } = useReportData('/api/activity-logs');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Statistics state
  const [statistics, setStatistics] = useState(null);

  // Fetch statistics function
  const fetchStatistics = useCallback(async timeframe => {
    try {
      const response = await api.get('/api/activity-logs/statistics', {
        params: { timeframe },
      });
      setStatistics(response.data.data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch statistics:', err);
    }
  }, []);

  // Custom fetch function for activity logs with pagination
  const fetchLogs = useCallback(
    async (resetPage = false) => {
      const currentPage = resetPage ? 1 : page;
      const params = {
        page: currentPage,
        limit: recordsPerPage,
        sort: '-timestamp',
      };

      // Add filters (removing 'all' values)
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all' && filters[key] !== '') {
          if (key === 'startDate') {
            params.startDate = moment
              .tz(filters[key], 'America/New_York')
              .startOf('day')
              .toISOString();
          } else if (key === 'endDate') {
            params.endDate = moment.tz(filters[key], 'America/New_York').endOf('day').toISOString();
          } else {
            params[key] = filters[key];
          }
        }
      });

      // Add importance-based smart filtering
      if (filterType === 'important') {
        params.importance = 'critical,high';
        params.category = 'api,workflow,webhook';
      } else if (filterType === 'critical') {
        params.importance = 'critical';
      }

      try {
        const response = await fetchData(params);
        if (resetPage) setPage(1);

        // Handle pagination response structure
        if (response?.data?.pagination) {
          setTotalPages(response.data.pagination.totalPages);
          setTotalRecords(response.data.pagination.total);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch activity logs');
      }
    },
    [page, recordsPerPage, filters, filterType, fetchData, setError]
  );

  // Page change handler
  const handlePageChange = useCallback(newPage => {
    setPage(newPage);
  }, []);

  // Records per page change handler
  const handleRecordsPerPageChange = useCallback(
    newRecordsPerPage => {
      setRecordsPerPage(parseInt(newRecordsPerPage));
      setPage(1);
      fetchLogs(true);
    },
    [fetchLogs]
  );

  // Search function
  const handleSearch = useCallback(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  // Reset function
  const handleReset = useCallback(() => {
    reset();
    setPage(1);
    setRecordsPerPage(10);
    setStatistics(null);
  }, [reset]);

  // Export function
  const handleExport = useCallback(async () => {
    try {
      const params = {
        format: 'csv',
      };

      // Add filters
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all' && filters[key] !== '') {
          if (key === 'startDate') {
            params.startDate = moment
              .tz(filters[key], 'America/New_York')
              .startOf('day')
              .toISOString();
          } else if (key === 'endDate') {
            params.endDate = moment.tz(filters[key], 'America/New_York').endOf('day').toISOString();
          } else {
            params[key] = filters[key];
          }
        }
      });

      const response = await api.get('/api/activity-logs/export', {
        params,
        responseType: 'blob',
      });

      // Create download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${moment().format('YYYY-MM-DD-HHmm')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    }
  }, [filters, setError]);

  // Effect to fetch logs when page changes
  useEffect(() => {
    if (page > 1) {
      fetchLogs();
    }
  }, [page, fetchLogs]);

  return {
    // Data
    logs,
    statistics,
    loading,
    error,

    // Pagination
    page,
    totalPages,
    recordsPerPage,
    totalRecords,

    // Functions
    fetchLogs,
    fetchStatistics,
    handleSearch,
    handleReset,
    handleExport,
    handlePageChange,
    handleRecordsPerPageChange,
  };
};

export default useActivityLogs;
