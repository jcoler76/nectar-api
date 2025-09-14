const { gql } = require('apollo-server-express');

const billingTypeDefs = gql`
  type BillingEvent implements Node {
    id: ID!
    organizationId: String!
    subscriptionId: String
    eventType: String!
    amount: Float
    currency: String
    description: String
    processedAt: Date
    createdAt: Date!
    organization: Organization!
    subscription: Subscription
  }

  type BillingEventEdge {
    node: BillingEvent!
    cursor: String!
  }

  type BillingEventConnection {
    edges: [BillingEventEdge!]!
    pageInfo: PageInfo!
  }

  type BillingMetrics {
    dailyRevenue: Float!
    monthlyRevenue: Float!
    yearlyRevenue: Float!
    totalEvents: Int!
  }

  extend type Query {
    billingMetrics: BillingMetrics!
    billingEvents(pagination: PaginationInput, since: Date, until: Date): BillingEventConnection!
  }
`;

module.exports = billingTypeDefs;
