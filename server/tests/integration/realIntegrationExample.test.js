/**
 * Real Integration Test Example for Mirabel API
 * Demonstrates how to use all test utilities with REAL implementations
 * NO MOCKS - Everything uses real services, databases, and authentication
 */

const request = require('supertest');
const { testEnvironment } = require('../../utils/testUtils');
const { RealAuthTestHelper, RealJWTTestManager } = require('../../utils/authTestUtils');
const { RealWorkflowTestManager } = require('../../utils/workflowTestUtils');

// Import real app
const app = require('../../server');

describe('Real Integration Tests - Full Stack', () => {
  let authHelper;
  let workflowManager;
  let apiClient;
  let testUser;

  beforeAll(async () => {
    // Initialize all real test utilities
    const jwtManager = new RealJWTTestManager();
    authHelper = new RealAuthTestHelper(testEnvironment.dbManager, jwtManager);
    workflowManager = new RealWorkflowTestManager(testEnvironment.dbManager, authHelper);

    await workflowManager.initialize();

    // Create authenticated test user
    testUser = await authHelper.createAuthenticatedUser({
      name: 'Integration Test User',
      email: 'integration@example.com',
      role: 'user',
      tier: 'premium',
    });

    // Create API client with authentication
    apiClient = testEnvironment.createApiClient(app);
    apiClient.setAuthToken(testUser.tokens.accessToken);

    console.log('Real integration test environment ready');
  }, 60000);

  afterAll(async () => {
    await workflowManager.cleanup();
  }, 30000);

  describe('Real Authentication Flow', () => {
    test('should authenticate user with real JWT tokens', async () => {
      // Test real login
      const loginResponse = await apiClient.post('/auth/login', {
        email: testUser.user.email,
        password: testUser.user.plainPassword,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user).toBeDefined();

      // Verify real JWT token
      const jwtManager = new RealJWTTestManager();
      const decoded = jwtManager.verifyToken(loginResponse.body.token);
      expect(decoded.email).toBe(testUser.user.email);
      expect(decoded.role).toBe(testUser.user.role);
    });

    test('should refresh tokens with real refresh flow', async () => {
      const refreshResponse = await authHelper.refreshTokens(testUser.tokens.refreshToken);

      expect(refreshResponse.success).toBe(true);
      expect(refreshResponse.tokens.accessToken).toBeDefined();
      expect(refreshResponse.tokens.refreshToken).toBeDefined();

      // New tokens should be different from original
      expect(refreshResponse.tokens.accessToken).not.toBe(testUser.tokens.accessToken);
    });

    test('should handle password reset with real tokens', async () => {
      const resetInitiation = await authHelper.initiatePasswordReset(testUser.user.email);
      expect(resetInitiation.success).toBe(true);
      expect(resetInitiation.resetToken).toBeDefined();

      const newPassword = 'newrealpassword123';
      const resetCompletion = await authHelper.completePasswordReset(
        resetInitiation.resetToken,
        newPassword
      );
      expect(resetCompletion.success).toBe(true);

      // Verify can login with new password
      const loginResponse = await authHelper.attemptLogin(testUser.user.email, newPassword);
      expect(loginResponse.success).toBe(true);
    });
  });

  describe('Real Database Operations', () => {
    test('should create and retrieve real services', async () => {
      const serviceData = {
        name: 'Real Test Service',
        label: 'Real Service',
        description: 'A real service for integration testing',
        database: 'test_database',
        isActive: true,
      };

      // Create service via real API
      const createResponse = await apiClient.post('/api/services', serviceData);
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.service).toBeDefined();

      const serviceId = createResponse.body.service._id;

      // Retrieve service via real API
      const getResponse = await apiClient.get(`/api/services/${serviceId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.service.name).toBe(serviceData.name);
    });

    test('should create and retrieve real connections', async () => {
      const connectionData = {
        name: 'Real Test Connection',
        type: 'sql-server',
        host: 'localhost',
        port: 1433,
        database: 'test_database',
        username: 'test_user',
        password: 'test_password',
        isActive: true,
      };

      const createResponse = await apiClient.post('/api/connections', connectionData);
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      const connectionId = createResponse.body.connection._id;
      const getResponse = await apiClient.get(`/api/connections/${connectionId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.connection.name).toBe(connectionData.name);
    });
  });

  describe('Real Workflow Execution', () => {
    test('should create and execute real workflow', async () => {
      // Create workflow with real API
      const workflowData = {
        name: 'Real Integration Test Workflow',
        description: 'Testing real workflow execution',
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
              headers: { 'Content-Type': 'application/json' },
            },
          },
          {
            id: 'end',
            type: 'end',
            position: { x: 500, y: 100 },
            data: { label: 'End' },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'http-node' },
          { id: 'e2', source: 'http-node', target: 'end' },
        ],
      };

      const createResponse = await apiClient.post('/api/workflows', workflowData);
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      const workflowId = createResponse.body.workflow._id;

      // Execute workflow with real engine
      const executeResponse = await apiClient.post(`/api/workflows/${workflowId}/execute`, {
        triggerData: { source: 'integration-test' },
      });

      expect(executeResponse.status).toBe(200);
      expect(executeResponse.body.success).toBe(true);
      expect(executeResponse.body.executionId).toBeDefined();

      // Wait for real execution to complete
      const execution = await workflowManager.waitForExecution(
        executeResponse.body.executionId,
        30000
      );

      expect(execution.status).toBe('completed');
      expect(execution.result).toBeDefined();
    }, 45000);

    test('should handle workflow errors in real execution', async () => {
      const errorWorkflow = await workflowManager.createErrorTestWorkflow();

      const { execution, result } = await workflowManager.executeWorkflow(errorWorkflow._id, {
        source: 'error-test',
      });

      expect(execution.status).toBe('failed');
      expect(execution.error).toBeDefined();
      expect(result.success).toBe(false);
    }, 30000);

    test('should execute workflow with different node types', async () => {
      const multiNodeWorkflow = await workflowManager.createTestWorkflowWithNodes([
        'http-request',
        'code',
        'filter',
      ]);

      const { execution, result } = await workflowManager.executeWorkflow(multiNodeWorkflow._id, {
        testData: 'integration test data',
        shouldContinue: true,
      });

      expect(execution.status).toBe('completed');
      expect(result.success).toBe(true);
      expect(result.nodeResults).toBeDefined();

      // Verify each node executed
      expect(Object.keys(result.nodeResults)).toContain('http-request');
      expect(Object.keys(result.nodeResults)).toContain('code');
      expect(Object.keys(result.nodeResults)).toContain('filter');
    }, 30000);
  });

  describe('Real Permission Testing', () => {
    test('should enforce role-based access control', async () => {
      const users = await authHelper.createUsersByRole();

      // Test admin access to admin endpoint
      const adminClient = authHelper.createAuthenticatedApiClient(app, users.admin);
      const adminResponse = await adminClient.get('/api/admin/users');
      expect(adminResponse.status).toBe(200);

      // Test user access to admin endpoint (should be denied)
      const userClient = authHelper.createAuthenticatedApiClient(app, users.user);
      const userResponse = await userClient.get('/api/admin/users');
      expect(userResponse.status).toBe(403);
    });

    test('should enforce tier-based rate limiting', async () => {
      const freeUser = await authHelper.createAuthenticatedUser({ tier: 'free' });
      const premiumUser = await authHelper.createAuthenticatedUser({ tier: 'premium' });

      const freeClient = authHelper.createAuthenticatedApiClient(app, freeUser);
      const premiumClient = authHelper.createAuthenticatedApiClient(app, premiumUser);

      // Make multiple requests to test rate limits
      const freePromises = Array(15)
        .fill()
        .map(() => freeClient.get('/api/services'));

      const premiumPromises = Array(15)
        .fill()
        .map(() => premiumClient.get('/api/services'));

      const freeResults = await Promise.all(freePromises);
      const premiumResults = await Promise.all(premiumPromises);

      // Free tier should hit rate limit
      const freeRateLimited = freeResults.some(response => response.status === 429);
      expect(freeRateLimited).toBe(true);

      // Premium tier should not hit rate limit
      const premiumRateLimited = premiumResults.some(response => response.status === 429);
      expect(premiumRateLimited).toBe(false);
    }, 15000);
  });

  describe('Real Error Handling', () => {
    test('should handle and sanitize database errors', async () => {
      // Attempt to create service with invalid data
      const invalidServiceData = {
        name: '', // Invalid: empty name
        database: null, // Invalid: null database
        connectionId: 'invalid-object-id', // Invalid ObjectId
      };

      const response = await apiClient.post('/api/services', invalidServiceData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();

      // Ensure no internal details are exposed
      expect(response.body.error.message).not.toContain('mongoose');
      expect(response.body.error.message).not.toContain('ValidationError');
    });

    test('should handle authentication errors properly', async () => {
      // Test with expired token
      const expiredUser = await authHelper.createAuthScenarios();
      const expiredClient = authHelper.createAuthenticatedApiClient(app, expiredUser.expiredUser);

      const response = await expiredClient.get('/api/services');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('Real Performance Testing', () => {
    test('should handle concurrent requests efficiently', async () => {
      const users = await Promise.all(
        Array(5)
          .fill()
          .map(() => authHelper.createAuthenticatedUser())
      );

      const clients = users.map(user => authHelper.createAuthenticatedApiClient(app, user));

      const startTime = Date.now();

      // Make concurrent requests
      const promises = clients.map(client =>
        Promise.all([
          client.get('/api/services'),
          client.get('/api/connections'),
          client.get('/api/workflows'),
        ])
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      results.forEach(userResults => {
        userResults.forEach(response => {
          expect(response.status).toBe(200);
        });
      });

      // Should complete within reasonable time
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // 5 seconds

      console.log(`Concurrent requests completed in ${executionTime}ms`);
    }, 10000);
  });
});
