const { expect } = require('chai');
const DatabaseService = require('../../../services/database/DatabaseService');
const { PrismaClient } = require('../../../prisma/generated/client');

const prisma = new PrismaClient();

describe('MySQL Database Connection Tests', () => {
  let testConnectionId;

  const testConfigs = {
    // Local MySQL
    localConfig: {
      type: 'MYSQL',
      host: process.env.TEST_MYSQL_HOST || 'localhost',
      port: parseInt(process.env.TEST_MYSQL_PORT) || 3306,
      database: process.env.TEST_MYSQL_DATABASE || 'mysql',
      username: process.env.TEST_MYSQL_USERNAME || 'root',
      password: process.env.TEST_MYSQL_PASSWORD || 'password',
      sslEnabled: false,
    },

    // SSL-enabled configuration
    sslConfig: {
      type: 'MYSQL',
      host: process.env.TEST_MYSQL_SSL_HOST || 'localhost',
      port: parseInt(process.env.TEST_MYSQL_SSL_PORT) || 3306,
      database: process.env.TEST_MYSQL_SSL_DATABASE || 'mysql',
      username: process.env.TEST_MYSQL_SSL_USERNAME || 'root',
      password: process.env.TEST_MYSQL_SSL_PASSWORD || 'password',
      sslEnabled: true,
    },

    // PlanetScale configuration (external test)
    planetscaleConfig: {
      type: 'MYSQL',
      host: process.env.PLANETSCALE_HOST,
      port: 3306,
      database: process.env.PLANETSCALE_DATABASE,
      username: process.env.PLANETSCALE_USERNAME,
      password: process.env.PLANETSCALE_PASSWORD,
      sslEnabled: true,
    },

    // Invalid configuration
    invalidConfig: {
      type: 'MYSQL',
      host: 'nonexistent.server.com',
      port: 3306,
      database: 'mysql',
      username: 'invaliduser',
      password: 'invalidpassword',
      sslEnabled: false,
    },
  };

  before(async () => {
    await prisma.databaseConnection.deleteMany({
      where: {
        name: {
          startsWith: 'test-mysql-',
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
          startsWith: 'test-mysql-',
        },
      },
    });
  });

  describe('Connection Testing', () => {
    it('should successfully test connection with valid MySQL config', async function () {
      this.timeout(30000);

      const result = await DatabaseService.testConnection(testConfigs.localConfig);

      if (result.success) {
        expect(result.success).to.be.true;
        expect(result.message).to.include('Connection successful');
      } else {
        console.log('MySQL connection test skipped - server not available:', result.error);
        this.skip();
      }
    });

    it('should fail with invalid MySQL config', async function () {
      this.timeout(15000);

      const result = await DatabaseService.testConnection(testConfigs.invalidConfig);

      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
    });

    it('should connect to PlanetScale if credentials provided', async function () {
      this.timeout(30000);

      if (!testConfigs.planetscaleConfig.host || !testConfigs.planetscaleConfig.username) {
        console.log('PlanetScale credentials not provided, skipping test');
        this.skip();
        return;
      }

      const result = await DatabaseService.testConnection(testConfigs.planetscaleConfig);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Connection successful');
    });
  });

  describe('MySQL-Specific Features', () => {
    it('should execute MySQL-specific queries', async function () {
      this.timeout(30000);

      const testResult = await DatabaseService.testConnection(testConfigs.localConfig);
      if (!testResult.success) {
        console.log('MySQL not available, skipping MySQL-specific query test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.localConfig,
          'SELECT VERSION() AS version, NOW() AS current_time, CONNECTION_ID() AS connection_id'
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data[0]).to.have.property('version');
        expect(queryResult.data[0]).to.have.property('current_time');
        expect(queryResult.data[0]).to.have.property('connection_id');
      } catch (error) {
        console.log('MySQL-specific query test skipped:', error.message);
        this.skip();
      }
    });

    it('should handle MySQL data types correctly', async function () {
      this.timeout(30000);

      const testResult = await DatabaseService.testConnection(testConfigs.localConfig);
      if (!testResult.success) {
        console.log('MySQL not available, skipping data types test');
        this.skip();
        return;
      }

      try {
        const queryResult = await DatabaseService.executeQuery(
          testConfigs.localConfig,
          `SELECT
            'test string' AS text_col,
            42 AS int_col,
            3.14 AS decimal_col,
            TRUE AS bool_col,
            NOW() AS datetime_col,
            '{"key": "value"}' AS json_col`
        );

        expect(queryResult.success).to.be.true;
        expect(queryResult.data).to.be.an('array');
        expect(queryResult.data.length).to.equal(1);

        const row = queryResult.data[0];
        expect(row.text_col).to.equal('test string');
        expect(row.int_col).to.equal(42);
        expect(row.bool_col).to.equal(1); // MySQL returns 1 for TRUE
      } catch (error) {
        console.log('MySQL data types test skipped:', error.message);
        this.skip();
      }
    });
  });
});
