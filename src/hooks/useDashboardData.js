import { useQuery } from '@tanstack/react-query';

import { getDashboardMetrics, getActivityStatistics } from '../services/dashboardService';
import SecureSessionStorage from '../utils/secureStorage';

// Dashboard metrics query hook
export const useDashboardMetrics = (days = 30) => {
  const token = (() => {
    try {
      const s = new SecureSessionStorage();
      const data = s.getItem();
      const tkn = data?.token || null;
      return tkn;
    } catch (_error) {
      return null;
    }
  })();

  return useQuery({
    queryKey: ['dashboard-metrics', days],
    queryFn: () => getDashboardMetrics(days),
    staleTime: 1000 * 60 * 2, // 2 minutes - frequent updates for critical metrics
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    enabled: !!token,
    select: data => {
      // Transform data if needed
      return {
        ...data,
        services: data.services || 0,
        applications: data.applications || 0,
        roles: data.roles || 0,
        apiCalls: data.apiCalls || 0,
        activityData: data.activityData || [],
        servicesList: data.servicesList || [],
      };
    },
  });
};

// Activity logs statistics query hook
export const useActivityStatistics = (dateRange = '30d') => {
  const token = (() => {
    try {
      const s = new SecureSessionStorage();
      return s.getItem()?.token || null;
    } catch (_) {
      return null;
    }
  })();

  const timeframeMap = { '7d': '7d', '30d': '30d', '90d': '90d' };

  return useQuery({
    queryKey: ['activity-statistics', dateRange],
    queryFn: async () => {
      return await getActivityStatistics(timeframeMap[dateRange] || '30d', true);
    },
    staleTime: 1000 * 60 * 1, // 1 minute - very fresh data
    cacheTime: 1000 * 60 * 3, // 3 minutes
    refetchOnWindowFocus: true,
    enabled: !!token,
    select: data => {
      // Ensure data structure and provide defaults
      return {
        summary: {
          totalRequests: data?.summary?.totalRequests || 0,
          successfulRequests: data?.summary?.successfulRequests || 0,
          failedRequests: data?.summary?.failedRequests || 0,
          averageResponseTime: data?.summary?.averageResponseTime || 0,
        },
        ...data,
      };
    },
  });
};

// Combined hook for dashboard data with different loading states
export const useDashboardData = (dateRange = '30d') => {
  const days = parseInt(dateRange) || 30;

  const metricsQuery = useDashboardMetrics(days);
  const statisticsQuery = useActivityStatistics(dateRange);

  return {
    // Metrics data
    metrics: metricsQuery.data,
    metricsLoading: metricsQuery.isLoading,
    metricsError: metricsQuery.error,
    metricsRefetch: metricsQuery.refetch,

    // Statistics data
    statistics: statisticsQuery.data,
    statisticsLoading: statisticsQuery.isLoading,
    statisticsError: statisticsQuery.error,
    statisticsRefetch: statisticsQuery.refetch,

    // Combined states
    isLoading: metricsQuery.isLoading || statisticsQuery.isLoading,
    hasError: !!metricsQuery.error || !!statisticsQuery.error,
    error: metricsQuery.error || statisticsQuery.error,

    // Refetch all data
    refetchAll: () => {
      metricsQuery.refetch();
      statisticsQuery.refetch();
    },
  };
};
