const { gql } = require('apollo-server-express');

const connectionTypeDefs = gql`
  enum DatabaseType {
    POSTGRESQL
    MYSQL
    MARIADB
    MSSQL
    MONGODB
    REDIS
    SUPABASE
    SNOWFLAKE
    BIGQUERY
    DYNAMODB
  }

  type DatabaseTypeInfo {
    type: DatabaseType!
    displayName: String!
    description: String!
    defaultPort: Int!
    icon: String!
  }

  type Connection implements Node {
    id: ID!
    name: String!
    type: DatabaseType!
    host: String!
    port: Int!
    username: String!
    database: String
    sslEnabled: Boolean!
    # Note: password is excluded for security
    isActive: Boolean!
    createdBy: User
    failoverHost: String
    databases: [String!]!
    services: [Service!]!
    createdAt: Date!
    updatedAt: Date!
    effectiveHost: String
    lastTestedAt: Date
    lastTestResult: Boolean
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
    type: DatabaseType!
    host: String!
    port: Int!
    username: String!
    password: String!
    database: String
    sslEnabled: Boolean = false
    isActive: Boolean = true
    failoverHost: String
    databases: [String!]
  }

  input UpdateConnectionInput {
    name: String
    type: DatabaseType
    host: String
    port: Int
    username: String
    password: String
    database: String
    sslEnabled: Boolean
    isActive: Boolean
    failoverHost: String
    databases: [String!]
  }

  input TestConnectionInput {
    type: DatabaseType!
    host: String!
    port: Int!
    username: String!
    password: String!
    database: String
    sslEnabled: Boolean = false
  }

  input ConnectionFilters {
    isActive: Boolean
    type: DatabaseType
    host: String
    search: String
    createdBy: ID
  }

  extend type Query {
    connection(id: ID!): Connection
    connections(filters: ConnectionFilters, pagination: PaginationInput): ConnectionConnection!
    supportedDatabaseTypes: [DatabaseTypeInfo!]!
  }

  extend type Mutation {
    createConnection(input: CreateConnectionInput!): Connection!
    updateConnection(id: ID!, input: UpdateConnectionInput!): Connection!
    deleteConnection(id: ID!): Boolean!
    testConnection(id: ID!): ConnectionTestResult!
    testConnectionTemp(input: TestConnectionInput!): ConnectionTestResult!
    refreshConnectionDatabases(id: ID!): Connection!
    getTableColumns(connectionId: ID!, database: String!, table: String!): TableColumnsResult!
  }

  type TableColumnsResult {
    success: Boolean!
    columns: [TableColumn!]
    error: String
  }

  type TableColumn {
    name: String!
    dataType: String!
    isNullable: String!
    maxLength: Int
    precision: Int
    scale: Int
    defaultValue: String
  }
`;

module.exports = connectionTypeDefs;
