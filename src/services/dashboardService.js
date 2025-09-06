import api from './api';

// Use the main API instance for consistent error handling
export const getDashboardMetrics = async (days = 30) => {
  try {
    const clamped = Math.min(90, Math.max(7, Number(days) || 30));
    // Add cache-busting parameter to ensure fresh data
    const timestamp = new Date().getTime();
    const response = await api.get(`/api/dashboard/metrics?days=${clamped}&_t=${timestamp}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    throw new Error('Failed to fetch dashboard metrics');
  }
};

// Add any other dashboard-related API calls here
