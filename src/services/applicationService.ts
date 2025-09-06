import type {
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  GenerateApiKeyResponse,
  ExtendedCRUDService,
} from '../types/api';

import api from './api';
import { createExtendedService } from './baseService';

// Define the application-specific extensions with proper types
interface ApplicationServiceExtensions {
  regenerateApiKey(id: string): Promise<GenerateApiKeyResponse>;
  action(
    applicationId: string,
    actionName: 'regenerate-key' | 'activate' | 'deactivate',
    data?: any
  ): Promise<any>;
}

// Create the extended service with proper typing
const applicationServiceBase = createExtendedService<
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationServiceExtensions
>('applications', 'application', {
  // Custom application operations with proper typing
  regenerateApiKey: async (id: string): Promise<GenerateApiKeyResponse> => {
    try {
      const response = await api.post(`/api/applications/${id}/regenerate-key`);
      return response.data as GenerateApiKeyResponse;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to regenerate API key');
    }
  },

  // Typed action method for custom operations
  action: async (
    applicationId: string,
    actionName: 'regenerate-key' | 'activate' | 'deactivate',
    data: any = {}
  ): Promise<any> => {
    switch (actionName) {
      case 'regenerate-key':
        return applicationServiceBase.regenerateApiKey(applicationId);
      case 'activate':
        return applicationServiceBase.update(applicationId, {
          isActive: true,
        } as UpdateApplicationRequest);
      case 'deactivate':
        return applicationServiceBase.update(applicationId, {
          isActive: false,
        } as UpdateApplicationRequest);
      default:
        throw new Error(`Unknown application action: ${actionName}`);
    }
  },
});

// Export with proper typing
type ApplicationService = ExtendedCRUDService<
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest
> &
  ApplicationServiceExtensions;

// Export standard CRUD operations with proper types
export const getAll = applicationServiceBase.getAll;
export const create = applicationServiceBase.create;
export const update = applicationServiceBase.update;
export const deleteItem = applicationServiceBase.delete;
export const getById = applicationServiceBase.getById;

// Legacy exports for backward compatibility (properly typed)
export const getApplications = applicationServiceBase.getAll;
export const getApplication = applicationServiceBase.getById;
export const createApplication = applicationServiceBase.create;
export const updateApplication = applicationServiceBase.update;
export const deleteApplication = applicationServiceBase.delete;

// Custom operations with proper types
export const regenerateApiKey = applicationServiceBase.regenerateApiKey;
export const action = applicationServiceBase.action;

// Default export of the full service
const applicationService: ApplicationService = applicationServiceBase as ApplicationService;
export default applicationService;
