import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useNotification } from '../context/NotificationContext';
import {
  deleteService,
  getServices,
  refreshServiceSchema,
  updateService,
} from '../services/serviceService';

export const useServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [operationInProgress, setOperationInProgress] = useState({});
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const servicesData = await getServices();
      setServices(servicesData);
      setError('');
    } catch (err) {
      setError('Failed to fetch services');
      console.error('Fetch services error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(
    async (serviceId, force = false) => {
      // Prevent concurrent delete operations for the same service
      if (operationInProgress[`delete-${serviceId}`]) {
        return { success: false, error: 'Delete operation already in progress' };
      }

      try {
        setOperationInProgress(prev => ({ ...prev, [`delete-${serviceId}`]: true }));
        const result = await deleteService(serviceId, force);

        if (result.success) {
          setServices(prevServices => prevServices.filter(service => service.id !== serviceId));
          showNotification(
            force
              ? 'Service and all dependent records deleted successfully'
              : 'Service deleted successfully',
            'success'
          );
          return { success: true };
        } else if (result.hasDependencies) {
          // Return dependency information for the UI to handle
          return {
            success: false,
            hasDependencies: true,
            dependencies: result.dependencies,
            message: result.message,
          };
        } else {
          setError('Failed to delete service');
          return { success: false, error: result.error || 'Delete operation failed' };
        }
      } catch (err) {
        setError('Failed to delete service');
        return { success: false, error: err };
      } finally {
        setOperationInProgress(prev => {
          const newState = { ...prev };
          delete newState[`delete-${serviceId}`];
          return newState;
        });
      }
    },
    [showNotification, operationInProgress]
  );

  const handleToggleActive = useCallback(
    async service => {
      try {
        await updateService(service.id, { isActive: !service.isActive });
        setServices(prevServices =>
          prevServices.map(s => (s.id === service.id ? { ...s, isActive: !service.isActive } : s))
        );
        showNotification('Service status updated successfully', 'success');
        return { success: true };
      } catch (err) {
        setError('Failed to update service status');
        return { success: false, error: err };
      }
    },
    [showNotification]
  );

  const handleRefreshSchema = useCallback(
    async (serviceId, onConnectionsNeeded) => {
      // Prevent concurrent refresh operations for the same service
      if (operationInProgress[`refresh-${serviceId}`]) {
        return { success: false, error: 'Refresh operation already in progress' };
      }

      try {
        setOperationInProgress(prev => ({ ...prev, [`refresh-${serviceId}`]: true }));

        // Request connections if needed
        if (onConnectionsNeeded) {
          await onConnectionsNeeded();
        }

        const service = services.find(s => s.id === serviceId);
        if (!service) return { success: false };

        setServices(prevServices =>
          prevServices.map(s => (s.id === serviceId ? { ...s, isRefreshing: true } : s))
        );

        const result = await refreshServiceSchema(serviceId);

        setSuccess(
          `Schema refreshed for ${service.name}: ${result.objectCount.total} objects found (${result.objectCount.tables} tables, ${result.objectCount.views} views, ${result.objectCount.procedures} procedures)`
        );

        setTimeout(() => {
          setSuccess('');
        }, 5000);

        return { success: true, result };
      } catch (err) {
        console.error('Schema refresh failed:', err);
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError(
            'Failed to refresh service schema: ' + (err.response?.data?.message || err.message)
          );
        }
        return { success: false, error: err };
      } finally {
        setOperationInProgress(prev => {
          const newState = { ...prev };
          delete newState[`refresh-${serviceId}`];
          return newState;
        });

        setServices(prevServices =>
          prevServices.map(s => (s.id === serviceId ? { ...s, isRefreshing: false } : s))
        );
      }
    },
    [services, navigate, operationInProgress]
  );

  return {
    // State
    services,
    setServices,
    loading,
    error,
    success,
    operationInProgress,

    // Actions
    fetchServices,
    handleDelete,
    handleToggleActive,
    handleRefreshSchema,

    // Utilities
    clearError: () => setError(''),
    clearSuccess: () => setSuccess(''),
  };
};
