#!/usr/bin/env node

/**
 * MCP Server Test Script
 *
 * Comprehensive diagnostic test for the MCP server implementation
 * Tests all critical components before attempting to connect with Claude Desktop
 *
 * Usage:
 *   node server/mcp/test-mcp-server.js --api-key YOUR_APPLICATION_API_KEY
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const RoleMCPAdapter = require('./RoleMCPAdapter');

const prisma = new PrismaClient({
  log: ['error'],
});

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(message, 'bright');
  log('='.repeat(60), 'bright');
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const apiKeyIndex = args.indexOf('--api-key');

  if (apiKeyIndex === -1 || !args[apiKeyIndex + 1]) {
    logError('--api-key parameter is required');
    log('\nUsage: node test-mcp-server.js --api-key YOUR_APPLICATION_API_KEY\n');
    process.exit(1);
  }

  return {
    apiKey: args[apiKeyIndex + 1],
  };
}

/**
 * Test 1: Environment Variables
 */
async function testEnvironmentVariables() {
  logSection('Test 1: Environment Variables');

  const requiredVars = ['DATABASE_URL', 'ENCRYPTION_KEY'];

  let allPresent = true;

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logError(`${varName} is missing`);
      allPresent = false;
    }
  }

  if (!allPresent) {
    throw new Error('Missing required environment variables');
  }

  logSuccess('All required environment variables are set');
}

/**
 * Test 2: API Key Format
 */
async function testApiKeyFormat(apiKey) {
  logSection('Test 2: API Key Format Validation');

  if (!apiKey.startsWith('mapi_')) {
    throw new Error('API key must start with "mapi_"');
  }
  logSuccess('API key format is valid');

  if (apiKey.length < 20) {
    logWarning('API key seems short - verify this is a real key');
  }

  logInfo(`API key prefix: ${apiKey.substring(0, 10)}...`);
}

/**
 * Test 3: Database Connection
 */
async function testDatabaseConnection() {
  logSection('Test 3: Database Connection');

  try {
    await prisma.$connect();
    logSuccess('Connected to database successfully');

    const result = await prisma.$queryRaw`SELECT 1 as test`;
    logSuccess('Database query test passed');
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

/**
 * Test 4: Application Lookup
 */
async function testApplicationLookup(apiKey) {
  logSection('Test 4: Application Lookup');

  const keyPrefix = apiKey.substring(0, 10);
  logInfo(`Looking up application by prefix: ${keyPrefix}`);

  const application = await prisma.application.findFirst({
    where: {
      apiKeyPrefix: keyPrefix,
    },
    include: {
      defaultRole: {
        include: {
          service: {
            include: {
              connection: true,
            },
          },
        },
      },
      organization: true,
    },
  });

  if (!application) {
    throw new Error('Application not found - check your API key');
  }

  logSuccess(`Found application: ${application.name}`);
  logInfo(`Application ID: ${application.id}`);
  logInfo(`Organization: ${application.organization.name}`);

  return application;
}

/**
 * Test 5: API Key Hash Validation
 */
async function testApiKeyHashValidation(apiKey, application) {
  logSection('Test 5: API Key Hash Validation');

  const isValid = await bcrypt.compare(apiKey, application.apiKeyHash);

  if (!isValid) {
    throw new Error('API key hash validation failed - invalid key');
  }

  logSuccess('API key hash validation passed');
}

/**
 * Test 6: Application Status Checks
 */
async function testApplicationStatus(application) {
  logSection('Test 6: Application Status Checks');

  if (!application.isActive) {
    throw new Error('Application is inactive');
  }
  logSuccess('Application is active');

  if (!application.defaultRole) {
    throw new Error('No default role assigned to application');
  }
  logSuccess(`Default role assigned: ${application.defaultRole.name}`);

  if (!application.defaultRole.isActive) {
    throw new Error('Default role is inactive');
  }
  logSuccess('Default role is active');

  if (!application.defaultRole.mcpEnabled) {
    throw new Error('MCP server not enabled on default role');
  }
  logSuccess('MCP server is enabled on role');
}

/**
 * Test 7: Role & Permissions Loading
 */
async function testRolePermissions(application) {
  logSection('Test 7: Role & Permissions Loading');

  const role = application.defaultRole;

  logInfo(`Role name: ${role.name}`);
  logInfo(`Role ID: ${role.id}`);

  const permissions = Array.isArray(role.permissions)
    ? role.permissions
    : JSON.parse(role.permissions || '[]');

  logSuccess(`Loaded ${permissions.length} permissions`);

  if (permissions.length === 0) {
    logWarning('No permissions found - tools list may be empty');
  } else {
    logInfo('Sample permissions:');
    permissions.slice(0, 3).forEach(perm => {
      logInfo(`  - ${perm.objectName || perm.path || 'Unknown'}`);
    });
    if (permissions.length > 3) {
      logInfo(`  ... and ${permissions.length - 3} more`);
    }
  }

  return permissions;
}

/**
 * Test 8: Service & Connection Configuration
 */
async function testServiceConfiguration(application) {
  logSection('Test 8: Service & Connection Configuration');

  const service = application.defaultRole.service;

  if (!service) {
    logWarning('No service configured - database tools will not be available');
    return;
  }

  logSuccess(`Service configured: ${service.name}`);
  logInfo(`Service type: ${service.type}`);
  logInfo(`Database: ${service.database}`);

  if (!service.connection) {
    logWarning('No connection configured - database tools will not work');
    return;
  }

  logSuccess('Database connection configured');
  logInfo(`DB Type: ${service.connection.dbType}`);
  logInfo(`Host: ${service.connection.host}`);
  logInfo(`Port: ${service.connection.port}`);
}

/**
 * Test 9: MCP Adapter Initialization
 */
async function testMCPAdapterInitialization(application) {
  logSection('Test 9: MCP Adapter Initialization');

  const adapter = new RoleMCPAdapter(application, prisma);
  logSuccess('RoleMCPAdapter instance created');

  await adapter.initialize();
  logSuccess('Adapter initialized successfully');

  return adapter;
}

/**
 * Test 10: Tools Generation
 */
async function testToolsGeneration(adapter) {
  logSection('Test 10: Tools Generation');

  const tools = adapter.getTools();

  logSuccess(`Generated ${tools.length} MCP tools`);

  if (tools.length === 0) {
    logWarning('No tools generated - check role permissions');
    return tools;
  }

  logInfo('\nGenerated tools:');
  tools.forEach((tool, index) => {
    logInfo(`  ${index + 1}. ${tool.name}`);
    logInfo(`     Handler: ${tool.handler}`);
    logInfo(`     Description: ${tool.description.substring(0, 80)}...`);
  });

  return tools;
}

/**
 * Test 11: Adapter Statistics
 */
async function testAdapterStatistics(adapter) {
  logSection('Test 11: Adapter Statistics');

  const stats = adapter.getStats();

  logInfo(`Role Name: ${stats.roleName}`);
  logInfo(`Organization: ${stats.organizationName}`);
  logInfo(`Application: ${stats.applicationName}`);
  logInfo(`Service: ${stats.serviceName}`);
  logInfo(`Permissions Count: ${stats.permissionsCount}`);
  logInfo(`Tools Count: ${stats.toolsCount}`);
  logInfo(`MCP Enabled: ${stats.mcpEnabled}`);

  logSuccess('Statistics retrieved successfully');
}

/**
 * Main Test Runner
 */
async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         MCP Server Diagnostic Test Suite                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    // Parse arguments
    const { apiKey } = parseArgs();

    // Run all tests
    await testEnvironmentVariables();
    await testApiKeyFormat(apiKey);
    await testDatabaseConnection();
    const application = await testApplicationLookup(apiKey);
    await testApiKeyHashValidation(apiKey, application);
    await testApplicationStatus(application);
    await testRolePermissions(application);
    await testServiceConfiguration(application);
    const adapter = await testMCPAdapterInitialization(application);
    const tools = await testToolsGeneration(adapter);
    await testAdapterStatistics(adapter);

    // Final summary
    logSection('Test Summary');
    logSuccess('ALL TESTS PASSED! ✨');
    log('');
    logInfo('Your MCP server is ready to use with Claude Desktop.');
    logInfo('Next steps:');
    logInfo('  1. Add the configuration to your claude_desktop_config.json');
    logInfo('  2. Restart Claude Desktop');
    logInfo('  3. Look for the 🔌 icon to confirm connection');
    log('');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    logSection('Test Failed');
    logError(`Error: ${error.message}`);
    if (error.stack) {
      log('\nStack trace:', 'yellow');
      log(error.stack, 'yellow');
    }
    log('');
    logInfo('Please fix the errors above before using the MCP server.');
    log('');

    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the tests
main();
