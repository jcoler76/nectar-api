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
          CreatedAt: formatDate.full(app.createdAt || app.created),
        })),
    },
  });

  // Custom toggle that uses isActive field
  const handleToggleActive = async application => {
    return crud.update(application._id, { isActive: !application.isActive });
  };

  const handleCopyApiKey = useCallback(
    apiKey => {
      if (apiKey.includes('•')) {
        showNotification(
          'Cannot copy masked API key. Please regenerate to get full key.',
          'warning'
        );
        return;
      }
      navigator.clipboard.writeText(apiKey);
      showNotification('API key copied to clipboard', 'success');
    },
    [showNotification]
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

  const handleRevealApiKey = useCallback(
    async applicationId => {
      try {
        const response = await revealApiKey(applicationId);
        if (response.success) {
          navigator.clipboard.writeText(response.apiKey);
          const lastRevealedText = response.lastRevealed
            ? ` (Last accessed: ${formatDate.full(response.lastRevealed.at)} by ${response.lastRevealed.by})`
            : '';
          showNotification(
            `API key for "${response.applicationName}" copied to clipboard${lastRevealedText}`,
            'success'
          );
          return { success: true };
        } else {
          // Check if regeneration is required
          if (response.requiresRegeneration) {
            showNotification(
              response.message + ' Click the regenerate button to create a new key.',
              'warning'
            );
          } else {
            showNotification(response.message, 'warning');
          }
          return { success: false };
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message;
        const requiresRegeneration = err.response?.data?.requiresRegeneration;

        if (requiresRegeneration) {
          showNotification(
            errorMessage + ' Click the regenerate button to create a new key.',
            'warning'
          );
        } else {
          showNotification('Failed to copy API key: ' + errorMessage, 'error');
        }
        return { success: false, error: err };
      }
    },
    [showNotification]
  );

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
    handleRevealApiKey,

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
