import api from './api';
import { createCRUDService } from './baseService';

// Create the base CRUD service
const roleService = createCRUDService('roles', 'role');

// Export standard CRUD operations with backward-compatible names
export const getRoles = roleService.getAll;
export const getRole = roleService.getById;
export const getRoleById = roleService.getById; // Backward compatibility alias
export const createRole = roleService.create;
export const updateRole = roleService.update;
export const deleteRole = roleService.delete;

export const getServiceSchema = async serviceId => {
  try {
    const response = await api.get(`/api/roles/service/${serviceId}/schema`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching service schema for ${serviceId}:`, error);
    throw error;
  }
};
