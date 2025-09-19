import {
  CREATE_ROLE,
  UPDATE_ROLE,
  DELETE_ROLE,
  GET_ROLES,
  GET_ROLE,
  GET_SERVICE_ROLES,
  GET_SERVICE_SCHEMA,
} from '../graphql/roleQueries';

import { executeGraphQL } from './graphqlClient';

// Create role using GraphQL
export const createRole = async roleData => {
  try {
    const data = await executeGraphQL(CREATE_ROLE, {
      input: {
        name: roleData.name,
        description: roleData.description,
        serviceId: roleData.serviceId,
        permissions: roleData.permissions || [],
        isActive: roleData.isActive !== false,
      },
    });
    return data.createRole;
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
};

// Update role using GraphQL
export const updateRole = async (id, roleData) => {
  try {
    const data = await executeGraphQL(UPDATE_ROLE, {
      id,
      input: {
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
        isActive: roleData.isActive,
      },
    });
    return data.updateRole;
  } catch (error) {
    console.error(`Error updating role ${id}:`, error);
    throw error;
  }
};

// Delete role using GraphQL
export const deleteRole = async id => {
  try {
    const data = await executeGraphQL(DELETE_ROLE, { id });
    return data.deleteRole;
  } catch (error) {
    console.error(`Error deleting role ${id}:`, error);
    throw error;
  }
};

// Get all roles using GraphQL
export const getRoles = async (filters = {}, pagination = {}) => {
  try {
    const data = await executeGraphQL(GET_ROLES, {
      first: pagination.limit || 50,
      after: pagination.cursor,
      filters,
      orderBy: pagination.orderBy || 'DESC',
    });
    return data.roles.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
};

// Get single role using GraphQL
export const getRole = async id => {
  try {
    const data = await executeGraphQL(GET_ROLE, { id });
    return data.role;
  } catch (error) {
    console.error(`Error fetching role ${id}:`, error);
    throw error;
  }
};

// Backward compatibility alias
export const getRoleById = getRole;

// Get roles for a specific service using GraphQL
export const getServiceRoles = async serviceId => {
  try {
    const data = await executeGraphQL(GET_SERVICE_ROLES, { serviceId });
    return data.serviceRoles;
  } catch (error) {
    console.error(`Error fetching service roles for ${serviceId}:`, error);
    throw error;
  }
};

// Get service schema using REST (keeping existing functionality)
export const getServiceSchema = async serviceId => {
  try {
    // Import api to use REST endpoint that was working
    const api = require('./api').default;
    const response = await api.get(`/api/roles/service/${serviceId}/schema`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching service schema for ${serviceId}:`, error);
    throw error;
  }
};
