import api from './api';
import { createCRUDService } from './baseService';

// Create the base CRUD service
const applicationService = createCRUDService('applications', 'application');

// Export standard CRUD operations
export const getAll = applicationService.getAll;
export const create = applicationService.create;
export const update = applicationService.update;
export const deleteItem = applicationService.delete;
export const getById = applicationService.getById;

// Legacy exports for backward compatibility
export const getApplications = applicationService.getAll;
export const getApplication = applicationService.getById;
export const createApplication = applicationService.create;
export const updateApplication = applicationService.update;
export const deleteApplication = applicationService.delete;

// Custom application operations
export const regenerateApiKey = async id => {
  try {
    const response = await api.post(`/api/applications/${id}/regenerate-key`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to regenerate API key');
  }
};

export const revealApiKey = async id => {
  try {
    const response = await api.get(`/api/applications/${id}/reveal-key`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to reveal API key');
  }
};

// Action method for custom operations (used by useCRUD)
export const action = async (applicationId, actionName, data = {}) => {
  switch (actionName) {
    case 'regenerate-api-key':
      return regenerateApiKey(applicationId);
    case 'reveal-api-key':
      return revealApiKey(applicationId);
    case 'activate':
      return update(applicationId, { isActive: true });
    case 'deactivate':
      return update(applicationId, { isActive: false });
    default:
      throw new Error(`Unknown application action: ${actionName}`);
  }
};

// Export the service object for use with useCRUD
const applicationServiceObject = {
  getAll,
  create,
  update,
  delete: applicationService.delete,
  getById,
  action,
  regenerateApiKey,
  revealApiKey,
};

export default applicationServiceObject;
