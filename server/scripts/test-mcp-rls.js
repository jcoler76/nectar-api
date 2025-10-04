/**
 * MCP & Agents RLS Validation Test
 * Verifies Row Level Security is properly enforced for MCP servers and autonomous agents
 */

const prismaService = require('../services/prismaService');
const { logger } = require('../utils/logger');

// Test configuration
const TEST_ORGS = {
  orgA: null, // Will be populated
  orgB: null,
};

async function setupTestData() {
  console.log('\n📋 Setting up test data...\n');

  // Create two test organizations using system context
  const { systemPrisma } = prismaService;

  const orgA = await systemPrisma.organization.create({
    data: {
      name: 'RLS Test Org A',
      slug: `rls-test-org-a-${Date.now()}`,
    },
  });

  const orgB = await systemPrisma.organization.create({
    data: {
      name: 'RLS Test Org B',
      slug: `rls-test-org-b-${Date.now()}`,
    },
  });

  TEST_ORGS.orgA = orgA.id;
  TEST_ORGS.orgB = orgB.id;

  console.log(`✅ Created test organizations:`);
  console.log(`   Org A: ${orgA.id}`);
  console.log(`   Org B: ${orgB.id}\n`);

  // Create users for each org
  const userA = await systemPrisma.user.create({
    data: {
      email: `rls-test-a-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User A',
      passwordHash: 'test',
    },
  });

  const userB = await systemPrisma.user.create({
    data: {
      email: `rls-test-b-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User B',
      passwordHash: 'test',
    },
  });

  // Create test data in Org A context
  await prismaService.withTenantContext(TEST_ORGS.orgA, async tx => {
    // Create connection for Org A
    const connectionA = await tx.databaseConnection.create({
      data: {
        organizationId: TEST_ORGS.orgA,
        name: 'Test Connection A',
        dbType: 'mssql',
        host: 'localhost',
        port: 1433,
        username: 'test',
        passwordEncrypted: 'encrypted',
        database: 'testdb',
        createdBy: userA.id,
      },
    });

    // Create service for Org A
    const serviceA = await tx.service.create({
      data: {
        organizationId: TEST_ORGS.orgA,
        name: 'Test Service A',
        database: 'testdb',
        dbType: 'mssql',
        objects: [],
        createdBy: userA.id,
        connectionId: connectionA.id,
      },
    });

    // Create role for Org A
    const roleA = await tx.role.create({
      data: {
        organizationId: TEST_ORGS.orgA,
        name: 'Test Role A',
        serviceId: serviceA.id,
        permissions: [],
        createdBy: userA.id,
        mcpEnabled: true,
      },
    });

    // Create MCP server for Org A
    await tx.mCPServerInstance.create({
      data: {
        organizationId: TEST_ORGS.orgA,
        roleId: roleA.id,
        serverUrl: 'http://localhost:3001/mcp/org-a',
        status: 'ACTIVE',
        tools: [],
      },
    });

    // Create agent execution for Org A
    await tx.agentExecution.create({
      data: {
        organizationId: TEST_ORGS.orgA,
        userId: userA.id,
        businessRequirement: 'Test requirement A',
        agentType: 'EXPLORER',
        status: 'COMPLETED',
        mcpServersUsed: [],
        toolsInvoked: [],
        thoughtProcess: [],
        discoveries: [],
      },
    });

    // Create agent memory for Org A
    await tx.agentMemory.create({
      data: {
        organizationId: TEST_ORGS.orgA,
        type: 'SUCCESS_PATTERN',
        content: 'Test pattern A',
        tags: ['test'],
      },
    });
  });

  // Create test data in Org B context
  await prismaService.withTenantContext(TEST_ORGS.orgB, async tx => {
    // Create connection for Org B
    const connectionB = await tx.databaseConnection.create({
      data: {
        organizationId: TEST_ORGS.orgB,
        name: 'Test Connection B',
        dbType: 'mssql',
        host: 'localhost',
        port: 1433,
        username: 'test',
        passwordEncrypted: 'encrypted',
        database: 'testdb',
        createdBy: userB.id,
      },
    });

    // Create service for Org B
    const serviceB = await tx.service.create({
      data: {
        organizationId: TEST_ORGS.orgB,
        name: 'Test Service B',
        database: 'testdb',
        dbType: 'mssql',
        objects: [],
        createdBy: userB.id,
        connectionId: connectionB.id,
      },
    });

    // Create role for Org B
    const roleB = await tx.role.create({
      data: {
        organizationId: TEST_ORGS.orgB,
        name: 'Test Role B',
        serviceId: serviceB.id,
        permissions: [],
        createdBy: userB.id,
        mcpEnabled: true,
      },
    });

    // Create MCP server for Org B
    await tx.mCPServerInstance.create({
      data: {
        organizationId: TEST_ORGS.orgB,
        roleId: roleB.id,
        serverUrl: 'http://localhost:3001/mcp/org-b',
        status: 'ACTIVE',
        tools: [],
      },
    });

    // Create agent execution for Org B
    await tx.agentExecution.create({
      data: {
        organizationId: TEST_ORGS.orgB,
        userId: userB.id,
        businessRequirement: 'Test requirement B',
        agentType: 'EXPLORER',
        status: 'COMPLETED',
        mcpServersUsed: [],
        toolsInvoked: [],
        thoughtProcess: [],
        discoveries: [],
      },
    });

    // Create agent memory for Org B
    await tx.agentMemory.create({
      data: {
        organizationId: TEST_ORGS.orgB,
        type: 'SUCCESS_PATTERN',
        content: 'Test pattern B',
        tags: ['test'],
      },
    });
  });

  console.log('✅ Test data created successfully\n');
}

async function testMCPServerInstanceRLS() {
  console.log('🧪 Testing MCPServerInstance RLS...\n');

  // Test Org A can only see its own servers
  const orgAServers = await prismaService.withTenantContext(TEST_ORGS.orgA, async tx => {
    return await tx.mCPServerInstance.findMany();
  });

  console.log(`   Org A sees ${orgAServers.length} MCP server(s)`);
  if (orgAServers.length !== 1) {
    throw new Error(`❌ FAIL: Org A should see exactly 1 server, saw ${orgAServers.length}`);
  }
  if (orgAServers[0].organizationId !== TEST_ORGS.orgA) {
    throw new Error(`❌ FAIL: Org A server has wrong organizationId`);
  }
  console.log(`   ✅ Org A correctly sees only its own server\n`);

  // Test Org B can only see its own servers
  const orgBServers = await prismaService.withTenantContext(TEST_ORGS.orgB, async tx => {
    return await tx.mCPServerInstance.findMany();
  });

  console.log(`   Org B sees ${orgBServers.length} MCP server(s)`);
  if (orgBServers.length !== 1) {
    throw new Error(`❌ FAIL: Org B should see exactly 1 server, saw ${orgBServers.length}`);
  }
  if (orgBServers[0].organizationId !== TEST_ORGS.orgB) {
    throw new Error(`❌ FAIL: Org B server has wrong organizationId`);
  }
  console.log(`   ✅ Org B correctly sees only its own server\n`);

  console.log('✅ MCPServerInstance RLS test passed\n');
}

async function testAgentExecutionRLS() {
  console.log('🧪 Testing AgentExecution RLS...\n');

  // Test Org A can only see its own executions
  const orgAExecutions = await prismaService.withTenantContext(TEST_ORGS.orgA, async tx => {
    return await tx.agentExecution.findMany();
  });

  console.log(`   Org A sees ${orgAExecutions.length} execution(s)`);
  if (orgAExecutions.length !== 1) {
    throw new Error(`❌ FAIL: Org A should see exactly 1 execution, saw ${orgAExecutions.length}`);
  }
  if (orgAExecutions[0].organizationId !== TEST_ORGS.orgA) {
    throw new Error(`❌ FAIL: Org A execution has wrong organizationId`);
  }
  console.log(`   ✅ Org A correctly sees only its own execution\n`);

  // Test Org B can only see its own executions
  const orgBExecutions = await prismaService.withTenantContext(TEST_ORGS.orgB, async tx => {
    return await tx.agentExecution.findMany();
  });

  console.log(`   Org B sees ${orgBExecutions.length} execution(s)`);
  if (orgBExecutions.length !== 1) {
    throw new Error(`❌ FAIL: Org B should see exactly 1 execution, saw ${orgBExecutions.length}`);
  }
  if (orgBExecutions[0].organizationId !== TEST_ORGS.orgB) {
    throw new Error(`❌ FAIL: Org B execution has wrong organizationId`);
  }
  console.log(`   ✅ Org B correctly sees only its own execution\n`);

  console.log('✅ AgentExecution RLS test passed\n');
}

async function testAgentMemoryRLS() {
  console.log('🧪 Testing AgentMemory RLS (CRITICAL)...\n');

  // Test Org A can only see its own memories
  const orgAMemories = await prismaService.withTenantContext(TEST_ORGS.orgA, async tx => {
    return await tx.agentMemory.findMany();
  });

  console.log(`   Org A sees ${orgAMemories.length} memory/memories`);
  if (orgAMemories.length !== 1) {
    throw new Error(`❌ FAIL: Org A should see exactly 1 memory, saw ${orgAMemories.length}`);
  }
  if (orgAMemories[0].organizationId !== TEST_ORGS.orgA) {
    throw new Error(`❌ FAIL: Org A memory has wrong organizationId`);
  }
  if (orgAMemories[0].content.includes('Test pattern B')) {
    throw new Error(`❌ CRITICAL FAIL: Org A can see Org B's learning patterns!`);
  }
  console.log(`   ✅ Org A correctly sees only its own learning\n`);

  // Test Org B can only see its own memories
  const orgBMemories = await prismaService.withTenantContext(TEST_ORGS.orgB, async tx => {
    return await tx.agentMemory.findMany();
  });

  console.log(`   Org B sees ${orgBMemories.length} memory/memories`);
  if (orgBMemories.length !== 1) {
    throw new Error(`❌ FAIL: Org B should see exactly 1 memory, saw ${orgBMemories.length}`);
  }
  if (orgBMemories[0].organizationId !== TEST_ORGS.orgB) {
    throw new Error(`❌ FAIL: Org B memory has wrong organizationId`);
  }
  if (orgBMemories[0].content.includes('Test pattern A')) {
    throw new Error(`❌ CRITICAL FAIL: Org B can see Org A's learning patterns!`);
  }
  console.log(`   ✅ Org B correctly sees only its own learning\n`);

  console.log('✅ AgentMemory RLS test passed (Learning is isolated) ✅\n');
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...\n');

  const { systemPrisma } = prismaService;

  // Delete test organizations (cascade will delete all related records)
  await systemPrisma.organization.deleteMany({
    where: {
      id: {
        in: [TEST_ORGS.orgA, TEST_ORGS.orgB],
      },
    },
  });

  console.log('✅ Test data cleaned up\n');
}

async function main() {
  console.log('==========================================');
  console.log('MCP & AGENTS RLS VALIDATION TEST');
  console.log('==========================================\n');

  try {
    await setupTestData();
    await testMCPServerInstanceRLS();
    await testAgentExecutionRLS();
    await testAgentMemoryRLS();
    await cleanupTestData();

    console.log('==========================================');
    console.log('✅ ALL RLS TESTS PASSED');
    console.log('==========================================\n');
    console.log('🔒 MCP and Agent systems are properly isolated');
    console.log('🔒 Learning cannot leak between organizations');
    console.log('🔒 Tool execution is scoped correctly\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ RLS TEST FAILED:');
    console.error(error.message);
    console.error('\n⚠️  CRITICAL: Fix RLS issues before deploying!\n');

    try {
      await cleanupTestData();
    } catch (cleanupError) {
      console.error('Failed to cleanup test data:', cleanupError.message);
    }

    process.exit(1);
  }
}

main();
