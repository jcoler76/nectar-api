import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useNotification } from '../context/NotificationContext';
import { deleteRole, getRoles, updateRole } from '../services/roleService';
import { formatDate } from '../utils/dateUtils';

import { useOperationTracking } from './useOperationTracking';

export const useRoles = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();
  const { operationInProgress, createProtectedHandler } = useOperationTracking();

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRoles();
      setRoles(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch roles');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = createProtectedHandler('delete', async roleId => {
    try {
      await deleteRole(roleId);
      setRoles(prev => prev.filter(role => role.id !== roleId));
      showNotification('Role deleted successfully', 'success');
      return { success: true };
    } catch (err) {
      setError('Failed to delete role');
      return { success: false, error: err };
    }
  });

  const handleToggleActive = createProtectedHandler(
    'toggle',
    async role => {
      try {
        // Only send the isActive field to avoid permission data conflicts
        const updateData = {
          isActive: !role.isActive,
        };
        await updateRole(role.id, updateData);
        await fetchRoles();
        return { success: true };
      } catch (err) {
        setError('Failed to update role status');
        return { success: false, error: err };
      }
    },
    role => role.id
  );

  const handleToggleMCP = createProtectedHandler(
    'toggle-mcp',
    async role => {
      try {
        const newMcpEnabled = !role.mcpEnabled;
        const updateData = {
          mcpEnabled: newMcpEnabled,
        };

        // If enabling MCP, show notification about tool generation
        if (newMcpEnabled) {
          showNotification('Enabling MCP server and generating tools...', 'info');
        }

        await updateRole(role.id, updateData);
        await fetchRoles();

        if (newMcpEnabled) {
          showNotification('MCP server enabled successfully! Tools generated.', 'success');
        } else {
          showNotification('MCP server disabled', 'info');
        }

        return { success: true };
      } catch (err) {
        setError('Failed to toggle MCP server');
        showNotification('Failed to toggle MCP server', 'error');
        return { success: false, error: err };
      }
    },
    role => role.id
  );

  const handleEdit = useCallback(
    role => {
      navigate(`/roles/edit/${role.id}`);
    },
    [navigate]
  );

  const handleAdd = useCallback(() => {
    navigate('/roles/create');
  }, [navigate]);

  const prepareExportData = useCallback(() => {
    return roles.map(role => ({
      Name: role.name,
      Description: role.description,
      Status: role.isActive ? 'Active' : 'Inactive',
      CreatedAt: formatDate.full(role.createdAt),
    }));
  }, [roles]);

  return {
    // State
    roles,
    loading,
    error,
    operationInProgress,

    // Actions
    fetchRoles,
    handleDelete,
    handleToggleActive,
    handleToggleMCP,
    handleEdit,
    handleAdd,

    // Utilities
    prepareExportData,
    clearError: () => setError(''),
  };
};
