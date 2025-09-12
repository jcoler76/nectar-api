const { gql } = require('apollo-server-express');

const roleTypeDefs = gql`
  # Permission Actions
  type PermissionActions {
    GET: Boolean!
    POST: Boolean!
    PUT: Boolean!
    DELETE: Boolean!
    PATCH: Boolean!
  }

  # Permission Definition
  type Permission {
    serviceId: ID!
    service: Service
    objectName: String!
    actions: PermissionActions!
    schema: JSON
  }

  # Role Type
  type Role implements Node {
    id: ID!
    name: String!
    description: String
    isActive: Boolean!
    serviceId: ID!
    service: Service!
    permissions: [Permission!]!
    createdBy: ID!
    creator: User!
    createdAt: Date!
    updatedAt: Date!
    # Usage statistics
    applications: [Application!]!
    usageCount: Int!
    lastUsed: Date
  }

  # Role Connection Types
  type RoleConnection {
    edges: [RoleEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type RoleEdge {
    node: Role!
    cursor: String!
  }

  # Input Types
  input PermissionActionsInput {
    GET: Boolean = false
    POST: Boolean = false
    PUT: Boolean = false
    DELETE: Boolean = false
    PATCH: Boolean = false
  }

  input PermissionInput {
    serviceId: ID!
    objectName: String!
    actions: PermissionActionsInput!
  }

  input CreateRoleInput {
    name: String!
    description: String
    serviceId: ID!
    permissions: [PermissionInput!]!
    isActive: Boolean = true
  }

  input UpdateRoleInput {
    name: String
    description: String
    isActive: Boolean
    permissions: [PermissionInput!]
  }

  input RoleFilters {
    name: String
    isActive: Boolean
    serviceId: ID
    createdBy: ID
    hasPermissions: Boolean
  }

  # Role Testing Result
  type RoleTestResult {
    success: Boolean!
    message: String!
    permissions: [PermissionTestResult!]!
  }

  type PermissionTestResult {
    objectName: String!
    actions: PermissionActions!
    accessible: Boolean!
    errors: [String!]!
  }

  # Extend Root Types
  extend type Query {
    # Role Queries
    role(id: ID!): Role
    roles(
      first: Int = 10
      after: String
      filters: RoleFilters
      orderBy: SortOrder = DESC
    ): RoleConnection!

    # Service-specific roles
    serviceRoles(serviceId: ID!): [Role!]!

    # User roles
    userRoles(userId: ID): [Role!]!

    # My roles (current user)
    myRoles: [Role!]!
  }

  extend type Mutation {
    # Role CRUD
    createRole(input: CreateRoleInput!): Role!
    updateRole(id: ID!, input: UpdateRoleInput!): Role!
    deleteRole(id: ID!): Boolean!

    # Role Management
    activateRole(id: ID!): Role!
    deactivateRole(id: ID!): Role!

    # Permission Management
    addPermission(roleId: ID!, permission: PermissionInput!): Role!
    removePermission(roleId: ID!, serviceId: ID!, objectName: String!): Role!
    updatePermission(roleId: ID!, permission: PermissionInput!): Role!

    # Role Testing
    testRole(id: ID!): RoleTestResult!
    refreshRoleSchemas(id: ID!): Role!
  }
`;

module.exports = roleTypeDefs;
