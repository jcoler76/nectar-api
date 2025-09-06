import { useCallback, useState } from 'react';

import { getConnections } from '../services/connectionService';

export const useConnections = () => {
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (connections.length > 0) return connections; // Already loaded

    try {
      setConnectionsLoading(true);
      const connectionsData = await getConnections();
      setConnections(connectionsData);
      return connectionsData;
    } catch (err) {
      console.error('Failed to fetch connections:', err);
      return [];
    } finally {
      setConnectionsLoading(false);
    }
  }, [connections]);

  const getConnectionName = useCallback(
    service => {
      if (connections.length === 0) {
        return connectionsLoading ? 'Loading...' : 'Unknown';
      }
      const connection = connections.find(c => c._id === service.connectionId);
      return connection ? connection.name : 'Unknown';
    },
    [connections, connectionsLoading]
  );

  return {
    connections,
    connectionsLoading,
    fetchConnections,
    getConnectionName,
  };
};
