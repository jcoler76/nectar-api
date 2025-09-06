const { gql } = require('apollo-server-express');

const connectionTypeDefs = gql`
  type Connection implements Node {
    id: ID!
    name: String!
    host: String!
    port: Int!
    username: String!
    # Note: password is excluded for security
    isActive: Boolean!
    createdBy: User
    failoverHost: String
    databases: [String!]!
    createdAt: Date!
    updatedAt: Date!
    effectiveHost: String
  }

  type ConnectionConnection {
    edges: [ConnectionEdge!]!
    pageInfo: PageInfo!
  }

  type ConnectionEdge {
    node: Connection!
    cursor: String!
  }

  type ConnectionTestResult {
    success: Boolean!
    message: String
    error: String
  }

  input CreateConnectionInput {
    name: String!
    host: String!
    port: Int!
    username: String!
    password: String!
    isActive: Boolean = true
    failoverHost: String
    databases: [String!]
  }

  input UpdateConnectionInput {
    name: String
    host: String
    port: Int
    username: String
    password: String
    isActive: Boolean
    failoverHost: String
    databases: [String!]
  }

  input ConnectionFilters {
    isActive: Boolean
    host: String
    search: String
    createdBy: ID
  }

  extend type Query {
    connection(id: ID!): Connection
    connections(filters: ConnectionFilters, pagination: PaginationInput): ConnectionConnection!
  }

  extend type Mutation {
    createConnection(input: CreateConnectionInput!): Connection!
    updateConnection(id: ID!, input: UpdateConnectionInput!): Connection!
    deleteConnection(id: ID!): Boolean!
    testConnection(id: ID!): ConnectionTestResult!
  }
`;

module.exports = connectionTypeDefs;
