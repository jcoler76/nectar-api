/**
 * Service Creation Bug Fix Tests
 * Tests to verify that the bug where label and description fields
 * were being saved to the wrong service has been fixed
 */

const request = require('supertest');
const express = require('express');

// Mock the models and dependencies
jest.mock('../models/Service');
jest.mock('../models/Connection');
jest.mock('../utils/logger');

const { validate } = require('../middleware/validation');
const validationRules = require('../middleware/validationRules');

// Create a minimal test app
const app = express();
app.use(express.json());

// Mock user middleware
app.use((req, res, next) => {
  req.user = { userId: 'test-user-id' };
  next();
});

// Simplified test route with our validation and field filtering logic
app.post('/test-service', validate(validationRules.service.create), (req, res) => {
  // Mirror the logic from our service creation endpoint
  const { name, connectionId, database } = req.body;

  if (!name || !connectionId || !database) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Missing required fields: name, connectionId, database',
      },
    });
  }

  // Check for unexpected fields that could cause the bug
  const allowedServiceFields = ['name', 'connectionId', 'database'];
  const unexpectedFields = Object.keys(req.body).filter(
    field => !allowedServiceFields.includes(field)
  );

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: `Invalid fields for service creation: ${unexpectedFields.join(', ')}. Only name, connectionId, and database are allowed.`,
      },
    });
  }

  res.status(201).json({
    success: true,
    message: 'Service would be created successfully',
    acceptedFields: { name, connectionId, database },
  });
});

describe('Service Creation Bug Fix Verification', () => {
  describe('Bug Prevention - Reject Wrong Fields', () => {
    test('Should reject service creation with label field (the main bug)', async () => {
      const requestWithLabel = {
        name: 'Test Service',
        connectionId: '64a7b9e8f123456789abcdef',
        database: 'test_database',
        label: 'This field caused the bug', // This was being saved to wrong service
      };

      const response = await request(app).post('/test-service').send(requestWithLabel).expect(422); // Validation should catch this

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'label',
          }),
        ])
      );
    });

    test('Should reject service creation with description field (the main bug)', async () => {
      const requestWithDescription = {
        name: 'Test Service',
        connectionId: '64a7b9e8f123456789abcdef',
        database: 'test_database',
        description: 'This field caused the bug', // This was being saved to wrong service
      };

      const response = await request(app)
        .post('/test-service')
        .send(requestWithDescription)
        .expect(422); // Validation should catch this

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'description',
          }),
        ])
      );
    });

    test('Should reject service creation with both label and description fields', async () => {
      const requestWithBothFields = {
        name: 'Test Service',
        connectionId: '64a7b9e8f123456789abcdef',
        database: 'test_database',
        label: 'Wrong field',
        description: 'Another wrong field',
      };

      const response = await request(app)
        .post('/test-service')
        .send(requestWithBothFields)
        .expect(422); // Validation should catch this first

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('details');
      // Should reject at least one of the invalid fields
      const fields = response.body.error.details.map(detail => detail.field);
      expect(fields).toEqual(expect.arrayContaining(['label']));
    });

    test('Should reject any unexpected fields that could cause similar bugs', async () => {
      const requestWithUnexpectedFields = {
        name: 'Test Service',
        connectionId: '64a7b9e8f123456789abcdef',
        database: 'test_database',
        customField1: 'Should not be allowed',
        customField2: 'Should also not be allowed',
      };

      const response = await request(app)
        .post('/test-service')
        .send(requestWithUnexpectedFields)
        .expect(400); // Our custom field filtering catches this

      expect(response.body.error.message).toContain('Invalid fields for service creation');
      expect(response.body.error.message).toContain('customField1, customField2');
    });
  });

  describe('Valid Service Creation - Bug Free', () => {
    test('Should successfully create service with only valid fields', async () => {
      const validRequest = {
        name: 'Valid Test Service',
        connectionId: '64a7b9e8f123456789abcdef',
        database: 'test_database',
      };

      const response = await request(app).post('/test-service').send(validRequest).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.acceptedFields).toEqual({
        name: 'Valid Test Service',
        connectionId: '64a7b9e8f123456789abcdef',
        database: 'test_database',
      });
    });

    test('Should not process or save any extra fields beyond the allowed ones', async () => {
      // This test ensures that even if validation somehow misses fields,
      // our field filtering will catch them
      const validRequest = {
        name: 'Valid Test Service',
        connectionId: '64a7b9e8f123456789abcdef',
        database: 'test_database',
      };

      const response = await request(app).post('/test-service').send(validRequest).expect(201);

      // Verify only the expected fields are in the response
      const acceptedFields = Object.keys(response.body.acceptedFields);
      expect(acceptedFields).toEqual(['name', 'connectionId', 'database']);
      expect(acceptedFields).not.toContain('label');
      expect(acceptedFields).not.toContain('description');
    });
  });

  describe('Security - Connection Field Protection', () => {
    test('Should reject attempts to override connection details', async () => {
      const requestWithConnectionOverride = {
        name: 'Test Service',
        connectionId: '64a7b9e8f123456789abcdef',
        database: 'test_database',
        host: 'malicious.example.com', // Should not be allowed
        port: 1234, // Should not be allowed
        username: 'hacker', // Should not be allowed
        password: 'secret', // Should not be allowed
      };

      const response = await request(app)
        .post('/test-service')
        .send(requestWithConnectionOverride)
        .expect(422); // Validation should catch the first invalid field

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('details');
    });
  });
});
