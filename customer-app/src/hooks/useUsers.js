import * as userService from '../services/userService';
import { formatDate } from '../utils/dateUtils';

import { useCRUD } from './useCRUD';

export const useUsers = () => {
  const crud = useCRUD({
    service: userService,
    itemName: 'user',
    customActions: {
      generateApiKey: userService.generateApiKey,
      inviteUser: userService.inviteUser,
    },
    transformers: {
      export: users =>
        users.map(user => ({
          FirstName: user.firstName || (user.name ? user.name.split(' ')[0] : ''),
          LastName: user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : ''),
          Email: user.email,
          Role: user.isAdmin ? 'Administrator' : 'User',
          CreatedAt: formatDate.full(user.createdAt || user.created),
          LastLogin: formatDate.full(user.lastLogin),
          Status: user.isActive ? 'Active' : 'Inactive',
        })),
    },
  });

  // Custom toggle that uses isActive field instead of active
  const handleToggleActive = async user => {
    return crud.update(user._id, { isActive: !user.isActive });
  };

  return {
    // State (renamed for backward compatibility)
    users: crud.items,
    loading: crud.loading,
    error: crud.error,
    operationInProgress: crud.operationInProgress,

    // Actions (renamed for backward compatibility)
    fetchUsers: crud.fetch,
    handleDelete: crud.delete,
    handleToggleActive,
    createUser: crud.create,
    updateUser: crud.update,

    // Custom actions
    generateApiKey: crud.generateApiKey,
    inviteUser: crud.inviteUser,

    // Utilities
    prepareExportData: crud.prepareExportData,
    clearError: crud.clearError,
    refresh: crud.refresh,
    getById: crud.getById,

    // Additional helpers
    isEmpty: crud.isEmpty,
    count: crud.count,
  };
};
