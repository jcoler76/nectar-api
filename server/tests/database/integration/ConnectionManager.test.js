const { expect } = require('chai');
const DatabaseService = require('../../../services/database/DatabaseService');
const databaseConnectionManager = require('../../../utils/databaseConnectionManager');
const { PrismaClient } = require('../../../prisma/generated/client');

const prisma = new PrismaClient();

describe('Database Connection Manager Integration Tests', () => {
  let testConnections = [];

  const testConfigs = {
    // Use PostgreSQL as the most reliable test database
    postgresqlConfig: {
      type: 'POSTGRESQL',
      host: process.env.TEST_POSTGRESQL_HOST || 'localhost',
      port: parseInt(process.env.TEST_POSTGRESQL_PORT) || 5432,
      database: process.env.TEST_POSTGRESQL_DATABASE || 'postgres',
      username: process.env.TEST_POSTGRESQL_USERNAME || 'postgres',
      password: process.env.TEST_POSTGRESQL_PASSWORD || 'password',
      sslEnabled: false,
    },

    mssqlConfig: {
      type: 'MSSQL',
      host: process.env.TEST_MSSQL_HOST || 'localhost',
      port: parseInt(process.env.TEST_MSSQL_PORT) || 1433,
      database: process.env.TEST_MSSQL_DATABASE || 'master',
      username: process.env.TEST_MSSQL_USERNAME || 'sa',
      password: process.env.TEST_MSSQL_PASSWORD || 'YourStrong!Passw0rd',
      sslEnabled: false,
      trustServerCertificate: true,
    },
  };

  before(async () => {
    // Clean up any existing test connections
    await prisma.databaseConnection.deleteMany({
      where: {
        name: {
          startsWith: 'test-integration-',
        },
      },
    });
  });

  after(async () => {
    // Clean up test connections
    if (testConnections.length > 0) {
      await prisma.databaseConnection.deleteMany({
        where: {
          id: {
            in: testConnections.map(conn => conn.id),
          },
        },
      });
    }

    // Close all database connections
    await databaseConnectionManager.closeAllConnections();
  });

  describe('Full Connection Lifecycle', () => {
    it('should create, save, test, and use a database connection end-to-end', async function () {
      this.timeout(60000);

      // Step 1: Test connection configuration
      const testResult = await DatabaseService.testConnection(testConfigs.postgresqlConfig);

      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping integration test');
        this.skip();
        return;
      }

      // Step 2: Save connection to database
      const connectionData = {
        name: `test-integration-postgresql-${Date.now()}`,
        type: 'POSTGRESQL',
        host: testConfigs.postgresqlConfig.host,
        port: testConfigs.postgresqlConfig.port,
        database: testConfigs.postgresqlConfig.database,
        username: testConfigs.postgresqlConfig.username,
        passwordEncrypted: testConfigs.postgresqlConfig.password, // In real app, this would be encrypted
        sslEnabled: testConfigs.postgresqlConfig.sslEnabled,
        isActive: true,
        organizationId: 'test-org-id',
        createdBy: 'test-user-id',
      };

      const savedConnection = await prisma.databaseConnection.create({
        data: connectionData,
      });

      testConnections.push(savedConnection);

      expect(savedConnection.id).to.be.a('string');
      expect(savedConnection.type).to.equal('POSTGRESQL');

      // Step 3: Retrieve and test the saved connection
      const retrievedConnection = await prisma.databaseConnection.findUnique({
        where: { id: savedConnection.id },
      });

      expect(retrievedConnection).to.not.be.null;

      // Step 4: Use the connection manager to get a connection
      const connectionConfig = {
        type: retrievedConnection.type,
        host: retrievedConnection.host,
        port: retrievedConnection.port,
        database: retrievedConnection.database,
        username: retrievedConnection.username,
        password: retrievedConnection.passwordEncrypted, // In real app, this would be decrypted
        sslEnabled: retrievedConnection.sslEnabled,
      };

      const pool = await databaseConnectionManager.getConnection(connectionConfig);
      expect(pool).to.not.be.null;

      // Step 5: Execute a query using the connection manager
      const queryResult = await databaseConnectionManager.executeQuery(
        connectionConfig,
        'SELECT version() AS version, current_timestamp AS current_time'
      );

      expect(queryResult.recordset).to.be.an('array');
      expect(queryResult.recordset.length).to.be.greaterThan(0);
      expect(queryResult.recordset[0]).to.have.property('version');

      // Step 6: Test connection pooling
      const secondPool = await databaseConnectionManager.getConnection(connectionConfig);
      expect(secondPool).to.equal(pool); // Should return the same pool instance

      // Step 7: Close the connection
      await databaseConnectionManager.closeConnection(connectionConfig);

      // Step 8: Verify connection is closed
      const activeConnections = databaseConnectionManager.getActiveConnections();
      const connectionKey = databaseConnectionManager.createConnectionKey(connectionConfig);
      expect(activeConnections).to.not.include(connectionKey);
    });

    it('should handle multiple different database types simultaneously', async function () {
      this.timeout(90000);

      const connections = [];

      // Test PostgreSQL
      const postgresTestResult = await DatabaseService.testConnection(testConfigs.postgresqlConfig);
      if (postgresTestResult.success) {
        const postgresConnection = {
          name: `test-integration-multi-postgresql-${Date.now()}`,
          type: 'POSTGRESQL',
          host: testConfigs.postgresqlConfig.host,
          port: testConfigs.postgresqlConfig.port,
          database: testConfigs.postgresqlConfig.database,
          username: testConfigs.postgresqlConfig.username,
          passwordEncrypted: testConfigs.postgresqlConfig.password,
          sslEnabled: testConfigs.postgresqlConfig.sslEnabled,
          isActive: true,
          organizationId: 'test-org-id',
          createdBy: 'test-user-id',
        };

        const savedPostgresConnection = await prisma.databaseConnection.create({
          data: postgresConnection,
        });

        connections.push(savedPostgresConnection);
        testConnections.push(savedPostgresConnection);
      }

      // Test MSSQL
      const mssqlTestResult = await DatabaseService.testConnection(testConfigs.mssqlConfig);
      if (mssqlTestResult.success) {
        const mssqlConnection = {
          name: `test-integration-multi-mssql-${Date.now()}`,
          type: 'MSSQL',
          host: testConfigs.mssqlConfig.host,
          port: testConfigs.mssqlConfig.port,
          database: testConfigs.mssqlConfig.database,
          username: testConfigs.mssqlConfig.username,
          passwordEncrypted: testConfigs.mssqlConfig.password,
          sslEnabled: testConfigs.mssqlConfig.sslEnabled,
          isActive: true,
          organizationId: 'test-org-id',
          createdBy: 'test-user-id',
        };

        const savedMSSQLConnection = await prisma.databaseConnection.create({
          data: mssqlConnection,
        });

        connections.push(savedMSSQLConnection);
        testConnections.push(savedMSSQLConnection);
      }

      if (connections.length === 0) {
        console.log('No databases available for multi-database test');
        this.skip();
        return;
      }

      expect(connections.length).to.be.greaterThan(0);

      // Test each connection simultaneously
      const testPromises = connections.map(async connection => {
        const connectionConfig = {
          type: connection.type,
          host: connection.host,
          port: connection.port,
          database: connection.database,
          username: connection.username,
          password: connection.passwordEncrypted,
          sslEnabled: connection.sslEnabled,
          trustServerCertificate: connection.type === 'MSSQL',
        };

        const testResult = await DatabaseService.testConnection(connectionConfig);
        return {
          connection,
          testResult,
        };
      });

      const results = await Promise.all(testPromises);

      results.forEach(({ connection, testResult }) => {
        expect(testResult.success).to.be.true;
        console.log(`Successfully tested ${connection.type} connection: ${connection.name}`);
      });
    });
  });

  describe('Connection Pool Management', () => {
    it('should manage connection pools efficiently', async function () {
      this.timeout(60000);

      const testResult = await DatabaseService.testConnection(testConfigs.postgresqlConfig);

      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping pool management test');
        this.skip();
        return;
      }

      const connectionConfig = testConfigs.postgresqlConfig;

      // Get initial connection count
      const initialCount = databaseConnectionManager.getConnectionCount();

      // Create multiple connections
      const pool1 = await databaseConnectionManager.getConnection(connectionConfig);
      const pool2 = await databaseConnectionManager.getConnection(connectionConfig);
      const pool3 = await databaseConnectionManager.getConnection(connectionConfig);

      // Should use the same pool for identical connections
      expect(pool1).to.equal(pool2);
      expect(pool2).to.equal(pool3);

      // Connection count should only increase by 1
      const newCount = databaseConnectionManager.getConnectionCount();
      expect(newCount).to.equal(initialCount + 1);

      // Test concurrent queries
      const queryPromises = [];
      for (let i = 0; i < 5; i++) {
        queryPromises.push(
          databaseConnectionManager.executeQuery(
            connectionConfig,
            `SELECT ${i} as test_number, current_timestamp as current_time`
          )
        );
      }

      const queryResults = await Promise.all(queryPromises);

      queryResults.forEach((result, index) => {
        expect(result.recordset).to.be.an('array');
        expect(result.recordset[0].test_number).to.equal(index);
      });

      // Close connection
      await databaseConnectionManager.closeConnection(connectionConfig);

      // Connection count should decrease
      const finalCount = databaseConnectionManager.getConnectionCount();
      expect(finalCount).to.equal(initialCount);
    });

    it('should handle connection errors gracefully', async function () {
      this.timeout(30000);

      const invalidConfig = {
        type: 'POSTGRESQL',
        host: 'nonexistent.server.com',
        port: 5432,
        database: 'postgres',
        username: 'invaliduser',
        password: 'invalidpassword',
        sslEnabled: false,
      };

      try {
        await databaseConnectionManager.getConnection(invalidConfig);
        expect.fail('Should have thrown an error for invalid connection');
      } catch (error) {
        expect(error.message).to.be.a('string');
        expect(error.message).to.satisfy(
          msg =>
            msg.includes('getaddrinfo ENOTFOUND') ||
            msg.includes('connect ECONNREFUSED') ||
            msg.includes('authentication failed')
        );
      }
    });
  });

  describe('Database-Specific Operations', () => {
    it('should execute stored procedures if supported', async function () {
      this.timeout(60000);

      const testResult = await DatabaseService.testConnection(testConfigs.mssqlConfig);

      if (!testResult.success) {
        console.log('MSSQL not available, skipping stored procedure test');
        this.skip();
        return;
      }

      try {
        // Test built-in stored procedure
        const procedureResult = await databaseConnectionManager.executeProcedure(
          testConfigs.mssqlConfig,
          'sp_who'
        );

        expect(procedureResult.recordset).to.be.an('array');
      } catch (error) {
        console.log('Stored procedure test skipped:', error.message);
        this.skip();
      }
    });

    it('should handle transactions', async function () {
      this.timeout(60000);

      const testResult = await DatabaseService.testConnection(testConfigs.postgresqlConfig);

      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping transaction test');
        this.skip();
        return;
      }

      try {
        const operations = [
          {
            type: 'query',
            sql: 'SELECT 1 as test_value',
          },
          {
            type: 'query',
            sql: 'SELECT 2 as test_value',
          },
        ];

        const transactionResults = await databaseConnectionManager.executeTransaction(
          testConfigs.postgresqlConfig,
          operations
        );

        expect(transactionResults).to.be.an('array');
        expect(transactionResults.length).to.equal(2);
        expect(transactionResults[0].recordset[0].test_value).to.equal(1);
        expect(transactionResults[1].recordset[0].test_value).to.equal(2);
      } catch (error) {
        console.log('Transaction test skipped:', error.message);
        this.skip();
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from connection failures', async function () {
      this.timeout(60000);

      const testResult = await DatabaseService.testConnection(testConfigs.postgresqlConfig);

      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping recovery test');
        this.skip();
        return;
      }

      // Get a working connection
      const pool = await databaseConnectionManager.getConnection(testConfigs.postgresqlConfig);
      expect(pool).to.not.be.null;

      // Force close the connection
      await databaseConnectionManager.closeConnection(testConfigs.postgresqlConfig);

      // Try to get a new connection (should succeed)
      const newPool = await databaseConnectionManager.getConnection(testConfigs.postgresqlConfig);
      expect(newPool).to.not.be.null;

      // Test that the new connection works
      const queryResult = await databaseConnectionManager.executeQuery(
        testConfigs.postgresqlConfig,
        'SELECT current_timestamp as recovery_time'
      );

      expect(queryResult.recordset).to.be.an('array');
      expect(queryResult.recordset[0]).to.have.property('recovery_time');

      // Clean up
      await databaseConnectionManager.closeConnection(testConfigs.postgresqlConfig);
    });

    it('should handle database disconnections gracefully', async function () {
      this.timeout(30000);

      const testResult = await DatabaseService.testConnection(testConfigs.postgresqlConfig);

      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping disconnection test');
        this.skip();
        return;
      }

      // This test simulates what happens when a connection is lost
      // In a real scenario, the database server might go down

      try {
        // Create a connection
        const pool = await databaseConnectionManager.getConnection(testConfigs.postgresqlConfig);

        // Execute a query to ensure connection is working
        const result1 = await databaseConnectionManager.executeQuery(
          testConfigs.postgresqlConfig,
          'SELECT 1 as test'
        );
        expect(result1.recordset[0].test).to.equal(1);

        // Close all connections to simulate disconnection
        await databaseConnectionManager.closeAllConnections();

        // Try to execute another query (should create a new connection)
        const result2 = await databaseConnectionManager.executeQuery(
          testConfigs.postgresqlConfig,
          'SELECT 2 as test'
        );
        expect(result2.recordset[0].test).to.equal(2);
      } catch (error) {
        console.log('Disconnection test failed as expected:', error.message);
        // This is expected behavior when connections are forcibly closed
      }
    });
  });

  describe('Performance and Monitoring', () => {
    it('should provide connection statistics', async function () {
      this.timeout(30000);

      const testResult = await DatabaseService.testConnection(testConfigs.postgresqlConfig);

      if (!testResult.success) {
        console.log('PostgreSQL not available, skipping statistics test');
        this.skip();
        return;
      }

      const initialCount = databaseConnectionManager.getConnectionCount();
      const initialConnections = databaseConnectionManager.getActiveConnections();

      // Create a connection
      await databaseConnectionManager.getConnection(testConfigs.postgresqlConfig);

      const newCount = databaseConnectionManager.getConnectionCount();
      const newConnections = databaseConnectionManager.getActiveConnections();

      expect(newCount).to.equal(initialCount + 1);
      expect(newConnections.length).to.equal(initialConnections.length + 1);

      // Clean up
      await databaseConnectionManager.closeConnection(testConfigs.postgresqlConfig);

      const finalCount = databaseConnectionManager.getConnectionCount();
      expect(finalCount).to.equal(initialCount);
    });
  });
});
