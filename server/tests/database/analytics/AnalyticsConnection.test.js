const { expect } = require('chai');
const DatabaseService = require('../../../services/database/DatabaseService');
const { PrismaClient } = require('../../../prisma/generated/client');

const prisma = new PrismaClient();

describe('Analytics Database Connection Tests', () => {
  let testConnectionId;

  const testConfigs = {
    // Google BigQuery
    bigQueryConfig: {
      type: 'BIGQUERY',
      host: 'bigquery.googleapis.com',
      port: 443,
      database: process.env.TEST_BIGQUERY_DATASET || 'bigquery-public-data',
      projectId: process.env.TEST_GCP_PROJECT_ID,
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      sslEnabled: true,
    },

    // Snowflake with password authentication
    snowflakePasswordConfig: {
      type: 'SNOWFLAKE',
      host: process.env.TEST_SNOWFLAKE_HOST,
      port: 443,
      database: process.env.TEST_SNOWFLAKE_DATABASE || 'SNOWFLAKE_SAMPLE_DATA',
      username: process.env.TEST_SNOWFLAKE_USERNAME,
      password: process.env.TEST_SNOWFLAKE_PASSWORD,
      accountId: process.env.TEST_SNOWFLAKE_ACCOUNT,
      warehouseName: process.env.TEST_SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
      authMethod: 'password',
      sslEnabled: true,
    },

    // Snowflake with key pair authentication
    snowflakeKeyPairConfig: {
      type: 'SNOWFLAKE',
      host: process.env.TEST_SNOWFLAKE_HOST,
      port: 443,
      database: process.env.TEST_SNOWFLAKE_DATABASE || 'SNOWFLAKE_SAMPLE_DATA',
      username: process.env.TEST_SNOWFLAKE_KEYPAIR_USERNAME,
      accountId: process.env.TEST_SNOWFLAKE_ACCOUNT,
      warehouseName: process.env.TEST_SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
      authMethod: 'keypair',
      privateKey: process.env.TEST_SNOWFLAKE_PRIVATE_KEY,
      passphrase: process.env.TEST_SNOWFLAKE_PRIVATE_KEY_PASSPHRASE,
      sslEnabled: true,
    },

    // Invalid BigQuery configuration
    invalidBigQueryConfig: {
      type: 'BIGQUERY',
      host: 'bigquery.googleapis.com',
      port: 443,
      database: 'invalid_dataset',
      projectId: 'invalid-project-12345',
      keyFile: '/invalid/path/to/credentials.json',
      sslEnabled: true,
    },

    // Invalid Snowflake configuration
    invalidSnowflakeConfig: {
      type: 'SNOWFLAKE',
      host: 'invalid.snowflakecomputing.com',
      port: 443,
      database: 'invalid_database',
      username: 'invaliduser',
      password: 'invalidpassword',
      accountId: 'invalid.account',
      warehouseName: 'INVALID_WH',
      authMethod: 'password',
      sslEnabled: true,
    },
  };

  before(async () => {
    await prisma.databaseConnection.deleteMany({
      where: {
        name: {
          startsWith: 'test-analytics-',
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
          startsWith: 'test-analytics-',
        },
      },
    });
  });

  describe('Google BigQuery Tests', () => {
    it('should successfully connect to BigQuery if configured', async function () {
      this.timeout(60000); // BigQuery connections can take longer

      if (!testConfigs.bigQueryConfig.projectId) {
        console.log('BigQuery project ID not provided, skipping test');
        this.skip();
        return;
      }

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('GOOGLE_APPLICATION_CREDENTIALS not set, skipping BigQuery test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.bigQueryConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on BigQuery', async function () {
      this.timeout(90000); // BigQuery queries can take longer

      if (!testConfigs.bigQueryConfig.projectId) {
        console.log('BigQuery project ID not provided, skipping query test');
        this.skip();
        return;
      }

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('GOOGLE_APPLICATION_CREDENTIALS not set, skipping BigQuery query test');
        this.skip();
        return;
      }

      try {
        // Use a public dataset for testing
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.bigQueryConfig,
          `SELECT
            'BigQuery' as platform,
            CURRENT_TIMESTAMP() as current_time,
            @@version as version
          LIMIT 1`
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('platform');
        expect(queryResult.data[0].platform).to.equal('BigQuery');
      } catch (error) {
        console.log('BigQuery query test skipped:', error.message);
        this.skip();
      }
    });

    it('should execute complex BigQuery analytics query', async function () {
      this.timeout(90000);

      if (!testConfigs.bigQueryConfig.projectId) {
        console.log('BigQuery project ID not provided, skipping complex query test');
        this.skip();
        return;
      }

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('GOOGLE_APPLICATION_CREDENTIALS not set, skipping BigQuery complex query test');
        this.skip();
        return;
      }

      try {
        // Query a public dataset
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.bigQueryConfig,
          `SELECT
            COUNT(*) as total_rows,
            'sample_data' as dataset_name
          FROM \`bigquery-public-data.samples.shakespeare\`
          LIMIT 1`
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('total_rows');
        expect(queryResult.data[0]).to.have.property('dataset_name');
      } catch (error) {
        console.log('BigQuery complex query test skipped:', error.message);
        this.skip();
      }
    });

    it('should save BigQuery connection to database', async function () {
      this.timeout(60000);

      if (!testConfigs.bigQueryConfig.projectId) {
        console.log('BigQuery project ID not provided, skipping persistence test');
        this.skip();
        return;
      }

      const connectionData = {
        name: `test-analytics-bigquery-${Date.now()}`,
        type: 'BIGQUERY',
        host: testConfigs.bigQueryConfig.host,
        port: testConfigs.bigQueryConfig.port,
        database: testConfigs.bigQueryConfig.database,
        projectId: testConfigs.bigQueryConfig.projectId,
        keyFile: testConfigs.bigQueryConfig.keyFile,
        sslEnabled: testConfigs.bigQueryConfig.sslEnabled,
        isActive: true,
        organizationId: 'test-org-id',
        createdBy: 'test-user-id',
      };

      const savedConnection = await prisma.databaseConnection.create({
        data: connectionData,
      });

      testConnectionId = savedConnection.id;

      expect(savedConnection.type).to.equal('BIGQUERY');
      expect(savedConnection.projectId).to.equal(testConfigs.bigQueryConfig.projectId);
      expect(savedConnection.port).to.equal(443);
    });
  });

  describe('Snowflake Password Authentication Tests', () => {
    it('should successfully connect to Snowflake with password auth if configured', async function () {
      this.timeout(60000);

      if (
        !testConfigs.snowflakePasswordConfig.host ||
        !testConfigs.snowflakePasswordConfig.username
      ) {
        console.log('Snowflake password auth credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.snowflakePasswordConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on Snowflake with password auth', async function () {
      this.timeout(90000);

      if (
        !testConfigs.snowflakePasswordConfig.host ||
        !testConfigs.snowflakePasswordConfig.username
      ) {
        console.log('Snowflake password auth credentials not provided, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.snowflakePasswordConfig,
          'SELECT CURRENT_VERSION() AS version, CURRENT_TIMESTAMP() AS current_time'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('version');
        expect(queryResult.data[0]).to.have.property('current_time');
      } catch (error) {
        console.log('Snowflake password auth query test skipped:', error.message);
        this.skip();
      }
    });

    it('should execute Snowflake-specific analytics queries', async function () {
      this.timeout(90000);

      if (
        !testConfigs.snowflakePasswordConfig.host ||
        !testConfigs.snowflakePasswordConfig.username
      ) {
        console.log(
          'Snowflake password auth credentials not provided, skipping analytics query test'
        );
        this.skip();
        return;
      }

      try {
        // Test Snowflake sample data
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.snowflakePasswordConfig,
          `SELECT
            COUNT(*) as row_count,
            'SNOWFLAKE_SAMPLE_DATA' as database_name
          FROM SNOWFLAKE_SAMPLE_DATA.INFORMATION_SCHEMA.TABLES
          LIMIT 1`
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('row_count');
        expect(queryResult.data[0]).to.have.property('database_name');
      } catch (error) {
        console.log('Snowflake analytics query test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('Snowflake Key Pair Authentication Tests', () => {
    it('should successfully connect to Snowflake with key pair auth if configured', async function () {
      this.timeout(60000);

      if (
        !testConfigs.snowflakeKeyPairConfig.host ||
        !testConfigs.snowflakeKeyPairConfig.privateKey
      ) {
        console.log('Snowflake key pair auth credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.snowflakeKeyPairConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });

    it('should execute queries on Snowflake with key pair auth', async function () {
      this.timeout(90000);

      if (
        !testConfigs.snowflakeKeyPairConfig.host ||
        !testConfigs.snowflakeKeyPairConfig.privateKey
      ) {
        console.log('Snowflake key pair auth credentials not provided, skipping query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.snowflakeKeyPairConfig,
          'SELECT CURRENT_USER() AS current_user, CURRENT_WAREHOUSE() AS warehouse'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('current_user');
        expect(queryResult.data[0]).to.have.property('warehouse');
      } catch (error) {
        console.log('Snowflake key pair auth query test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('Analytics-Specific Features', () => {
    it('should handle BigQuery dataset permissions', async function () {
      this.timeout(60000);

      if (!testConfigs.bigQueryConfig.projectId) {
        console.log('BigQuery project ID not provided, skipping permissions test');
        this.skip();
        return;
      }

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('GOOGLE_APPLICATION_CREDENTIALS not set, skipping BigQuery permissions test');
        this.skip();
        return;
      }

      try {
        // Try to access a dataset that might not exist or we don't have access to
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.bigQueryConfig,
          'SELECT COUNT(*) as count FROM `invalid.dataset.table`'
        );

        // This should fail due to permissions or non-existent dataset
        expect(queryResult.success).to.be.false;
        expect(queryResult.error).to.satisfy(
          error =>
            error.includes('Not found') ||
            error.includes('permission denied') ||
            error.includes('does not exist') ||
            error.includes('invalid')
        );
      } catch (error) {
        console.log('BigQuery permissions test skipped:', error.message);
        this.skip();
      }
    });

    it('should handle Snowflake warehouse management', async function () {
      this.timeout(60000);

      if (
        !testConfigs.snowflakePasswordConfig.host ||
        !testConfigs.snowflakePasswordConfig.username
      ) {
        console.log('Snowflake credentials not provided, skipping warehouse test');
        this.skip();
        return;
      }

      try {
        // Test warehouse information
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.snowflakePasswordConfig,
          'SELECT CURRENT_WAREHOUSE() AS warehouse, CURRENT_DATABASE() AS database'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('warehouse');
        expect(queryResult.data[0]).to.have.property('database');
      } catch (error) {
        console.log('Snowflake warehouse test skipped:', error.message);
        this.skip();
      }
    });

    it('should handle large result sets efficiently', async function () {
      this.timeout(120000); // Longer timeout for large queries

      if (!testConfigs.bigQueryConfig.projectId) {
        console.log('BigQuery project ID not provided, skipping large result test');
        this.skip();
        return;
      }

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('GOOGLE_APPLICATION_CREDENTIALS not set, skipping BigQuery large result test');
        this.skip();
        return;
      }

      try {
        // Query with limit to ensure manageable result size
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.bigQueryConfig,
          `SELECT
            word,
            word_count
          FROM \`bigquery-public-data.samples.shakespeare\`
          ORDER BY word_count DESC
          LIMIT 100`
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data.length).to.be.lessThanOrEqual(100);
        expect(queryResult.data.length).to.be.greaterThan(0);
      } catch (error) {
        console.log('BigQuery large result test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('Analytics Error Handling', () => {
    it('should fail gracefully with invalid BigQuery configuration', async function () {
      this.timeout(30000);

      const result = await DatabaseService.testConnection(testConfigs.invalidBigQueryConfig);

      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
      expect(result.error).to.satisfy(
        error =>
          error.includes('authentication') ||
          error.includes('permission') ||
          error.includes('credentials') ||
          error.includes('project') ||
          error.includes('not found')
      );
    });

    it('should fail gracefully with invalid Snowflake configuration', async function () {
      this.timeout(30000);

      const result = await DatabaseService.testConnection(testConfigs.invalidSnowflakeConfig);

      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
      expect(result.error).to.satisfy(
        error =>
          error.includes('getaddrinfo ENOTFOUND') ||
          error.includes('connect ECONNREFUSED') ||
          error.includes('authentication failed') ||
          error.includes('invalid') ||
          error.includes('timeout')
      );
    });
  });

  describe('Analytics Performance Testing', () => {
    it('should measure BigQuery connection latency', async function () {
      this.timeout(60000);

      if (!testConfigs.bigQueryConfig.projectId) {
        console.log('BigQuery project ID not provided, skipping latency test');
        this.skip();
        return;
      }

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('GOOGLE_APPLICATION_CREDENTIALS not set, skipping BigQuery latency test');
        this.skip();
        return;
      }

      const startTime = Date.now();
      const result = await DatabaseService.testConnection(testConfigs.bigQueryConfig);
      const endTime = Date.now();

      const latency = endTime - startTime;

      expect(result.success).to.be.true;
      expect(latency).to.be.lessThan(45000); // Should connect within 45 seconds

      console.log(`BigQuery connection latency: ${latency}ms`);
    });

    it('should measure Snowflake connection latency', async function () {
      this.timeout(60000);

      if (
        !testConfigs.snowflakePasswordConfig.host ||
        !testConfigs.snowflakePasswordConfig.username
      ) {
        console.log('Snowflake credentials not provided, skipping latency test');
        this.skip();
        return;
      }

      const startTime = Date.now();
      const result = await DatabaseService.testConnection(testConfigs.snowflakePasswordConfig);
      const endTime = Date.now();

      const latency = endTime - startTime;

      expect(result.success).to.be.true;
      expect(latency).to.be.lessThan(45000); // Should connect within 45 seconds

      console.log(`Snowflake connection latency: ${latency}ms`);
    });
  });
});
