import { render, screen, waitFor } from '@testing-library/react';
import React, { lazy } from 'react';

import LazyRoute from './LazyRoute';

// Mock component for testing
const MockComponent = () => <div>Mock Component Loaded</div>;
const LazyMockComponent = lazy(
  () =>
    new Promise(resolve => {
      setTimeout(() => {
        resolve({ default: MockComponent });
      }, 100);
    })
);

describe('LazyRoute', () => {
  test('should show loading state then load component', async () => {
    render(<LazyRoute component={LazyMockComponent} routeName="Test Component" />);

    // Should show loading state initially
    expect(screen.getByText(/Loading Test Component/)).toBeInTheDocument();

    // Should load the actual component after delay
    await waitFor(
      () => {
        expect(screen.getByText('Mock Component Loaded')).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    // Loading text should be gone
    expect(screen.queryByText(/Loading Test Component/)).not.toBeInTheDocument();
  });

  test('should handle component loading errors', async () => {
    const FailingComponent = lazy(() => Promise.reject(new Error('Failed to load component')));

    render(<LazyRoute component={FailingComponent} routeName="Failing Component" />);

    // Should show loading state initially
    expect(screen.getByText(/Loading Failing Component/)).toBeInTheDocument();

    // Should show error boundary after failure
    await waitFor(
      () => {
        expect(screen.getByText(/Something went wrong loading this page/)).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    // Should have try again button
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });
});
