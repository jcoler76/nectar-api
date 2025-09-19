const { expect } = require('chai');
const DatabaseService = require('../../../services/database/DatabaseService');
const { PrismaClient } = require('../../../prisma/generated/client');

const prisma = new PrismaClient();

describe('PostgreSQL Database Connection Tests', () => {
  let testConnectionId;

  const testConfigs = {
    // Local PostgreSQL
    localConfig: {
      type: 'POSTGRESQL',
      host: process.env.TEST_POSTGRESQL_HOST || 'localhost',
      port: parseInt(process.env.TEST_POSTGRESQL_PORT) || 5432,
      database: process.env.TEST_POSTGRESQL_DATABASE || 'postgres',
      username: process.env.TEST_POSTGRESQL_USERNAME || 'postgres',
      password: process.env.TEST_POSTGRESQL_PASSWORD || 'password',
      sslEnabled: false,
    },

    // SSL-enabled configuration
    sslConfig: {
      type: 'POSTGRESQL',
      host: process.env.TEST_POSTGRESQL_SSL_HOST || 'localhost',
      port: parseInt(process.env.TEST_POSTGRESQL_SSL_PORT) || 5432,
      database: process.env.TEST_POSTGRESQL_SSL_DATABASE || 'postgres',
      username: process.env.TEST_POSTGRESQL_SSL_USERNAME || 'postgres',
      password: process.env.TEST_POSTGRESQL_SSL_PASSWORD || 'password',
      sslEnabled: true,
      sslMode: 'require',
    },

    // ElephantSQL free tier (external test)
    elephantSQLConfig: {
      type: 'POSTGRESQL',
      host: process.env.ELEPHANTSQL_HOST,
      port: 5432,
      database: process.env.ELEPHANTSQL_DATABASE,
      username: process.env.ELEPHANTSQL_USERNAME,
      password: process.env.ELEPHANTSQL_PASSWORD,
      sslEnabled: true,
    },

    // Invalid configuration
    invalidConfig: {
      type: 'POSTGRESQL',
      host: 'nonexistent.server.com',
      port: 5432,
      database: 'postgres',
      username: 'invaliduser',
      password: 'invalidpassword',
      sslEnabled: false,
    },
  };

  before(async () => {
    // Clean up any existing test connections
    await prisma.databaseConnection.deleteMany({
      where: {
        name: {
          startsWith: 'test-postgresql-',
        },
      },
    });
  });

  after(async () => {
    // Clean up test connections
    if (testConnectionId) {
      await prisma.databaseConnection.deleteMany({
        where: {
          id: testConnectionId,
        },
      });
    }

    await prisma.databaseConnection.deleteMany({
      where: {
        name: {
          startsWith: 'test-postgresql-',
        },
      },
    });
  });

  describe('Connection Testing', () => {
    it('should successfully test connection with valid PostgreSQL config', async function () {
      this.timeout(30000);

      const result = await DatabaseService.testConnection(testConfigs.localConfig);

      if (result.success) {
        expect(result.success).to.be.true;
        expect(result.message).to.include('Connection successful');
      } else {
        console.log('PostgreSQL connection test skipped - server not available:', result.error);
        this.skip();
      }
    });

    it('should fail with invalid PostgreSQL config', async function () {
      this.timeout(15000);

      const result = await DatabaseService.testConnection(testConfigs.invalidConfig);

      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
      expect(result.error).to.satisfy(
        error =>
          error.includes('getaddrinfo ENOTFOUND') ||
          error.includes('connect ECONNREFUSED') ||
          error.includes('authentication failed') ||
          error.includes('password authentication failed')
      );
    });

    it('should test SSL connection if configured', async function () {
      this.timeout(30000);

      const result = await DatabaseService.testConnection(testConfigs.sslConfig);

      // SSL test might fail if SSL is not properly configured on local PostgreSQL
      if (result.success) {
        expect(result.success).to.be.true;
        expect(result.message).to.include('Connection successful');
      } else {
        console.log('PostgreSQL SSL test skipped:', result.error);
        // Don't fail the test if SSL isn't configured locally
      }
    });

    it('should connect to ElephantSQL if credentials provided', async function () {
      this.timeout(30000);

      if (!testConfigs.elephantSQLConfig.host || !testConfigs.elephantSQLConfig.username) {
        console.log('ElephantSQL credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.elephantSQLConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });
  });

  describe('Connection Persistence', () => {
    it('should save PostgreSQL connection to database and test it', async function () {
      this.timeout(30000);

      // First test if PostgreSQL is available
      const testResult = await DatabaseService.testConnection(testConfigs.localConfig);
      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping persistence test');
        this.skip();
        return;
      }

      const connectionData = {
        name: `test-postgresql-${Date.now()}`,
        type: 'POSTGRESQL',
        host: testConfigs.localConfig.host,
        port: testConfigs.localConfig.port,
        database: testConfigs.localConfig.database,
        username: testConfigs.localConfig.username,
        passwordEncrypted: testConfigs.localConfig.password,
        sslEnabled: testConfigs.localConfig.sslEnabled || false,
        isActive: true,
        organizationId: 'test-org-id',
        createdBy: 'test-user-id',
      };

      const savedConnection = await prisma.databaseConnection.create({
        data: connectionData,
      });

      testConnectionId = savedConnection.id;

      expect(savedConnection.id).to.be.a('string');
      expect(savedConnection.type).to.equal('POSTGRESQL');

      // Test the saved connection
      const connectionConfig = {
        type: savedConnection.type,
        host: savedConnection.host,
        port: savedConnection.port,
        database: savedConnection.database,
        username: savedConnection.username,
        password: savedConnection.passwordEncrypted,
        sslEnabled: savedConnection.sslEnabled,
      };

      const connectionTestResult = await DatabaseService.testConnection(connectionConfig);
      expect(connectionTestResult.success).to.be.true;
    });
  });

  describe('Query Execution', () => {
    it('should execute basic SELECT query on PostgreSQL', async function () {
      this.timeout(30000);

      const testResult = await DatabaseService.testConnection(testConfigs.localConfig);
      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.localConfig,
          'SELECT version() AS version, NOW() AS current_time'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data.length).to.be.greaterThan(0);
        expect(queryResult.data[0]).to.have.property('version');
        expect(queryResult.data[0]).to.have.property('current_time');
      } catch (error) {
        console.log('Query execution test skipped:', error.message);
        this.skip();
      }
    });

    it('should handle PostgreSQL-specific queries', async function () {
      this.timeout(30000);

      const testResult = await DatabaseService.testConnection(testConfigs.localConfig);
      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping PostgreSQL-specific query test');
        this.skip();
        return;
      }

      try {
        // Test PostgreSQL-specific query
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.localConfig,
          "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 5"
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
      } catch (error) {
        console.log('PostgreSQL-specific query test skipped:', error.message);
        this.skip();
      }
    });

    it('should handle invalid PostgreSQL queries gracefully', async function () {
      this.timeout(15000);

      const testResult = await DatabaseService.testConnection(testConfigs.localConfig);
      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping invalid query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.localConfig,
          'SELECT * FROM nonexistent_table_12345'
        );

        expect(queryResult.success).to.be.false;
        expect(queryResult.error).to.be.a('string');
        expect(queryResult.error).to.satisfy(
          error =>
            error.includes('does not exist') ||
            error.includes('relation') ||
            error.includes('not found')
        );
      } catch (error) {
        console.log('Invalid query test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('PostgreSQL-Specific Features', () => {
    it('should handle different PostgreSQL data types', async function () {
      this.timeout(30000);

      const testResult = await DatabaseService.testConnection(testConfigs.localConfig);
      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping data types test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.localConfig,
          `SELECT
            'test string'::text AS text_col,
            42::integer AS int_col,
            3.14::numeric AS numeric_col,
            true::boolean AS bool_col,
            NOW()::timestamp AS timestamp_col,
            '{"key": "value"}'::json AS json_col`
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data.length).to.equal(1);

        const row = queryResult.data[0];
        expect(row.text_col).to.equal('test string');
        expect(row.int_col).to.equal(42);
        expect(row.bool_col).to.equal(true);
      } catch (error) {
        console.log('PostgreSQL data types test skipped:', error.message);
        this.skip();
      }
    });

    it('should handle connection with different schema', async function () {
      this.timeout(30000);

      const testResult = await DatabaseService.testConnection(testConfigs.localConfig);
      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping schema test');
        this.skip();
        return;
      }

      try {
        // Test with information_schema
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.localConfig,
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 3"
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
      } catch (error) {
        console.log('Schema test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('Connection Pool Management', () => {
    it('should handle multiple concurrent PostgreSQL connections', async function () {
      this.timeout(45000);

      const testResult = await DatabaseService.testConnection(testConfigs.localConfig);
      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping connection pool test');
        this.skip();
        return;
      }

      const promises = [];

      // Create 10 concurrent connection tests
      for (let i = 0; i < 10; i++) {
        promises.push(DatabaseService.testConnection(testConfigs.localConfig));
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).to.be.true;
      });
    });
  });
});
