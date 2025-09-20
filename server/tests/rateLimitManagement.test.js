const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const RateLimitConfig = require('../models/RateLimitConfig');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nectar-test';

describe('Rate Limit Management API', () => {
  let adminUser;
  let adminToken;
  let testConfigId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Create admin user for testing
    adminUser = new User({
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
      tier: 'enterprise',
    });
    await adminUser.save();

    // Generate admin token
    adminToken = jwt.sign(
      { userId: adminUser._id, email: adminUser.email },
      process.env.JWT_SECRET
    );
  });

  afterAll(async () => {
    // Clean up test data
    await RateLimitConfig.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up rate limit configs before each test
    await RateLimitConfig.deleteMany({});
  });

  describe('GET /api/admin/rate-limits/configs', () => {
    it('should fetch all rate limit configurations', async () => {
      // Create test config
      const testConfig = new RateLimitConfig({
        name: 'test-api',
        displayName: 'Test API Rate Limit',
        type: 'api',
        windowMs: 60000,
        max: 100,
        prefix: 'rl:test:',
        keyStrategy: 'application',
        createdBy: adminUser._id,
      });
      await testConfig.save();

      const response = await request(app)
        .get('/api/admin/rate-limits/configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('test-api');
    });

    it('should filter configurations by type', async () => {
      // Create multiple configs
      await RateLimitConfig.create([
        {
          name: 'api-limit',
          displayName: 'API Limit',
          type: 'api',
          windowMs: 60000,
          max: 100,
          prefix: 'rl:api:',
          keyStrategy: 'application',
          createdBy: adminUser._id,
        },
        {
          name: 'auth-limit',
          displayName: 'Auth Limit',
          type: 'auth',
          windowMs: 60000,
          max: 5,
          prefix: 'rl:auth:',
          keyStrategy: 'ip',
          createdBy: adminUser._id,
        },
      ]);

      const response = await request(app)
        .get('/api/admin/rate-limits/configs?type=api')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('api');
    });
  });

  describe('POST /api/admin/rate-limits/configs', () => {
    it('should create a new rate limit configuration', async () => {
      const configData = {
        name: 'new-api-limit',
        displayName: 'New API Rate Limit',
        description: 'Test rate limit configuration',
        type: 'api',
        windowMs: 900000, // 15 minutes
        max: 200,
        prefix: 'rl:new-api:',
        keyStrategy: 'application',
        enabled: true,
      };

      const response = await request(app)
        .post('/api/admin/rate-limits/configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(configData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(configData.name);
      expect(response.body.data.max).toBe(configData.max);
      expect(response.body.data.createdBy).toBeDefined();

      // Verify it was saved to database
      const savedConfig = await RateLimitConfig.findOne({ name: configData.name });
      expect(savedConfig).toBeTruthy();
      expect(savedConfig.max).toBe(configData.max);
    });

    it('should validate required fields', async () => {
      const invalidConfigData = {
        displayName: 'Invalid Config',
        // Missing required fields: name, type, windowMs, max, prefix
      };

      const response = await request(app)
        .post('/api/admin/rate-limits/configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidConfigData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
      expect(response.body.errors).toBeDefined();
    });

    it('should prevent duplicate configuration names', async () => {
      // Create first config
      const firstConfig = new RateLimitConfig({
        name: 'duplicate-test',
        displayName: 'First Config',
        type: 'api',
        windowMs: 60000,
        max: 100,
        prefix: 'rl:dup1:',
        keyStrategy: 'application',
        createdBy: adminUser._id,
      });
      await firstConfig.save();

      // Try to create duplicate
      const duplicateConfigData = {
        name: 'duplicate-test',
        displayName: 'Duplicate Config',
        type: 'api',
        windowMs: 60000,
        max: 100,
        prefix: 'rl:dup2:',
        keyStrategy: 'application',
      };

      const response = await request(app)
        .post('/api/admin/rate-limits/configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateConfigData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('PUT /api/admin/rate-limits/configs/:id', () => {
    beforeEach(async () => {
      const testConfig = new RateLimitConfig({
        name: 'update-test',
        displayName: 'Update Test Config',
        type: 'api',
        windowMs: 60000,
        max: 100,
        prefix: 'rl:update:',
        keyStrategy: 'application',
        createdBy: adminUser._id,
      });
      const saved = await testConfig.save();
      testConfigId = saved._id;
    });

    it('should update an existing configuration', async () => {
      const updateData = {
        displayName: 'Updated Display Name',
        max: 200,
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/admin/rate-limits/configs/${testConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.displayName).toBe(updateData.displayName);
      expect(response.body.data.max).toBe(updateData.max);
      expect(response.body.data.description).toBe(updateData.description);

      // Verify change was saved
      const updatedConfig = await RateLimitConfig.findById(testConfigId);
      expect(updatedConfig.displayName).toBe(updateData.displayName);
      expect(updatedConfig.max).toBe(updateData.max);
    });

    it('should track change history', async () => {
      const updateData = {
        max: 300,
        changeReason: 'Testing change tracking',
      };

      await request(app)
        .put(`/api/admin/rate-limits/configs/${testConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      const updatedConfig =
        await RateLimitConfig.findById(testConfigId).populate('changeHistory.changedBy');
      expect(updatedConfig.changeHistory).toHaveLength(1);
      expect(updatedConfig.changeHistory[0].changes.max.to).toBe(300);
      expect(updatedConfig.changeHistory[0].changedBy._id.toString()).toBe(
        adminUser._id.toString()
      );
    });

    it('should return 404 for non-existent configuration', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = { max: 200 };

      const response = await request(app)
        .put(`/api/admin/rate-limits/configs/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/admin/rate-limits/configs/:id/toggle', () => {
    beforeEach(async () => {
      const testConfig = new RateLimitConfig({
        name: 'toggle-test',
        displayName: 'Toggle Test Config',
        type: 'api',
        windowMs: 60000,
        max: 100,
        prefix: 'rl:toggle:',
        keyStrategy: 'application',
        enabled: true,
        createdBy: adminUser._id,
      });
      const saved = await testConfig.save();
      testConfigId = saved._id;
    });

    it('should toggle configuration enabled status', async () => {
      const response = await request(app)
        .post(`/api/admin/rate-limits/configs/${testConfigId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Testing toggle functionality' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);

      // Verify change was saved
      const updatedConfig = await RateLimitConfig.findById(testConfigId);
      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.changeHistory).toHaveLength(1);
    });
  });

  describe('DELETE /api/admin/rate-limits/configs/:id', () => {
    beforeEach(async () => {
      const testConfig = new RateLimitConfig({
        name: 'delete-test',
        displayName: 'Delete Test Config',
        type: 'api',
        windowMs: 60000,
        max: 100,
        prefix: 'rl:delete:',
        keyStrategy: 'application',
        createdBy: adminUser._id,
      });
      const saved = await testConfig.save();
      testConfigId = saved._id;
    });

    it('should delete a configuration', async () => {
      const response = await request(app)
        .delete(`/api/admin/rate-limits/configs/${testConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it was deleted
      const deletedConfig = await RateLimitConfig.findById(testConfigId);
      expect(deletedConfig).toBeNull();
    });

    it('should return 404 for non-existent configuration', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/admin/rate-limits/configs/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/admin/rate-limits/configs').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require admin privileges', async () => {
      // Create regular user
      const regularUser = new User({
        email: 'user@test.com',
        firstName: 'Regular',
        lastName: 'User',
        isAdmin: false,
        tier: 'free',
      });
      await regularUser.save();

      const userToken = jwt.sign(
        { userId: regularUser._id, email: regularUser.email },
        process.env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/admin/rate-limits/configs')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('admin');

      await User.findByIdAndDelete(regularUser._id);
    });
  });
});

module.exports = {};
