import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  GenerateApiKeyResponse,
  ExtendedCRUDService,
} from '../types/api';

import api from './api';
import { createExtendedService } from './baseService';

// Define the user-specific extensions with proper types
interface UserServiceExtensions {
  generateApiKey(userId: string): Promise<GenerateApiKeyResponse>;
  inviteUser(userData: CreateUserRequest): Promise<User>;
  action(
    userId: string,
    actionName: 'generate-api-key' | 'invite' | 'activate' | 'deactivate',
    data?: any
  ): Promise<any>;
}

// Create the extended service with proper typing
const userServiceBase = createExtendedService<
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserServiceExtensions
>('users', 'user', {
  // Custom user operations with proper typing
  generateApiKey: async (userId: string): Promise<GenerateApiKeyResponse> => {
    try {
      const response = await api.post(`/api/users/${userId}/generate-api-key`);
      return response.data as GenerateApiKeyResponse;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate API key');
    }
  },

  inviteUser: async (userData: CreateUserRequest): Promise<User> => {
    try {
      const response = await api.post('/api/users', userData);
      return response.data as User;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to invite user');
    }
  },

  // Typed action method for custom operations
  action: async (
    userId: string,
    actionName: 'generate-api-key' | 'invite' | 'activate' | 'deactivate',
    data: any = {}
  ): Promise<any> => {
    switch (actionName) {
      case 'generate-api-key':
        return userServiceBase.generateApiKey(userId);
      case 'invite':
        return userServiceBase.inviteUser(data as CreateUserRequest);
      case 'activate':
        return userServiceBase.update(userId, { isActive: true } as UpdateUserRequest);
      case 'deactivate':
        return userServiceBase.update(userId, { isActive: false } as UpdateUserRequest);
      default:
        throw new Error(`Unknown user action: ${actionName}`);
    }
  },
});

// Export with proper typing
type UserService = ExtendedCRUDService<User, CreateUserRequest, UpdateUserRequest> &
  UserServiceExtensions;

// Export standard CRUD operations with proper types
export const getAll = userServiceBase.getAll;
export const create = userServiceBase.create;
export const update = userServiceBase.update;
export const deleteItem = userServiceBase.delete;
export const getById = userServiceBase.getById;

// Legacy exports for backward compatibility (properly typed)
export const getUsers = userServiceBase.getAll;
export const createUser = userServiceBase.create;
export const updateUser = userServiceBase.update;
export const deleteUser = userServiceBase.delete;

// Custom operations with proper types
export const generateApiKey = userServiceBase.generateApiKey;
export const inviteUser = userServiceBase.inviteUser;
export const action = userServiceBase.action;

// Default export of the full service
const userService: UserService = userServiceBase as UserService;
export default userService;
