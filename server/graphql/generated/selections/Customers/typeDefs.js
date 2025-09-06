/*
Template20 GraphQL Schema
Generated from MongoDB Template20 Intelligence
Version: v1.0-ai-optimized
Generated: 2025-07-14T23:06:52.020Z

This schema provides AI-friendly access to Template20 business data
with intelligent procedure recommendations and relationship context.
*/

const typeDefs = `
directive @auth(requires: Role = USER) on OBJECT | FIELD_DEFINITION
directive @deprecated(reason: String = "No longer supported") on FIELD_DEFINITION | ENUM_VALUE
directive @businessEntity(entity: String!) on OBJECT
directive @confidence(score: Float!) on FIELD_DEFINITION

enum Role {
  USER
  ADMIN
  DEVELOPER
}

"""Custom scalar types for business data"""
scalar DateTime
scalar Decimal
scalar JSON

"""Confidence score for AI recommendations (0.0 to 1.0)"""
scalar Confidence



"""Pagination arguments"""
input PaginationInput {
  first: Int
  after: String
  last: Int
  before: String
}

"""Ordering input"""
input OrderBy {
  field: String!
  direction: SortDirection!
}

enum SortDirection {
  ASC
  DESC
}

"""Page info for connections"""
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

"""Root Query type with AI-optimized resolvers"""
type Query {
  # Schema introspection
  _schema: SchemaInfo!

  # Stored procedure queries
  executeStoredProcedure(procedureName: String!, parameters: JSON): JSON!
  recommendedProcedures(entityType: String!, minConfidence: Float = 0.7): [ProcedureRecommendation!]!

  # Relationship queries
  entityRelationships(entityType: String!): [EntityRelationship!]!
  tableRelationships(tableName: String!): [TableRelationship!]!
}

"""Mutations for data modification"""
type Mutation {
  # Schema updates
  refreshIntelligence: RefreshResult!
  
  # Procedure execution
  executeProcedure(input: ProcedureExecutionInput!): ProcedureResult!
}

input ProcedureExecutionInput {
  procedureName: String!
  parameters: JSON
  timeout: Int = 30000
}

type ProcedureResult {
  success: Boolean!
  data: JSON
  error: String
  executionTime: Int!
  recordCount: Int
}

type RefreshResult {
  success: Boolean!
  entitiesUpdated: Int!
  proceduresAnalyzed: Int!
  relationshipsDiscovered: Int!
}

"""Subscriptions for real-time updates"""
type Subscription {
  # Schema changes
  intelligenceUpdated: IntelligenceUpdate!
  
  # Procedure recommendations
  procedureRecommendationUpdated(entityType: String!): ProcedureRecommendation!
}

type IntelligenceUpdate {
  type: UpdateType!
  entityType: String
  timestamp: DateTime!
  details: JSON
}

enum UpdateType {
  ENTITY_ADDED
  ENTITY_UPDATED
  PROCEDURES_REFRESHED
  RELATIONSHIPS_UPDATED
}
`;

module.exports = typeDefs;
