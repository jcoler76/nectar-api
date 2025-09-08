# Test Utilities Documentation

This document provides comprehensive guidance for using the test utilities in the Nectar API project. All utilities follow the **NO MOCKS** principle, using real implementations for reliable testing.

## Philosophy: Real Implementation Testing

Our test utilities are designed around the principle of testing with **real implementations** rather than mocks:

- ✅ **Real API calls** to actual endpoints
- ✅ **Real database operations** with actual persistence
- ✅ **Real authentication** with JWT tokens and bcrypt hashing
- ✅ **Real React providers** and context
- ✅ **Real error handling** and validation
- ❌ **No mocks** or fake implementations
- ❌ **No fallbacks** or temporary solutions

## Frontend Test Utilities

### Location: `src/utils/testUtils.js`

### Core Components

#### TestWrapper
Provides all React context providers with real implementations.

```javascript
import { TestWrapper } from '../utils/testUtils';

// Wrap components with real providers
<TestWrapper authValue={{ user: realUser }}>
  <YourComponent />
</TestWrapper>
```

#### renderWithProviders
Custom render function that includes all necessary providers.

```javascript
import { renderWithProviders } from '../utils/testUtils';

test('Component renders with real providers', () => {
  renderWithProviders(<Login />);
  
  // Component has access to real Auth, Notification, and Permission contexts
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});
```

#### RealApiTestUtils
Makes actual HTTP requests to API endpoints.

```javascript
import { RealApiTestUtils } from '../utils/testUtils';

test('Real API integration', async () => {
  const apiUtils = new RealApiTestUtils();
  
  // Real authentication
  await apiUtils.authenticate('test@example.com', 'password');
  
  // Real API calls
  const response = await apiUtils.request('GET', '/api/services');
  expect(response.status).toBe(200);
  
  await apiUtils.cleanup();
});
```

#### TestDataGenerators
Generate realistic test data for various entities.

```javascript
import { TestDataGenerators } from '../utils/testUtils';

test('Generate realistic test data', () => {
  const user = TestDataGenerators.user({
    email: 'custom@example.com',
    isAdmin: true
  });
  
  const service = TestDataGenerators.service({
    name: 'Custom Service',
    type: 'database'
  });
  
  expect(user.email).toBe('custom@example.com');
  expect(service.type).toBe('database');
});
```

### Performance Testing

#### PerformanceTestUtils
Measure real component render times and API response times.

```javascript
import { PerformanceTestUtils } from '../utils/testUtils';

test('Component performance', () => {
  const { renderTime, result } = PerformanceTestUtils.measureRenderTime(
    renderWithProviders(<Dashboard />)
  );
  
  expect(renderTime).toBeLessThan(1000); // Should render within 1 second
});

test('API performance', async () => {
  const { responseTime, response } = await PerformanceTestUtils.measureApiResponseTime(
    () => apiUtils.request('GET', '/api/users')
  );
  
  expect(responseTime).toBeLessThan(500); // Should respond within 500ms
});
```

### Accessibility Testing

#### AccessibilityTestUtils
Check for real accessibility attributes and keyboard navigation.

```javascript
import { AccessibilityTestUtils } from '../utils/testUtils';

test('Accessibility compliance', () => {
  renderWithProviders(<Button>Submit</Button>);
  
  const button = screen.getByRole('button');
  const ariaAttributes = AccessibilityTestUtils.checkAriaAttributes(button);
  const keyboardSupport = AccessibilityTestUtils.checkKeyboardNavigation(button);
  
  expect(keyboardSupport.focusable).toBe(true);
});
```

### Wait Utilities

#### WaitUtils
Handle real async operations with proper timing.

```javascript
import { WaitUtils } from '../utils/testUtils';

test('Wait for real async condition', async () => {
  let dataLoaded = false;
  
  // Simulate real async operation
  setTimeout(() => { dataLoaded = true; }, 1000);
  
  await WaitUtils.waitForCondition(() => dataLoaded, 2000);
  
  expect(dataLoaded).toBe(true);
});
```

## Backend Test Utilities

### Location: `server/utils/testUtils.js`

### Database Testing

#### RealDatabaseTestManager
Manages real MongoDB connections for testing.

```javascript
const { RealDatabaseTestManager } = require('../utils/testUtils');

describe('Database tests', () => {
  let dbManager;
  
  beforeAll(async () => {
    dbManager = new RealDatabaseTestManager();
    await dbManager.connect(); // Real MongoDB connection
  });
  
  afterAll(async () => {
    await dbManager.disconnect();
  });
  
  beforeEach(async () => {
    await dbManager.clearDatabase(); // Real cleanup
  });
});
```

#### RealTestDataFactory
Creates real database records.

```javascript
const { RealTestDataFactory } = require('../utils/testUtils');

test('Create real user in database', async () => {
  const user = await RealTestDataFactory.createUser({
    email: 'real@example.com',
    password: 'RealPassword123!'
  });
  
  expect(user._id).toBeDefined();
  expect(user.password).not.toBe('RealPassword123!'); // Should be hashed
  
  // Verify user exists in real database
  const dbUser = await User.findById(user._id);
  expect(dbUser).toBeTruthy();
});
```

### API Testing

#### RealApiTestClient
Makes real HTTP requests to API endpoints.

```javascript
const { RealApiTestClient } = require('../utils/testUtils');

describe('API tests', () => {
  let apiClient;
  
  beforeEach(() => {
    apiClient = new RealApiTestClient(app);
  });
  
  afterEach(async () => {
    await apiClient.cleanup();
  });
  
  test('Real API authentication', async () => {
    const { user, response } = await apiClient.createAndAuthenticate({
      email: 'test@example.com',
      isAdmin: true
    });
    
    expect(response.status).toBe(200);
    expect(apiClient.token).toBeDefined();
  });
});
```

### JWT Testing

#### RealJWTTestManager
Manages real JWT tokens with actual signing and verification.

```javascript
const { RealJWTTestManager } = require('../utils/testUtils');

test('Real JWT operations', () => {
  const payload = { userId: '123', isAdmin: true };
  
  // Real JWT signing
  const token = RealJWTTestManager.generateToken(payload);
  expect(token).toBeDefined();
  
  // Real JWT verification
  const decoded = RealJWTTestManager.verifyToken(token);
  expect(decoded.userId).toBe('123');
  expect(decoded.isAdmin).toBe(true);
});
```

### Performance Testing

#### PerformanceTestUtils
Measure real API and database operation performance.

```javascript
const { PerformanceTestUtils } = require('../utils/testUtils');

test('API endpoint performance', async () => {
  const performance = await PerformanceTestUtils.measureEndpointTime(
    apiClient,
    'GET',
    '/api/services'
  );
  
  expect(performance.responseTime).toBeLessThan(1000);
  expect(performance.response.status).toBe(200);
});

test('Database operation performance', async () => {
  const performance = await PerformanceTestUtils.measureDatabaseOperation(
    () => RealTestDataFactory.createUser()
  );
  
  expect(performance.operationTime).toBeLessThan(500);
  expect(performance.result._id).toBeDefined();
});
```

### Validation Testing

#### ValidationTestUtils
Test real model validation and API endpoint validation.

```javascript
const { ValidationTestUtils } = require('../utils/testUtils');

test('Model field validation', async () => {
  const results = await ValidationTestUtils.testFieldValidation(
    User,
    'email',
    ['invalid-email', ''], // Invalid values
    ['test@example.com']   // Valid values
  );
  
  results.invalid.forEach(result => {
    expect(result.passed).toBe(true); // Should catch invalid values
  });
});

test('API endpoint validation', async () => {
  const results = await ValidationTestUtils.testEndpointValidation(
    apiClient,
    'POST',
    '/api/services',
    [{}], // Invalid payloads
    [{ name: 'Valid Service', type: 'database' }] // Valid payloads
  );
  
  expect(results.invalid[0].passed).toBe(true); // Should reject invalid
  expect(results.valid[0].passed).toBe(true);   // Should accept valid
});
```

## Environment Setup

### TestEnvironment Class
Complete test environment setup and teardown.

```javascript
const { TestEnvironment } = require('../utils/testUtils');

describe('Integration tests', () => {
  let dbManager;
  
  beforeAll(async () => {
    dbManager = await TestEnvironment.setup(); // Complete setup
  });
  
  afterAll(async () => {
    await TestEnvironment.teardown(dbManager); // Complete cleanup
  });
  
  beforeEach(async () => {
    await TestEnvironment.reset(dbManager); // Reset between tests
  });
});
```

## Configuration

### Environment Variables

For tests to work with real implementations, set these environment variables:

```bash
# Test database (separate from development/production)
TEST_MONGODB_URI=mongodb://localhost:27017/mirabel_test

# JWT secret for test tokens
JWT_SECRET=your-test-jwt-secret

# API URL for frontend tests
REACT_APP_API_URL=http://localhost:3001

# Test mode
NODE_ENV=test
```

### Jest Configuration

#### Frontend (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@testing-library)/)'
  ],
  testTimeout: 10000 // Longer timeout for real operations
};
```

#### Backend (`server/jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  runInBand: true, // Sequential execution for database tests
  testTimeout: 15000 // Longer timeout for real operations
};
```

## Best Practices

### 1. Database Management
- Use separate test database (`mirabel_test`)
- Clear database between tests
- Use transactions when possible for faster rollback
- Consider in-memory MongoDB for speed vs real MongoDB for accuracy

### 2. Test Organization
- Group related tests in describe blocks
- Use proper setup/teardown for each test level
- Clean up resources after each test
- Use descriptive test names

### 3. Performance Considerations
- Set appropriate timeouts for real operations
- Run database tests sequentially to avoid conflicts
- Use real test data generators for consistent results
- Monitor test execution time

### 4. Error Handling
- Test real error scenarios
- Verify actual error messages and status codes
- Test edge cases and boundary conditions
- Don't suppress real errors - let them surface

### 5. Data Integrity
- Use unique identifiers for test data
- Clean up test data thoroughly
- Verify data persistence and retrieval
- Test data relationships and constraints

## Example Test Files

### Frontend Component Test
```javascript
// src/components/auth/Login.test.jsx
import { renderWithProviders } from '../../utils/testUtils';
import Login from './Login';

describe('Login Component', () => {
  test('renders and functions with real auth', async () => {
    renderWithProviders(<Login />);
    
    // Test with real form interactions
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(emailInput.value).toBe('test@example.com');
  });
});
```

### Backend API Test
```javascript
// server/tests/api/users.test.js
const { RealApiTestClient, TestEnvironment } = require('../../utils/testUtils');

describe('Users API', () => {
  let dbManager, apiClient;
  
  beforeAll(async () => {
    dbManager = await TestEnvironment.setup();
  });
  
  afterAll(async () => {
    await TestEnvironment.teardown(dbManager);
  });
  
  test('POST /api/users creates real user', async () => {
    apiClient = new RealApiTestClient(app);
    await apiClient.createAndAuthenticate({ isAdmin: true });
    
    const response = await apiClient.request('POST', '/api/users', {
      email: 'newuser@example.com',
      password: 'Password123!'
    });
    
    expect(response.status).toBe(201);
    expect(response.body.email).toBe('newuser@example.com');
  });
});
```

## Troubleshooting

### Common Issues

#### Database Connection Problems
```javascript
// Solution: Check MongoDB is running and accessible
const dbManager = new RealDatabaseTestManager();
await dbManager.connect(); // This will show connection errors
```

#### API Authentication Failures
```javascript
// Solution: Verify user exists and password is correct
const user = await RealTestDataFactory.createUser({
  email: 'test@example.com',
  password: 'TestPassword123!' // Use this exact password in test
});
```

#### Performance Test Timeouts
```javascript
// Solution: Increase timeout for real operations
test('slow operation', async () => {
  // Real operations may take longer than mocked ones
}, 15000); // 15 second timeout
```

#### Memory Leaks in Tests
```javascript
// Solution: Always clean up resources
afterEach(async () => {
  await apiClient.cleanup();
  await dbManager.clearDatabase();
});
```

## Migration from Mocked Tests

If you have existing tests with mocks, here's how to migrate:

### Before (with mocks)
```javascript
jest.mock('../services/api');
const mockApi = require('../services/api');

test('mocked test', () => {
  mockApi.get.mockResolvedValue({ data: 'fake data' });
  // Test uses fake data
});
```

### After (real implementation)
```javascript
import { RealApiTestUtils } from '../utils/testUtils';

test('real test', async () => {
  const apiUtils = new RealApiTestUtils();
  await apiUtils.authenticate();
  
  const response = await apiUtils.request('GET', '/api/data');
  // Test uses real data from actual API
});
```

## Conclusion

These test utilities provide a comprehensive foundation for testing with real implementations. They ensure that your tests are reliable, accurate, and truly representative of production behavior.

Remember: **Real tests catch real bugs that mocked tests miss.**