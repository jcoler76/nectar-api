module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverage: true,
  coverageDirectory: '../coverage/server',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/logs/',
    '/tests/',
    '/scripts/',
    '/mcp/',
  ],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially for database operations
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
  roots: ['<rootDir>'],
  testPathIgnorePatterns: ['/node_modules/', '/coverage/'],
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(supertest|@testing-library)/)'],
  // Real implementations - NO mocking
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,
  // Ensure real modules are loaded
  moduleNameMapper: {},
  // Global setup for real database connections
  globalSetup: undefined,
  globalTeardown: undefined,
  // Environment variables for tests
  setupFiles: ['dotenv/config'],
};
