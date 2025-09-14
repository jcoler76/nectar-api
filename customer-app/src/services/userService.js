import api from './api';
import { createCRUDService } from './baseService';

// Create the base CRUD service
const userService = createCRUDService('users', 'user');

// Export standard CRUD operations
export const getAll = userService.getAll;
export const create = userService.create;
export const update = userService.update;
export const deleteItem = userService.delete;
export const getById = userService.getById;

// Legacy exports for backward compatibility
export const getUsers = userService.getAll;
export const createUser = userService.create;
export const updateUser = userService.update;
export const deleteUser = userService.delete;

// Custom user operations
export const generateApiKey = async userId => {
  try {
    const response = await api.post(`/api/users/${userId}/generate-api-key`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to generate API key');
  }
};

export const inviteUser = async userData => {
  const response = await api.post('/api/users', userData);
  return response.data;
};

// Action method for custom operations (used by useCRUD)
export const action = async (userId, actionName, data = {}) => {
  switch (actionName) {
    case 'generate-api-key':
      return generateApiKey(userId);
    case 'invite':
      return inviteUser(data);
    case 'activate':
      return update(userId, { isActive: true });
    case 'deactivate':
      return update(userId, { isActive: false });
    default:
      throw new Error(`Unknown user action: ${actionName}`);
  }
};

// Export the service object for use with useCRUD
const userServiceObject = {
  getAll,
  create,
  update,
  delete: userService.delete,
  getById,
  action,
  generateApiKey,
  inviteUser,
};

export default userServiceObject;
