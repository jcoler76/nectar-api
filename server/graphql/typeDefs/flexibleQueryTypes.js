const { gql } = require('apollo-server-express');

const flexibleQueryTypeDefs = gql`
  # Flexible query result that can return any structure
  scalar JSON

  # Generic database query input
  input DatabaseQueryInput {
    # For CLIENT API keys: serviceName is optional (uses their permitted service)
    # For DEVELOPER API keys: serviceName is required (can access multiple services)
    serviceName: String

    # The query to execute (can be stored procedure, view, or raw SQL)
    query: String!

    # Parameters for the query
    parameters: JSON

    # For developer endpoints: specify which endpoint this query belongs to
    endpointName: String

    # Optional environment for testing (production, staging, development)
    # Defaults based on API key type: Client=production, Developer/MCP=staging
    environment: String
  }

  # Safety information for SQL queries
  type ActionableStatement {
    sql: String!
    type: String!
    description: String!
  }

  type SafetyInfo {
    canExecute: Boolean!
    executableStatements: [String!]
    actionableStatements: [ActionableStatement!]
    warnings: [String!]
  }

  # Generic database query result
  type DatabaseQueryResult {
    success: Boolean!
    data: JSON
    error: String
    executionTime: Int
    recordCount: Int
    safetyInfo: SafetyInfo
  }

  # Flexible data access queries
  extend type Query {
    # Execute a flexible database query
    # Supports both client and developer use cases
    executeQuery(input: DatabaseQueryInput!): DatabaseQueryResult!

    # Get available services for the current API key
    # Clients see only their permitted services
    # Developers see all active services
    availableServices: [Service!]!

    # Get database schema information for a service
    # Useful for developers to explore available tables/views/procedures
    getServiceSchema(serviceName: String!): JSON
  }

  # For developer endpoints: ability to create/manage flexible queries
  extend type Mutation {
    # Save a query template for reuse (developer endpoints only)
    saveQueryTemplate(
      name: String!
      serviceName: String!
      query: String!
      description: String
      parameters: JSON
    ): Boolean!

    # Execute a saved query template
    executeQueryTemplate(templateName: String!, parameters: JSON): DatabaseQueryResult!
  }
`;

module.exports = flexibleQueryTypeDefs;
