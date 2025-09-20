/**
 * Backend Test Utilities for API and Database Testing
 *
 * These utilities provide real implementations for testing backend functionality
 * without mocks. All database operations, API calls, and services use actual implementations.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client for testing
const prisma = new PrismaClient();

/**
 * Real Database Test Manager
 *
 * Manages real PostgreSQL connections for testing via Prisma
 */
class RealDatabaseTestManager {
  constructor() {
    this.prisma = prisma;
  }

  /**
   * Connect to test database
   */
  async connect() {
    try {
      // Test the connection
      await this.prisma.$connect();
      console.log('Connected to test database (PostgreSQL via Prisma)');
      return this.prisma;
    } catch (error) {
      console.error('Failed to connect to test database:', error);
      throw error;
    }
  }

  /**
   * Clear all tables in test database
   */
  async clearDatabase() {
    try {
      // Clear all tables in reverse order to handle foreign key constraints
      await this.prisma.databaseObject.deleteMany({});
      await this.prisma.role.deleteMany({});
      await this.prisma.service.deleteMany({});
      await this.prisma.databaseConnection.deleteMany({});
      await this.prisma.user.deleteMany({});
      await this.prisma.organization.deleteMany({});

      console.log('Test database cleared');
    } catch (error) {
      console.error('Failed to clear test database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from test database
   */
  async disconnect() {
    try {
      await this.prisma.$disconnect();
      console.log('Disconnected from test database');
    } catch (error) {
      console.error('Failed to disconnect from test database:', error);
      throw error;
    }
  }

  /**
   * Seed database with test data
   */
  async seed(data = {}) {
    try {
      const seededData = {};

      // Create organizations first (required for foreign keys)
      if (data.organizations) {
        seededData.organizations = [];
        for (const orgData of data.organizations) {
          const org = await this.prisma.organization.create({ data: orgData });
          seededData.organizations.push(org);
        }
      }

      // Create users
      if (data.users) {
        seededData.users = [];
        for (const userData of data.users) {
          const user = await this.prisma.user.create({ data: userData });
          seededData.users.push(user);
        }
      }

      // Create connections
      if (data.connections) {
        seededData.connections = [];
        for (const connectionData of data.connections) {
          const connection = await this.prisma.databaseConnection.create({ data: connectionData });
          seededData.connections.push(connection);
        }
      }

      // Create services
      if (data.services) {
        seededData.services = [];
        for (const serviceData of data.services) {
          const service = await this.prisma.service.create({ data: serviceData });
          seededData.services.push(service);
        }
      }

      // Create roles
      if (data.roles) {
        seededData.roles = [];
        for (const roleData of data.roles) {
          const role = await this.prisma.role.create({ data: roleData });
          seededData.roles.push(role);
        }
      }

      return seededData;
    } catch (error) {
      console.error('Failed to seed test database:', error);
      throw error;
    }
  }
}

/**
 * Real Test Data Factory
 *
 * Creates real database records for testing using Prisma
 */
class RealTestDataFactory {
  /**
   * Create a test organization
   */
  static async createOrganization(data = {}) {
    const defaultData = {
      name: `Test Org ${Date.now()}`,
      subdomain: `test${Date.now()}`,
      isActive: true,
    };

    const orgData = { ...defaultData, ...data };
    return await prisma.organization.create({ data: orgData });
  }

  /**
   * Create a real user in database
   */
  static async createUser(data = {}) {
    // Ensure we have an organization
    let organizationId = data.organizationId;
    if (!organizationId) {
      const org = await this.createOrganization();
      organizationId = org.id;
    }

    const defaultData = {
      email: `test${Date.now()}@example.com`,
      passwordHash: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      organizationId,
    };

    const userData = { ...defaultData, ...data };

    // Hash password with real bcrypt
    if (userData.passwordHash) {
      userData.passwordHash = await bcrypt.hash(userData.passwordHash, 10);
    }

    return await prisma.user.create({ data: userData });
  }

  /**
   * Create a real service in database
   */
  static async createService(data = {}) {
    // Ensure we have required foreign keys
    let organizationId = data.organizationId;
    let connectionId = data.connectionId;

    if (!organizationId) {
      const org = await this.createOrganization();
      organizationId = org.id;
    }

    if (!connectionId) {
      const connection = await this.createConnection({ organizationId });
      connectionId = connection.id;
    }

    const defaultData = {
      name: `test_service_${Date.now()}`,
      label: 'Test Service',
      description: 'Test service description',
      database: 'test_db',
      isActive: true,
      organizationId,
      connectionId,
    };

    const serviceData = { ...defaultData, ...data };
    return await prisma.service.create({ data: serviceData });
  }

  /**
   * Create a real connection in database
   */
  static async createConnection(data = {}) {
    // Ensure we have an organization
    let organizationId = data.organizationId;
    if (!organizationId) {
      const org = await this.createOrganization();
      organizationId = org.id;
    }

    const defaultData = {
      name: `test_connection_${Date.now()}`,
      type: 'POSTGRESQL',
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      passwordEncrypted: 'encrypted_password',
      isActive: true,
      organizationId,
    };

    const connectionData = { ...defaultData, ...data };
    return await prisma.databaseConnection.create({ data: connectionData });
  }

  /**
   * Create a real role in database
   */
  static async createRole(data = {}) {
    // Ensure we have required foreign keys
    let organizationId = data.organizationId;
    let serviceId = data.serviceId;

    if (!organizationId) {
      const org = await this.createOrganization();
      organizationId = org.id;
    }

    if (!serviceId) {
      const service = await this.createService({ organizationId });
      serviceId = service.id;
    }

    const defaultData = {
      name: `test_role_${Date.now()}`,
      description: 'Test role description',
      permissions: {},
      isActive: true,
      organizationId,
      serviceId,
    };

    const roleData = { ...defaultData, ...data };
    return await prisma.role.create({ data: roleData });
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
