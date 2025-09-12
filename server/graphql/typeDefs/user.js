const { gql } = require('apollo-server-express');

const userTypeDefs = gql`
  type User implements Node {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    fullName: String!
    isAdmin: Boolean!
    isActive: Boolean!
    roles: [Role!]!
    memberships: [UserMembership!]!
    lastLogin: Date
    createdAt: Date!
    updatedAt: Date!
  }

  type UserMembership {
    organization: Organization!
    role: String!
    joinedAt: Date!
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  input CreateUserInput {
    email: String!
    firstName: String!
    lastName: String!
    roles: [ID!]
    isAdmin: Boolean = false
    isActive: Boolean = true
  }

  input UpdateUserInput {
    email: String
    firstName: String
    lastName: String
    roles: [ID!]
    isActive: Boolean
  }

  input UserFilters {
    isActive: Boolean
    isAdmin: Boolean
    roles: [ID!]
    search: String
  }

  extend type Query {
    user(id: ID!): User
    users(filters: UserFilters, pagination: PaginationInput): UserConnection!
    me: User
  }

  extend type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    inviteUser(email: String!, firstName: String!, lastName: String!): User!
  }
`;

module.exports = userTypeDefs;
