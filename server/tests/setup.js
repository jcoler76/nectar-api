// Real Test Setup for Mirabel API Server
// NO MOCKS - Uses real implementations for all tests

const { testEnvironment } = require('../utils/testUtils');

// Set up real test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-32-chars';
process.env.MONGODB_TEST_URI =
  process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/mirabel_test';
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'test-encryption-key-for-testing-32-chars';

// Configure test database settings
process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;
process.env.DB_BACKUP_ENABLED = 'false'; // Disable backups during testing
process.env.REDIS_HOST = process.env.REDIS_TEST_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_TEST_PORT || '6379';

// Set up logging for tests (keep errors visible)
global.console = {
  ...console,
  log: process.env.DEBUG_TESTS ? console.log : jest.fn(),
  info: process.env.DEBUG_TESTS ? console.info : jest.fn(),
  warn: console.warn, // Keep warnings visible
  error: console.error, // Keep errors visible for debugging
};

// Global setup and teardown
beforeAll(async () => {
  try {
    await testEnvironment.setup();
    console.log('Test environment setup complete');
  } catch (error) {
    console.error('Failed to set up test environment:', error);
    throw error;
  }
}, 30000); // 30 second timeout for setup

afterAll(async () => {
  try {
    await testEnvironment.teardown();
    console.log('Test environment torn down');
  } catch (error) {
    console.error('Failed to tear down test environment:', error);
  }
}, 30000); // 30 second timeout for teardown

// Clean up between test suites
afterEach(async () => {
  try {
    await testEnvironment.reset();
  } catch (error) {
    console.error('Failed to reset test environment:', error);
  }
});

// Export test environment for use in tests
global.testEnvironment = testEnvironment;
