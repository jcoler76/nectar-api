const { gql } = require('apollo-server-express');

const serviceTypeDefs = gql`
  type Service implements Node {
    id: ID!
    name: String!
    label: String
    description: String
    host: String
    port: Int
    database: String!
    username: String
    # Note: password is excluded for security
    isActive: Boolean!
    createdBy: User
    failoverHost: String
    connectionId: ID
    connection: Connection
    objects: JSON
    createdAt: Date!
    updatedAt: Date!
    effectiveHost: String
  }

  type ServiceConnection {
    edges: [ServiceEdge!]!
    pageInfo: PageInfo!
  }

  type ServiceEdge {
    node: Service!
    cursor: String!
  }

  type ServiceTestResult {
    success: Boolean!
    message: String
    error: String
  }

  input CreateServiceInput {
    name: String!
    label: String
    description: String
    host: String
    port: Int
    database: String!
    username: String
    password: String
    isActive: Boolean = true
    failoverHost: String
    connectionId: ID
    objects: JSON
  }

  input UpdateServiceInput {
    name: String
    label: String
    description: String
    host: String
    port: Int
    database: String
    username: String
    password: String
    isActive: Boolean
    failoverHost: String
    connectionId: ID
    objects: JSON
  }

  input ServiceFilters {
    isActive: Boolean
    database: String
    host: String
    search: String
    createdBy: ID
  }

  extend type Query {
    service(id: ID!): Service
    services(filters: ServiceFilters, pagination: PaginationInput): ServiceConnection!
  }

  extend type Mutation {
    createService(input: CreateServiceInput!): Service!
    updateService(id: ID!, input: UpdateServiceInput!): Service!
    deleteService(id: ID!, force: Boolean = false): Boolean!
    testService(id: ID!): ServiceTestResult!
  }
`;

module.exports = serviceTypeDefs;
