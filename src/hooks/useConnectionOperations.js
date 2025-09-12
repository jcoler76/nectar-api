import { useCallback, useState } from 'react';

import { useNotification } from '../context/NotificationContext';
import {
  createConnection,
  deleteConnection,
  getConnections,
  refreshConnectionDatabases,
  testConnection,
  testConnectionDetails,
  updateConnection,
} from '../services/connectionService';
import { getServices, updateService } from '../services/serviceService';

import { useOperationTracking } from './useOperationTracking';

export const useConnectionOperations = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { operationInProgress, startOperation, stopOperation } = useOperationTracking();
  const { showNotification } = useNotification();

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedConnections = await getConnections();
      setConnections(fetchedConnections);
      setError('');
    } catch (err) {
      setError('Failed to fetch connections. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = useCallback(
    async (connectionData, selectedConnection) => {
      try {
        if (selectedConnection) {
          const connectionId = selectedConnection.id || selectedConnection._id;
          await updateConnection(connectionId, connectionData);
        } else {
          await createConnection(connectionData);
        }
        await fetchConnections(); // Refetch all connections
        return { success: true };
      } catch (err) {
        setError(`Failed to save connection: ${err.message || err}`);
        console.error(err);
        return { success: false, error: err };
      }
    },
    [fetchConnections]
  );

  const handleDelete = useCallback(
    async connectionId => {
      // Prevent concurrent delete operations for the same connection
      if (operationInProgress[`delete-${connectionId}`]) {
        return { success: false, error: 'Delete operation already in progress' };
      }

      try {
        startOperation('delete', connectionId);
        await deleteConnection(connectionId);
        setConnections(prev => prev.filter(c => c._id !== connectionId));
        showNotification('Connection deleted successfully.', 'success');
        return { success: true };
      } catch (err) {
        // Check if it's a 404 error (connection not found)
        if (err.response?.status === 404) {
          // Connection doesn't exist on server, remove it from local state
          setConnections(prev => prev.filter(c => c._id !== connectionId));
          showNotification('Connection was already removed.', 'info');
          // Refresh the connections list to ensure sync with server
          fetchConnections();
        } else {
          const errorMessage = err.response?.data?.message || 'Failed to delete connection.';
          showNotification(errorMessage, 'error');
          console.error(err);
        }
        return { success: false, error: err };
      } finally {
        stopOperation('delete', connectionId);
      }
    },
    [operationInProgress, startOperation, stopOperation, showNotification, fetchConnections]
  );

  const handleTest = useCallback(
    async connectionId => {
      // Prevent concurrent test operations for the same connection
      if (operationInProgress[`test-${connectionId}`]) {
        return { success: false, error: 'Test operation already in progress' };
      }

      try {
        startOperation('test', connectionId);
        const result = await testConnection(connectionId);
        if (result.success) {
          showNotification(result.message, 'success');
        } else {
          showNotification(result.message, 'error');
        }
        return result;
      } catch (err) {
        showNotification(err.message || 'Failed to test connection.', 'error');
        console.error(err);
        return { success: false, error: err };
      } finally {
        stopOperation('test', connectionId);
      }
    },
    [operationInProgress, startOperation, stopOperation, showNotification]
  );

  const handleRefreshDatabases = useCallback(
    async connectionId => {
      // Prevent concurrent refresh operations for the same connection
      if (operationInProgress[`refresh-${connectionId}`]) {
        return { success: false, error: 'Refresh operation already in progress' };
      }

      try {
        startOperation('refresh', connectionId);
        const result = await refreshConnectionDatabases(connectionId);
        showNotification(result.message, 'success');
        return result;
      } catch (err) {
        showNotification(err.message || 'Failed to refresh databases.', 'error');
        console.error(err);
        return { success: false, error: err };
      } finally {
        stopOperation('refresh', connectionId);
      }
    },
    [operationInProgress, startOperation, stopOperation, showNotification]
  );

  const handleTestDetails = useCallback(
    async (connectionData, selectedConnection) => {
      // Filter out empty password if we are editing and not changing it
      const dataToTest = { ...connectionData };
      if (selectedConnection && !dataToTest.password) {
        delete dataToTest.password;
        // Include connection ID so backend can use existing password
        dataToTest.connectionId = selectedConnection.id || selectedConnection._id;
      }

      try {
        const result = await testConnectionDetails(dataToTest);
        if (result.success) {
          showNotification(result.message, 'success');
        } else {
          showNotification(result.error || 'Connection test failed', 'error');
        }
        return result;
      } catch (err) {
        showNotification(err.message || 'Failed to test connection.', 'error');
        console.error(err);
        return { success: false, error: err };
      }
    },
    [showNotification]
  );

  const handleToggleActive = useCallback(
    async (connection, skipConfirmation = false) => {
      // Prevent concurrent toggle operations for the same connection
      if (operationInProgress[`toggle-${connection.id}`]) {
        return { success: false, error: 'Toggle operation already in progress' };
      }

      // If we're deactivating a connection, check for dependent services
      if (connection.isActive && !skipConfirmation) {
        try {
          const services = await getServices();
          const connectionId = connection._id || connection.id;
          const dependentServices = services.filter(
            service => service.connectionId === connectionId && service.isActive
          );

          console.log('🔗 Connection dependency check:', {
            connection: connection.name,
            connectionId,
            totalServices: services.length,
            dependentServices: dependentServices.length,
            serviceNames: dependentServices.map(s => s.name),
          });

          if (dependentServices.length > 0) {
            // Return information about dependent services for confirmation dialog
            return {
              success: false,
              requiresConfirmation: true,
              dependentServices,
              message: `This connection is used by ${dependentServices.length} active service${dependentServices.length === 1 ? '' : 's'}. Deactivating this connection will also deactivate these services:\n\n• ${dependentServices.map(s => s.name).join('\n• ')}\n\nDo you want to continue?`,
            };
          }
        } catch (err) {
          console.error('Error checking dependent services:', err);
          // Continue with toggle but show warning
          showNotification('Warning: Could not check dependent services', 'warning');
        }
      }

      try {
        startOperation('toggle', connection.id);

        // Only send the isActive field to avoid data conflicts
        const updateData = {
          isActive: !connection.isActive,
        };

        await updateConnection(connection._id || connection.id, updateData);

        // If we're deactivating a connection, also deactivate dependent services
        if (connection.isActive) {
          try {
            const services = await getServices();
            const dependentServices = services.filter(
              service =>
                service.connectionId === (connection._id || connection.id) && service.isActive
            );

            // Deactivate all dependent services
            for (const service of dependentServices) {
              try {
                await updateService(service._id || service.id, { isActive: false });
              } catch (serviceErr) {
                console.error(`Failed to deactivate service ${service.name}:`, serviceErr);
              }
            }

            if (dependentServices.length > 0) {
              showNotification(
                `Connection deactivated. ${dependentServices.length} dependent service${dependentServices.length === 1 ? '' : 's'} also deactivated.`,
                'info'
              );
            } else {
              showNotification('Connection deactivated successfully', 'success');
            }
          } catch (err) {
            console.error('Error deactivating dependent services:', err);
            showNotification(
              'Connection deactivated, but some dependent services may still be active',
              'warning'
            );
          }
        } else {
          showNotification('Connection activated successfully', 'success');
        }

        // Update local state immediately
        setConnections(prevConnections =>
          prevConnections.map(c =>
            c._id === connection._id || c.id === connection.id ? { ...c, isActive: !c.isActive } : c
          )
        );

        return { success: true };
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Failed to update connection status';
        showNotification(errorMessage, 'error');
        console.error(err);
        return { success: false, error: err };
      } finally {
        stopOperation('toggle', connection.id);
      }
    },
    [operationInProgress, startOperation, stopOperation, showNotification]
  );

  return {
    // State
    connections,
    loading,
    error,
    operationInProgress,

    // Actions
    fetchConnections,
    handleSave,
    handleDelete,
    handleTest,
    handleToggleActive,
    handleRefreshDatabases,
    handleTestDetails,

    // Utilities
    clearError: () => setError(''),
  };
};
