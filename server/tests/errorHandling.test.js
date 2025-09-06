const request = require('supertest');
const express = require('express');
const { errorMiddleware } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');

// Mock logger to prevent actual logging during tests
jest.mock('../middleware/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Error Handling', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Test routes that trigger different errors
    app.get('/test/error', (req, res, next) => {
      const error = new Error('Test error');
      next(error);
    });

    app.get('/test/validation', (req, res) => {
      res.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Please check your input and try again',
        },
      });
    });

    app.get('/test/not-found', (req, res) => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
    });

    app.get('/test/unauthorized', (req, res) => {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });

    // Apply error middleware (must be last)
    app.use(errorMiddleware);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should handle generic errors without exposing internals', async () => {
    const response = await request(app).get('/test/error').expect(500);

    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred processing your request',
      },
    });

    // Verify error was logged
    expect(logger.error).toHaveBeenCalledWith(
      'Error occurred',
      expect.objectContaining({ error: 'Test error' })
    );
  });

  test('should return proper validation error format', async () => {
    const response = await request(app).get('/test/validation').expect(422);

    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Please check your input and try again',
      },
    });
  });

  test('should return proper 404 error format', async () => {
    const response = await request(app).get('/test/not-found').expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });

  test('should return proper 401 error format', async () => {
    const response = await request(app).get('/test/unauthorized').expect(401);

    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  });

  test('should not expose stack traces in production', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(app).get('/test/error').expect(500);

    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).not.toHaveProperty('details');
    expect(response.body.error.message).not.toContain('Test error');

    process.env.NODE_ENV = 'test';
  });

  test('should sanitize error messages', async () => {
    // Test that database connection details are not exposed
    const dbError = new Error('connect ECONNREFUSED 192.168.1.100:1433');
    dbError.code = 'ECONNREFUSED';

    app.get('/test/db-error', (req, res, next) => {
      next(dbError);
    });

    const response = await request(app).get('/test/db-error').expect(500);

    expect(response.body.error.message).not.toContain('192.168.1.100');
    expect(response.body.error.message).not.toContain('1433');
    expect(response.body.error.message).toBe('An error occurred processing your request');
  });
});
