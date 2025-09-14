import React, { Suspense, Component } from 'react';

import LoadingSpinner from './LoadingSpinner';

/**
 * LazyRoute - Wrapper for lazy-loaded route components
 * Provides loading states and error boundaries for code splitting
 */

// Custom Error Boundary for lazy loading
class LazyRouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LazyRoute Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return <FallbackComponent error={this.state.error} resetErrorBoundary={this.handleReset} />;
      }
      return <ErrorFallback error={this.state.error} resetErrorBoundary={this.handleReset} />;
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div
    role="alert"
    style={{
      padding: '20px',
      textAlign: 'center',
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      margin: '20px',
    }}
  >
    <h2>⚠️ Something went wrong loading this page</h2>
    <p style={{ color: '#6c757d', marginBottom: '20px' }}>
      {error.message || 'Failed to load page component'}
    </p>
    <button
      onClick={resetErrorBoundary}
      style={{
        background: '#007bff',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      Try again
    </button>
  </div>
);

const LoadingFallback = ({ routeName }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      padding: '40px',
    }}
  >
    <LoadingSpinner />
    <p
      style={{
        marginTop: '16px',
        color: '#6c757d',
        fontSize: '14px',
      }}
    >
      Loading {routeName || 'page'}...
    </p>
  </div>
);

const LazyRoute = ({
  component: Component,
  routeName = 'component',
  errorFallback: CustomErrorFallback,
  loadingFallback: CustomLoadingFallback,
  ...props
}) => {
  const LoadingComponent =
    CustomLoadingFallback || (() => <LoadingFallback routeName={routeName} />);

  return (
    <LazyRouteErrorBoundary
      fallbackComponent={CustomErrorFallback}
      onReset={() => window.location.reload()}
    >
      <Suspense fallback={<LoadingComponent />}>
        <Component {...props} />
      </Suspense>
    </LazyRouteErrorBoundary>
  );
};

export default LazyRoute;
