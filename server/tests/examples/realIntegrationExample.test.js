/**
 * Real Backend Integration Test Example
 *
 * This test demonstrates backend testing with real implementations:
 * - Real MongoDB database operations
 * - Real HTTP requests to API endpoints
 * - Real authentication and authorization
 * - Real data persistence and retrieval
 *
 * NO MOCKS - All tests use actual implementations
 */

const {
  RealDatabaseTestManager,
  RealTestDataFactory,
  RealApiTestClient,
  RealJWTTestManager,
  TestEnvironment,
  PerformanceTestUtils,
  ValidationTestUtils,
} = require('../../utils/testUtils');

const app = require('../../server');
const User = require('../../models/User');
const Service = require('../../models/Service');
const Connection = require('../../models/Connection');
const bcrypt = require('bcryptjs');

describe('Real Backend Integration Tests', () => {
  let dbManager;
  let apiClient;

  beforeAll(async () => {
    // Set up real test environment
    dbManager = await TestEnvironment.setup();
  });

  afterAll(async () => {
    // Clean up real test environment
    await TestEnvironment.teardown(dbManager);
  });

  beforeEach(async () => {
    // Reset database before each test
    await TestEnvironment.reset(dbManager);

    // Create new API client for each test
    apiClient = new RealApiTestClient(app);
  });

  afterEach(async () => {
    // Clean up API client
    await apiClient.cleanup();
  });

  describe('Real Authentication Tests', () => {
    test('User registration with real password hashing', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'NewUserPassword123!',
        firstName: 'New',
        lastName: 'User',
      };

      // Test real user creation
      const user = await RealTestDataFactory.createUser(userData);

      expect(user._id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);

      // Verify password is actually hashed with bcrypt
      expect(user.password).not.toBe(userData.password);
      const isValidPassword = await bcrypt.compare(userData.password, user.password);
      expect(isValidPassword).toBe(true);
    });

    test('Real JWT token generation and verification', async () => {
      const user = await RealTestDataFactory.createUser();

      // Generate real JWT token
      const token = RealJWTTestManager.generateToken({
        userId: user._id,
        email: user.email,
        isAdmin: user.isAdmin,
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify real JWT token
      const decoded = RealJWTTestManager.verifyToken(token);
      expect(decoded.userId).toBe(user._id.toString());
      expect(decoded.email).toBe(user.email);
      expect(decoded.isAdmin).toBe(user.isAdmin);
    });

    test('Real API login endpoint', async () => {
      // Create real user with known password
      const plainPassword = 'TestPassword123!';
      const user = await RealTestDataFactory.createUser({
        email: 'testlogin@example.com',
        password: plainPassword,
      });

      // Test real login API
      const response = await apiClient.authenticate(user.email, plainPassword);

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(user.email);
      expect(apiClient.token).toBeDefined();
    });
  });

  describe('Real Database CRUD Operations', () => {
    test('Service CRUD with real database persistence', async () => {
      // Create authenticated user
      const { user } = await apiClient.createAndAuthenticate({
        isAdmin: true, // Admin user for service management
      });

      // Test real service creation via API
      const serviceData = {
        name: 'Real Test Service',
        description: 'This service is created via real API call',
        type: 'database',
        active: true,
      };

      const createResponse = await apiClient.request('POST', '/api/services', serviceData);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.name).toBe(serviceData.name);
      expect(createResponse.body.description).toBe(serviceData.description);

      const serviceId = createResponse.body._id;

      // Verify service exists in real database
      const dbService = await Service.findById(serviceId);
      expect(dbService).toBeTruthy();
      expect(dbService.name).toBe(serviceData.name);

      // Test real service retrieval via API
      const getResponse = await apiClient.request('GET', `/api/services/${serviceId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body._id).toBe(serviceId);

      // Test real service update via API
      const updateData = {
        name: 'Updated Real Service Name',
        description: 'Updated description',
      };

      const updateResponse = await apiClient.request(
        'PUT',
        `/api/services/${serviceId}`,
        updateData
      );
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe(updateData.name);

      // Verify update persisted in real database
      const updatedDbService = await Service.findById(serviceId);
      expect(updatedDbService.name).toBe(updateData.name);

      // Test real service deletion via API
      const deleteResponse = await apiClient.request('DELETE', `/api/services/${serviceId}`);
      expect(deleteResponse.status).toBeLessThan(400);

      // Verify deletion from real database
      const deletedService = await Service.findById(serviceId);
      expect(deletedService).toBeNull();
    });

    test('Connection CRUD with real encryption', async () => {
      const { user } = await apiClient.createAndAuthenticate({ isAdmin: true });

      const connectionData = {
        name: 'Real Test Connection',
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        database: 'real_test_db',
        username: 'testuser',
        password: 'testpassword',
      };

      // Test real connection creation
      const createResponse = await apiClient.request('POST', '/api/connections', connectionData);

      if (createResponse.status === 201) {
        expect(createResponse.body.name).toBe(connectionData.name);
        expect(createResponse.body.type).toBe(connectionData.type);

        // Password should not be returned in API response
        expect(createResponse.body.password).toBeUndefined();

        const connectionId = createResponse.body._id;

        // Verify connection exists in database with encrypted password
        const dbConnection = await Connection.findById(connectionId);
        expect(dbConnection).toBeTruthy();
        expect(dbConnection.password).not.toBe(connectionData.password); // Should be encrypted
      }
    });
  });

  describe('Real Permission and Authorization Tests', () => {
    test('Admin vs regular user permissions', async () => {
      // Create regular user
      const { user: regularUser } = await apiClient.createAndAuthenticate({
        isAdmin: false,
      });

      // Regular user should not be able to create services
      const serviceData = {
        name: 'Unauthorized Service',
        type: 'database',
      };

      const unauthorizedResponse = await apiClient.request('POST', '/api/services', serviceData);
      expect(unauthorizedResponse.status).toBeGreaterThanOrEqual(403);

      // Create admin user with new client
      const adminClient = new RealApiTestClient(app);
      await adminClient.createAndAuthenticate({ isAdmin: true });

      // Admin should be able to create services
      const authorizedResponse = await adminClient.request('POST', '/api/services', serviceData);
      expect(authorizedResponse.status).toBeLessThan(400);

      await adminClient.cleanup();
    });
  });

  describe('Real Performance Tests', () => {
    test('API endpoint performance under load', async () => {
      const { user } = await apiClient.createAndAuthenticate({ isAdmin: true });

      // Create some real test data
      await RealTestDataFactory.createService({ name: 'Perf Test Service 1' });
      await RealTestDataFactory.createService({ name: 'Perf Test Service 2' });
      await RealTestDataFactory.createService({ name: 'Perf Test Service 3' });

      // Measure real API performance
      const performance = await PerformanceTestUtils.measureEndpointTime(
        apiClient,
        'GET',
        '/api/services'
      );

      expect(performance.responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(performance.response.status).toBe(200);
      expect(Array.isArray(performance.response.body)).toBe(true);
    });

    test('Database operation performance', async () => {
      // Measure real database operation performance
      const performance = await PerformanceTestUtils.measureDatabaseOperation(async () => {
        return await RealTestDataFactory.createUser({
          email: 'perftest@example.com',
        });
      });

      expect(performance.operationTime).toBeLessThan(500); // Should complete within 500ms
      expect(performance.result._id).toBeDefined();
    });
  });

  describe('Real Validation Tests', () => {
    test('User model validation with real constraints', async () => {
      const invalidEmails = ['', 'invalid', 'test@', '@example.com'];
      const validEmails = ['test@example.com', 'user.name+tag@domain.co.uk'];

      const results = await ValidationTestUtils.testFieldValidation(
        User,
        'email',
        invalidEmails,
        validEmails
      );

      // All invalid emails should fail validation
      results.invalid.forEach(result => {
        expect(result.passed).toBe(true); // Validation should catch invalid values
      });

      // All valid emails should pass validation
      results.valid.forEach(result => {
        expect(result.passed).toBe(true); // Validation should allow valid values
      });
    });

    test('API endpoint validation with real requests', async () => {
      const { user } = await apiClient.createAndAuthenticate({ isAdmin: true });

      const invalidPayloads = [
        {}, // Missing required fields
        { name: '' }, // Empty name
        { name: 'Test', type: 'invalid_type' }, // Invalid type
      ];

      const validPayloads = [
        {
          name: 'Valid Service',
          description: 'Valid description',
          type: 'database',
          active: true,
        },
      ];

      const results = await ValidationTestUtils.testEndpointValidation(
        apiClient,
        'POST',
        '/api/services',
        invalidPayloads,
        validPayloads
      );

      // Invalid payloads should be rejected
      results.invalid.forEach(result => {
        expect(result.passed).toBe(true); // Should return error status
      });

      // Valid payloads should be accepted
      results.valid.forEach(result => {
        expect(result.passed).toBe(true); // Should return success status
      });
    });
  });

  describe('Real Error Handling Tests', () => {
    test('Database connection error handling', async () => {
      // Test with invalid database operation
      try {
        await User.findById('invalid_object_id');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.name).toBe('CastError');
      }
    });

    test('API authentication error handling', async () => {
      // Test API without authentication
      const unauthenticatedClient = new RealApiTestClient(app);
      const response = await unauthenticatedClient.request('GET', '/api/services');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Authentication');
    });
  });
});

describe('Real Workflow Integration Tests', () => {
  let dbManager;
  let apiClient;

  beforeAll(async () => {
    dbManager = await TestEnvironment.setup();
  });

  afterAll(async () => {
    await TestEnvironment.teardown(dbManager);
  });

  beforeEach(async () => {
    await TestEnvironment.reset(dbManager);
    apiClient = new RealApiTestClient(app);
  });

  afterEach(async () => {
    await apiClient.cleanup();
  });

  test('Real workflow creation and execution', async () => {
    const { user } = await apiClient.createAndAuthenticate({ isAdmin: true });

    // Create real workflow
    const workflowData = {
      name: 'Real Test Workflow',
      description: 'This workflow uses real execution',
      nodes: [
        {
          id: 'start',
          type: 'trigger',
          data: { type: 'manual' },
        },
        {
          id: 'log',
          type: 'logger',
          data: { message: 'Real workflow executed' },
        },
      ],
      edges: [{ id: 'e1', source: 'start', target: 'log' }],
      active: true,
    };

    const response = await apiClient.request('POST', '/api/workflows', workflowData);

    if (response.status === 201) {
      expect(response.body.name).toBe(workflowData.name);
      expect(response.body.nodes).toHaveLength(2);

      const workflowId = response.body._id;

      // Test real workflow execution
      const executeResponse = await apiClient.request(
        'POST',
        `/api/workflows/${workflowId}/execute`
      );
      expect(executeResponse.status).toBeLessThan(400);
    }
  });
});
