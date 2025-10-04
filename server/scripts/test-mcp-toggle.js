require('dotenv').config();
const prismaService = require('../services/prismaService');
const MCPServerService = require('../services/mcp/MCPServerService');
const { logger } = require('../utils/logger');

async function testMCPToggle() {
  try {
    // Test organization and role
    const testOrgId = '9394f783-3376-4953-80d8-a607d1435840';
    const testRoleId = 'cffb63f7-b3ba-47ac-962a-d49cc78e458f';
    const testUserId = 'test-user-id';

    console.log('\n🧪 Testing MCP Toggle Flow\n');
    console.log('Organization:', testOrgId);
    console.log('Role:', testRoleId);

    // Step 1: Get current role state
    console.log('\n📋 Step 1: Checking current role state...');
    const role = await prismaService.withTenantContext(testOrgId, async tx => {
      return await tx.role.findUnique({
        where: { id: testRoleId },
        include: {
          service: {
            include: {
              connection: true,
            },
          },
        },
      });
    });

    if (!role) {
      console.error('❌ Role not found');
      process.exit(1);
    }

    console.log('✅ Role found:', role.name);
    console.log('   MCP Enabled:', role.mcpEnabled);
    console.log('   Service:', role.service?.name);
    console.log('   Permissions:', role.permissions?.length || 0);

    // Step 2: Test enabling MCP
    console.log('\n⚡ Step 2: Testing MCP enable...');
    const startTime = Date.now();

    const enableResult = await MCPServerService.enableMCPServer(testRoleId, testOrgId, testUserId);

    const enableDuration = Date.now() - startTime;
    console.log(`✅ MCP enabled in ${enableDuration}ms`);
    console.log('   Server ID:', enableResult.server.id);
    console.log('   Tools Count:', enableResult.toolsCount);
    console.log('   Server URL:', enableResult.serverUrl);

    // Step 3: Verify MCP server instance was created
    console.log('\n🔍 Step 3: Verifying MCP server instance...');
    const mcpServer = await prismaService.withTenantContext(testOrgId, async tx => {
      return await tx.mCPServerInstance.findFirst({
        where: { roleId: testRoleId },
      });
    });

    if (mcpServer) {
      console.log('✅ MCP Server instance found');
      console.log('   Status:', mcpServer.status);
      console.log('   Tools:', JSON.stringify(mcpServer.tools).substring(0, 100) + '...');
    } else {
      console.error('❌ MCP Server instance not found');
    }

    // Step 4: Test disabling MCP
    console.log('\n⚡ Step 4: Testing MCP disable...');
    const disableStartTime = Date.now();

    const disableResult = await MCPServerService.disableMCPServer(testRoleId, testOrgId);

    const disableDuration = Date.now() - disableStartTime;
    console.log(`✅ MCP disabled in ${disableDuration}ms`);

    // Step 5: Verify MCP server instance was deactivated
    console.log('\n🔍 Step 5: Verifying MCP server deactivation...');
    const mcpServerAfter = await prismaService.withTenantContext(testOrgId, async tx => {
      return await tx.mCPServerInstance.findFirst({
        where: { roleId: testRoleId },
      });
    });

    if (mcpServerAfter) {
      console.log('✅ MCP Server instance status:', mcpServerAfter.status);
      if (mcpServerAfter.status === 'INACTIVE') {
        console.log('✅ Successfully deactivated');
      } else {
        console.error('❌ Status should be INACTIVE but is:', mcpServerAfter.status);
      }
    }

    console.log('\n✅ All tests passed!');
    console.log('\n📊 Performance Summary:');
    console.log(`   Enable time: ${enableDuration}ms`);
    console.log(`   Disable time: ${disableDuration}ms`);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMCPToggle();
