/**
 * GraphQL Query Templates for Internal Routes
 * Pre-built queries and mutations for common operations
 */

// Application queries and mutations
const APPLICATION_QUERIES = {
  GET_ALL: `
    query GetApplications($filters: ApplicationFilters, $pagination: PaginationInput) {
      applications(filters: $filters, pagination: $pagination) {
        edges {
          node {
            id
            name
            description
            apiKey
            isActive
            createdAt
            updatedAt
            creator {
              id
              email
              firstName
              lastName
            }
            defaultRole {
              id
              name
              service {
                id
                name
                database
              }
            }
            organization {
              id
              name
            }
          }
        }
        pageInfo {
          totalCount
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `,

  GET_BY_ID: `
    query GetApplication($id: ID!) {
      application(id: $id) {
        id
        name
        description
        apiKey
        isActive
        createdAt
        updatedAt
        creator {
          id
          email
          firstName
          lastName
        }
        defaultRole {
          id
          name
          service {
            id
            name
            database
          }
        }
        organization {
          id
          name
        }
      }
    }
  `,

  CREATE: `
    mutation CreateApplication($input: CreateApplicationInput!) {
      createApplication(input: $input) {
        id
        name
        description
        apiKey
        isActive
        createdAt
        creator {
          id
          email
          firstName
          lastName
        }
        defaultRole {
          id
          name
        }
      }
    }
  `,

  UPDATE: `
    mutation UpdateApplication($id: ID!, $input: UpdateApplicationInput!) {
      updateApplication(id: $id, input: $input) {
        id
        name
        description
        apiKey
        isActive
        updatedAt
        creator {
          id
          email
          firstName
          lastName
        }
        defaultRole {
          id
          name
        }
      }
    }
  `,

  DELETE: `
    mutation DeleteApplication($id: ID!) {
      deleteApplication(id: $id)
    }
  `,

  REGENERATE_API_KEY: `
    mutation RegenerateApiKey($id: ID!) {
      regenerateApiKey(id: $id) {
        id
        name
        apiKey
        updatedAt
      }
    }
  `,
};

// Service queries and mutations
const SERVICE_QUERIES = {
  GET_ALL: `
    query GetServices($filters: ServiceFilters, $pagination: PaginationInput) {
      services(filters: $filters, pagination: $pagination) {
        edges {
          node {
            id
            name
            label
            description
            host
            port
            database
            username
            connectionId
            objects
            isActive
            createdAt
            updatedAt
            creator {
              id
              email
              firstName
              lastName
            }
            connection {
              id
              name
              host
              port
            }
            effectiveHost
          }
        }
        pageInfo {
          totalCount
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `,

  GET_BY_ID: `
    query GetService($id: ID!) {
      service(id: $id) {
        id
        name
        host
        port
        database
        username
        isActive
        createdAt
        updatedAt
        creator {
          id
          email
          firstName
          lastName
        }
        connection {
          id
          name
          type
          host
          port
          username
          passwordEncrypted
          sslEnabled
        }
        effectiveHost
      }
    }
  `,

  CREATE: `
    mutation CreateService($input: CreateServiceInput!) {
      createService(input: $input) {
        id
        name
        host
        port
        database
        username
        isActive
        createdAt
        creator {
          id
          email
          firstName
          lastName
        }
        connection {
          id
          name
        }
      }
    }
  `,

  UPDATE: `
    mutation UpdateService($id: ID!, $input: UpdateServiceInput!) {
      updateService(id: $id, input: $input) {
        id
        name
        host
        port
        database
        username
        isActive
        updatedAt
      }
    }
  `,

  DELETE: `
    mutation DeleteService($id: ID!) {
      deleteService(id: $id)
    }
  `,

  TEST_CONNECTION: `
    mutation TestService($id: ID!) {
      testService(id: $id) {
        success
        message
        error
      }
    }
  `,
};

// User queries and mutations
const USER_QUERIES = {
  GET_ALL: `
    query GetUsers($filters: UserFilters, $pagination: PaginationInput) {
      users(filters: $filters, pagination: $pagination) {
        edges {
          node {
            id
            email
            firstName
            lastName
            isAdmin
            isActive
            createdAt
            roles {
              id
              name
            }
            fullName
          }
        }
        pageInfo {
          totalCount
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `,

  GET_BY_ID: `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        email
        firstName
        lastName
        isAdmin
        isActive
        createdAt
        roles {
          id
          name
          service {
            id
            name
          }
        }
        fullName
      }
    }
  `,

  GET_ME: `
    query GetMe {
      me {
        id
        email
        firstName
        lastName
        isAdmin
        isActive
        roles {
          id
          name
          service {
            id
            name
          }
        }
        fullName
      }
    }
  `,

  CREATE: `
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        id
        email
        firstName
        lastName
        isAdmin
        isActive
        createdAt
        roles {
          id
          name
        }
      }
    }
  `,

  UPDATE: `
    mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
      updateUser(id: $id, input: $input) {
        id
        email
        firstName
        lastName
        isAdmin
        isActive
        updatedAt
        roles {
          id
          name
        }
      }
    }
  `,

  DELETE: `
    mutation DeleteUser($id: ID!) {
      deleteUser(id: $id)
    }
  `,
};

// Role queries and mutations
const ROLE_QUERIES = {
  GET_ALL: `
    query GetRoles($filters: RoleFilters, $pagination: PaginationInput) {
      roles(filters: $filters, pagination: $pagination) {
        edges {
          node {
            id
            name
            description
            isActive
            permissions
            createdAt
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
          totalCount
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `,

  GET_BY_ID: `
    query GetRole($id: ID!) {
      role(id: $id) {
        id
        name
        description
        isActive
        permissions
        createdAt
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
  `,

  CREATE: `
    mutation CreateRole($input: CreateRoleInput!) {
      createRole(input: $input) {
        id
        name
        description
        isActive
        permissions
        createdAt
        creator {
          id
          email
          firstName
          lastName
        }
        service {
          id
          name
        }
      }
    }
  `,

  UPDATE: `
    mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {
      updateRole(id: $id, input: $input) {
        id
        name
        description
        isActive
        permissions
        updatedAt
      }
    }
  `,

  DELETE: `
    mutation DeleteRole($id: ID!) {
      deleteRole(id: $id)
    }
  `,
};

// Connection queries and mutations
const CONNECTION_QUERIES = {
  GET_ALL: `
    query GetConnections($filters: ConnectionFilters, $pagination: PaginationInput) {
      connections(filters: $filters, pagination: $pagination) {
        edges {
          node {
            id
            name
            host
            port
            username
            isActive
            databases
            createdAt
            updatedAt
            creator {
              id
              email
              firstName
              lastName
            }
            services {
              id
              name
              database
            }
            effectiveHost
          }
        }
        pageInfo {
          totalCount
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `,

  GET_BY_ID: `
    query GetConnection($id: ID!) {
      connection(id: $id) {
        id
        name
        host
        port
        username
        isActive
        databases
        createdAt
        updatedAt
        creator {
          id
          email
          firstName
          lastName
        }
        services {
          id
          name
          database
        }
        effectiveHost
      }
    }
  `,

  CREATE: `
    mutation CreateConnection($input: CreateConnectionInput!) {
      createConnection(input: $input) {
        id
        name
        host
        port
        username
        isActive
        databases
        createdAt
        creator {
          id
          email
          firstName
          lastName
        }
      }
    }
  `,

  UPDATE: `
    mutation UpdateConnection($id: ID!, $input: UpdateConnectionInput!) {
      updateConnection(id: $id, input: $input) {
        id
        name
        host
        port
        username
        isActive
        databases
        updatedAt
      }
    }
  `,

  DELETE: `
    mutation DeleteConnection($id: ID!) {
      deleteConnection(id: $id)
    }
  `,

  TEST_CONNECTION: `
    mutation TestConnection($id: ID!) {
      testConnection(id: $id) {
        success
        message
        error
      }
    }
  `,
};

const NOTIFICATION_QUERIES = {
  GET_ALL: `
    query GetNotifications($filters: NotificationFilters, $pagination: PaginationInput) {
      notifications(filters: $filters, pagination: $pagination) {
        edges {
          node {
            id
            type
            priority
            title
            message
            isRead
            actionUrl
            actionText
            metadata
            createdAt
            user {
              id
              email
              firstName
              lastName
            }
          }
        }
        pageInfo {
          totalCount
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `,

  GET_BY_ID: `
    query GetNotification($id: ID!) {
      notification(id: $id) {
        id
        type
        priority
        title
        message
        isRead
        actionUrl
        actionText
        metadata
        createdAt
        user {
          id
          email
          firstName
          lastName
        }
      }
    }
  `,

  GET_UNREAD_COUNT: `
    query GetUnreadCount {
      unreadNotificationCount
    }
  `,

  CREATE: `
    mutation CreateNotification($input: CreateNotificationInput!) {
      createNotification(input: $input) {
        id
        type
        priority
        title
        message
        isRead
        actionUrl
        actionText
        metadata
        createdAt
      }
    }
  `,

  MARK_READ: `
    mutation MarkNotificationRead($id: ID!) {
      markNotificationRead(id: $id) {
        id
        isRead
        updatedAt
      }
    }
  `,

  MARK_ALL_READ: `
    mutation MarkAllNotificationsRead {
      markAllNotificationsRead {
        success
        count
      }
    }
  `,

  DELETE: `
    mutation DeleteNotification($id: ID!) {
      deleteNotification(id: $id)
    }
  `,

  CLEAR_ALL: `
    mutation ClearAllNotifications {
      clearAllNotifications {
        success
        count
      }
    }
  `,
};

module.exports = {
  APPLICATION_QUERIES,
  SERVICE_QUERIES,
  USER_QUERIES,
  ROLE_QUERIES,
  CONNECTION_QUERIES,
  NOTIFICATION_QUERIES,
};
