/**
 * Test Utilities for React Components and Frontend Testing
 *
 * These utilities provide real implementations for testing without mocks.
 * All providers, API calls, and state management use actual implementations.
 */

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import AuthContext from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { PermissionProvider } from '../context/PermissionContext';
import api from '../services/api';

/**
 * Test Wrapper Component with All Real Providers
 *
 * This wrapper includes all the context providers needed for components
 * to function with real implementations.
 */
export const TestWrapper = ({ children, authValue, initialRoute = '/' }) => {
  const theme = createTheme();

  // Default auth context value with real implementation
  const defaultAuthValue = {
    user: null,
    login: async (email, password) => {
      const response = await api.post('/api/auth/login', { email, password });
      return response.data;
    },
    logout: async () => {
      await api.post('/api/auth/logout');
    },
    isAuthenticated: false,
    loading: false,
    error: null,
    twoFactorRequired: false,
    setupTwoFactorRequired: false,
    verifyTwoFactor: async code => {
      const response = await api.post('/api/auth/verify-2fa', { code });
      return response.data;
    },
    requestTwoFactorCode: async () => {
      const response = await api.post('/api/auth/request-2fa');
      return response.data;
    },
    otpRequested: false,
    qrCode: null,
    secret: null,
    ...authValue,
  };

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthContext.Provider value={defaultAuthValue}>
          <NotificationProvider>
            <PermissionProvider>{children}</PermissionProvider>
          </NotificationProvider>
        </AuthContext.Provider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

/**
 * Custom render function with all providers
 *
 * @param {React.Component} component - Component to render
 * @param {Object} options - Render options
 * @returns {RenderResult} - Testing library render result
 */
export const renderWithProviders = (component, options = {}) => {
  const { authValue, initialRoute = '/', ...renderOptions } = options;

  return render(
    <TestWrapper authValue={authValue} initialRoute={initialRoute}>
      {component}
    </TestWrapper>,
    renderOptions
  );
};

/**
 * Real API Test Utilities
 *
 * Makes actual HTTP requests to the API for integration testing
 */
export class RealApiTestUtils {
  constructor(baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.token = null;
  }

  /**
   * Authenticate with real credentials
   */
  async authenticate(email = 'test@example.com', password = 'TestPassword123!') {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      this.token = response.data.token;
      return response.data;
    } catch (error) {
      console.error('Authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Make authenticated API request
   */
  async request(method, endpoint, data = null) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {},
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    if (data) {
      config.data = data;
    }

    return api(config);
  }

  /**
   * Clean up test data
   */
  async cleanup() {
    // Implement cleanup logic for test data
    this.token = null;
  }
}

/**
 * Test Data Generators
 *
 * Generate realistic test data for various entities
 */
export const TestDataGenerators = {
  /**
   * Generate a test user object
   */
  user: (overrides = {}) => ({
    _id: `test-user-${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    isAdmin: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Generate a test service object
   */
  service: (overrides = {}) => ({
    _id: `test-service-${Date.now()}`,
    name: `Test Service ${Date.now()}`,
    description: 'Test service description',
    connectionId: `test-connection-${Date.now()}`,
    type: 'database',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Generate a test connection object
   */
  connection: (overrides = {}) => ({
    _id: `test-connection-${Date.now()}`,
    name: `Test Connection ${Date.now()}`,
    type: 'mongodb',
    host: 'localhost',
    port: 27017,
    database: 'test_db',
    active: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Generate a test workflow object
   */
  workflow: (overrides = {}) => ({
    _id: `test-workflow-${Date.now()}`,
    name: `Test Workflow ${Date.now()}`,
    description: 'Test workflow description',
    nodes: [],
    edges: [],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Generate a test application object
   */
  application: (overrides = {}) => ({
    _id: `test-app-${Date.now()}`,
    name: `Test Application ${Date.now()}`,
    description: 'Test application description',
    apiKey: `test-api-key-${Date.now()}`,
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
};

/**
 * Wait Utilities for Async Operations
 */
export const WaitUtils = {
  /**
   * Wait for a condition to be true
   */
  waitForCondition: async (condition, timeout = 5000, interval = 100) => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Wait for API response
   */
  waitForApiResponse: async (apiCall, timeout = 5000) => {
    return Promise.race([
      apiCall(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API call timed out')), timeout)
      ),
    ]);
  },
};

/**
 * Performance Test Utilities
 */
export const PerformanceTestUtils = {
  /**
   * Measure component render time
   */
  measureRenderTime: component => {
    const startTime = performance.now();
    const result = render(component);
    const endTime = performance.now();

    return {
      renderTime: endTime - startTime,
      result,
    };
  },

  /**
   * Measure API response time
   */
  measureApiResponseTime: async apiCall => {
    const startTime = performance.now();
    const response = await apiCall();
    const endTime = performance.now();

    return {
      responseTime: endTime - startTime,
      response,
    };
  },
};

/**
 * Accessibility Test Utilities
 */
export const AccessibilityTestUtils = {
  /**
   * Check for ARIA attributes
   */
  checkAriaAttributes: element => {
    const ariaAttributes = [
      'aria-label',
      'aria-labelledby',
      'aria-describedby',
      'aria-live',
      'aria-hidden',
    ];

    const foundAttributes = {};
    ariaAttributes.forEach(attr => {
      if (element.hasAttribute(attr)) {
        foundAttributes[attr] = element.getAttribute(attr);
      }
    });

    return foundAttributes;
  },

  /**
   * Check for keyboard navigation support
   */
  checkKeyboardNavigation: element => {
    const tabIndex = element.getAttribute('tabindex');
    const role = element.getAttribute('role');

    return {
      focusable: tabIndex !== '-1',
      tabIndex,
      role,
      hasKeyHandlers: !!(element.onkeydown || element.onkeyup || element.onkeypress),
    };
  },
};

/**
 * Environment Setup Utilities
 */
export const EnvironmentSetup = {
  /**
   * Set up test environment variables
   */
  setupTestEnvironment: () => {
    // Store original env
    const originalEnv = { ...process.env };

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.REACT_APP_API_URL = 'http://localhost:3001';

    return () => {
      // Restore original env
      Object.keys(originalEnv).forEach(key => {
        process.env[key] = originalEnv[key];
      });
    };
  },

  /**
   * Set up local storage for tests
   */
  setupLocalStorage: () => {
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    return localStorageMock;
  },

  /**
   * Clean up after tests
   */
  cleanup: () => {
    // Clear all timers
    jest.clearAllTimers();

    // Clear local storage
    if (window.localStorage) {
      window.localStorage.clear();
    }

    // Clear session storage
    if (window.sessionStorage) {
      window.sessionStorage.clear();
    }
  },
};

const TestUtils = {
  TestWrapper,
  renderWithProviders,
  RealApiTestUtils,
  TestDataGenerators,
  WaitUtils,
  PerformanceTestUtils,
  AccessibilityTestUtils,
  EnvironmentSetup,
};

export default TestUtils;
