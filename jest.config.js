module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/logs/',
    '/__tests__/'
  ],
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  extensiveDepthLimit: 7,
  maxWorkers: 1,
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@testing-library|file-saver|react-router-dom|@azure|uuid|@babel|@microsoft|react-syntax-highlighter)/)'
  ],
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  }
};