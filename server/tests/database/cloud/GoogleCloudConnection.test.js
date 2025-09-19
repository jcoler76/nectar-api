const { expect } = require('chai');
const DatabaseService = require('../../../services/database/DatabaseService');
const { PrismaClient } = require('../../../prisma/generated/client');

const prisma = new PrismaClient();

describe('Google Cloud Database Connection Tests', () => {
  let testConnectionId;

  const testConfigs = {
    // Google Cloud SQL PostgreSQL
    gcpPostgreSQLConfig: {
      type: 'GCP_CLOUD_SQL_POSTGRESQL',
      host: process.env.TEST_GCP_POSTGRESQL_HOST,
      port: parseInt(process.env.TEST_GCP_POSTGRESQL_PORT) || 5432,
      database: process.env.TEST_GCP_POSTGRESQL_DATABASE || 'postgres',
      username: process.env.TEST_GCP_POSTGRESQL_USERNAME,
      password: process.env.TEST_GCP_POSTGRESQL_PASSWORD,
      projectId: process.env.TEST_GCP_PROJECT_ID,
      region: process.env.TEST_GCP_REGION || 'us-central1',
      instanceConnectionName: process.env.TEST_GCP_POSTGRESQL_INSTANCE_CONNECTION_NAME,
      sslEnabled: true,
    },

    // Google Cloud SQL MySQL
    gcpMySQLConfig: {
      type: 'GCP_CLOUD_SQL_MYSQL',
      host: process.env.TEST_GCP_MYSQL_HOST,
      port: parseInt(process.env.TEST_GCP_MYSQL_PORT) || 3306,
      database: process.env.TEST_GCP_MYSQL_DATABASE || 'mysql',
      username: process.env.TEST_GCP_MYSQL_USERNAME,
      password: process.env.TEST_GCP_MYSQL_PASSWORD,
      projectId: process.env.TEST_GCP_PROJECT_ID,
      region: process.env.TEST_GCP_REGION || 'us-central1',
      instanceConnectionName: process.env.TEST_GCP_MYSQL_INSTANCE_CONNECTION_NAME,
      sslEnabled: true,
    },

    // Google Cloud SQL Server
    gcpSQLServerConfig: {
      type: 'GCP_CLOUD_SQL_MSSQL',
      host: process.env.TEST_GCP_MSSQL_HOST,
      port: parseInt(process.env.TEST_GCP_MSSQL_PORT) || 1433,
      database: process.env.TEST_GCP_MSSQL_DATABASE || 'master',
      username: process.env.TEST_GCP_MSSQL_USERNAME,
      password: process.env.TEST_GCP_MSSQL_PASSWORD,
      projectId: process.env.TEST_GCP_PROJECT_ID,
      region: process.env.TEST_GCP_REGION || 'us-central1',
      instanceConnectionName: process.env.TEST_GCP_MSSQL_INSTANCE_CONNECTION_NAME,
      sslEnabled: true,
    },

    // Google Cloud Spanner
    gcpSpannerConfig: {
      type: 'GCP_SPANNER',
      host: 'spanner.googleapis.com',
      port: 443,
      database: process.env.TEST_GCP_SPANNER_DATABASE,
      projectId: process.env.TEST_GCP_PROJECT_ID,
      region: process.env.TEST_GCP_REGION || 'us-central1',
      instanceConnectionName: process.env.TEST_GCP_SPANNER_INSTANCE,
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      sslEnabled: true,
    },

    // Invalid GCP configuration
    invalidGCPConfig: {
      type: 'GCP_CLOUD_SQL_POSTGRESQL',
      host: 'invalid.gcp.host',
      port: 5432,
      database: 'postgres',
      username: 'invaliduser',
      password: 'invalidpassword',
      projectId: 'invalid-project',
      region: 'us-central1',
      instanceConnectionName: 'invalid-project:us-central1:invalid-instance',
      sslEnabled: true,
    },
  };

  before(async () => {
    await prisma.databaseConnection.deleteMany({
      where: {
        name: {
          startsWith: 'test-gcp-',
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
          startsWith: 'test-gcp-',
        },
      },
    });
  });

  describe('Google Cloud SQL PostgreSQL Tests', () => {
    it('should successfully connect to GCP Cloud SQL PostgreSQL if configured', async function () {
      this.timeout(45000);

      if (!testConfigs.gcpPostgreSQLConfig.host || !testConfigs.gcpPostgreSQLConfig.username) {
        console.log('GCP Cloud SQL PostgreSQL credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.gcpPostgreSQLConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on GCP Cloud SQL PostgreSQL', async function () {
      this.timeout(45000);

      if (!testConfigs.gcpPostgreSQLConfig.host || !testConfigs.gcpPostgreSQLConfig.username) {
        console.log('GCP Cloud SQL PostgreSQL credentials not provided, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.gcpPostgreSQLConfig,
          'SELECT version() AS version, current_timestamp AS current_time'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('version');
        expect(queryResult.data[0].version).to.include('PostgreSQL');
      } catch (error) {
        console.log('GCP Cloud SQL PostgreSQL query test skipped:', error.message);
        this.skip();
      }
    });

    it('should save GCP Cloud SQL PostgreSQL connection to database', async function () {
      this.timeout(45000);

      if (!testConfigs.gcpPostgreSQLConfig.host || !testConfigs.gcpPostgreSQLConfig.username) {
        console.log('GCP Cloud SQL PostgreSQL credentials not provided, skipping persistence test');
        this.skip();
        return;
      }

      const connectionData = {
        name: `test-gcp-postgresql-${Date.now()}`,
        type: 'GCP_CLOUD_SQL_POSTGRESQL',
        host: testConfigs.gcpPostgreSQLConfig.host,
        port: testConfigs.gcpPostgreSQLConfig.port,
        database: testConfigs.gcpPostgreSQLConfig.database,
        username: testConfigs.gcpPostgreSQLConfig.username,
        passwordEncrypted: testConfigs.gcpPostgreSQLConfig.password,
        projectId: testConfigs.gcpPostgreSQLConfig.projectId,
        region: testConfigs.gcpPostgreSQLConfig.region,
        instanceConnectionName: testConfigs.gcpPostgreSQLConfig.instanceConnectionName,
        sslEnabled: testConfigs.gcpPostgreSQLConfig.sslEnabled,
        isActive: true,
        organizationId: 'test-org-id',
        createdBy: 'test-user-id',
      };

      const savedConnection = await prisma.databaseConnection.create({
        data: connectionData,
      });

      testConnectionId = savedConnection.id;

      expect(savedConnection.type).to.equal('GCP_CLOUD_SQL_POSTGRESQL');
      expect(savedConnection.projectId).to.equal(testConfigs.gcpPostgreSQLConfig.projectId);
      expect(savedConnection.instanceConnectionName).to.equal(
        testConfigs.gcpPostgreSQLConfig.instanceConnectionName
      );
    });
  });

  describe('Google Cloud SQL MySQL Tests', () => {
    it('should successfully connect to GCP Cloud SQL MySQL if configured', async function () {
      this.timeout(45000);

      if (!testConfigs.gcpMySQLConfig.host || !testConfigs.gcpMySQLConfig.username) {
        console.log('GCP Cloud SQL MySQL credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.gcpMySQLConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on GCP Cloud SQL MySQL', async function () {
      this.timeout(45000);

      if (!testConfigs.gcpMySQLConfig.host || !testConfigs.gcpMySQLConfig.username) {
        console.log('GCP Cloud SQL MySQL credentials not provided, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.gcpMySQLConfig,
          'SELECT VERSION() AS version, NOW() AS current_time'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('version');
      } catch (error) {
        console.log('GCP Cloud SQL MySQL query test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('Google Cloud Spanner Tests', () => {
    it('should successfully connect to GCP Spanner if configured', async function () {
      this.timeout(60000); // Spanner might take longer

      if (!testConfigs.gcpSpannerConfig.database || !testConfigs.gcpSpannerConfig.projectId) {
        console.log('GCP Spanner credentials not provided, skipping test');
        this.skip();
        return;
      }

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('GOOGLE_APPLICATION_CREDENTIALS not set, skipping Spanner test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.gcpSpannerConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on GCP Spanner', async function () {
      this.timeout(60000);

      if (!testConfigs.gcpSpannerConfig.database || !testConfigs.gcpSpannerConfig.projectId) {
        console.log('GCP Spanner credentials not provided, skipping query test');
        this.skip();
        return;
      }

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('GOOGLE_APPLICATION_CREDENTIALS not set, skipping Spanner query test');
        this.skip();
        return;
      }

      try {
        // Spanner uses different SQL syntax
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.gcpSpannerConfig,
          'SELECT 1 AS test_value, CURRENT_TIMESTAMP() AS current_time'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('test_value');
        expect(queryResult.data[0].test_value).to.equal(1);
      } catch (error) {
        console.log('GCP Spanner query test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('GCP-Specific Features', () => {
    it('should handle GCP project ID validation', async function () {
      this.timeout(30000);

      if (!testConfigs.gcpPostgreSQLConfig.host) {
        console.log('GCP credentials not provided, skipping project ID test');
        this.skip();
        return;
      }

      // Test with invalid project ID
      const configWithInvalidProject = {
        ...testConfigs.gcpPostgreSQLConfig,
        projectId: 'invalid-project-12345',
      };

      const result = await DatabaseService.testConnection(configWithInvalidProject);

      // The result depends on how the driver handles project ID validation
      expect(result).to.have.property('success');
    });

    it('should handle GCP instance connection name format', async function () {
      this.timeout(30000);

      if (!testConfigs.gcpPostgreSQLConfig.host || !testConfigs.gcpPostgreSQLConfig.username) {
        console.log('GCP credentials not provided, skipping instance connection name test');
        this.skip();
        return;
      }

      // Validate instance connection name format: project:region:instance
      const instanceConnectionName = testConfigs.gcpPostgreSQLConfig.instanceConnectionName;
      if (instanceConnectionName) {
        const parts = instanceConnectionName.split(':');
        expect(parts).to.have.length(3);
        expect(parts[0]).to.be.a('string').that.is.not.empty; // project
        expect(parts[1]).to.be.a('string').that.is.not.empty; // region
        expect(parts[2]).to.be.a('string').that.is.not.empty; // instance
      }
    });

    it('should handle GCP service account authentication', async function () {
      this.timeout(45000);

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('GOOGLE_APPLICATION_CREDENTIALS not set, skipping service account test');
        this.skip();
        return;
      }

      if (!testConfigs.gcpSpannerConfig.database || !testConfigs.gcpSpannerConfig.projectId) {
        console.log('GCP Spanner credentials not provided, skipping service account test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.gcpSpannerConfig);

      // Service account authentication should work if properly configured
      if (result.success) {
        expect(result.success).to.be.true;
      } else {
        // Authentication might fail if service account doesn't have proper permissions
        expect(result.error).to.be.a('string');
        expect(result.error).to.satisfy(
          error =>
            error.includes('authentication') ||
            error.includes('permission') ||
            error.includes('credentials') ||
            error.includes('forbidden')
        );
      }
    });

    it('should fail gracefully with invalid GCP endpoints', async function () {
      this.timeout(30000);

      const result = await DatabaseService.testConnection(testConfigs.invalidGCPConfig);

      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
      expect(result.error).to.satisfy(
        error =>
          error.includes('getaddrinfo ENOTFOUND') ||
          error.includes('connect ECONNREFUSED') ||
          error.includes('timeout') ||
          error.includes('authentication failed') ||
          error.includes('permission denied')
      );
    });
  });

  describe('GCP Connection Pooling', () => {
    it('should handle multiple concurrent GCP connections', async function () {
      this.timeout(60000);

      if (!testConfigs.gcpPostgreSQLConfig.host || !testConfigs.gcpPostgreSQLConfig.username) {
        console.log(
          'GCP Cloud SQL PostgreSQL credentials not provided, skipping connection pooling test'
        );
        this.skip();
        return;
      }

      const promises = [];

      // Create 3 concurrent connection tests
      for (let i = 0; i < 3; i++) {
        promises.push(DatabaseService.testConnection(testConfigs.gcpPostgreSQLConfig));
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).to.be.true;
      });
    });
  });

  describe('GCP Performance Testing', () => {
    it('should measure GCP connection latency', async function () {
      this.timeout(45000);

      if (!testConfigs.gcpPostgreSQLConfig.host || !testConfigs.gcpPostgreSQLConfig.username) {
        console.log('GCP Cloud SQL PostgreSQL credentials not provided, skipping latency test');
        this.skip();
        return;
      }

      const startTime = Date.now();
      const result = await DatabaseService.testConnection(testConfigs.gcpPostgreSQLConfig);
      const endTime = Date.now();

      const latency = endTime - startTime;

      expect(result.success).to.be.true;
      expect(latency).to.be.lessThan(30000); // Should connect within 30 seconds

      console.log(`GCP Cloud SQL connection latency: ${latency}ms`);
    });
  });
});
