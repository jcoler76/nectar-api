/**
 * Real React Component Integration Tests
 * Demonstrates how to test React components with REAL implementations
 * NO MOCKS - Uses real API calls, real authentication, real providers
 *
 * NOTE: This suite is intentionally skipped by default because it requires
 * a real backend + environment (e.g., API at http://localhost:3001 with
 * test data and endpoints available). To run these tests:
 *
 *   1) Ensure a test backend is running and accessible.
 *   2) Remove `.skip` from `describe.skip(...)` below (or set up a
 *      conditional flag and only run when `process.env.REAL_API_TESTS === 'true'`).
 *   3) Optionally adjust URLs/ports to match your environment.
 *
 * If you prefer not to depend on a live backend, consider converting these
 * to mock-based integration tests using MSW (Mock Service Worker) instead.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import real components (no mocks)
import WorkflowBuilder from '../../features/workflows/WorkflowBuilder';
import {
  RealApiTestUtils,
  cleanupTestEnvironment,
  generateTestService,
  generateTestUser,
  renderWithProviders,
  setupTestEnvironment,
} from '../../utils/testUtils';
import Login from '../auth/Login';

import ServiceList from './ServiceList';

// Skipping real integration tests unless a real backend test environment is configured
describe.skip('Real Component Integration Tests', () => {
  let apiUtils;
  let testUser;

  beforeAll(async () => {
    setupTestEnvironment();
    apiUtils = new RealApiTestUtils('http://localhost:3001');

    // Create real test user for authentication
    testUser = generateTestUser({
      email: 'component-test@example.com',
      password: 'testpassword123',
    });

    // Register user with real API
    await apiUtils.createUser(testUser);
    // Real component test environment ready
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    // Clean up storage between tests
    localStorage.clear();
    sessionStorage.clear();
    global.testUtils.clearAuthToken();
  });

  describe('Real Authentication Components', () => {
    test('should login user with real authentication flow', async () => {
      const user = userEvent.setup();

      // Mock successful login response
      const handleLogin = jest.fn();

      renderWithProviders(<Login onLogin={handleLogin} />);

      // Fill in real login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, testUser.email);
      await user.type(passwordInput, testUser.password);

      // Trigger real login
      await user.click(loginButton);

      // Wait for real API response
      await waitFor(
        () => {
          expect(handleLogin).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      // Verify real authentication occurred
      const authData = handleLogin.mock.calls[0][0];
      expect(authData.user.email).toBe(testUser.email);
      expect(authData.token).toBeDefined();
    }, 15000);

    test('should handle login errors with real API responses', async () => {
      const user = userEvent.setup();

      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      // Try to login with invalid credentials
      await user.type(emailInput, 'invalid@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(loginButton);

      // Wait for real error response
      await waitFor(
        () => {
          expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    }, 15000);
  });

  describe('Real ServiceList Component', () => {
    beforeEach(async () => {
      // Login user for authenticated requests
      const loginResponse = await apiUtils.login(testUser.email, testUser.password);
      expect(loginResponse.status).toBe(200);
      global.testUtils.setAuthToken(loginResponse.body.token);
    });

    test('should fetch and display real services', async () => {
      // Create real test services via API
      const testServices = [
        generateTestService({ name: 'Test Service 1' }),
        generateTestService({ name: 'Test Service 2' }),
        generateTestService({ name: 'Test Service 3' }),
      ];

      for (const service of testServices) {
        await apiUtils.createService(service);
      }

      // Render component with real providers
      renderWithProviders(<ServiceList />);

      // Wait for real API call to complete
      await waitFor(
        () => {
          const serviceElements = screen.getAllByText(/Test Service/);
          expect(serviceElements).toHaveLength(3);
        },
        { timeout: 10000 }
      );

      // Verify all specific services are properly displayed
      expect(screen.getByText('Test Service 1')).toBeInTheDocument();
      expect(screen.getByText('Test Service 2')).toBeInTheDocument();
      expect(screen.getByText('Test Service 3')).toBeInTheDocument();
    }, 15000);

    test('should create new service with real API call', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ServiceList />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/services/i)).toBeInTheDocument();
      });

      // Click create new service button
      const createButton = screen.getByRole('button', { name: /create service/i });
      await user.click(createButton);

      // Wait for create form to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/service name/i)).toBeInTheDocument();
      });

      // Fill out real form data
      const nameInput = screen.getByLabelText(/service name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      await user.type(nameInput, 'New Real Service');
      await user.type(descriptionInput, 'Created via real integration test');

      // Submit form to make real API call
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      // Wait for real service creation and UI update
      await waitFor(
        () => {
          expect(screen.getByText('New Real Service')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      // Verify service was actually created in backend
      const services = await apiUtils.makeRequest('/api/services');
      const createdService = services.body.find(s => s.name === 'New Real Service');
      expect(createdService).toBeDefined();
    }, 20000);

    test('should handle service deletion with real API calls', async () => {
      const user = userEvent.setup();

      // Create service to delete
      const serviceToDelete = generateTestService({ name: 'Service To Delete' });
      const createResponse = await apiUtils.createService(serviceToDelete);
      const serviceId = createResponse.body.service._id;

      renderWithProviders(<ServiceList />);

      // Wait for services to load
      await waitFor(() => {
        expect(screen.getByText('Service To Delete')).toBeInTheDocument();
      });

      // Find and click delete button
      const deleteButton = screen.getByTestId(`delete-service-${serviceId}`);
      await user.click(deleteButton);

      // Confirm deletion in modal
      await waitFor(() => {
        expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Wait for real deletion and UI update
      await waitFor(
        () => {
          expect(screen.queryByText('Service To Delete')).not.toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      // Verify service was actually deleted from backend
      const response = await apiUtils.makeRequest(`/api/services/${serviceId}`);
      expect(response.status).toBe(404);
    }, 20000);
  });

  describe('Real Workflow Builder Component', () => {
    beforeEach(async () => {
      // Login user for authenticated requests
      const loginResponse = await apiUtils.login(testUser.email, testUser.password);
      global.testUtils.setAuthToken(loginResponse.body.token);
    });

    test('should create and save real workflow', async () => {
      const user = userEvent.setup();

      renderWithProviders(<WorkflowBuilder />);

      // Wait for workflow builder to load
      await waitFor(() => {
        expect(screen.getByText(/workflow builder/i)).toBeInTheDocument();
      });

      // Add workflow name
      const nameInput = screen.getByLabelText(/workflow name/i);
      await user.type(nameInput, 'Real Integration Test Workflow');

      // Add nodes to workflow (simulate drag and drop)
      const httpNodeButton = screen.getByText(/http request/i);
      await user.click(httpNodeButton);

      // Configure HTTP node
      await waitFor(() => {
        expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/url/i);
      await user.type(urlInput, 'https://httpbin.org/get');

      // Save workflow with real API call
      const saveButton = screen.getByRole('button', { name: /save workflow/i });
      await user.click(saveButton);

      // Wait for save confirmation
      await waitFor(
        () => {
          expect(screen.getByText(/workflow saved/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      // Verify workflow was actually saved in backend
      const workflows = await apiUtils.makeRequest('/api/workflows');
      const savedWorkflow = workflows.body.find(w => w.name === 'Real Integration Test Workflow');
      expect(savedWorkflow).toBeDefined();
      expect(savedWorkflow.nodes).toHaveLength(2); // Start node + HTTP node
    }, 25000);

    test('should execute real workflow', async () => {
      const user = userEvent.setup();

      // Create workflow via API first
      const workflowData = {
        name: 'Executable Test Workflow',
        nodes: [
          {
            id: 'start',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start', triggerType: 'manual' },
          },
          {
            id: 'http-node',
            type: 'http-request',
            position: { x: 300, y: 100 },
            data: {
              label: 'HTTP Request',
              method: 'GET',
              url: 'https://httpbin.org/json',
            },
          },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'http-node' }],
      };

      const createResponse = await apiUtils.createWorkflow(workflowData);
      const workflowId = createResponse.body.workflow._id;

      renderWithProviders(<WorkflowBuilder workflowId={workflowId} />);

      // Wait for workflow to load
      await waitFor(() => {
        expect(screen.getByText('Executable Test Workflow')).toBeInTheDocument();
      });

      // Execute workflow
      const executeButton = screen.getByRole('button', { name: /execute/i });
      await user.click(executeButton);

      // Wait for real execution to complete
      await waitFor(
        () => {
          expect(screen.getByText(/execution completed/i)).toBeInTheDocument();
        },
        { timeout: 15000 }
      );

      // Verify execution results are displayed
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    }, 30000);
  });

  describe('Real Error Handling in Components', () => {
    test('should display real network errors', async () => {
      // Temporarily break network by using invalid API URL
      const originalUrl = process.env.REACT_APP_API_URL;
      process.env.REACT_APP_API_URL = 'http://invalid-url:9999';

      renderWithProviders(<ServiceList />);

      // Wait for network error to be displayed
      await waitFor(
        () => {
          expect(
            screen.getByText(/network error/i) || screen.getByText(/connection failed/i)
          ).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      // Restore original URL
      process.env.REACT_APP_API_URL = originalUrl;
    }, 15000);

    test('should handle real authentication errors', async () => {
      // Set invalid auth token
      global.testUtils.setAuthToken('invalid-token');

      renderWithProviders(<ServiceList />);

      // Wait for authentication error
      await waitFor(
        () => {
          expect(
            screen.getByText(/authentication required/i) || screen.getByText(/unauthorized/i)
          ).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    }, 15000);
  });

  describe('Real Performance Testing', () => {
    test('should render large datasets efficiently', async () => {
      // Create many services for performance testing
      const services = Array.from({ length: 100 }, (_, i) =>
        generateTestService({ name: `Performance Test Service ${i + 1}` })
      );

      // Login first
      const loginResponse = await apiUtils.login(testUser.email, testUser.password);
      global.testUtils.setAuthToken(loginResponse.body.token);

      // Create services in batch
      await Promise.all(services.map(service => apiUtils.createService(service)));

      const startTime = Date.now();

      renderWithProviders(<ServiceList />);

      // Wait for all services to be rendered
      await waitFor(
        () => {
          expect(screen.getAllByText(/Performance Test Service/)).toHaveLength(100);
        },
        { timeout: 20000 }
      );

      const renderTime = Date.now() - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(10000); // 10 seconds
    }, 30000);
  });
});
