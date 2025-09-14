module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/auth/**/*.test.js'],
  collectCoverage: false,
  testTimeout: 30000,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
  roots: ['<rootDir>/../..'],
  moduleFileExtensions: ['js', 'json'],
  // NO setup files - run tests independently
  setupFilesAfterEnv: [],
  // Real implementations - NO mocking
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,
  moduleNameMapper: {},
  globalSetup: undefined,
  globalTeardown: undefined,
};
