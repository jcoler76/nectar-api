const { gql } = require('apollo-server-express');

const dynamicProcedureTypeDefs = gql`
  scalar JSON

  # ProcedureResult is handled by JSON scalar for maximum flexibility

  type BatchProcedureResult {
    serviceName: String!
    procedureName: String!
    success: Boolean!
    error: String
    data: [JSON]
  }

  type ProcedureInfo {
    name: String!
  }

  type ServiceProcedures {
    serviceName: String!
    procedures: [ProcedureInfo!]!
  }

  input ProcedureRequest {
    serviceName: String!
    procedureName: String!
    params: JSON
    # Optional field projection (server-side). Example: ["ID", "Name"]
    select: [String!]
    # Optional environment override (e.g., "staging", "production")
    environment: String
  }

  type Query {
    # Execute a single stored procedure dynamically
    # Returns array of objects with dynamic fields based on procedure output
    procedure(
      serviceName: String!
      procedureName: String!
      params: JSON
      # Optional field projection (server-side). Example: ["ID", "Name"]
      select: [String!]
      # Optional environment override (e.g., "staging", "production")
      environment: String
    ): [JSON]

    # Execute multiple procedures in a batch
    procedures(requests: [ProcedureRequest!]!): [BatchProcedureResult!]!

    # Get available procedures for a service
    serviceProcedures(serviceName: String!): ServiceProcedures!
  }

  # Dynamic type generation for specific procedures
  # This is where we can add typed responses for known procedures
  type IssueResult {
    ID: Int
    Name: String
    IssueDate: String
    Edition: String
    ProductType: String
  }

  extend type Query {
    # Typed version for known procedures (optional)
    issues(serviceName: String! = "modernluxury", issuesetID: Int!): [IssueResult]
  }
`;

module.exports = dynamicProcedureTypeDefs;
