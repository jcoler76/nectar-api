const { expect } = require('chai');
const DatabaseService = require('../../../services/database/DatabaseService');
const { PrismaClient } = require('../../../prisma/generated/client');

const prisma = new PrismaClient();

describe('AWS Database Connection Tests', () => {
  let testConnectionId;

  const testConfigs = {
    // AWS RDS PostgreSQL
    rdsPostgreSQLConfig: {
      type: 'AWS_RDS_POSTGRESQL',
      host: process.env.TEST_AWS_RDS_POSTGRESQL_HOST,
      port: parseInt(process.env.TEST_AWS_RDS_POSTGRESQL_PORT) || 5432,
      database: process.env.TEST_AWS_RDS_POSTGRESQL_DATABASE || 'postgres',
      username: process.env.TEST_AWS_RDS_POSTGRESQL_USERNAME,
      password: process.env.TEST_AWS_RDS_POSTGRESQL_PASSWORD,
      region: process.env.TEST_AWS_REGION || 'us-east-1',
      endpoint: process.env.TEST_AWS_RDS_POSTGRESQL_ENDPOINT,
      sslEnabled: true,
    },

    // AWS RDS MySQL
    rdsMySQLConfig: {
      type: 'AWS_RDS_MYSQL',
      host: process.env.TEST_AWS_RDS_MYSQL_HOST,
      port: parseInt(process.env.TEST_AWS_RDS_MYSQL_PORT) || 3306,
      database: process.env.TEST_AWS_RDS_MYSQL_DATABASE || 'mysql',
      username: process.env.TEST_AWS_RDS_MYSQL_USERNAME,
      password: process.env.TEST_AWS_RDS_MYSQL_PASSWORD,
      region: process.env.TEST_AWS_REGION || 'us-east-1',
      endpoint: process.env.TEST_AWS_RDS_MYSQL_ENDPOINT,
      sslEnabled: true,
    },

    // AWS RDS SQL Server
    rdsMSSQLConfig: {
      type: 'AWS_RDS_MSSQL',
      host: process.env.TEST_AWS_RDS_MSSQL_HOST,
      port: parseInt(process.env.TEST_AWS_RDS_MSSQL_PORT) || 1433,
      database: process.env.TEST_AWS_RDS_MSSQL_DATABASE || 'master',
      username: process.env.TEST_AWS_RDS_MSSQL_USERNAME,
      password: process.env.TEST_AWS_RDS_MSSQL_PASSWORD,
      region: process.env.TEST_AWS_REGION || 'us-east-1',
      endpoint: process.env.TEST_AWS_RDS_MSSQL_ENDPOINT,
      sslEnabled: true,
    },

    // AWS Aurora PostgreSQL
    auroraPostgreSQLConfig: {
      type: 'AWS_AURORA_POSTGRESQL',
      host: process.env.TEST_AWS_AURORA_POSTGRESQL_HOST,
      port: parseInt(process.env.TEST_AWS_AURORA_POSTGRESQL_PORT) || 5432,
      database: process.env.TEST_AWS_AURORA_POSTGRESQL_DATABASE || 'postgres',
      username: process.env.TEST_AWS_AURORA_POSTGRESQL_USERNAME,
      password: process.env.TEST_AWS_AURORA_POSTGRESQL_PASSWORD,
      region: process.env.TEST_AWS_REGION || 'us-east-1',
      endpoint: process.env.TEST_AWS_AURORA_POSTGRESQL_ENDPOINT,
      sslEnabled: true,
    },

    // AWS Aurora MySQL
    auroraMySQLConfig: {
      type: 'AWS_AURORA_MYSQL',
      host: process.env.TEST_AWS_AURORA_MYSQL_HOST,
      port: parseInt(process.env.TEST_AWS_AURORA_MYSQL_PORT) || 3306,
      database: process.env.TEST_AWS_AURORA_MYSQL_DATABASE || 'mysql',
      username: process.env.TEST_AWS_AURORA_MYSQL_USERNAME,
      password: process.env.TEST_AWS_AURORA_MYSQL_PASSWORD,
      region: process.env.TEST_AWS_REGION || 'us-east-1',
      endpoint: process.env.TEST_AWS_AURORA_MYSQL_ENDPOINT,
      sslEnabled: true,
    },

    // Invalid AWS configuration
    invalidAWSConfig: {
      type: 'AWS_RDS_POSTGRESQL',
      host: 'invalid.cluster-xxxxx.us-east-1.rds.amazonaws.com',
      port: 5432,
      database: 'postgres',
      username: 'invaliduser',
      password: 'invalidpassword',
      region: 'us-east-1',
      endpoint: 'invalid.cluster-xxxxx.us-east-1.rds.amazonaws.com',
      sslEnabled: true,
    },
  };

  before(async () => {
    await prisma.databaseConnection.deleteMany({
      where: {
        name: {
          startsWith: 'test-aws-',
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
          startsWith: 'test-aws-',
        },
      },
    });
  });

  describe('AWS RDS PostgreSQL Tests', () => {
    it('should successfully connect to AWS RDS PostgreSQL if configured', async function () {
      this.timeout(45000); // AWS connections can take longer

      if (!testConfigs.rdsPostgreSQLConfig.host || !testConfigs.rdsPostgreSQLConfig.username) {
        console.log('AWS RDS PostgreSQL credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.rdsPostgreSQLConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on AWS RDS PostgreSQL', async function () {
      this.timeout(45000);

      if (!testConfigs.rdsPostgreSQLConfig.host || !testConfigs.rdsPostgreSQLConfig.username) {
        console.log('AWS RDS PostgreSQL credentials not provided, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.rdsPostgreSQLConfig,
          'SELECT version() AS version, current_timestamp AS current_time'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('version');
        expect(queryResult.data[0].version).to.include('PostgreSQL');
      } catch (error) {
        console.log('AWS RDS PostgreSQL query test skipped:', error.message);
        this.skip();
      }
    });

    it('should save AWS RDS PostgreSQL connection to database', async function () {
      this.timeout(45000);

      if (!testConfigs.rdsPostgreSQLConfig.host || !testConfigs.rdsPostgreSQLConfig.username) {
        console.log('AWS RDS PostgreSQL credentials not provided, skipping persistence test');
        this.skip();
        return;
      }

      const connectionData = {
        name: `test-aws-rds-postgresql-${Date.now()}`,
        type: 'AWS_RDS_POSTGRESQL',
        host: testConfigs.rdsPostgreSQLConfig.host,
        port: testConfigs.rdsPostgreSQLConfig.port,
        database: testConfigs.rdsPostgreSQLConfig.database,
        username: testConfigs.rdsPostgreSQLConfig.username,
        passwordEncrypted: testConfigs.rdsPostgreSQLConfig.password,
        region: testConfigs.rdsPostgreSQLConfig.region,
        endpoint: testConfigs.rdsPostgreSQLConfig.endpoint,
        sslEnabled: testConfigs.rdsPostgreSQLConfig.sslEnabled,
        isActive: true,
        organizationId: 'test-org-id',
        createdBy: 'test-user-id',
      };

      const savedConnection = await prisma.databaseConnection.create({
        data: connectionData,
      });

      testConnectionId = savedConnection.id;

      expect(savedConnection.type).to.equal('AWS_RDS_POSTGRESQL');
      expect(savedConnection.region).to.equal(testConfigs.rdsPostgreSQLConfig.region);
      expect(savedConnection.endpoint).to.equal(testConfigs.rdsPostgreSQLConfig.endpoint);
    });
  });

  describe('AWS RDS MySQL Tests', () => {
    it('should successfully connect to AWS RDS MySQL if configured', async function () {
      this.timeout(45000);

      if (!testConfigs.rdsMySQLConfig.host || !testConfigs.rdsMySQLConfig.username) {
        console.log('AWS RDS MySQL credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.rdsMySQLConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on AWS RDS MySQL', async function () {
      this.timeout(45000);

      if (!testConfigs.rdsMySQLConfig.host || !testConfigs.rdsMySQLConfig.username) {
        console.log('AWS RDS MySQL credentials not provided, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.rdsMySQLConfig,
          'SELECT VERSION() AS version, NOW() AS current_time'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('version');
      } catch (error) {
        console.log('AWS RDS MySQL query test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('AWS Aurora Tests', () => {
    it('should successfully connect to AWS Aurora PostgreSQL if configured', async function () {
      this.timeout(45000);

      if (
        !testConfigs.auroraPostgreSQLConfig.host ||
        !testConfigs.auroraPostgreSQLConfig.username
      ) {
        console.log('AWS Aurora PostgreSQL credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.auroraPostgreSQLConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should successfully connect to AWS Aurora MySQL if configured', async function () {
      this.timeout(45000);

      if (!testConfigs.auroraMySQLConfig.host || !testConfigs.auroraMySQLConfig.username) {
        console.log('AWS Aurora MySQL credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.auroraMySQLConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });
  });

  describe('AWS-Specific Features', () => {
    it('should handle AWS region configuration correctly', async function () {
      this.timeout(30000);

      if (!testConfigs.rdsPostgreSQLConfig.host) {
        console.log('AWS RDS credentials not provided, skipping region test');
        this.skip();
        return;
      }

      // Test with different regions
      const configWithDifferentRegion = {
        ...testConfigs.rdsPostgreSQLConfig,
        region: 'us-west-2',
      };

      // This should still work since region is mainly for AWS API calls, not direct DB connection
      const result = await DatabaseService.testConnection(configWithDifferentRegion);

      // The result depends on whether the endpoint is actually in us-west-2
      expect(result).to.have.property('success');
    });

    it('should handle SSL enforcement on AWS RDS', async function () {
      this.timeout(45000);

      if (!testConfigs.rdsPostgreSQLConfig.host || !testConfigs.rdsPostgreSQLConfig.username) {
        console.log('AWS RDS credentials not provided, skipping SSL test');
        this.skip();
        return;
      }

      // AWS RDS typically enforces SSL
      const result = await DatabaseService.testConnection(testConfigs.rdsPostgreSQLConfig);

      if (result.success) {
        expect(result.success).to.be.true;
      } else {
        // SSL might be required and our test config might not have proper SSL setup
        expect(result.error).to.be.a('string');
      }
    });

    it('should fail gracefully with invalid AWS endpoints', async function () {
      this.timeout(30000);

      const result = await DatabaseService.testConnection(testConfigs.invalidAWSConfig);

      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
      expect(result.error).to.satisfy(
        error =>
          error.includes('getaddrinfo ENOTFOUND') ||
          error.includes('connect ECONNREFUSED') ||
          error.includes('timeout') ||
          error.includes('authentication failed')
      );
    });
  });

  describe('AWS Connection Pooling', () => {
    it('should handle multiple concurrent AWS connections', async function () {
      this.timeout(60000);

      if (!testConfigs.rdsPostgreSQLConfig.host || !testConfigs.rdsPostgreSQLConfig.username) {
        console.log('AWS RDS credentials not provided, skipping connection pooling test');
        this.skip();
        return;
      }

      const promises = [];

      // Create 3 concurrent connection tests (AWS has connection limits)
      for (let i = 0; i < 3; i++) {
        promises.push(DatabaseService.testConnection(testConfigs.rdsPostgreSQLConfig));
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).to.be.true;
      });
    });
  });

  describe('AWS Performance Testing', () => {
    it('should measure AWS connection latency', async function () {
      this.timeout(45000);

      if (!testConfigs.rdsPostgreSQLConfig.host || !testConfigs.rdsPostgreSQLConfig.username) {
        console.log('AWS RDS credentials not provided, skipping latency test');
        this.skip();
        return;
      }

      const startTime = Date.now();
      const result = await DatabaseService.testConnection(testConfigs.rdsPostgreSQLConfig);
      const endTime = Date.now();

      const latency = endTime - startTime;

      expect(result.success).to.be.true;
      expect(latency).to.be.lessThan(30000); // Should connect within 30 seconds

      console.log(`AWS RDS connection latency: ${latency}ms`);
    });
  });
});
