import userService from '../services/userService';
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  GenerateApiKeyResponse,
} from '../types/api';

import { useCRUD } from './useCRUD';

/**
 * Hook for managing users with full type safety
 * Built on top of the generic useCRUD hook
 */
export const useUsers = () => {
  // Use the typed CRUD hook with User-specific types
  const crudResult = useCRUD<User, CreateUserRequest, UpdateUserRequest>({
    service: userService,
    itemName: 'user',
    initialFetch: true,
    enableNotifications: true,
    customActions: {
      generateApiKey: async (userId: string): Promise<GenerateApiKeyResponse> => {
        return userService.generateApiKey(userId);
      },
      inviteUser: async (_: string, userData: CreateUserRequest): Promise<User> => {
        return userService.inviteUser(userData);
      },
      activate: async (userId: string): Promise<User> => {
        return userService.action(userId, 'activate');
      },
      deactivate: async (userId: string): Promise<User> => {
        return userService.action(userId, 'deactivate');
      },
    },
    permissions: {
      create: true,
      read: true,
      update: true,
      delete: true,
    },
  });

  // Type-safe custom methods specific to users
  const generateApiKey = async (userId: string): Promise<GenerateApiKeyResponse> => {
    return (crudResult.generateApiKey as any)(userId);
  };

  const inviteUser = async (userData: CreateUserRequest): Promise<User> => {
    return (crudResult.inviteUser as any)('', userData);
  };

  const activateUser = async (userId: string): Promise<User> => {
    return (crudResult.activate as any)(userId);
  };

  const deactivateUser = async (userId: string): Promise<User> => {
    return (crudResult.deactivate as any)(userId);
  };

  // Filter methods with type safety
  const getActiveUsers = (): User[] => {
    return crudResult.items.filter(user => user.isActive);
  };

  const getAdminUsers = (): User[] => {
    return crudResult.items.filter(user => user.isAdmin);
  };

  const getUsersByRole = (role: string): User[] => {
    return crudResult.items.filter(user => user.roles.includes(role));
  };

  // Search with type safety
  const searchUsers = (query: string): User[] => {
    const lowercaseQuery = query.toLowerCase();
    return crudResult.items.filter(
      user =>
        user.firstName.toLowerCase().includes(lowercaseQuery) ||
        user.lastName.toLowerCase().includes(lowercaseQuery) ||
        user.email.toLowerCase().includes(lowercaseQuery)
    );
  };

  return {
    // All CRUD operations with proper typing
    ...crudResult,

    // User-specific methods with type safety
    generateApiKey,
    inviteUser,
    activateUser,
    deactivateUser,

    // Filter methods
    getActiveUsers,
    getAdminUsers,
    getUsersByRole,
    searchUsers,

    // Computed properties with proper typing
    users: crudResult.items,
    totalUsers: crudResult.count,
    activeUsersCount: crudResult.items.filter(user => user.isActive).length,
    adminUsersCount: crudResult.items.filter(user => user.isAdmin).length,

    // Legacy aliases for backward compatibility
    getUsers: crudResult.fetch,
    createUser: crudResult.create,
    updateUser: crudResult.update,
    deleteUser: crudResult.delete,
  };
};

export default useUsers;
