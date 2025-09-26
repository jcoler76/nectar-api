const { gql } = require('apollo-server-express');

const dashboardTypeDefs = gql`
  type DashboardMetrics {
    services: Int!
    activeUsers: Int!
    roles: Int!
    applications: Int!
    apiCalls: Int!
    activityData: [ActivityDataPoint!]!
    totals: ActivityTotals!
  }

  type ActivityDataPoint {
    time: String!
    calls: Int!
    failures: Int!
    totalRecords: Int!
    totalDataSize: Float!
  }

  type ActivityTotals {
    totalCalls: Int!
    totalFailures: Int!
    totalRecords: Int!
    totalDataSize: Float!
  }

  type ActivityStatistics {
    summary: ActivitySummary!
    errorBreakdown: [ErrorBreakdownItem!]!
    topEndpoints: [EndpointUsage!]!
    userActivity: [UserActivity!]!
    timeframe: String!
  }

  type ActivitySummary {
    totalRequests: Int!
    successfulRequests: Int!
    failedRequests: Int!
    averageResponseTime: Float!
    totalDataTransferred: Float!
  }

  type ErrorBreakdownItem {
    statusCode: Int!
    count: Int!
    percentage: Float!
  }

  type EndpointUsage {
    endpoint: String!
    count: Int!
    averageResponseTime: Float!
  }

  type UserActivity {
    userId: String!
    userEmail: String!
    requestCount: Int!
    successRate: Float!
  }

  extend type Query {
    dashboardMetrics(days: Int): DashboardMetrics!
    activityStatistics(timeframe: String, onlyImportant: Boolean): ActivityStatistics!
  }
`;

module.exports = dashboardTypeDefs;
