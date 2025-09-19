#!/usr/bin/env node

/**
 * Database Connection Test Runner
 * Runs comprehensive tests for all supported database types
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.test if it exists
const envTestPath = path.join(__dirname, '.env.test');
if (fs.existsSync(envTestPath)) {
  require('dotenv').config({ path: envTestPath });
}

const testCategories = {
  traditional: {
    name: 'Traditional Databases',
    tests: [
      'traditional/MSSQLConnection.test.js',
      'traditional/PostgreSQLConnection.test.js',
      'traditional/MySQLConnection.test.js',
    ],
  },
  cloud: {
    name: 'Cloud Databases',
    tests: [
      'cloud/AWSConnection.test.js',
      'cloud/AzureConnection.test.js',
      'cloud/GoogleCloudConnection.test.js',
    ],
  },
  analytics: {
    name: 'Analytics Databases',
    tests: ['analytics/AnalyticsConnection.test.js'],
  },
  integration: {
    name: 'Integration Tests',
    tests: ['integration/ConnectionManager.test.js'],
  },
};

class DatabaseTestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      categories: {},
    };
  }

  async runCategory(categoryName, category) {
    console.log(`\n🔍 Running ${category.name}...`);
    console.log('='.repeat(50));

    const categoryResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
    };

    for (const testFile of category.tests) {
      const testPath = path.join(__dirname, testFile);

      if (!fs.existsSync(testPath)) {
        console.log(`⚠️  Test file not found: ${testFile}`);
        categoryResults.skipped++;
        continue;
      }

      console.log(`\n📋 Running ${testFile}...`);

      try {
        const result = await this.runTest(testPath);
        categoryResults.tests.push({
          file: testFile,
          result: result,
        });

        if (result.success) {
          categoryResults.passed++;
          console.log(`✅ ${testFile} - PASSED`);
        } else {
          categoryResults.failed++;
          console.log(`❌ ${testFile} - FAILED`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
        }
      } catch (error) {
        categoryResults.failed++;
        console.log(`💥 ${testFile} - ERROR: ${error.message}`);
      }
    }

    this.results.categories[categoryName] = categoryResults;
    this.results.passed += categoryResults.passed;
    this.results.failed += categoryResults.failed;
    this.results.skipped += categoryResults.skipped;

    console.log(`\n📊 ${category.name} Results:`);
    console.log(`   Passed: ${categoryResults.passed}`);
    console.log(`   Failed: ${categoryResults.failed}`);
    console.log(`   Skipped: ${categoryResults.skipped}`);
  }

  async runTest(testPath) {
    return new Promise(resolve => {
      const mocha = spawn('npx', ['mocha', testPath, '--timeout', '60000'], {
        stdio: 'pipe',
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      mocha.stdout.on('data', data => {
        stdout += data.toString();
      });

      mocha.stderr.on('data', data => {
        stderr += data.toString();
      });

      mocha.on('close', code => {
        resolve({
          success: code === 0,
          code: code,
          stdout: stdout,
          stderr: stderr,
          error: code !== 0 ? stderr || stdout : null,
        });
      });

      mocha.on('error', error => {
        resolve({
          success: false,
          error: error.message,
        });
      });
    });
  }

  printDatabaseAvailability() {
    console.log('\n🔧 Database Availability Check:');
    console.log('================================');

    const checks = [
      {
        name: 'PostgreSQL',
        env: ['TEST_POSTGRESQL_HOST', 'TEST_POSTGRESQL_USERNAME'],
        default: 'localhost:5432',
      },
      {
        name: 'MySQL',
        env: ['TEST_MYSQL_HOST', 'TEST_MYSQL_USERNAME'],
        default: 'localhost:3306',
      },
      {
        name: 'SQL Server',
        env: ['TEST_MSSQL_HOST', 'TEST_MSSQL_USERNAME'],
        default: 'localhost:1433',
      },
      {
        name: 'MongoDB',
        env: ['TEST_MONGODB_HOST'],
        default: 'localhost:27017',
      },
      {
        name: 'AWS RDS',
        env: ['TEST_AWS_RDS_POSTGRESQL_HOST', 'TEST_AWS_RDS_POSTGRESQL_USERNAME'],
        default: 'Not configured',
      },
      {
        name: 'Azure SQL',
        env: ['TEST_AZURE_SQL_SERVER', 'TEST_AZURE_SQL_USERNAME'],
        default: 'Not configured',
      },
      {
        name: 'Google Cloud SQL',
        env: ['TEST_GCP_POSTGRESQL_HOST', 'TEST_GCP_POSTGRESQL_USERNAME'],
        default: 'Not configured',
      },
      {
        name: 'BigQuery',
        env: ['TEST_GCP_PROJECT_ID', 'GOOGLE_APPLICATION_CREDENTIALS'],
        default: 'Not configured',
      },
      {
        name: 'Snowflake',
        env: ['TEST_SNOWFLAKE_HOST', 'TEST_SNOWFLAKE_USERNAME'],
        default: 'Not configured',
      },
    ];

    checks.forEach(check => {
      const configured = check.env.every(envVar => process.env[envVar]);
      const status = configured ? '✅ Configured' : '⚪ Not configured';
      const value = configured ? check.env.map(env => process.env[env]).join(', ') : check.default;

      console.log(`${status} ${check.name.padEnd(20)} - ${value}`);
    });
  }

  printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 DATABASE CONNECTION TEST SUMMARY');
    console.log('='.repeat(70));

    const total = this.results.passed + this.results.failed + this.results.skipped;

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${total}`);
    console.log(`   ✅ Passed: ${this.results.passed}`);
    console.log(`   ❌ Failed: ${this.results.failed}`);
    console.log(`   ⚪ Skipped: ${this.results.skipped}`);

    if (total > 0) {
      const passRate = ((this.results.passed / total) * 100).toFixed(1);
      console.log(`   📊 Pass Rate: ${passRate}%`);
    }

    console.log('\n📋 Results by Category:');
    Object.entries(this.results.categories).forEach(([categoryName, categoryResult]) => {
      const categoryTotal = categoryResult.passed + categoryResult.failed + categoryResult.skipped;
      console.log(`\n   ${testCategories[categoryName].name}:`);
      console.log(
        `     Total: ${categoryTotal} | Passed: ${categoryResult.passed} | Failed: ${categoryResult.failed} | Skipped: ${categoryResult.skipped}`
      );
    });

    if (this.results.failed > 0) {
      console.log('\n⚠️  Some tests failed. Check the output above for details.');
      console.log('💡 Note: Tests may be skipped if databases are not available locally.');
    }

    if (this.results.skipped > 0) {
      console.log('\n💡 Setup Instructions:');
      console.log('   • Install local databases (PostgreSQL, MySQL, SQL Server, MongoDB)');
      console.log('   • Copy .env.test.example to .env.test and configure credentials');
      console.log('   • For cloud databases, set up test instances and add credentials');
      console.log('   • See TEST_CONNECTION_STRINGS.md for detailed setup instructions');
    }
  }

  async run(categories = null) {
    console.log('🚀 Starting Database Connection Tests');
    console.log('=====================================');

    this.printDatabaseAvailability();

    const categoriesToRun = categories || Object.keys(testCategories);

    for (const categoryName of categoriesToRun) {
      if (testCategories[categoryName]) {
        await this.runCategory(categoryName, testCategories[categoryName]);
      } else {
        console.log(`⚠️  Unknown category: ${categoryName}`);
      }
    }

    this.printSummary();

    // Exit with non-zero code if any tests failed
    if (this.results.failed > 0) {
      process.exit(1);
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const runner = new DatabaseTestRunner();

  if (args.length === 0) {
    // Run all tests
    runner.run();
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('Database Connection Test Runner');
    console.log('');
    console.log('Usage:');
    console.log('  node run-database-tests.js [category...]');
    console.log('');
    console.log('Categories:');
    Object.entries(testCategories).forEach(([key, category]) => {
      console.log(`  ${key.padEnd(12)} - ${category.name}`);
    });
    console.log('');
    console.log('Examples:');
    console.log('  node run-database-tests.js                    # Run all tests');
    console.log(
      '  node run-database-tests.js traditional        # Run only traditional database tests'
    );
    console.log('  node run-database-tests.js cloud analytics    # Run cloud and analytics tests');
    console.log('');
    console.log('Environment:');
    console.log('  Create .env.test file with your database credentials');
    console.log('  See .env.test.example for template');
  } else {
    // Run specific categories
    runner.run(args);
  }
}

module.exports = DatabaseTestRunner;
