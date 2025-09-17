const path = require('path');
const fs = require('fs').promises;
const DatabaseDriverFactory = require('../services/database/DatabaseDriverFactory');

async function testSQLiteDriver() {
  console.log('🧪 Testing SQLite Driver Integration...');

  const testDbPath = path.join(__dirname, 'test_databases', 'test.db');

  try {
    // Ensure test directory exists
    await fs.mkdir(path.dirname(testDbPath), { recursive: true });

    // Clean up any existing test database
    try {
      await fs.unlink(testDbPath);
    } catch (err) {
      // File doesn't exist, that's fine
    }

    // Test connection configuration
    const connectionConfig = {
      type: 'SQLITE',
      database: testDbPath,
    };

    console.log('✅ Creating SQLite driver...');
    const driver = DatabaseDriverFactory.createDriver('SQLITE', connectionConfig);

    console.log('✅ Testing connection...');
    const connectionResult = await driver.testConnection();

    if (!connectionResult.success) {
      throw new Error(`Connection test failed: ${connectionResult.error}`);
    }

    console.log('✅ Creating connection...');
    const connection = await driver.createConnection();

    console.log('✅ Creating test table...');
    await driver.executeQuery(
      connection,
      `
      CREATE TABLE IF NOT EXISTS test_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    console.log('✅ Inserting test data...');
    await driver.executeQuery(
      connection,
      `
      INSERT INTO test_users (name, email) VALUES (?, ?)
    `,
      ['John Doe', 'john@example.com']
    );

    await driver.executeQuery(
      connection,
      `
      INSERT INTO test_users (name, email) VALUES (:name, :email)
    `,
      { name: 'Jane Smith', email: 'jane@example.com' }
    );

    console.log('✅ Querying data...');
    const users = await driver.executeQuery(connection, 'SELECT * FROM test_users');
    console.log('📊 Query results:', users);

    console.log('✅ Getting database objects...');
    const dbObjects = await driver.getDatabaseObjects(connection);
    console.log(
      '📋 Database objects:',
      dbObjects.map(obj => `${obj.name} (${obj.type_desc})`)
    );

    console.log('✅ Getting table columns...');
    const columns = await driver.getTableColumns(connection, null, 'test_users');
    console.log(
      '📊 Table columns:',
      columns.map(col => `${col.name}: ${col.dataType}`)
    );

    console.log('✅ Getting tables list...');
    const tables = await driver.getTables(connection);
    console.log('📋 Tables:', tables);

    console.log('✅ Closing connection...');
    await driver.closeConnection(connection);

    console.log('🎉 SQLite driver test completed successfully!');

    // Clean up test database
    try {
      await fs.unlink(testDbPath);
    } catch (err) {
      console.warn('⚠️  Could not clean up test database:', err.message);
    }
  } catch (error) {
    console.error('❌ SQLite driver test failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testSQLiteDriver()
    .then(() => {
      console.log('✅ All tests passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed!', error);
      process.exit(1);
    });
}

module.exports = { testSQLiteDriver };
