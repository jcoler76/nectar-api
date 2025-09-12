const { gql } = require('apollo-server-express');

const adminAnalyticsTypeDefs = gql`
  type AdminMetrics {
    totalUsers: Int!
    activeUsers: Int!
    totalSubscriptions: Int!
    monthlyRevenue: Float!
  }

  extend type Query {
    adminMetrics: AdminMetrics!
  }
`;

module.exports = adminAnalyticsTypeDefs;
