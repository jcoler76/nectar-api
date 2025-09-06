const { gql } = require('apollo-server-express');

const commonTypeDefs = gql`
  scalar Date
  scalar JSON
  scalar ObjectId

  interface Node {
    id: ID!
  }

  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }

  type Subscription {
    _empty: String
  }

  input PaginationInput {
    limit: Int = 20
    offset: Int = 0
    sortBy: String
    sortOrder: SortOrder = ASC
  }

  enum SortOrder {
    ASC
    DESC
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
    totalCount: Int!
  }
`;

module.exports = commonTypeDefs;
