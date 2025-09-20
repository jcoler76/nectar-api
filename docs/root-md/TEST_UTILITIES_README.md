# Nectar API Test Utilities

## Overview

This document describes the comprehensive test utilities created for the Nectar API project. These utilities are designed with **NO MOCKS** - all tests use real implementations, real databases, real API calls, and real authentication.

## Philosophy: Real Testing, No Mocks

Unlike traditional testing approaches that rely heavily on mocks and stubs, our test utilities are built around the principle of **real integration testing**:

- **Real Database Operations**: MongoDB and SQL Server connections with actual data
- **Real Authentication**: JWT tokens, bcrypt hashing, real login flows
- **Real API Calls**: HTTP requests to actual endpoints
- **Real Workflow Execution**: Complete workflow engine with queue processing
- **Real React Components**: Full provider context with real state management

## Test Utilities Structure

```
src/utils/testUtils.js              # Frontend test utilities
server/utils/testUtils.js           # Backend database test utilities
server/utils/authTestUtils.js       # Authentication test utilities
server/utils/workflowTestUtils.js   # Workflow engine test utilities
```

## Frontend Test Utilities (`src/utils/testUtils.js`)

### Core Components

#### `TestWrapper`
Provides all necessary React contexts with real implementations:
```javascript
import { renderWithProviders } from '../utils/testUtils';

// Renders component with real AuthContext, NotificationContext, PermissionContext
renderWithProviders(<YourComponent />);
```

#### `RealApiTestUtils`
Makes actual HTTP requests to the API:
```javascript
const apiUtils = new RealApiTestUtils('http://localhost:3001');
await apiUtils.login(email, password);
await apiUtils.createService(serviceData);
```

#### Test Data Generators
Generate real data structures for testing:
```javascript
import { generateTestUser, generateTestService } from '../utils/testUtils';

const user = generateTestUser({ role: 'admin' });
const service = generateTestService({ name: 'My Test Service' });
```

### Usage Examples

```javascript
import { renderWithProviders, RealApiTestUtils, setupTestEnvironment } from '../utils/testUtils';

describe('Real Component Tests', () => {
  let apiUtils;

  beforeAll(async () => {
    setupTestEnvironment();
    apiUtils = new RealApiTestUtils();
    // Create real test user and login
    await apiUtils.createUser(testUser);
    await apiUtils.login(testUser.email, testUser.password);
  });

  test('should display real services', async () => {
    // Create real service via API
    await apiUtils.createService({ name: 'Test Service' });
    
    // Render with real providers
    renderWithProviders(<ServiceList />);
    
    // Assert real data is displayed
    await waitFor(() => {
      expect(screen.getByText('Test Service')).toBeInTheDocument();
    });
  });
});
```

## Backend Test Utilities (`server/utils/testUtils.js`)

### Core Components

#### `RealDatabaseTestManager`
Manages real MongoDB connections for testing:
```javascript
const dbManager = new RealDatabaseTestManager();
await dbManager.connect();
await dbManager.cleanup(); // Removes test data only
```

#### `RealTestDataFactory`
Creates real database records:
```javascript
const factory = new RealTestDataFactory(dbManager);
const user = await factory.createUser({ email: 'test@example.com' });
const service = await factory.createService({ name: 'Test Service' });
```

#### `RealApiTestClient`
Makes authenticated requests to real API endpoints:
```javascript
const client = new RealApiTestClient(app, dbManager);
client.setAuthToken(realJwtToken);
const response = await client.get('/api/services');
```

#### `RealSQLServerTestUtils`
Real SQL Server database operations:
```javascript
const sqlUtils = new RealSQLServerTestUtils();
const connection = await sqlUtils.getTestConnection();
const result = await sqlUtils.executeQuery('SELECT * FROM test_table');
```

### Usage Examples

```javascript
const { testEnvironment } = require('../utils/testUtils');

describe('Real Integration Tests', () => {
  beforeAll(async () => {
    await testEnvironment.setup();
  });

  afterAll(async () => {
    await testEnvironment.teardown();
  });

  test('should create and retrieve real service', async () => {
    const service = await testEnvironment.dataFactory.createService({
      name: 'Integration Test Service'
    });

    const apiClient = testEnvironment.createApiClient(app);
    const response = await apiClient.get(`/api/services/${service._id}`);
    
    expect(response.status).toBe(200);
    expect(response.body.service.name).toBe('Integration Test Service');
  });
});
```

## Authentication Test Utilities (`server/utils/authTestUtils.js`)

### Core Components

#### `RealJWTTestManager`
Handles real JWT token operations:
```javascript
const jwtManager = new RealJWTTestManager();
const token = jwtManager.generateToken({ id: userId, email, role });
const decoded = jwtManager.verifyToken(token);
```

#### `RealAuthTestHelper`
Complete authentication flows:
```javascript
const authHelper = new RealAuthTestHelper(dbManager, jwtManager);

// Create user with real hashed password
const { user, tokens } = await authHelper.createAuthenticatedUser();

// Test real login
const result = await authHelper.attemptLogin(email, password);

// Test password reset
const reset = await authHelper.initiatePasswordReset(email);
```

#### `RealPermissionTestUtils`
Test role and tier-based access control:
```javascript
const permissionUtils = new RealPermissionTestUtils(authHelper);

// Test different roles against endpoint
const results = await permissionUtils.testRoleBasedAccess(app, '/api/admin/users');
expect(results.admin.allowed).toBe(true);
expect(results.user.allowed).toBe(false);
```

### Authentication Test Examples

```javascript
const { RealAuthTestHelper, RealJWTTestManager } = require('../utils/authTestUtils');

describe('Real Authentication Tests', () => {
  let authHelper;

  beforeAll(async () => {
    const jwtManager = new RealJWTTestManager();
    authHelper = new RealAuthTestHelper(testEnvironment.dbManager, jwtManager);
  });

  test('should authenticate with real JWT tokens', async () => {
    const { user, tokens } = await authHelper.createAuthenticatedUser();
    
    // Verify real JWT token
    const jwtManager = new RealJWTTestManager();
    const decoded = jwtManager.verifyToken(tokens.accessToken);
    
    expect(decoded.email).toBe(user.email);
    expect(decoded.role).toBe(user.role);
  });
});
```

## Workflow Test Utilities (`server/utils/workflowTestUtils.js`)

### Core Components

#### `RealWorkflowTestManager`
Real workflow execution and testing:
```javascript
const workflowManager = new RealWorkflowTestManager(dbManager, authHelper);
await workflowManager.initialize();

// Create real workflow
const workflow = await workflowManager.createTestWorkflow();

// Execute with real engine
const { execution, result } = await workflowManager.executeWorkflow(workflow._id);
```

#### `RealQueueTestUtils`
Real Redis queue processing:
```javascript
const queueUtils = new RealQueueTestUtils();
const queue = queueUtils.createTestQueue('workflow-test');

// Process jobs with real worker
const results = await queueUtils.processJobs(queue, jobProcessor);
```

### Workflow Test Examples

```javascript
const { RealWorkflowTestManager } = require('../utils/workflowTestUtils');

describe('Real Workflow Tests', () => {
  let workflowManager;

  beforeAll(async () => {
    workflowManager = new RealWorkflowTestManager(testEnvironment.dbManager, authHelper);
    await workflowManager.initialize();
  });

  test('should execute real workflow with HTTP node', async () => {
    const workflow = await workflowManager.createTestWorkflowWithNodes(['http-request']);
    
    const { execution, result } = await workflowManager.executeWorkflow(
      workflow._id,
      { testData: 'real workflow execution' }
    );

    expect(execution.status).toBe('completed');
    expect(result.success).toBe(true);
    expect(result.nodeResults['http-request']).toBeDefined();
  });
});
```

## Configuration

### Jest Configuration

#### Frontend (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@testing-library|file-saver|react-router-dom|@azure|uuid|@babel|@microsoft)/)'
  ],
  extensiveDepthLimit: 7,
  maxWorkers: 1, // Sequential for database operations
  // NO mocking configurations
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false
};
```

#### Backend (`server/jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  maxWorkers: 1, // Sequential for database operations
  forceExit: true,
  detectOpenHandles: true,
  // NO mocking configurations
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false
};
```

### Environment Variables

#### Test Environment Variables
```bash
# Database
MONGODB_TEST_URI=mongodb://localhost:27017/nectar_test
SQL_SERVER_TEST_DATABASE=test_database

# Authentication
JWT_SECRET=test-jwt-secret-for-testing-32-chars
ENCRYPTION_KEY=test-encryption-key-for-testing-32-chars

# Redis (for queues)
REDIS_TEST_HOST=localhost
REDIS_TEST_PORT=6379

# API
REACT_APP_API_URL=http://localhost:3001

# Debug
DEBUG_TESTS=true # Enable verbose test logging
```

## Best Practices

### 1. Database Isolation
- Each test gets a clean database state
- Test data is automatically cleaned up
- Real database operations ensure accurate testing

### 2. Authentication Security
- Real password hashing with bcrypt
- Actual JWT token generation and verification
- Complete authentication flows including refresh tokens

### 3. API Integration
- Real HTTP requests to actual endpoints
- Proper error handling and status codes
- Authentication headers and CORS

### 4. Performance Considerations
- Tests run sequentially to avoid database conflicts
- Efficient cleanup procedures
- Realistic performance thresholds for real operations

### 5. Error Handling
- Real error scenarios and responses
- No mocked error states
- Actual network timeouts and failures

## Example Test Files

### Real Integration Test
See: `server/tests/integration/realIntegrationExample.test.js`
- Complete full-stack integration testing
- Real authentication, database, and API operations
- Workflow execution with real engine

### Real Component Test
See: `src/tests/integration/realComponentIntegration.test.jsx`
- React component testing with real providers
- Real API calls and data fetching
- Authentication flows and error handling

### Real Performance Test
See: `src/tests/performance.test.js`
- Performance testing with real data loads
- Actual API response times
- Large dataset handling

## Running Tests

### Frontend Tests
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
DEBUG_TESTS=true npm test   # Verbose logging
```

### Backend Tests
```bash
cd server
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --detectOpenHandles  # Debug handle leaks
DEBUG_TESTS=true npm test   # Verbose logging
```

### Integration Tests
```bash
# Start backend first
npm run start:backend

# In another terminal, run frontend tests
npm test
```

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Ensure MongoDB is running on test port
   - Check MONGODB_TEST_URI environment variable
   - Verify test database permissions

2. **Authentication Errors**
   - Check JWT_SECRET length (must be 32+ characters)
   - Verify user creation in test setup
   - Ensure proper token format

3. **API Request Timeouts**
   - Increase test timeouts for real operations
   - Check backend server is running
   - Verify API_URL configuration

4. **Memory Leaks**
   - Use `--detectOpenHandles` flag
   - Ensure proper cleanup in afterAll hooks
   - Close database connections properly

### Debug Mode
Set `DEBUG_TESTS=true` to enable verbose logging:
```bash
DEBUG_TESTS=true npm test
```

This will show:
- API request/response details
- Database operation logs
- Authentication flow steps
- Workflow execution progress

## Benefits of Real Testing

### 1. **True Integration Coverage**
- Catches real integration issues
- Tests actual data flow
- Validates complete user journeys

### 2. **Production Parity**
- Same code paths as production
- Real performance characteristics
- Actual error scenarios

### 3. **Confidence in Deployments**
- No surprises from mocked behavior
- Real database constraints tested
- Actual API contract validation

### 4. **Debugging Capabilities**
- Real error messages and stack traces
- Actual network timeouts and failures
- Complete data persistence testing

## Conclusion

The Nectar API test utilities provide a comprehensive framework for real integration testing without mocks. This approach ensures high confidence in code quality, catches real-world issues early, and provides accurate performance metrics.

All tests use real implementations, making them more reliable indicators of production behavior while maintaining the speed and isolation necessary for effective testing.