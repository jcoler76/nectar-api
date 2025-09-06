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
          await updateConnection(selectedConnection._id, connectionData);
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
    handleRefreshDatabases,
    handleTestDetails,

    // Utilities
    clearError: () => setError(''),
  };
};
