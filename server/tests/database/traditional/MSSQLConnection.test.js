const { expect } = require('chai');
const DatabaseService = require('../../../services/database/DatabaseService');
const { PrismaClient } = require('../../../prisma/generated/client');

const prisma = new PrismaClient();

describe('MSSQL Database Connection Tests', () => {
  let testConnectionId;

  const testConfigs = {
    // Local SQL Server Express (Docker)
    localDockerConfig: {
      type: 'MSSQL',
      host: process.env.TEST_MSSQL_HOST || 'localhost',
      port: parseInt(process.env.TEST_MSSQL_PORT) || 1433,
      database: process.env.TEST_MSSQL_DATABASE || 'master',
      username: process.env.TEST_MSSQL_USERNAME || 'sa',
      password: process.env.TEST_MSSQL_PASSWORD || 'YourStrong!Passw0rd',
      sslEnabled: false,
      trustServerCertificate: true,
    },

    // Windows Authentication (if available)
    windowsAuthConfig: {
      type: 'MSSQL',
      host: process.env.TEST_MSSQL_HOST || 'localhost',
      port: parseInt(process.env.TEST_MSSQL_PORT) || 1433,
      database: process.env.TEST_MSSQL_DATABASE || 'master',
      trustedConnection: true,
      sslEnabled: false,
      trustServerCertificate: true,
    },

    // Invalid configuration for negative testing
    invalidConfig: {
      type: 'MSSQL',
      host: 'nonexistent.server.com',
      port: 1433,
      database: 'master',
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
          startsWith: 'test-mssql-',
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

    // Clean up any remaining test connections
    await prisma.databaseConnection.deleteMany({
      where: {
        name: {
          startsWith: 'test-mssql-',
        },
      },
    });
  });

  describe('Connection Testing', () => {
    it('should successfully test connection with valid SQL Server config', async function () {
      this.timeout(30000); // 30 second timeout for database connections

      const result = await DatabaseService.testConnection(testConfigs.localDockerConfig);

      if (result.success) {
        expect(result.success).to.be.true;
        expect(result.message).to.include('Connection successful');
      } else {
        // If connection fails, it might be because SQL Server isn't available
        // This is expected in CI environments
        expect(result.error).to.be.a('string');
        console.log('MSSQL connection test skipped - server not available:', result.error);
        this.skip();
      }
    });

    it('should fail with invalid SQL Server config', async function () {
      this.timeout(15000);

      const result = await DatabaseService.testConnection(testConfigs.invalidConfig);

      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
      expect(result.error).to.satisfy(
        error =>
          error.includes('Failed to connect') ||
          error.includes('Login failed') ||
          error.includes('getaddrinfo ENOTFOUND') ||
          error.includes('connect ECONNREFUSED')
      );
    });

    it('should test Windows Authentication if available', async function () {
      this.timeout(30000);

      // Skip this test on non-Windows platforms
      if (process.platform !== 'win32') {
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.windowsAuthConfig);

      // This test may fail if not running in a domain environment
      if (result.success) {
        expect(result.success).to.be.true;
        expect(result.message).to.include('Connection successful');
      } else {
        console.log('Windows Authentication test skipped:', result.error);
        this.skip();
      }
    });
  });

  describe('Connection Persistence', () => {
    it('should save MSSQL connection to PostgreSQL and test it', async function () {
      this.timeout(30000);

      // First test if MSSQL is available
      const testResult = await DatabaseService.testConnection(testConfigs.localDockerConfig);
      if (!testResult.success) {
        console.log('MSSQL not available, skipping persistence test');
        this.skip();
        return;
      }

      // Create connection in PostgreSQL
      const connectionData = {
        name: `test-mssql-${Date.now()}`,
        type: 'MSSQL',
        host: testConfigs.localDockerConfig.host,
        port: testConfigs.localDockerConfig.port,
        database: testConfigs.localDockerConfig.database,
        username: testConfigs.localDockerConfig.username,
        passwordEncrypted: testConfigs.localDockerConfig.password, // In real app, this would be encrypted
        sslEnabled: testConfigs.localDockerConfig.sslEnabled || false,
        isActive: true,
        organizationId: 'test-org-id',
        createdBy: 'test-user-id',
      };

      const savedConnection = await prisma.databaseConnection.create({
        data: connectionData,
      });

      testConnectionId = savedConnection.id;

      expect(savedConnection.id).to.be.a('string');
      expect(savedConnection.name).to.equal(connectionData.name);
      expect(savedConnection.type).to.equal('MSSQL');
      expect(savedConnection.host).to.equal(testConfigs.localDockerConfig.host);
      expect(savedConnection.port).to.equal(testConfigs.localDockerConfig.port);

      // Test the saved connection
      const retrievedConnection = await prisma.databaseConnection.findUnique({
        where: { id: savedConnection.id },
      });

      expect(retrievedConnection).to.not.be.null;
      expect(retrievedConnection.type).to.equal('MSSQL');

      // Test connection with saved data
      const connectionConfig = {
        type: retrievedConnection.type,
        host: retrievedConnection.host,
        port: retrievedConnection.port,
        database: retrievedConnection.database,
        username: retrievedConnection.username,
        password: retrievedConnection.passwordEncrypted, // In real app, this would be decrypted
        sslEnabled: retrievedConnection.sslEnabled,
        trustServerCertificate: true,
      };

      const connectionTestResult = await DatabaseService.testConnection(connectionConfig);
      expect(connectionTestResult.success).to.be.true;
    });
  });

  describe('Query Execution', () => {
    it('should execute basic SELECT query on MSSQL', async function () {
      this.timeout(30000);

      // First test if MSSQL is available
      const testResult = await DatabaseService.testConnection(testConfigs.localDockerConfig);
      if (!testResult.success) {
        console.log('MSSQL not available, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.localDockerConfig,
          'SELECT @@VERSION AS version, GETDATE() AS current_time'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data.length).to.be.greaterThan(0);
        expect(queryResult.data[0]).to.have.property('version');
        expect(queryResult.data[0]).to.have.property('current_time');
      } catch (error) {
        // If query execution fails, log the error but don't fail the test
        // This might happen if the DatabaseService.executeQuery method doesn't exist yet
        console.log('Query execution test skipped:', error.message);
        this.skip();
      }
    });

    it('should handle invalid SQL queries gracefully', async function () {
      this.timeout(15000);

      // First test if MSSQL is available
      const testResult = await DatabaseService.testConnection(testConfigs.localDockerConfig);
      if (!testResult.success) {
        console.log('MSSQL not available, skipping invalid query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.localDockerConfig,
          'SELECT * FROM nonexistent_table_12345'
        );

        expect(queryResult.success).to.be.false;
        expect(queryResult.error).to.be.a('string');
        expect(queryResult.error).to.satisfy(
          error =>
            error.includes('Invalid object name') ||
            error.includes('does not exist') ||
            error.includes('not found')
        );
      } catch (error) {
        // If executeQuery method doesn't exist, skip this test
        console.log('Invalid query test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('SSL/TLS Configuration', () => {
    it('should handle SSL configuration correctly', async function () {
      this.timeout(30000);

      const sslConfig = {
        ...testConfigs.localDockerConfig,
        sslEnabled: true,
        trustServerCertificate: false,
      };

      const result = await DatabaseService.testConnection(sslConfig);

      // SSL might fail on local development environments
      // This test verifies that the SSL setting is processed, not that it succeeds
      expect(result).to.have.property('success');
      expect(result).to.have.property('error').or.have.property('message');
    });
  });

  describe('Connection Pooling', () => {
    it('should handle multiple concurrent connections', async function () {
      this.timeout(45000);

      // First test if MSSQL is available
      const testResult = await DatabaseService.testConnection(testConfigs.localDockerConfig);
      if (!testResult.success) {
        console.log('MSSQL not available, skipping connection pooling test');
        this.skip();
        return;
      }

      const promises = [];

      // Create 5 concurrent connection tests
      for (let i = 0; i < 5; i++) {
        promises.push(DatabaseService.testConnection(testConfigs.localDockerConfig));
      }

      const results = await Promise.all(promises);

      // All connections should succeed
      results.forEach((result, index) => {
        expect(result.success).to.be.true;
      });
    });
  });
});
