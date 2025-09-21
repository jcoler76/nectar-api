/**
 * Integration Tests for Role-Based Access Control System
 * Tests real API endpoints with different user roles and permissions
 */

const axios = require('axios');
const { spawn } = require('child_process');
const jwt = require('jsonwebtoken');

// Test configuration
const API_BASE_URL = 'http://localhost:3001';
const ADMIN_BASE_URL = 'http://localhost:4001';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

class IntegrationTester {
  constructor() {
    this.testResults = [];
    this.testTokens = {};
    this.testUsers = {
      superAdmin: {
        id: 'super-admin-id',
        email: 'superadmin@test.com',
        memberships: [{ role: 'SUPER_ADMIN', organizationId: 'test-org' }],
      },
      orgOwner: {
        id: 'owner-id',
        email: 'owner@test.com',
        memberships: [{ role: 'ORGANIZATION_OWNER', organizationId: 'test-org' }],
      },
      orgAdmin: {
        id: 'admin-id',
        email: 'admin@test.com',
        memberships: [{ role: 'ORGANIZATION_ADMIN', organizationId: 'test-org' }],
      },
      developer: {
        id: 'dev-id',
        email: 'dev@test.com',
        memberships: [{ role: 'DEVELOPER', organizationId: 'test-org' }],
      },
      member: {
        id: 'member-id',
        email: 'member@test.com',
        memberships: [{ role: 'MEMBER', organizationId: 'test-org' }],
      },
      viewer: {
        id: 'viewer-id',
        email: 'viewer@test.com',
        memberships: [{ role: 'VIEWER', organizationId: 'test-org' }],
      },
    };
  }

  generateTestToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        memberships: user.memberships,
        isSuperAdmin: user.memberships?.some(m => m.role === 'SUPER_ADMIN'),
        isAdmin: user.memberships?.some(m =>
          ['ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER', 'ADMIN', 'OWNER'].includes(m.role)
        ),
      },
      JWT_SECRET,
      {
        expiresIn: '1h',
        issuer: 'nectar-api',
        audience: 'nectar-client',
      }
    );
  }

  async setup() {
    console.log('🔧 Setting up integration test environment...\n');

    // Generate test tokens for all user types
    Object.keys(this.testUsers).forEach(userType => {
      this.testTokens[userType] = this.generateTestToken(this.testUsers[userType]);
    });

    console.log('✅ Test tokens generated for all user roles');
    console.log('✅ Integration test setup complete\n');
  }

  async testEndpointAccess(method, url, expectedStatus, token, testName) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await axios.get(url, { headers, validateStatus: () => true });
          break;
        case 'POST':
          response = await axios.post(url, {}, { headers, validateStatus: () => true });
          break;
        case 'PUT':
          response = await axios.put(url, {}, { headers, validateStatus: () => true });
          break;
        case 'DELETE':
          response = await axios.delete(url, { headers, validateStatus: () => true });
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      const passed = response.status === expectedStatus;

      this.testResults.push({
        test: testName,
        expected: expectedStatus,
        actual: response.status,
        passed,
        method,
        url,
      });

      console.log(
        `${passed ? '✅' : '❌'} ${testName}: ${response.status} (expected ${expectedStatus})`
      );

      return { passed, status: response.status, data: response.data };
    } catch (error) {
      const passed = false;

      this.testResults.push({
        test: testName,
        expected: expectedStatus,
        actual: 'ERROR',
        passed,
        error: error.message,
        method,
        url,
      });

      console.log(`❌ ${testName}: ERROR - ${error.message}`);
      return { passed, error };
    }
  }

  async testHealthEndpoints() {
    console.log('🏥 Testing Health Endpoints:');

    await this.testEndpointAccess(
      'GET',
      `${API_BASE_URL}/health`,
      200,
      null,
      'Main API health check'
    );
    await this.testEndpointAccess(
      'GET',
      `${ADMIN_BASE_URL}/health`,
      200,
      null,
      'Admin API health check'
    );

    console.log('');
  }

  async testAuthenticationEndpoints() {
    console.log('🔐 Testing Authentication Endpoints:');

    // Test endpoints that require authentication
    await this.testEndpointAccess(
      'GET',
      `${API_BASE_URL}/api/user/profile`,
      401,
      null,
      'Profile access without token'
    );
    await this.testEndpointAccess(
      'GET',
      `${API_BASE_URL}/api/user/profile`,
      200,
      this.testTokens.member,
      'Profile access with valid token'
    );

    // Test with invalid token
    await this.testEndpointAccess(
      'GET',
      `${API_BASE_URL}/api/user/profile`,
      401,
      'invalid-token',
      'Profile access with invalid token'
    );

    console.log('');
  }

  async testOrganizationEndpoints() {
    console.log('🏢 Testing Organization Endpoints:');

    const orgUrl = `${API_BASE_URL}/api/organizations/test-org`;

    // Test organization access by different roles
    await this.testEndpointAccess(
      'GET',
      orgUrl,
      200,
      this.testTokens.superAdmin,
      'Super Admin org access'
    );
    await this.testEndpointAccess(
      'GET',
      orgUrl,
      200,
      this.testTokens.orgOwner,
      'Org Owner org access'
    );
    await this.testEndpointAccess(
      'GET',
      orgUrl,
      200,
      this.testTokens.orgAdmin,
      'Org Admin org access'
    );
    await this.testEndpointAccess(
      'GET',
      orgUrl,
      200,
      this.testTokens.developer,
      'Developer org access'
    );
    await this.testEndpointAccess('GET', orgUrl, 200, this.testTokens.member, 'Member org access');
    await this.testEndpointAccess('GET', orgUrl, 200, this.testTokens.viewer, 'Viewer org access');

    // Test organization management (should be restricted)
    const orgManageUrl = `${API_BASE_URL}/api/organizations/test-org/settings`;
    await this.testEndpointAccess(
      'PUT',
      orgManageUrl,
      200,
      this.testTokens.superAdmin,
      'Super Admin org management'
    );
    await this.testEndpointAccess(
      'PUT',
      orgManageUrl,
      200,
      this.testTokens.orgOwner,
      'Org Owner org management'
    );
    await this.testEndpointAccess(
      'PUT',
      orgManageUrl,
      403,
      this.testTokens.orgAdmin,
      'Org Admin org management (should fail)'
    );
    await this.testEndpointAccess(
      'PUT',
      orgManageUrl,
      403,
      this.testTokens.developer,
      'Developer org management (should fail)'
    );
    await this.testEndpointAccess(
      'PUT',
      orgManageUrl,
      403,
      this.testTokens.member,
      'Member org management (should fail)'
    );
    await this.testEndpointAccess(
      'PUT',
      orgManageUrl,
      403,
      this.testTokens.viewer,
      'Viewer org management (should fail)'
    );

    console.log('');
  }

  async testMemberManagementEndpoints() {
    console.log('👥 Testing Member Management Endpoints:');

    const inviteUrl = `${API_BASE_URL}/api/organizations/test-org/invite`;
    const membersUrl = `${API_BASE_URL}/api/organizations/test-org/members`;

    // Test member invitation (requires admin level)
    await this.testEndpointAccess(
      'POST',
      inviteUrl,
      200,
      this.testTokens.superAdmin,
      'Super Admin invite member'
    );
    await this.testEndpointAccess(
      'POST',
      inviteUrl,
      200,
      this.testTokens.orgOwner,
      'Org Owner invite member'
    );
    await this.testEndpointAccess(
      'POST',
      inviteUrl,
      200,
      this.testTokens.orgAdmin,
      'Org Admin invite member'
    );
    await this.testEndpointAccess(
      'POST',
      inviteUrl,
      403,
      this.testTokens.developer,
      'Developer invite member (should fail)'
    );
    await this.testEndpointAccess(
      'POST',
      inviteUrl,
      403,
      this.testTokens.member,
      'Member invite member (should fail)'
    );
    await this.testEndpointAccess(
      'POST',
      inviteUrl,
      403,
      this.testTokens.viewer,
      'Viewer invite member (should fail)'
    );

    // Test member list access
    await this.testEndpointAccess(
      'GET',
      membersUrl,
      200,
      this.testTokens.superAdmin,
      'Super Admin view members'
    );
    await this.testEndpointAccess(
      'GET',
      membersUrl,
      200,
      this.testTokens.orgOwner,
      'Org Owner view members'
    );
    await this.testEndpointAccess(
      'GET',
      membersUrl,
      200,
      this.testTokens.orgAdmin,
      'Org Admin view members'
    );
    await this.testEndpointAccess(
      'GET',
      membersUrl,
      200,
      this.testTokens.developer,
      'Developer view members'
    );
    await this.testEndpointAccess(
      'GET',
      membersUrl,
      200,
      this.testTokens.member,
      'Member view members'
    );
    await this.testEndpointAccess(
      'GET',
      membersUrl,
      403,
      this.testTokens.viewer,
      'Viewer view members (should fail)'
    );

    console.log('');
  }

  async testApiKeyEndpoints() {
    console.log('🔑 Testing API Key Endpoints:');

    const apiKeysUrl = `${API_BASE_URL}/api/organizations/test-org/api-keys`;
    const createKeyUrl = `${API_BASE_URL}/api/organizations/test-org/api-keys`;

    // Test API key viewing (most roles should have access)
    await this.testEndpointAccess(
      'GET',
      apiKeysUrl,
      200,
      this.testTokens.superAdmin,
      'Super Admin view API keys'
    );
    await this.testEndpointAccess(
      'GET',
      apiKeysUrl,
      200,
      this.testTokens.orgOwner,
      'Org Owner view API keys'
    );
    await this.testEndpointAccess(
      'GET',
      apiKeysUrl,
      200,
      this.testTokens.orgAdmin,
      'Org Admin view API keys'
    );
    await this.testEndpointAccess(
      'GET',
      apiKeysUrl,
      200,
      this.testTokens.developer,
      'Developer view API keys'
    );
    await this.testEndpointAccess(
      'GET',
      apiKeysUrl,
      200,
      this.testTokens.member,
      'Member view API keys'
    );
    await this.testEndpointAccess(
      'GET',
      apiKeysUrl,
      403,
      this.testTokens.viewer,
      'Viewer view API keys (should fail)'
    );

    // Test API key creation (requires developer level)
    await this.testEndpointAccess(
      'POST',
      createKeyUrl,
      200,
      this.testTokens.superAdmin,
      'Super Admin create API key'
    );
    await this.testEndpointAccess(
      'POST',
      createKeyUrl,
      200,
      this.testTokens.orgOwner,
      'Org Owner create API key'
    );
    await this.testEndpointAccess(
      'POST',
      createKeyUrl,
      200,
      this.testTokens.orgAdmin,
      'Org Admin create API key'
    );
    await this.testEndpointAccess(
      'POST',
      createKeyUrl,
      200,
      this.testTokens.developer,
      'Developer create API key'
    );
    await this.testEndpointAccess(
      'POST',
      createKeyUrl,
      403,
      this.testTokens.member,
      'Member create API key (should fail)'
    );
    await this.testEndpointAccess(
      'POST',
      createKeyUrl,
      403,
      this.testTokens.viewer,
      'Viewer create API key (should fail)'
    );

    console.log('');
  }

  async testAdminEndpoints() {
    console.log('👨‍💼 Testing Admin Portal Endpoints:');

    const adminUsersUrl = `${ADMIN_BASE_URL}/api/admin/users`;
    const licensesUrl = `${ADMIN_BASE_URL}/api/licenses`;

    // Generate admin tokens
    const superAdminToken = jwt.sign(
      {
        adminId: 'super-admin-id',
        email: 'superadmin@admin.test',
        role: 'SUPER_ADMIN',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const supportAgentToken = jwt.sign(
      {
        adminId: 'support-id',
        email: 'support@admin.test',
        role: 'SUPPORT_AGENT',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Test admin user management (SUPER_ADMIN only)
    await this.testEndpointAccess(
      'GET',
      adminUsersUrl,
      200,
      superAdminToken,
      'Super Admin view admin users'
    );
    await this.testEndpointAccess(
      'GET',
      adminUsersUrl,
      403,
      supportAgentToken,
      'Support Agent view admin users (should fail)'
    );

    // Test license management
    await this.testEndpointAccess(
      'GET',
      licensesUrl,
      200,
      superAdminToken,
      'Super Admin view licenses'
    );
    await this.testEndpointAccess(
      'GET',
      licensesUrl,
      200,
      supportAgentToken,
      'Support Agent view licenses'
    );

    console.log('');
  }

  async testRoleInheritance() {
    console.log('🔄 Testing Role Inheritance in API:');

    // Test that higher roles can access lower role endpoints
    const memberOnlyUrl = `${API_BASE_URL}/api/organizations/test-org/member-dashboard`;

    await this.testEndpointAccess(
      'GET',
      memberOnlyUrl,
      200,
      this.testTokens.superAdmin,
      'Super Admin access member endpoint'
    );
    await this.testEndpointAccess(
      'GET',
      memberOnlyUrl,
      200,
      this.testTokens.orgOwner,
      'Org Owner access member endpoint'
    );
    await this.testEndpointAccess(
      'GET',
      memberOnlyUrl,
      200,
      this.testTokens.orgAdmin,
      'Org Admin access member endpoint'
    );
    await this.testEndpointAccess(
      'GET',
      memberOnlyUrl,
      200,
      this.testTokens.developer,
      'Developer access member endpoint'
    );
    await this.testEndpointAccess(
      'GET',
      memberOnlyUrl,
      200,
      this.testTokens.member,
      'Member access member endpoint'
    );
    await this.testEndpointAccess(
      'GET',
      memberOnlyUrl,
      403,
      this.testTokens.viewer,
      'Viewer access member endpoint (should fail)'
    );

    console.log('');
  }

  async testCrossOrganizationAccess() {
    console.log('🏢 Testing Cross-Organization Access Controls:');

    // Test access to different organization (should fail for non-super-admins)
    const otherOrgUrl = `${API_BASE_URL}/api/organizations/other-org`;

    await this.testEndpointAccess(
      'GET',
      otherOrgUrl,
      200,
      this.testTokens.superAdmin,
      'Super Admin access other org'
    );
    await this.testEndpointAccess(
      'GET',
      otherOrgUrl,
      403,
      this.testTokens.orgOwner,
      'Org Owner access other org (should fail)'
    );
    await this.testEndpointAccess(
      'GET',
      otherOrgUrl,
      403,
      this.testTokens.orgAdmin,
      'Org Admin access other org (should fail)'
    );
    await this.testEndpointAccess(
      'GET',
      otherOrgUrl,
      403,
      this.testTokens.developer,
      'Developer access other org (should fail)'
    );
    await this.testEndpointAccess(
      'GET',
      otherOrgUrl,
      403,
      this.testTokens.member,
      'Member access other org (should fail)'
    );
    await this.testEndpointAccess(
      'GET',
      otherOrgUrl,
      403,
      this.testTokens.viewer,
      'Viewer access other org (should fail)'
    );

    console.log('');
  }

  generateReport() {
    console.log('📊 INTEGRATION TEST RESULTS SUMMARY');
    console.log('====================================');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      console.log('================');
      this.testResults
        .filter(t => !t.passed)
        .forEach(test => {
          console.log(`- ${test.test} (${test.method} ${test.url})`);
          console.log(`  Expected: ${test.expected}, Got: ${test.actual}`);
          if (test.error) console.log(`  Error: ${test.error}`);
        });
    }

    // Group results by category
    const categories = {
      Health: this.testResults.filter(t => t.test.includes('health')),
      Authentication: this.testResults.filter(
        t => t.test.includes('token') || t.test.includes('Profile')
      ),
      Organization: this.testResults.filter(
        t => t.test.includes('org') && !t.test.includes('member')
      ),
      'Member Management': this.testResults.filter(
        t => t.test.includes('member') || t.test.includes('invite')
      ),
      'API Keys': this.testResults.filter(t => t.test.includes('API key')),
      'Admin Portal': this.testResults.filter(t => t.test.includes('Admin')),
      'Role Inheritance': this.testResults.filter(t => t.test.includes('access member endpoint')),
      'Cross-Organization': this.testResults.filter(t => t.test.includes('other org')),
    };

    console.log('\n📈 RESULTS BY CATEGORY:');
    console.log('========================');

    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length === 0) return;

      const categoryPassed = tests.filter(t => t.passed).length;
      const categoryTotal = tests.length;
      const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);

      console.log(`${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
    });

    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: (passedTests / totalTests) * 100,
      categories,
    };
  }

  async runAllTests() {
    try {
      console.log('🚀 Starting Role-Based Access Control Integration Tests\n');

      await this.setup();
      await this.testHealthEndpoints();
      await this.testAuthenticationEndpoints();
      await this.testOrganizationEndpoints();
      await this.testMemberManagementEndpoints();
      await this.testApiKeyEndpoints();
      await this.testAdminEndpoints();
      await this.testRoleInheritance();
      await this.testCrossOrganizationAccess();

      const report = this.generateReport();

      console.log(
        `\n🎯 Integration tests completed with ${report.successRate.toFixed(1)}% success rate`
      );

      return report;
    } catch (error) {
      console.error('❌ Integration test suite failed:', error);
      throw error;
    }
  }
}

// Helper function to check if servers are running
async function checkServersRunning() {
  try {
    const mainHealth = await axios.get(`${API_BASE_URL}/health`, { timeout: 2000 });
    const adminHealth = await axios.get(`${ADMIN_BASE_URL}/health`, { timeout: 2000 });

    return mainHealth.status === 200 && adminHealth.status === 200;
  } catch (error) {
    return false;
  }
}

// Export for use in other test files
module.exports = { IntegrationTester, checkServersRunning };

// Run tests if called directly
if (require.main === module) {
  (async () => {
    console.log('🔍 Checking if servers are running...');

    const serversRunning = await checkServersRunning();
    if (!serversRunning) {
      console.log('⚠️  Warning: One or both servers may not be running.');
      console.log('   Main API should be at http://localhost:3001');
      console.log('   Admin API should be at http://localhost:4001');
      console.log('   Some tests may fail due to connection errors.\n');
    } else {
      console.log('✅ Both servers are running and healthy\n');
    }

    const tester = new IntegrationTester();
    try {
      const report = await tester.runAllTests();
      process.exit(report.failed === 0 ? 0 : 1);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}
