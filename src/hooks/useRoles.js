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
      setRoles(prev => prev.filter(role => role._id !== roleId));
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
        const updatedRole = {
          ...role,
          isActive: !role.isActive,
        };
        await updateRole(role._id, updatedRole);
        await fetchRoles();
        return { success: true };
      } catch (err) {
        setError('Failed to update role status');
        return { success: false, error: err };
      }
    },
    role => role._id
  );

  const handleEdit = useCallback(
    role => {
      navigate(`/roles/edit/${role._id}`);
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
    handleEdit,
    handleAdd,

    // Utilities
    prepareExportData,
    clearError: () => setError(''),
  };
};
