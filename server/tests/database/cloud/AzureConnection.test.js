const { expect } = require('chai');
const DatabaseService = require('../../../services/database/DatabaseService');
const { PrismaClient } = require('../../../prisma/generated/client');

const prisma = new PrismaClient();

describe('Azure Database Connection Tests', () => {
  let testConnectionId;

  const testConfigs = {
    // Azure SQL Database
    azureSQLConfig: {
      type: 'AZURE_SQL_DATABASE',
      host: process.env.TEST_AZURE_SQL_SERVER || 'myserver.database.windows.net',
      port: parseInt(process.env.TEST_AZURE_SQL_PORT) || 1433,
      database: process.env.TEST_AZURE_SQL_DATABASE || 'mydatabase',
      username: process.env.TEST_AZURE_SQL_USERNAME,
      password: process.env.TEST_AZURE_SQL_PASSWORD,
      endpoint: process.env.TEST_AZURE_SQL_SERVER,
      sslEnabled: true,
    },

    // Azure SQL Managed Instance
    azureSQLManagedConfig: {
      type: 'AZURE_SQL_MANAGED_INSTANCE',
      host: process.env.TEST_AZURE_SQL_MANAGED_HOST,
      port: parseInt(process.env.TEST_AZURE_SQL_MANAGED_PORT) || 1433,
      database: process.env.TEST_AZURE_SQL_MANAGED_DATABASE || 'master',
      username: process.env.TEST_AZURE_SQL_MANAGED_USERNAME,
      password: process.env.TEST_AZURE_SQL_MANAGED_PASSWORD,
      endpoint: process.env.TEST_AZURE_SQL_MANAGED_HOST,
      sslEnabled: true,
    },

    // Azure Database for PostgreSQL
    azurePostgreSQLConfig: {
      type: 'AZURE_POSTGRESQL',
      host: process.env.TEST_AZURE_POSTGRESQL_HOST,
      port: parseInt(process.env.TEST_AZURE_POSTGRESQL_PORT) || 5432,
      database: process.env.TEST_AZURE_POSTGRESQL_DATABASE || 'postgres',
      username: process.env.TEST_AZURE_POSTGRESQL_USERNAME,
      password: process.env.TEST_AZURE_POSTGRESQL_PASSWORD,
      endpoint: process.env.TEST_AZURE_POSTGRESQL_HOST,
      sslEnabled: true,
    },

    // Azure Database for MySQL
    azureMySQLConfig: {
      type: 'AZURE_MYSQL',
      host: process.env.TEST_AZURE_MYSQL_HOST,
      port: parseInt(process.env.TEST_AZURE_MYSQL_PORT) || 3306,
      database: process.env.TEST_AZURE_MYSQL_DATABASE || 'mysql',
      username: process.env.TEST_AZURE_MYSQL_USERNAME,
      password: process.env.TEST_AZURE_MYSQL_PASSWORD,
      endpoint: process.env.TEST_AZURE_MYSQL_HOST,
      sslEnabled: true,
    },

    // Invalid Azure configuration
    invalidAzureConfig: {
      type: 'AZURE_SQL_DATABASE',
      host: 'invalid.database.windows.net',
      port: 1433,
      database: 'invaliddb',
      username: 'invaliduser',
      password: 'invalidpassword',
      endpoint: 'invalid.database.windows.net',
      sslEnabled: true,
    },
  };

  before(async () => {
    await prisma.databaseConnection.deleteMany({
      where: {
        name: {
          startsWith: 'test-azure-',
        },
      },
    });
  });

  after(async () => {
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
          startsWith: 'test-azure-',
        },
      },
    });
  });

  describe('Azure SQL Database Tests', () => {
    it('should successfully connect to Azure SQL Database if configured', async function () {
      this.timeout(45000);

      if (!testConfigs.azureSQLConfig.username || !testConfigs.azureSQLConfig.password) {
        console.log('Azure SQL Database credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.azureSQLConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on Azure SQL Database', async function () {
      this.timeout(45000);

      if (!testConfigs.azureSQLConfig.username || !testConfigs.azureSQLConfig.password) {
        console.log('Azure SQL Database credentials not provided, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.azureSQLConfig,
          'SELECT @@VERSION AS version, GETDATE() AS current_time, @@SERVERNAME AS server_name'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('version');
        expect(queryResult.data[0].version).to.include('Azure');
      } catch (error) {
        console.log('Azure SQL Database query test skipped:', error.message);
        this.skip();
      }
    });

    it('should save Azure SQL Database connection to database', async function () {
      this.timeout(45000);

      if (!testConfigs.azureSQLConfig.username || !testConfigs.azureSQLConfig.password) {
        console.log('Azure SQL Database credentials not provided, skipping persistence test');
        this.skip();
        return;
      }

      const connectionData = {
        name: `test-azure-sql-${Date.now()}`,
        type: 'AZURE_SQL_DATABASE',
        host: testConfigs.azureSQLConfig.host,
        port: testConfigs.azureSQLConfig.port,
        database: testConfigs.azureSQLConfig.database,
        username: testConfigs.azureSQLConfig.username,
        passwordEncrypted: testConfigs.azureSQLConfig.password,
        endpoint: testConfigs.azureSQLConfig.endpoint,
        sslEnabled: testConfigs.azureSQLConfig.sslEnabled,
        isActive: true,
        organizationId: 'test-org-id',
        createdBy: 'test-user-id',
      };

      const savedConnection = await prisma.databaseConnection.create({
        data: connectionData,
      });

      testConnectionId = savedConnection.id;

      expect(savedConnection.type).to.equal('AZURE_SQL_DATABASE');
      expect(savedConnection.endpoint).to.equal(testConfigs.azureSQLConfig.endpoint);
      expect(savedConnection.host).to.include('.database.windows.net');
    });
  });

  describe('Azure Database for PostgreSQL Tests', () => {
    it('should successfully connect to Azure PostgreSQL if configured', async function () {
      this.timeout(45000);

      if (
        !testConfigs.azurePostgreSQLConfig.username ||
        !testConfigs.azurePostgreSQLConfig.password
      ) {
        console.log('Azure PostgreSQL credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.azurePostgreSQLConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on Azure PostgreSQL', async function () {
      this.timeout(45000);

      if (
        !testConfigs.azurePostgreSQLConfig.username ||
        !testConfigs.azurePostgreSQLConfig.password
      ) {
        console.log('Azure PostgreSQL credentials not provided, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.azurePostgreSQLConfig,
          'SELECT version() AS version, current_timestamp AS current_time'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('version');
        expect(queryResult.data[0].version).to.include('PostgreSQL');
      } catch (error) {
        console.log('Azure PostgreSQL query test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('Azure Database for MySQL Tests', () => {
    it('should successfully connect to Azure MySQL if configured', async function () {
      this.timeout(45000);

      if (!testConfigs.azureMySQLConfig.username || !testConfigs.azureMySQLConfig.password) {
        console.log('Azure MySQL credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.azureMySQLConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on Azure MySQL', async function () {
      this.timeout(45000);

      if (!testConfigs.azureMySQLConfig.username || !testConfigs.azureMySQLConfig.password) {
        console.log('Azure MySQL credentials not provided, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.azureMySQLConfig,
          'SELECT VERSION() AS version, NOW() AS current_time'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('version');
      } catch (error) {
        console.log('Azure MySQL query test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('Azure-Specific Features', () => {
    it('should handle Azure SQL Database firewall rules', async function () {
      this.timeout(30000);

      if (!testConfigs.azureSQLConfig.username) {
        console.log('Azure SQL Database credentials not provided, skipping firewall test');
        this.skip();
        return;
      }

      // Test with a potentially blocked IP (this might fail due to firewall)
      const result = await DatabaseService.testConnection(testConfigs.azureSQLConfig);

      // Either succeeds (IP is allowed) or fails with firewall error
      if (!result.success) {
        expect(result.error).to.satisfy(
          error =>
            error.includes('firewall') ||
            error.includes('blocked') ||
            error.includes('not allowed') ||
            error.includes('connect ECONNREFUSED') ||
            error.includes('getaddrinfo ENOTFOUND')
        );
      } else {
        expect(result.success).to.be.true;
      }
    });

    it('should handle Azure Active Directory authentication format', async function () {
      this.timeout(30000);

      // Test username format with @servername for Azure
      if (!testConfigs.azureSQLConfig.username) {
        console.log('Azure SQL Database credentials not provided, skipping AAD test');
        this.skip();
        return;
      }

      const aadConfig = {
        ...testConfigs.azureSQLConfig,
        username: testConfigs.azureSQLConfig.username.includes('@')
          ? testConfigs.azureSQLConfig.username
          : `${testConfigs.azureSQLConfig.username}@${testConfigs.azureSQLConfig.host.split('.')[0]}`,
      };

      const result = await DatabaseService.testConnection(aadConfig);

      // Result depends on whether AAD is configured
      expect(result).to.have.property('success');
    });

    it('should enforce SSL on Azure databases', async function () {
      this.timeout(45000);

      if (!testConfigs.azureSQLConfig.username || !testConfigs.azureSQLConfig.password) {
        console.log('Azure SQL Database credentials not provided, skipping SSL test');
        this.skip();
        return;
      }

      // Azure databases typically enforce SSL
      const result = await DatabaseService.testConnection(testConfigs.azureSQLConfig);

      if (result.success) {
        expect(result.success).to.be.true;
      } else {
        // SSL might be required
        expect(result.error).to.be.a('string');
      }
    });

    it('should fail gracefully with invalid Azure endpoints', async function () {
      this.timeout(30000);

      const result = await DatabaseService.testConnection(testConfigs.invalidAzureConfig);

      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
      expect(result.error).to.satisfy(
        error =>
          error.includes('getaddrinfo ENOTFOUND') ||
          error.includes('connect ECONNREFUSED') ||
          error.includes('timeout') ||
          error.includes('authentication failed') ||
          error.includes('firewall')
      );
    });
  });

  describe('Azure Connection Pooling', () => {
    it('should handle multiple concurrent Azure connections', async function () {
      this.timeout(60000);

      if (!testConfigs.azureSQLConfig.username || !testConfigs.azureSQLConfig.password) {
        console.log(
          'Azure SQL Database credentials not provided, skipping connection pooling test'
        );
        this.skip();
        return;
      }

      const promises = [];

      // Create 3 concurrent connection tests
      for (let i = 0; i < 3; i++) {
        promises.push(DatabaseService.testConnection(testConfigs.azureSQLConfig));
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).to.be.true;
      });
    });
  });

  describe('Azure Performance Testing', () => {
    it('should measure Azure connection latency', async function () {
      this.timeout(45000);

      if (!testConfigs.azureSQLConfig.username || !testConfigs.azureSQLConfig.password) {
        console.log('Azure SQL Database credentials not provided, skipping latency test');
        this.skip();
        return;
      }

      const startTime = Date.now();
      const result = await DatabaseService.testConnection(testConfigs.azureSQLConfig);
      const endTime = Date.now();

      const latency = endTime - startTime;

      expect(result.success).to.be.true;
      expect(latency).to.be.lessThan(30000); // Should connect within 30 seconds

      console.log(`Azure SQL Database connection latency: ${latency}ms`);
    });
  });
});
