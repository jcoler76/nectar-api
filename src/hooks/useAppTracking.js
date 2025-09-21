import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import appTracker from '../utils/appTracking';

/**
 * Hook for automatic page view tracking
 * Tracks route changes in React Router applications
 */
export const usePageTracking = () => {
  const location = useLocation();
  const previousLocation = useRef();

  useEffect(() => {
    // Track page view on route change
    if (previousLocation.current !== location.pathname) {
      appTracker.trackPageView(location.pathname, {
        search: location.search,
        hash: location.hash,
        state: location.state ? 'has_state' : 'no_state',
      });
      previousLocation.current = location.pathname;
    }
  }, [location]);

  return {
    currentPage: location.pathname,
    trackPageView: appTracker.trackPageView.bind(appTracker),
  };
};

/**
 * Hook for click tracking with React event handlers
 */
export const useClickTracking = () => {
  const trackClick = useCallback((elementId, metadata = {}, event = null) => {
    try {
      // If event object is provided, extract additional info
      let enhancedMetadata = { ...metadata };

      if (event && event.target) {
        const element = event.target;
        enhancedMetadata = {
          ...enhancedMetadata,
          tagName: element.tagName?.toLowerCase(),
          className: element.className,
          type: element.type,
          href: element.href,
          value: element.type !== 'password' ? element.value : '[hidden]',
        };
      }

      appTracker.trackEvent('click', elementId, enhancedMetadata);
    } catch (error) {
      // Silently handle click tracking errors
    }
  }, []);

  const trackButtonClick = useCallback(
    (buttonName, metadata = {}) => {
      trackClick(buttonName, { ...metadata, elementType: 'button' });
    },
    [trackClick]
  );

  const trackLinkClick = useCallback(
    (linkName, metadata = {}) => {
      trackClick(linkName, { ...metadata, elementType: 'link' });
    },
    [trackClick]
  );

  return {
    trackClick,
    trackButtonClick,
    trackLinkClick,
  };
};

/**
 * Hook for feature usage tracking
 * Tracks when components mount and when features are used
 */
export const useFeatureTracking = (featureName, options = {}) => {
  const { trackOnMount = false, trackOnUnmount = false } = options;
  const mountTime = useRef(Date.now());

  useEffect(() => {
    if (trackOnMount) {
      appTracker.trackFeatureUse(featureName, {
        action: 'feature_mounted',
        timestamp: new Date().toISOString(),
      });
    }

    // Capture the mount time at effect creation to avoid stale closure
    const mountTimeValue = mountTime.current;

    return () => {
      if (trackOnUnmount) {
        const duration = Date.now() - mountTimeValue;
        appTracker.trackFeatureUse(featureName, {
          action: 'feature_unmounted',
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }, [featureName, trackOnMount, trackOnUnmount]);

  const trackFeatureAction = useCallback(
    (action, metadata = {}) => {
      appTracker.trackFeatureUse(featureName, {
        action,
        ...metadata,
        timestamp: new Date().toISOString(),
      });
    },
    [featureName]
  );

  const trackFeatureStart = useCallback(
    (metadata = {}) => {
      trackFeatureAction('feature_started', metadata);
    },
    [trackFeatureAction]
  );

  const trackFeatureComplete = useCallback(
    (metadata = {}) => {
      trackFeatureAction('feature_completed', metadata);
    },
    [trackFeatureAction]
  );

  const trackFeatureError = useCallback(
    (error, metadata = {}) => {
      trackFeatureAction('feature_error', {
        error: error.message || error.toString(),
        ...metadata,
      });
    },
    [trackFeatureAction]
  );

  return {
    trackFeatureAction,
    trackFeatureStart,
    trackFeatureComplete,
    trackFeatureError,
  };
};

/**
 * Hook for form interaction tracking
 */
export const useFormTracking = formName => {
  const startTime = useRef(null);
  const fieldInteractions = useRef(new Set());

  const trackFormStart = useCallback(
    (metadata = {}) => {
      startTime.current = Date.now();
      fieldInteractions.current.clear();

      appTracker.trackEvent('form_start', formName, {
        ...metadata,
        timestamp: new Date().toISOString(),
      });
    },
    [formName]
  );

  const trackFieldInteraction = useCallback(
    (fieldName, metadata = {}) => {
      fieldInteractions.current.add(fieldName);

      appTracker.trackEvent('form_field_interaction', `${formName}_${fieldName}`, {
        formName,
        fieldName,
        ...metadata,
      });
    },
    [formName]
  );

  const trackFormSubmit = useCallback(
    (success = true, metadata = {}) => {
      const duration = startTime.current ? Date.now() - startTime.current : null;

      appTracker.trackEvent('form_submit', formName, {
        success,
        duration_ms: duration,
        fields_interacted: fieldInteractions.current.size,
        ...metadata,
      });
    },
    [formName]
  );

  const trackFormAbandon = useCallback(
    (metadata = {}) => {
      const duration = startTime.current ? Date.now() - startTime.current : null;

      appTracker.trackEvent('form_abandon', formName, {
        duration_ms: duration,
        fields_interacted: fieldInteractions.current.size,
        ...metadata,
      });
    },
    [formName]
  );

  return {
    trackFormStart,
    trackFieldInteraction,
    trackFormSubmit,
    trackFormAbandon,
  };
};

/**
 * Hook for search tracking
 */
export const useSearchTracking = () => {
  const trackSearch = useCallback((query, metadata = {}) => {
    appTracker.trackSearch(query, null, metadata);
  }, []);

  const trackSearchResults = useCallback((query, resultsCount, metadata = {}) => {
    appTracker.trackSearch(query, resultsCount, {
      ...metadata,
      action: 'search_results_displayed',
    });
  }, []);

  const trackSearchClick = useCallback((query, resultIndex, metadata = {}) => {
    appTracker.trackEvent('search_result_click', 'search_result', {
      query,
      resultIndex,
      ...metadata,
    });
  }, []);

  return {
    trackSearch,
    trackSearchResults,
    trackSearchClick,
  };
};

/**
 * Hook for error tracking
 */
export const useErrorTracking = () => {
  const trackError = useCallback((error, context = '', metadata = {}) => {
    appTracker.trackEvent('error', 'application_error', {
      error_message: error.message || error.toString(),
      error_type: error.name || 'Unknown',
      context,
      stack: error.stack?.substring(0, 1000), // Limit stack trace length
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackApiError = useCallback(
    (error, endpoint, metadata = {}) => {
      trackError(error, `api_${endpoint}`, {
        endpoint,
        status: error.response?.status,
        ...metadata,
      });
    },
    [trackError]
  );

  const trackComponentError = useCallback(
    (error, componentName, metadata = {}) => {
      trackError(error, `component_${componentName}`, {
        componentName,
        ...metadata,
      });
    },
    [trackError]
  );

  return {
    trackError,
    trackApiError,
    trackComponentError,
  };
};

/**
 * Hook for performance tracking
 */
export const usePerformanceTracking = () => {
  const trackPerformance = useCallback((metricName, value, metadata = {}) => {
    appTracker.trackEvent('performance', metricName, {
      value,
      unit: 'ms',
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackApiPerformance = useCallback(
    (endpoint, duration, metadata = {}) => {
      trackPerformance(`api_${endpoint}`, duration, {
        endpoint,
        ...metadata,
      });
    },
    [trackPerformance]
  );

  const trackComponentRender = useCallback(
    (componentName, duration, metadata = {}) => {
      trackPerformance(`render_${componentName}`, duration, {
        componentName,
        ...metadata,
      });
    },
    [trackPerformance]
  );

  return {
    trackPerformance,
    trackApiPerformance,
    trackComponentRender,
  };
};

/**
 * Hook for user session tracking
 */
export const useSessionTracking = () => {
  const updateUserInfo = useCallback((userId, organizationId) => {
    appTracker.setUserInfo(userId, organizationId);
  }, []);

  const clearUserInfo = useCallback(() => {
    appTracker.clearUserInfo();
  }, []);

  const trackSessionEvent = useCallback((eventType, metadata = {}) => {
    appTracker.trackEvent('session', eventType, {
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return {
    updateUserInfo,
    clearUserInfo,
    trackSessionEvent,
    sessionId: appTracker.sessionId,
  };
};

/**
 * Comprehensive tracking hook that provides all tracking capabilities
 */
export const useAppTracking = () => {
  const pageTracking = usePageTracking();
  const clickTracking = useClickTracking();
  const errorTracking = useErrorTracking();
  const performanceTracking = usePerformanceTracking();
  const sessionTracking = useSessionTracking();

  // General purpose tracking methods
  const trackEvent = useCallback((eventType, elementId, metadata = {}) => {
    appTracker.trackEvent(eventType, elementId, metadata);
  }, []);

  const trackDownload = useCallback((fileName, fileType, metadata = {}) => {
    appTracker.trackDownload(fileName, fileType, metadata);
  }, []);

  const flush = useCallback(async () => {
    await appTracker.flush();
  }, []);

  return {
    // Core tracking
    trackEvent,
    trackDownload,
    flush,

    // Specialized tracking
    ...pageTracking,
    ...clickTracking,
    ...errorTracking,
    ...performanceTracking,
    ...sessionTracking,

    // Direct access to tracker
    tracker: appTracker,
  };
};

// Export default only to avoid duplicate named exports during build
export { usePageTracking as default };
