const { gql } = require('apollo-server-express');

const organizationTypeDefs = gql`
  type Organization implements Node {
    id: ID!
    name: String!
    slug: String!
    domain: String
    logo: String
    website: String
    billingEmail: String
    createdAt: Date!
    updatedAt: Date!

    subscription: Subscription
    membershipCount: Int!

    # Back-compat shape for UI expecting _count.memberships
    _count: OrganizationCount!

    memberships: [OrganizationMembership!]!
  }

  type OrganizationCount {
    memberships: Int!
  }

  type OrganizationEdge {
    node: Organization!
    cursor: String!
  }

  type OrganizationConnection {
    edges: [OrganizationEdge!]!
    pageInfo: PageInfo!
  }

  type OrganizationMembership {
    user: User!
    role: String!
    joinedAt: Date!
  }

  extend type Query {
    organization(id: ID!): Organization
    organizations(pagination: PaginationInput, search: String): OrganizationConnection!
  }

  input CreateOrganizationInput {
    name: String!
    domain: String
    website: String
  }

  input UpdateOrganizationInput {
    name: String
    domain: String
    website: String
    logo: String
  }

  extend type Mutation {
    createOrganization(input: CreateOrganizationInput!): Organization!
    updateOrganization(id: ID!, input: UpdateOrganizationInput!): Organization!
    deleteOrganization(id: ID!): Boolean!

    addOrganizationMember(organizationId: ID!, userId: ID!, role: String = "MEMBER"): Organization!
    removeOrganizationMember(organizationId: ID!, userId: ID!): Boolean!
    updateOrganizationMemberRole(organizationId: ID!, userId: ID!, role: String!): Boolean!
  }
`;

module.exports = organizationTypeDefs;
