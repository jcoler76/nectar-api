const { gql } = require('apollo-server-express');

const applicationTypeDefs = gql`
  type Application implements Node {
    id: ID!
    name: String!
    description: String
    apiKey: String!
    apiKeyEncrypted: String
    apiKeyPrefix: String
    apiKeyHint: String
    defaultRole: Role!
    organization: Organization
    isActive: Boolean!
    createdBy: User!
    creator: User!
    createdAt: Date!
    updatedAt: Date!
  }

  type ApplicationConnection {
    edges: [ApplicationEdge!]!
    pageInfo: PageInfo!
  }

  type ApplicationEdge {
    node: Application!
    cursor: String!
  }

  input CreateApplicationInput {
    name: String!
    description: String
    defaultRoleId: ID!
    isActive: Boolean = true
  }

  input UpdateApplicationInput {
    name: String
    description: String
    defaultRoleId: ID
    isActive: Boolean
  }

  input ApplicationFilters {
    isActive: Boolean
    name: String
    search: String
    createdBy: ID
  }

  extend type Query {
    application(id: ID!): Application
    applications(filters: ApplicationFilters, pagination: PaginationInput): ApplicationConnection!
  }

  extend type Mutation {
    createApplication(input: CreateApplicationInput!): Application!
    updateApplication(id: ID!, input: UpdateApplicationInput!): Application!
    deleteApplication(id: ID!): Boolean!
    regenerateApiKey(id: ID!): Application!
  }
`;

module.exports = applicationTypeDefs;
