import { useCallback } from 'react';

import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import applicationService, { regenerateApiKey, revealApiKey } from '../services/applicationService';
import { formatDate } from '../utils/dateUtils';

import { useCRUD } from './useCRUD';

export const useApplications = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const crud = useCRUD({
    service: applicationService,
    itemName: 'application',
    customActions: {
      regenerateApiKey: regenerateApiKey,
      revealApiKey: revealApiKey,
    },
    transformers: {
      export: applications =>
        applications.map(app => ({
          Name: app.name,
          Description: app.description,
          DefaultRole: app.defaultRole?.name || '',
          Status: app.isActive ? 'Active' : 'Inactive',
          CreatedAt: formatDate.full(app.createdAt),
        })),
    },
  });

  // Custom toggle that uses isActive field
  const handleToggleActive = async application => {
    return crud.update(application.id, { isActive: !application.isActive });
  };

  const handleCopyApiKey = useCallback(
    async applicationId => {
      try {
        // Call secure server endpoint to get API key
        const response = await crud.revealApiKey(applicationId);
        if (response.success && response.apiKey) {
          await navigator.clipboard.writeText(response.apiKey);
          showNotification('API key copied to clipboard', 'success');
        } else {
          showNotification(response.message || 'Failed to retrieve API key', 'error');
        }
      } catch (error) {
        showNotification('Failed to copy API key: ' + (error.message || 'Unknown error'), 'error');
      }
    },
    [crud, showNotification]
  );

  const handleRegenerateApiKey = async applicationId => {
    try {
      await crud.regenerateApiKey(applicationId);
      await crud.refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  // Removed handleRevealApiKey - now using secure handleCopyApiKey for all cases

  return {
    // State (renamed for backward compatibility)
    applications: crud.items,
    loading: crud.loading,
    error: crud.error,
    user,
    operationInProgress: crud.operationInProgress,

    // Actions (backward compatibility)
    fetchApplications: crud.fetch,
    handleDelete: crud.delete,
    handleToggleActive,
    handleCopyApiKey,
    handleRegenerateApiKey,

    // Standard CRUD operations
    createApplication: crud.create,
    updateApplication: crud.update,

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
