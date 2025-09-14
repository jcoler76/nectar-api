import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing cleanup operations to prevent memory leaks
 * Automatically handles cleanup of event listeners, intervals, timeouts, and subscriptions
 *
 * @returns {Object} Cleanup utilities
 */
export const useCleanup = () => {
  const cleanupFunctions = useRef([]);
  const intervals = useRef(new Set());
  const timeouts = useRef(new Set());
  const eventListeners = useRef(new Map());
  const abortControllers = useRef(new Set());

  // Add a cleanup function to be called on unmount
  const addCleanup = useCallback(cleanupFn => {
    if (typeof cleanupFn === 'function') {
      cleanupFunctions.current.push(cleanupFn);
    }
  }, []);

  // Safe interval creation with automatic cleanup
  const setManagedInterval = useCallback((callback, delay) => {
    const intervalId = setInterval(callback, delay);
    intervals.current.add(intervalId);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      intervals.current.delete(intervalId);
    };
  }, []);

  // Safe timeout creation with automatic cleanup
  const setManagedTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      callback();
      timeouts.current.delete(timeoutId);
    }, delay);
    timeouts.current.add(timeoutId);

    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
      timeouts.current.delete(timeoutId);
    };
  }, []);

  // Safe event listener management with automatic cleanup
  const addManagedEventListener = useCallback((target, event, handler, options = {}) => {
    if (!target || !target.addEventListener) {
      console.warn('useCleanup: Invalid event target provided');
      return () => {};
    }

    target.addEventListener(event, handler, options);

    // Store for cleanup
    const key = `${event}_${Date.now()}_${Math.random()}`;
    eventListeners.current.set(key, { target, event, handler, options });

    // Return cleanup function
    return () => {
      target.removeEventListener(event, handler, options);
      eventListeners.current.delete(key);
    };
  }, []);

  // Safe AbortController management
  const createManagedAbortController = useCallback(() => {
    const controller = new AbortController();
    abortControllers.current.add(controller);

    // Return controller and cleanup function
    return {
      controller,
      cleanup: () => {
        if (!controller.signal.aborted) {
          controller.abort();
        }
        abortControllers.current.delete(controller);
      },
    };
  }, []);

  // Manual cleanup trigger
  const cleanup = useCallback(() => {
    // Clear all intervals
    intervals.current.forEach(intervalId => {
      clearInterval(intervalId);
    });
    intervals.current.clear();

    // Clear all timeouts
    timeouts.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    timeouts.current.clear();

    // Remove all event listeners
    eventListeners.current.forEach(({ target, event, handler, options }) => {
      try {
        target.removeEventListener(event, handler, options);
      } catch (error) {
        console.warn('useCleanup: Error removing event listener:', error);
      }
    });
    eventListeners.current.clear();

    // Abort all controllers
    abortControllers.current.forEach(controller => {
      try {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      } catch (error) {
        console.warn('useCleanup: Error aborting controller:', error);
      }
    });
    abortControllers.current.clear();

    // Run custom cleanup functions
    cleanupFunctions.current.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        console.warn('useCleanup: Error in cleanup function:', error);
      }
    });
    cleanupFunctions.current = [];
  }, []);

  // Automatic cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Development mode: log active resources for debugging
  const getActiveResources = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      return {
        intervals: intervals.current.size,
        timeouts: timeouts.current.size,
        eventListeners: eventListeners.current.size,
        abortControllers: abortControllers.current.size,
        customCleanups: cleanupFunctions.current.length,
      };
    }
    return null;
  }, []);

  return {
    // Cleanup management
    addCleanup,
    cleanup,

    // Managed resource creation
    setManagedInterval,
    setManagedTimeout,
    addManagedEventListener,
    createManagedAbortController,

    // Development utilities
    getActiveResources,
  };
};

/**
 * Simplified hook for basic cleanup needs
 * @param {Function} cleanupFunction - Function to call on unmount
 */
export const useSimpleCleanup = cleanupFunction => {
  const { addCleanup } = useCleanup();

  useEffect(() => {
    if (typeof cleanupFunction === 'function') {
      addCleanup(cleanupFunction);
    }
  }, [addCleanup, cleanupFunction]);
};

/**
 * Hook for managing intervals with automatic cleanup
 * @param {Function} callback - Function to call on interval
 * @param {number} delay - Interval delay in milliseconds
 * @param {boolean} immediate - Whether to run immediately
 */
export const useManagedInterval = (callback, delay, immediate = false) => {
  const { setManagedInterval } = useCleanup();
  const savedCallback = useRef(callback);
  const cleanupRef = useRef(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null && delay !== undefined) {
      // Run immediately if requested
      if (immediate) {
        savedCallback.current();
      }

      // Set up interval
      cleanupRef.current = setManagedInterval(() => {
        savedCallback.current();
      }, delay);

      return () => {
        if (cleanupRef.current) {
          cleanupRef.current();
        }
      };
    }
  }, [delay, immediate, setManagedInterval]);

  // Return manual cleanup function
  return cleanupRef.current;
};

export default useCleanup;
