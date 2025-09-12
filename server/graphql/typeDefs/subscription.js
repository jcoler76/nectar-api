const { gql } = require('apollo-server-express');

const subscriptionTypeDefs = gql`
  type Subscription implements Node {
    id: ID!
    plan: String!
    status: String!
    trialStart: Date
    trialEnd: Date
    currentPeriodStart: Date!
    currentPeriodEnd: Date!
    canceledAt: Date
    stripeCustomerId: String
    stripeSubscriptionId: String
    stripePriceId: String
    monthlyRevenue: Float
    cancelAtPeriodEnd: Boolean!
    createdAt: Date!
    updatedAt: Date!

    organizationId: String!
    organization: Organization!
  }

  type SubscriptionEdge {
    node: Subscription!
    cursor: String!
  }

  type SubscriptionConnection {
    edges: [SubscriptionEdge!]!
    pageInfo: PageInfo!
  }

  type SubscriptionMetrics {
    totalSubscriptions: Int!
    activeSubscriptions: Int!
    trialSubscriptions: Int!
    cancelledSubscriptions: Int!
    upcomingRenewals: Int!
    averageSubscriptionValue: Float!
    totalMonthlyRevenue: Float!
  }

  type OrganizationMRR {
    id: ID!
    name: String!
    plan: String!
    status: String!
    mrr: Float!
  }

  extend type Query {
    subscriptions(pagination: PaginationInput, status: String): SubscriptionConnection!
    subscriptionMetrics: SubscriptionMetrics!
    topOrganizationsByMRR(limit: Int = 10): [OrganizationMRR!]!
  }
`;

module.exports = subscriptionTypeDefs;
