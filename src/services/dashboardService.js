import { gql } from 'graphql-request';

import { executeGraphQL } from './graphqlClient';

const DASHBOARD_METRICS_QUERY = gql`
  query GetDashboardMetrics($days: Int) {
    dashboardMetrics(days: $days) {
      services
      activeUsers
      roles
      applications
      apiCalls
      activityData {
        time
        calls
        failures
        totalRecords
        totalDataSize
      }
      totals {
        totalCalls
        totalFailures
        totalRecords
        totalDataSize
      }
    }
  }
`;

const ACTIVITY_STATISTICS_QUERY = gql`
  query GetActivityStatistics($timeframe: String, $onlyImportant: Boolean) {
    activityStatistics(timeframe: $timeframe, onlyImportant: $onlyImportant) {
      summary {
        totalRequests
        successfulRequests
        failedRequests
        averageResponseTime
        totalDataTransferred
      }
      errorBreakdown {
        statusCode
        count
        percentage
      }
      topEndpoints {
        endpoint
        count
        averageResponseTime
      }
      userActivity {
        userId
        userEmail
        requestCount
        successRate
      }
      timeframe
    }
  }
`;

// Use GraphQL for dashboard metrics
export const getDashboardMetrics = async (days = 30) => {
  try {
    const clamped = Math.min(90, Math.max(7, Number(days) || 30));
    const data = await executeGraphQL(DASHBOARD_METRICS_QUERY, { days: clamped });
    return data.dashboardMetrics;
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    throw new Error('Failed to fetch dashboard metrics');
  }
};

// Use GraphQL for activity statistics
export const getActivityStatistics = async (timeframe = '24h', onlyImportant = false) => {
  try {
    const data = await executeGraphQL(ACTIVITY_STATISTICS_QUERY, {
      timeframe,
      onlyImportant,
    });
    return data.activityStatistics;
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    throw new Error('Failed to fetch activity statistics');
  }
};
