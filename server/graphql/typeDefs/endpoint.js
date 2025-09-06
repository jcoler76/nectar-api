const { gql } = require('apollo-server-express');

const endpointTypeDefs = gql`
  # Endpoint Type
  type Endpoint implements Node {
    id: ID!
    name: String!
    apiKey: String!
    createdBy: ID!
    creator: User!
    createdAt: Date!
    updatedAt: Date!
    # Usage statistics
    usageCount: Int!
    lastUsed: Date
    isActive: Boolean!
  }

  # Endpoint Connection Types
  type EndpointConnection {
    edges: [EndpointEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type EndpointEdge {
    node: Endpoint!
    cursor: String!
  }

  # Input Types
  input CreateEndpointInput {
    name: String!
  }

  input UpdateEndpointInput {
    name: String
  }

  input EndpointFilters {
    name: String
    createdBy: ID
    isActive: Boolean
    createdAfter: Date
    createdBefore: Date
  }

  # API Key Regeneration Result
  type RegenerateApiKeyResult {
    success: Boolean!
    newApiKey: String
    message: String!
  }

  # Endpoint Usage Statistics
  type EndpointUsageStats {
    totalRequests: Int!
    requestsToday: Int!
    requestsThisWeek: Int!
    requestsThisMonth: Int!
    averageRequestsPerDay: Float!
    lastRequest: Date
    mostActiveDay: Date
  }

  # Extend Root Types
  extend type Query {
    # Endpoint Queries
    endpoint(id: ID!): Endpoint
    endpoints(
      first: Int = 10
      after: String
      filters: EndpointFilters
      orderBy: SortOrder = DESC
    ): EndpointConnection!

    # My endpoints (current user)
    myEndpoints(first: Int = 10, after: String): EndpointConnection!

    # Endpoint usage statistics
    endpointUsage(id: ID!): EndpointUsageStats!

    # Verify API key
    verifyApiKey(apiKey: String!): Endpoint
  }

  extend type Mutation {
    # Endpoint CRUD
    createEndpoint(input: CreateEndpointInput!): Endpoint!
    updateEndpoint(id: ID!, input: UpdateEndpointInput!): Endpoint!
    deleteEndpoint(id: ID!): Boolean!

    # API Key Management
    regenerateEndpointApiKey(id: ID!): RegenerateApiKeyResult!

    # Endpoint Management
    activateEndpoint(id: ID!): Endpoint!
    deactivateEndpoint(id: ID!): Endpoint!
  }
`;

module.exports = endpointTypeDefs;
