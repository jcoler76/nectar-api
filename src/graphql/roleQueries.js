// GraphQL queries and mutations for roles

export const CREATE_ROLE = `
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
      name
      description
      isActive
      permissions {
        serviceId
        objectName
        actions {
          GET
          POST
          PUT
          PATCH
          DELETE
        }
      }
      serviceId
      createdAt
      updatedAt
      creator {
        id
        email
        firstName
        lastName
      }
      service {
        id
        name
        database
      }
    }
  }
`;

export const UPDATE_ROLE = `
  mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) {
      id
      name
      description
      isActive
      permissions {
        serviceId
        objectName
        actions {
          GET
          POST
          PUT
          PATCH
          DELETE
        }
      }
      serviceId
      createdAt
      updatedAt
      creator {
        id
        email
        firstName
        lastName
      }
      service {
        id
        name
        database
      }
    }
  }
`;

export const DELETE_ROLE = `
  mutation DeleteRole($id: ID!) {
    deleteRole(id: $id)
  }
`;

export const GET_ROLES = `
  query GetRoles($first: Int, $after: String, $filters: RoleFilters, $orderBy: SortOrder) {
    roles(first: $first, after: $after, filters: $filters, orderBy: $orderBy) {
      edges {
        node {
          id
          name
          description
          isActive
          permissions {
            serviceId
            objectName
            actions {
              GET
              POST
              PUT
              PATCH
              DELETE
            }
          }
          serviceId
          createdAt
          updatedAt
          creator {
            id
            email
            firstName
            lastName
          }
          service {
            id
            name
            database
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
      }
    }
  }
`;

export const GET_ROLE = `
  query GetRole($id: ID!) {
    role(id: $id) {
      id
      name
      description
      isActive
      permissions {
        serviceId
        objectName
        actions {
          GET
          POST
          PUT
          PATCH
          DELETE
        }
      }
      serviceId
      createdAt
      updatedAt
      creator {
        id
        email
        firstName
        lastName
      }
      service {
        id
        name
        database
      }
    }
  }
`;

export const GET_SERVICE_ROLES = `
  query GetServiceRoles($serviceId: ID!) {
    serviceRoles(serviceId: $serviceId) {
      id
      name
      description
      isActive
      permissions {
        serviceId
        objectName
        actions {
          GET
          POST
          PUT
          PATCH
          DELETE
        }
      }
      creator {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

export const GET_SERVICE_SCHEMA = `
  query GetServiceSchema($id: ID!) {
    service(id: $id) {
      id
      name
      objects
    }
  }
`;
