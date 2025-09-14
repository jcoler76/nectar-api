/**
 * Real-time Data Hook
 * Provides real-time data synchronization for Auto-REST APIs
 * DEFAULT: Uses polling-based updates (no database triggers required)
 * OPTIONAL: Can request database triggers for advanced use cases
 */

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Hook for real-time data synchronization
 * @param {string} endpoint - Auto-REST API endpoint
 * @param {Object} options - Configuration options
 * @param {Object} options.filters - Query filters (page, fields, sort, filter)
 * @param {number} options.pollingInterval - Polling interval in ms (default: 5000)
 * @param {boolean} options.enableDatabaseTriggers - Use database triggers (default: false)
 * @param {boolean} options.enabled - Enable real-time updates (default: true)
 * @returns {Object} - { data, isConnected, isLoading, error, refetch }
 */
export const useRealtimeData = (endpoint, options = {}) => {
  const {
    filters = {},
    pollingInterval = 5000,
    enableDatabaseTriggers = false, // DEFAULT: false (respects client database boundaries)
    enabled = true,
    onUpdate = null,
    onError = null,
  } = options;

  // State
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Refs for cleanup
  const socketRef = useRef(null);
  const channelIdRef = useRef(null);

  // Build query parameters
  const queryParams = new URLSearchParams({
    realtime: 'true',
    ...filters,
  }).toString();

  const fullEndpoint = `${endpoint}?${queryParams}`;

  // Initial data fetch and real-time setup
  useEffect(() => {
    if (!enabled || !endpoint) return;

    let isMounted = true;

    const setupRealtimeConnection = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch initial data with real-time info
        const response = await fetch(fullEndpoint, {
          headers: {
            'X-API-Key': localStorage.getItem('apiKey') || '',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();

        if (!isMounted) return;

        // Set initial data
        setData(responseData.data || []);
        setIsLoading(false);

        // Setup real-time connection if supported
        if (responseData.realtime?.enabled) {
          await setupSocketConnection(responseData.realtime);
        }
      } catch (err) {
        if (!isMounted) return;

        setError(err.message);
        setIsLoading(false);
        if (onError) onError(err);
      }
    };

    const setupSocketConnection = async realtimeInfo => {
      try {
        // Create Socket.IO connection
        const socket = io(realtimeInfo.socketUrl, {
          auth: {
            organizationId: localStorage.getItem('organizationId'),
            user: JSON.parse(localStorage.getItem('user') || '{}'),
          },
          transports: ['websocket', 'polling'],
        });

        socketRef.current = socket;
        channelIdRef.current = realtimeInfo.channelId;

        // Connection handlers
        socket.on('connect', () => {
          if (!isMounted) return;
          setIsConnected(true);

          // Subscribe to table updates
          socket.emit('subscribe_table', {
            serviceName: extractServiceName(endpoint),
            entityName: extractEntityName(endpoint),
            channelId: realtimeInfo.channelId,
            filters,
            pollingInterval,
            enableDatabaseTriggers,
          });
        });

        socket.on('disconnect', () => {
          if (!isMounted) return;
          setIsConnected(false);
        });

        socket.on('connect_error', err => {
          if (!isMounted) return;
          setError(`Connection error: ${err.message}`);
          if (onError) onError(err);
        });

        // Real-time data updates
        socket.on('table_update', update => {
          if (!isMounted) return;

          if (update.channelId === realtimeInfo.channelId) {
            // Update data based on update type
            if (update.updateType === 'polling_refresh') {
              // Full data refresh from polling
              setData(update.data);
            } else if (update.updateType === 'database_trigger') {
              // Incremental update from database trigger
              setData(currentData => {
                return updateDataFromTrigger(currentData, update);
              });
            }

            if (onUpdate) onUpdate(update);
          }
        });

        socket.on('subscription_confirmed', () => {
          // Real-time subscription confirmed - no need to log in production
        });

        socket.on('subscription_error', err => {
          if (!isMounted) return;
          setError(`Subscription error: ${err.error}`);
          if (onError) onError(new Error(err.error));
        });

        socket.on('polling_error', err => {
          if (!isMounted) return;
          // Polling errors are often temporary - don't log or set error state
          // They will automatically retry on the next polling cycle
        });
      } catch (err) {
        if (!isMounted) return;
        setError(`Socket setup error: ${err.message}`);
        if (onError) onError(err);
      }
    };

    setupRealtimeConnection();

    // Cleanup function
    return () => {
      isMounted = false;

      if (socketRef.current) {
        if (channelIdRef.current) {
          socketRef.current.emit('unsubscribe_table', {
            channelId: channelIdRef.current,
          });
        }
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      setIsConnected(false);
    };
  }, [
    fullEndpoint,
    enabled,
    pollingInterval,
    enableDatabaseTriggers,
    endpoint,
    filters,
    onError,
    onUpdate,
  ]);

  // Manual refetch function
  const refetch = async () => {
    if (!endpoint) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(fullEndpoint, {
        headers: {
          'X-API-Key': localStorage.getItem('apiKey') || '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      setData(responseData.data || []);
      setIsLoading(false);

      return responseData;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  return {
    data,
    isConnected,
    isLoading,
    error,
    refetch,
    // Additional metadata
    realtimeEnabled: enabled && isConnected,
    connectionMethod: enableDatabaseTriggers ? 'database_triggers' : 'polling',
  };
};

/**
 * Update data array based on database trigger event
 */
function updateDataFromTrigger(currentData, update) {
  const { operation, data: updatedRecord } = update;

  switch (operation) {
    case 'INSERT':
      // Add new record if not already present
      if (!currentData.find(item => item.id === updatedRecord.id)) {
        return [...currentData, updatedRecord];
      }
      return currentData;

    case 'UPDATE':
      // Update existing record
      return currentData.map(item =>
        item.id === updatedRecord.id ? { ...item, ...updatedRecord } : item
      );

    case 'DELETE':
      // Remove deleted record
      return currentData.filter(item => item.id !== updatedRecord.id);

    default:
      console.warn('Unknown trigger operation:', operation);
      return currentData;
  }
}

/**
 * Extract service name from endpoint
 */
function extractServiceName(endpoint) {
  const match = endpoint.match(/\/api\/v2\/([^/]+)\/_table/);
  return match ? match[1] : 'unknown';
}

/**
 * Extract entity name from endpoint
 */
function extractEntityName(endpoint) {
  const match = endpoint.match(/\/_table\/([^/?]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Simplified hook for basic real-time list data
 * Uses polling by default (safe for all clients)
 */
export const useRealtimeList = (endpoint, filters = {}) => {
  return useRealtimeData(endpoint, {
    filters,
    enableDatabaseTriggers: false, // DEFAULT: Safe polling approach
  });
};

/**
 * Advanced hook with database triggers (opt-in)
 * Only use if client explicitly allows database modifications
 */
export const useAdvancedRealtimeList = (endpoint, filters = {}) => {
  return useRealtimeData(endpoint, {
    filters,
    enableDatabaseTriggers: true, // ADVANCED: Requires client permission
    pollingInterval: 1000, // Faster polling as backup
  });
};

export default useRealtimeData;
