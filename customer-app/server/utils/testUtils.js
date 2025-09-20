/**
 * Backend Test Utilities for API and Database Testing
 *
 * These utilities provide real implementations for testing backend functionality
 * without mocks. All database operations, API calls, and services use actual implementations.
 */

const mongoose = require('mongoose');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Models
const User = require('../models/User');
const Service = require('../models/Service');
const Connection = require('../models/Connection');
const Workflow = require('../models/workflowModels');
const Application = require('../models/Application');
const Role = require('../models/Role');

/**
 * Real Database Test Manager
 *
 * Manages real MongoDB connections for testing
 */
class RealDatabaseTestManager {
  constructor() {
    this.mongoServer = null;
    this.connection = null;
  }

  /**
   * Connect to test database
   */
  async connect(useInMemory = false) {
    try {
      if (useInMemory) {
        // Use in-memory MongoDB for faster tests
        this.mongoServer = await MongoMemoryServer.create();
        const uri = this.mongoServer.getUri();
        this.connection = await mongoose.connect(uri);
      } else {
        // Use real test database
        const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/nectar_test';
        this.connection = await mongoose.connect(testDbUri);
      }

      console.log('Connected to test database');
      return this.connection;
    } catch (error) {
      console.error('Failed to connect to test database:', error);
      throw error;
    }
  }

  /**
   * Clear all collections in test database
   */
  async clearDatabase() {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }

  /**
   * Drop test database
   */
  async dropDatabase() {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
  }

  /**
   * Disconnect from test database
   */
  async disconnect() {
    await mongoose.disconnect();

    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }

  /**
   * Seed database with test data
   */
  async seed(data = {}) {
    const seededData = {};

    if (data.users) {
      seededData.users = await User.insertMany(data.users);
    }

    if (data.services) {
      seededData.services = await Service.insertMany(data.services);
    }

    if (data.connections) {
      seededData.connections = await Connection.insertMany(data.connections);
    }

    if (data.workflows) {
      seededData.workflows = await Workflow.insertMany(data.workflows);
    }

    if (data.applications) {
      seededData.applications = await Application.insertMany(data.applications);
    }

    if (data.roles) {
      seededData.roles = await Role.insertMany(data.roles);
    }

    return seededData;
  }
}

/**
 * Real Test Data Factory
 *
 * Creates real database records for testing
 */
class RealTestDataFactory {
  /**
   * Create a real user in database
   */
  static async createUser(data = {}) {
    const defaultData = {
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      isAdmin: false,
      isActive: true,
    };

    const userData = { ...defaultData, ...data };

    // Hash password with real bcrypt
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const user = new User(userData);
    await user.save();

    return user;
  }

  /**
   * Create a real service in database
   */
  static async createService(data = {}) {
    const defaultData = {
      name: `Test Service ${Date.now()}`,
      description: 'Test service description',
      type: 'database',
      active: true,
      endpoints: [],
      configuration: {},
    };

    const serviceData = { ...defaultData, ...data };
    const service = new Service(serviceData);
    await service.save();

    return service;
  }

  /**
   * Create a real connection in database
   */
  static async createConnection(data = {}) {
    const defaultData = {
      name: `Test Connection ${Date.now()}`,
      type: 'mongodb',
      host: 'localhost',
      port: 27017,
      database: 'test_db',
      username: '',
      password: '',
      active: true,
    };

    const connectionData = { ...defaultData, ...data };
    const connection = new Connection(connectionData);
    await connection.save();

    return connection;
  }

  /**
   * Create a real workflow in database
   */
  static async createWorkflow(data = {}) {
    const defaultData = {
      name: `Test Workflow ${Date.now()}`,
      description: 'Test workflow description',
      nodes: [],
      edges: [],
      trigger: { type: 'manual' },
      active: true,
    };

    const workflowData = { ...defaultData, ...data };
    const workflow = new Workflow(workflowData);
    await workflow.save();

    return workflow;
  }

  /**
   * Create a real application in database
   */
  static async createApplication(data = {}) {
    const defaultData = {
      name: `Test Application ${Date.now()}`,
      description: 'Test application description',
      isActive: true,
    };

    const applicationData = { ...defaultData, ...data };
    const application = new Application(applicationData);

    // Generate real API key
    application.apiKey = await application.generateApiKey();
    await application.save();

    return application;
  }

  /**
   * Create a real role in database
   */
  static async createRole(data = {}) {
    const defaultData = {
      name: `Test Role ${Date.now()}`,
      description: 'Test role description',
      permissions: [],
      isSystem: false,
    };

    const roleData = { ...defaultData, ...data };
    const role = new Role(roleData);
    await role.save();

    return role;
  }
}

/**
 * Real API Test Client
 *
 * Makes real HTTP requests to API endpoints
 */
class RealApiTestClient {
  constructor(app) {
    this.app = app;
    this.agent = request.agent(app);
    this.token = null;
    this.user = null;
  }

  /**
   * Authenticate with real credentials
   */
  async authenticate(email, password) {
    const response = await this.agent.post('/api/auth/login').send({ email, password });

    if (response.body.token) {
      this.token = response.body.token;
      this.user = response.body.user;
    }

    return response;
  }

  /**
   * Create and authenticate a test user
   */
  async createAndAuthenticate(userData = {}) {
    const user = await RealTestDataFactory.createUser(userData);
    const plainPassword = userData.password || 'TestPassword123!';

    const response = await this.authenticate(user.email, plainPassword);
    return { user, response };
  }

  /**
   * Make authenticated request
   */
  async request(method, path, data = null) {
    let req = this.agent[method.toLowerCase()](path);

    if (this.token) {
      req = req.set('Authorization', `Bearer ${this.token}`);
    }

    if (data) {
      req = req.send(data);
    }

    return req;
  }

  /**
   * Clean up test data created by this client
   */
  async cleanup() {
    if (this.user && this.user._id) {
      await User.findByIdAndDelete(this.user._id);
    }

    this.token = null;
    this.user = null;
  }
}

/**
 * Real JWT Test Manager
 *
 * Manages real JWT tokens for testing
 */
class RealJWTTestManager {
  /**
   * Generate a real JWT token
   */
  static generateToken(payload, expiresIn = '1h') {
    const secret = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify a real JWT token
   */
  static verifyToken(token) {
    const secret = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
    return jwt.verify(token, secret);
  }

  /**
   * Generate tokens for different user roles
   */
  static async generateRoleTokens() {
    const adminUser = await RealTestDataFactory.createUser({ isAdmin: true });
    const normalUser = await RealTestDataFactory.createUser({ isAdmin: false });

    return {
      admin: this.generateToken({ userId: adminUser._id, isAdmin: true }),
      user: this.generateToken({ userId: normalUser._id, isAdmin: false }),
    };
  }
}

/**
 * Test Environment Setup
 */
class TestEnvironment {
  /**
   * Set up complete test environment
   */
  static async setup() {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
    process.env.MONGODB_URI =
      process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/nectar_test';

    // Connect to test database
    const dbManager = new RealDatabaseTestManager();
    await dbManager.connect();

    return dbManager;
  }

  /**
   * Tear down test environment
   */
  static async teardown(dbManager) {
    if (dbManager) {
      await dbManager.clearDatabase();
      await dbManager.disconnect();
    }
  }

  /**
   * Reset database between tests
   */
  static async reset(dbManager) {
    if (dbManager) {
      await dbManager.clearDatabase();
    }
  }
}

/**
 * Performance Test Utilities
 */
class PerformanceTestUtils {
  /**
   * Measure API endpoint response time
   */
  static async measureEndpointTime(client, method, path, data = null) {
    const startTime = Date.now();
    const response = await client.request(method, path, data);
    const endTime = Date.now();

    return {
      responseTime: endTime - startTime,
      response,
    };
  }

  /**
   * Measure database operation time
   */
  static async measureDatabaseOperation(operation) {
    const startTime = Date.now();
    const result = await operation();
    const endTime = Date.now();

    return {
      operationTime: endTime - startTime,
      result,
    };
  }

  /**
   * Load test an endpoint
   */
  static async loadTest(client, method, path, data = null, requests = 100) {
    const results = [];

    for (let i = 0; i < requests; i++) {
      const measurement = await this.measureEndpointTime(client, method, path, data);
      results.push(measurement.responseTime);
    }

    return {
      totalRequests: requests,
      averageTime: results.reduce((a, b) => a + b, 0) / results.length,
      minTime: Math.min(...results),
      maxTime: Math.max(...results),
      times: results,
    };
  }
}

/**
 * Validation Test Utilities
 */
class ValidationTestUtils {
  /**
   * Test field validation
   */
  static async testFieldValidation(Model, field, invalidValues, validValues) {
    const results = {
      invalid: [],
      valid: [],
    };

    // Test invalid values
    for (const value of invalidValues) {
      try {
        const doc = new Model({ [field]: value });
        await doc.validate();
        results.invalid.push({ value, error: null, passed: false });
      } catch (error) {
        results.invalid.push({ value, error: error.message, passed: true });
      }
    }

    // Test valid values
    for (const value of validValues) {
      try {
        const doc = new Model({ [field]: value });
        await doc.validate();
        results.valid.push({ value, error: null, passed: true });
      } catch (error) {
        results.valid.push({ value, error: error.message, passed: false });
      }
    }

    return results;
  }

  /**
   * Test API endpoint validation
   */
  static async testEndpointValidation(client, method, path, invalidPayloads, validPayloads) {
    const results = {
      invalid: [],
      valid: [],
    };

    // Test invalid payloads
    for (const payload of invalidPayloads) {
      const response = await client.request(method, path, payload);
      results.invalid.push({
        payload,
        status: response.status,
        error: response.body.error || response.body.message,
        passed: response.status >= 400,
      });
    }

    // Test valid payloads
    for (const payload of validPayloads) {
      const response = await client.request(method, path, payload);
      results.valid.push({
        payload,
        status: response.status,
        error: response.body.error || response.body.message,
        passed: response.status < 400,
      });
    }

    return results;
  }
}

module.exports = {
  RealDatabaseTestManager,
  RealTestDataFactory,
  RealApiTestClient,
  RealJWTTestManager,
  TestEnvironment,
  PerformanceTestUtils,
  ValidationTestUtils,
};
