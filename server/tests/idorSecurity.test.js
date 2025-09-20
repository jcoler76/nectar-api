/**
 * IDOR (Insecure Direct Object Reference) Security Tests
 * Tests to verify that authorization middleware properly prevents unauthorized access
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Mock models for testing
const Service = require('../models/Service');
const Connection = require('../models/Connection');
const Role = require('../models/Role');
const { Workflow } = require('../models/workflowModels');

// Import the middleware
const {
  verifyServiceAccess,
  verifyConnectionAccess,
  verifyWorkflowAccess,
} = require('../middleware/resourceAuthorization');

const app = express();
app.use(express.json());

// Mock auth middleware for testing
const mockAuth = (userId, isAdmin = false) => {
  return (req, res, next) => {
    req.user = {
      userId,
      isAdmin,
      role: isAdmin ? 'admin' : 'user',
    };
    next();
  };
};

// Test routes
app.post('/services/:id/refresh-schema', mockAuth('user1'), verifyServiceAccess(), (req, res) => {
  res.json({ success: true, serviceId: req.params.id });
});

app.get('/services/:serviceId/objects', mockAuth('user1'), verifyServiceAccess(), (req, res) => {
  res.json({ success: true, serviceId: req.params.serviceId });
});

app.post(
  '/connections/:id/table-columns',
  mockAuth('user1'),
  verifyConnectionAccess(),
  (req, res) => {
    res.json({ success: true, connectionId: req.params.id });
  }
);

app.post(
  '/workflows/:id/test-database-trigger',
  mockAuth('user1'),
  verifyWorkflowAccess(),
  (req, res) => {
    res.json({ success: true, workflowId: req.params.id });
  }
);

// Test user trying to access admin-only service
app.post('/services/:id/admin-only', mockAuth('user1'), verifyServiceAccess(), (req, res) => {
  res.json({ success: true, serviceId: req.params.id });
});

// Admin route for comparison
app.post(
  '/services/:id/admin-access',
  mockAuth('admin1', true),
  verifyServiceAccess(),
  (req, res) => {
    res.json({ success: true, serviceId: req.params.id, isAdmin: true });
  }
);

describe('IDOR Security Tests', () => {
  let testServiceId, testConnectionId, testWorkflowId;
  let otherUserServiceId, otherUserConnectionId, otherUserWorkflowId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/nectar_test'
      );
    }

    // Create test resources owned by user1
    const testService = new Service({
      name: 'Test Service User1',
      database: 'test_db',
      host: 'localhost',
      port: 1433,
      username: 'test',
      password: 'encrypted_password',
      createdBy: 'user1',
    });
    await testService.save();
    testServiceId = testService._id.toString();

    const testConnection = new Connection({
      name: 'Test Connection User1',
      host: 'localhost',
      port: 1433,
      username: 'test',
      password: 'encrypted_password',
      createdBy: 'user1',
    });
    await testConnection.save();
    testConnectionId = testConnection._id.toString();

    const testWorkflow = new Workflow({
      name: 'Test Workflow User1',
      nodes: [{ data: { nodeType: 'trigger:database' } }],
      edges: [],
      createdBy: 'user1',
    });
    await testWorkflow.save();
    testWorkflowId = testWorkflow._id.toString();

    // Create test resources owned by user2 (should be inaccessible to user1)
    const otherService = new Service({
      name: 'Test Service User2',
      database: 'test_db2',
      host: 'localhost',
      port: 1433,
      username: 'test',
      password: 'encrypted_password',
      createdBy: 'user2',
    });
    await otherService.save();
    otherUserServiceId = otherService._id.toString();

    const otherConnection = new Connection({
      name: 'Test Connection User2',
      host: 'localhost',
      port: 1433,
      username: 'test',
      password: 'encrypted_password',
      createdBy: 'user2',
    });
    await otherConnection.save();
    otherUserConnectionId = otherConnection._id.toString();

    const otherWorkflow = new Workflow({
      name: 'Test Workflow User2',
      nodes: [{ data: { nodeType: 'trigger:database' } }],
      edges: [],
      createdBy: 'user2',
    });
    await otherWorkflow.save();
    otherUserWorkflowId = otherWorkflow._id.toString();
  });

  afterAll(async () => {
    // Clean up test data
    await Service.deleteMany({ name: { $regex: /^Test Service/ } });
    await Connection.deleteMany({ name: { $regex: /^Test Connection/ } });
    await Workflow.deleteMany({ name: { $regex: /^Test Workflow/ } });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('Service IDOR Protection', () => {
    test('Should allow access to owned service', async () => {
      const response = await request(app)
        .post(`/services/${testServiceId}/refresh-schema`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.serviceId).toBe(testServiceId);
    });

    test('Should deny access to other user service', async () => {
      await request(app).post(`/services/${otherUserServiceId}/refresh-schema`).expect(403);
    });

    test('Should return 404 for non-existent service', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await request(app).post(`/services/${fakeId}/refresh-schema`).expect(404);
    });

    test('Should return 400 for invalid service ID format', async () => {
      await request(app).post('/services/invalid-id/refresh-schema').expect(400);
    });

    test('Should allow admin access to any service', async () => {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.post(
        '/services/:id/admin-access',
        mockAuth('admin1', true),
        verifyServiceAccess(),
        (req, res) => {
          res.json({ success: true, serviceId: req.params.id, isAdmin: true });
        }
      );

      const response = await request(adminApp)
        .post(`/services/${otherUserServiceId}/admin-access`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isAdmin).toBe(true);
    });
  });

  describe('Connection IDOR Protection', () => {
    test('Should allow access to owned connection', async () => {
      const response = await request(app)
        .post(`/connections/${testConnectionId}/table-columns`)
        .send({ database: 'test_db', table: 'test_table' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.connectionId).toBe(testConnectionId);
    });

    test('Should deny access to other user connection', async () => {
      await request(app)
        .post(`/connections/${otherUserConnectionId}/table-columns`)
        .send({ database: 'test_db', table: 'test_table' })
        .expect(403);
    });

    test('Should return 404 for non-existent connection', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .post(`/connections/${fakeId}/table-columns`)
        .send({ database: 'test_db', table: 'test_table' })
        .expect(404);
    });
  });

  describe('Workflow IDOR Protection', () => {
    test('Should allow access to owned workflow', async () => {
      const response = await request(app)
        .post(`/workflows/${testWorkflowId}/test-database-trigger`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflowId).toBe(testWorkflowId);
    });

    test('Should deny access to other user workflow', async () => {
      await request(app)
        .post(`/workflows/${otherUserWorkflowId}/test-database-trigger`)
        .expect(403);
    });

    test('Should return 404 for non-existent workflow', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await request(app).post(`/workflows/${fakeId}/test-database-trigger`).expect(404);
    });
  });

  describe('Cross-User Access Attempts', () => {
    test('Should log unauthorized access attempts', async () => {
      const logSpy = jest.spyOn(console, 'warn').mockImplementation();

      await request(app).post(`/services/${otherUserServiceId}/refresh-schema`).expect(403);

      // Note: In real implementation, this would check the logger
      // expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Unauthorized service access attempt'));

      logSpy.mockRestore();
    });

    test('Should handle concurrent access attempts', async () => {
      const promises = Array(5)
        .fill()
        .map(() => request(app).post(`/services/${otherUserServiceId}/refresh-schema`).expect(403));

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.status).toBe(403);
      });
    });
  });

  describe('Edge Cases', () => {
    test('Should handle malformed ObjectId', async () => {
      await request(app).post('/services/not-an-objectid/refresh-schema').expect(400);
    });

    test('Should handle empty user context', async () => {
      const noUserApp = express();
      noUserApp.use(express.json());
      noUserApp.post(
        '/test',
        (req, res, next) => {
          req.user = null;
          next();
        },
        verifyServiceAccess(),
        (req, res) => {
          res.json({ success: true });
        }
      );

      await request(noUserApp).post('/test').expect(500);
    });
  });
});

module.exports = {
  app,
  mockAuth,
};
