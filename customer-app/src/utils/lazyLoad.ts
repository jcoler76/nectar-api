import { lazy, Suspense, type ComponentType } from 'react';
import * as React from 'react';

import LoadingSpinner from '../components/common/LoadingSpinner';

// Type for dynamic import function
type ImportFunc = () => Promise<{ default: ComponentType<any> }>;

// Configuration options for lazy loading
export interface LazyLoadOptions {
  fallback?: React.ReactElement;
  delay?: number;
  timeout?: number;
}

// Configuration options for intersection observer lazy loading
export interface LazyLoadVisibleOptions {
  rootMargin?: string;
  threshold?: number;
  fallback?: React.ReactElement;
}

// Extended component with preload method
export interface LazyRouteComponent {
  (props: any): React.ReactElement | null;
  preload: () => void;
  displayName?: string;
}

/**
 * Higher-order component for lazy loading with enhanced loading states
 */
export const lazyLoadComponent = (
  importFunc: ImportFunc,
  options: LazyLoadOptions = {}
): ComponentType<any> => {
  const {
    fallback = React.createElement(LoadingSpinner),
    delay = 200,
    // timeout reserved for future implementation
  } = options;

  const LazyComponent = lazy(() => {
    // Add artificial delay for better UX (prevents flash of loading state)
    const importPromise = importFunc();

    if (delay > 0) {
      return Promise.all([
        importPromise,
        new Promise<void>(resolve => setTimeout(resolve, delay)),
      ]).then(([moduleExports]) => moduleExports);
    }

    return importPromise;
  });

  // Return component wrapped with Suspense and error boundary
  const WrappedComponent: ComponentType<any> = (props: any) =>
    React.createElement(Suspense, { fallback }, React.createElement(LazyComponent, props));

  WrappedComponent.displayName = `LazyLoaded(Component)`;

  return WrappedComponent;
};

/**
 * Preload a lazy component to improve perceived performance
 */
export const preloadComponent = (importFunc: ImportFunc): void => {
  // Preload on idle or after a short delay
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => importFunc());
  } else {
    setTimeout(() => importFunc(), 100);
  }
};

/**
 * Create a lazy loaded route component with preloading
 */
export const createLazyRoute = (
  importFunc: ImportFunc,
  options: LazyLoadOptions = {}
): LazyRouteComponent => {
  const LazyComponent = lazyLoadComponent(importFunc, options);

  // Create a component that matches LazyRouteComponent interface
  const RouteComponent = LazyComponent as LazyRouteComponent;

  // Preload on mouse enter for better UX
  RouteComponent.preload = () => preloadComponent(importFunc);

  return RouteComponent;
};

/**
 * Intersection Observer based lazy loading for components
 */
export const lazyLoadOnVisible = (
  importFunc: ImportFunc,
  options: LazyLoadVisibleOptions = {}
): ComponentType<any> => {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    // fallback reserved for future implementation
  } = options;

  return lazy(() => {
    return new Promise<{ default: ComponentType<any> }>(resolve => {
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              observer.disconnect();
              importFunc().then(resolve);
            }
          });
        },
        { rootMargin, threshold }
      );

      // Create a temporary element to observe
      const tempElement = document.createElement('div');
      observer.observe(tempElement);

      // Cleanup if component unmounts before loading
      setTimeout(() => {
        observer.disconnect();
        importFunc().then(resolve);
      }, 5000);
    });
  });
};

interface LazyLoadUtils {
  lazyLoadComponent: typeof lazyLoadComponent;
  preloadComponent: typeof preloadComponent;
  createLazyRoute: typeof createLazyRoute;
  lazyLoadOnVisible: typeof lazyLoadOnVisible;
}

const lazyLoadUtils: LazyLoadUtils = {
  lazyLoadComponent,
  preloadComponent,
  createLazyRoute,
  lazyLoadOnVisible,
};

export default lazyLoadUtils;
