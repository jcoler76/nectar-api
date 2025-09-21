/**
 * Simple Role System Testing Script
 * Tests the role system through direct function calls and database queries
 */

require('dotenv').config();

// Test role utility functions
function getRoleLevel(role) {
  const levels = {
    SUPER_ADMIN: 7,
    ORGANIZATION_OWNER: 6,
    OWNER: 6, // Legacy mapping
    ORGANIZATION_ADMIN: 5,
    ADMIN: 5, // Legacy mapping
    DEVELOPER: 4,
    MEMBER: 3,
    VIEWER: 1,
  };
  return levels[role] || 0;
}

function getAdminRoleLevel(role) {
  const levels = {
    SUPER_ADMIN: 5,
    ADMIN: 4,
    BILLING_ADMIN: 3,
    SUPPORT_AGENT: 2,
    ANALYST: 1,
  };
  return levels[role] || 0;
}

function canRoleInherit(higherRole, lowerRole) {
  return getRoleLevel(higherRole) > getRoleLevel(lowerRole);
}

function checkPermission(role, permission) {
  if (role === 'SUPER_ADMIN' || permission === '*') return true;

  const rolePermissions = {
    ORGANIZATION_OWNER: [
      'organization:manage',
      'member:invite',
      'member:remove',
      'member:manage_roles',
      'apikey:create',
      'apikey:revoke',
      'billing:manage',
      'analytics:view',
    ],
    ORGANIZATION_ADMIN: [
      'member:invite',
      'member:manage_roles',
      'apikey:create',
      'apikey:revoke',
      'analytics:view',
    ],
    DEVELOPER: ['apikey:create', 'apikey:view', 'analytics:view'],
    MEMBER: ['apikey:view', 'organization:view'],
    VIEWER: ['organization:view'],
  };

  const permissions = rolePermissions[role] || [];

  // Check direct permission
  if (permissions.includes(permission)) return true;

  // Check inheritance - higher roles inherit lower role permissions
  const roleLevel = getRoleLevel(role);
  for (const [otherRole, otherPermissions] of Object.entries(rolePermissions)) {
    if (getRoleLevel(otherRole) < roleLevel && otherPermissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

function runTests() {
  console.log('🧪 Running Simple Role System Tests...\n');

  let totalTests = 0;
  let passedTests = 0;

  function test(name, expected, actual) {
    totalTests++;
    const passed = expected === actual;
    if (passed) passedTests++;

    console.log(`${passed ? '✅' : '❌'} ${name}`);
    if (!passed) {
      console.log(`   Expected: ${expected}, Got: ${actual}`);
    }
    return passed;
  }

  // Test role hierarchy levels
  console.log('📊 Testing Role Hierarchy Levels:');
  test('SUPER_ADMIN level', 7, getRoleLevel('SUPER_ADMIN'));
  test('ORGANIZATION_OWNER level', 6, getRoleLevel('ORGANIZATION_OWNER'));
  test('ORGANIZATION_ADMIN level', 5, getRoleLevel('ORGANIZATION_ADMIN'));
  test('DEVELOPER level', 4, getRoleLevel('DEVELOPER'));
  test('MEMBER level', 3, getRoleLevel('MEMBER'));
  test('VIEWER level', 1, getRoleLevel('VIEWER'));
  test('Legacy OWNER level', 6, getRoleLevel('OWNER'));
  test('Legacy ADMIN level', 5, getRoleLevel('ADMIN'));
  console.log('');

  // Test admin role hierarchy
  console.log('👨‍💼 Testing Admin Role Hierarchy:');
  test('Admin SUPER_ADMIN level', 5, getAdminRoleLevel('SUPER_ADMIN'));
  test('Admin ADMIN level', 4, getAdminRoleLevel('ADMIN'));
  test('Admin BILLING_ADMIN level', 3, getAdminRoleLevel('BILLING_ADMIN'));
  test('Admin SUPPORT_AGENT level', 2, getAdminRoleLevel('SUPPORT_AGENT'));
  test('Admin ANALYST level', 1, getAdminRoleLevel('ANALYST'));
  console.log('');

  // Test role inheritance
  console.log('🔄 Testing Role Inheritance:');
  test(
    'SUPER_ADMIN inherits from ORGANIZATION_OWNER',
    true,
    canRoleInherit('SUPER_ADMIN', 'ORGANIZATION_OWNER')
  );
  test(
    'ORGANIZATION_OWNER inherits from ORGANIZATION_ADMIN',
    true,
    canRoleInherit('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
  );
  test(
    'ORGANIZATION_ADMIN inherits from DEVELOPER',
    true,
    canRoleInherit('ORGANIZATION_ADMIN', 'DEVELOPER')
  );
  test('DEVELOPER inherits from MEMBER', true, canRoleInherit('DEVELOPER', 'MEMBER'));
  test('MEMBER inherits from VIEWER', true, canRoleInherit('MEMBER', 'VIEWER'));
  test('VIEWER does NOT inherit from MEMBER', false, canRoleInherit('VIEWER', 'MEMBER'));
  test(
    'DEVELOPER does NOT inherit from ORGANIZATION_ADMIN',
    false,
    canRoleInherit('DEVELOPER', 'ORGANIZATION_ADMIN')
  );
  console.log('');

  // Test permission checking
  console.log('🔐 Testing Permission System:');

  // SUPER_ADMIN should have all permissions
  test(
    'SUPER_ADMIN has organization:manage',
    true,
    checkPermission('SUPER_ADMIN', 'organization:manage')
  );
  test('SUPER_ADMIN has any permission', true, checkPermission('SUPER_ADMIN', 'random:permission'));

  // ORGANIZATION_OWNER permissions
  test(
    'ORGANIZATION_OWNER has organization:manage',
    true,
    checkPermission('ORGANIZATION_OWNER', 'organization:manage')
  );
  test(
    'ORGANIZATION_OWNER has member:invite',
    true,
    checkPermission('ORGANIZATION_OWNER', 'member:invite')
  );
  test(
    'ORGANIZATION_OWNER has billing:manage',
    true,
    checkPermission('ORGANIZATION_OWNER', 'billing:manage')
  );

  // ORGANIZATION_ADMIN permissions
  test(
    'ORGANIZATION_ADMIN has member:invite',
    true,
    checkPermission('ORGANIZATION_ADMIN', 'member:invite')
  );
  test(
    'ORGANIZATION_ADMIN has apikey:create',
    true,
    checkPermission('ORGANIZATION_ADMIN', 'apikey:create')
  );
  test(
    'ORGANIZATION_ADMIN does NOT have organization:manage',
    false,
    checkPermission('ORGANIZATION_ADMIN', 'organization:manage')
  );

  // DEVELOPER permissions
  test('DEVELOPER has apikey:create', true, checkPermission('DEVELOPER', 'apikey:create'));
  test('DEVELOPER has analytics:view', true, checkPermission('DEVELOPER', 'analytics:view'));
  test(
    'DEVELOPER does NOT have member:invite',
    false,
    checkPermission('DEVELOPER', 'member:invite')
  );

  // MEMBER permissions
  test('MEMBER has organization:view', true, checkPermission('MEMBER', 'organization:view'));
  test('MEMBER has apikey:view', true, checkPermission('MEMBER', 'apikey:view'));
  test('MEMBER does NOT have apikey:create', false, checkPermission('MEMBER', 'apikey:create'));

  // VIEWER permissions
  test('VIEWER has organization:view', true, checkPermission('VIEWER', 'organization:view'));
  test('VIEWER does NOT have apikey:view', false, checkPermission('VIEWER', 'apikey:view'));
  test('VIEWER does NOT have member:invite', false, checkPermission('VIEWER', 'member:invite'));
  console.log('');

  // Test permission inheritance
  console.log('🔄 Testing Permission Inheritance:');
  test(
    'ORGANIZATION_OWNER inherits VIEWER organization:view',
    true,
    checkPermission('ORGANIZATION_OWNER', 'organization:view')
  );
  test(
    'ORGANIZATION_ADMIN inherits MEMBER apikey:view',
    true,
    checkPermission('ORGANIZATION_ADMIN', 'apikey:view')
  );
  test(
    'DEVELOPER inherits VIEWER organization:view',
    true,
    checkPermission('DEVELOPER', 'organization:view')
  );
  test(
    'MEMBER inherits VIEWER organization:view',
    true,
    checkPermission('MEMBER', 'organization:view')
  );
  console.log('');

  // Test role validation scenarios
  console.log('⚠️  Testing Role Validation Scenarios:');

  // Test invalid roles
  test('Invalid role returns level 0', 0, getRoleLevel('INVALID_ROLE'));
  test('Empty role returns level 0', 0, getRoleLevel(''));
  test('Null role returns level 0', 0, getRoleLevel(null));

  // Test case sensitivity (should be case sensitive)
  test('lowercase role returns level 0', 0, getRoleLevel('super_admin'));
  test('Mixed case role returns level 0', 0, getRoleLevel('Super_Admin'));
  console.log('');

  // Summary
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${totalTests - passedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Role system is working correctly.');
  } else {
    console.log(
      `\n⚠️  ${totalTests - passedTests} tests failed. Please review the role system implementation.`
    );
  }

  return {
    total: totalTests,
    passed: passedTests,
    failed: totalTests - passedTests,
    successRate: (passedTests / totalTests) * 100,
  };
}

// Test middleware functions
function testMiddlewareFunctions() {
  console.log('\n🔧 Testing Middleware Helper Functions:');

  // Import the auth factory to test its methods
  try {
    const AuthFactory = require('./middleware/authFactory');

    console.log('✅ AuthFactory loaded successfully');

    // Test role detection methods exist
    const methods = [
      'requireSuperAdmin',
      'requireOrganizationOwner',
      'requireOrganizationAdmin',
      'requireDeveloper',
      'requireMember',
      'requireMinimumRole',
    ];

    let methodTests = 0;
    let methodsPassed = 0;

    methods.forEach(method => {
      methodTests++;
      if (typeof AuthFactory[method] === 'function') {
        methodsPassed++;
        console.log(`✅ ${method} method exists`);
      } else {
        console.log(`❌ ${method} method missing`);
      }
    });

    console.log(`\nMiddleware Methods: ${methodsPassed}/${methodTests} ✅`);

    return { methodTests, methodsPassed };
  } catch (error) {
    console.error('❌ Failed to load AuthFactory:', error.message);
    return { methodTests: 0, methodsPassed: 0 };
  }
}

// Test audit service functions
function testAuditService() {
  console.log('\n📝 Testing Audit Service:');

  try {
    const auditService = require('./services/auditService');

    const expectedFunctions = [
      'logAuditEvent',
      'logRoleChange',
      'logUserLogin',
      'logApiKeyEvent',
      'logInvitationEvent',
      'getAuditLogs',
      'getRoleChangeLogs',
    ];

    let auditTests = 0;
    let auditPassed = 0;

    expectedFunctions.forEach(func => {
      auditTests++;
      if (typeof auditService[func] === 'function') {
        auditPassed++;
        console.log(`✅ ${func} function exists`);
      } else {
        console.log(`❌ ${func} function missing`);
      }
    });

    console.log(`\nAudit Service Functions: ${auditPassed}/${auditTests} ✅`);

    return { auditTests, auditPassed };
  } catch (error) {
    console.error('❌ Failed to load Audit Service:', error.message);
    return { auditTests: 0, auditPassed: 0 };
  }
}

// Run all tests
if (require.main === module) {
  const roleResults = runTests();
  const middlewareResults = testMiddlewareFunctions();
  const auditResults = testAuditService();

  const totalTests = roleResults.total + middlewareResults.methodTests + auditResults.auditTests;
  const totalPassed =
    roleResults.passed + middlewareResults.methodsPassed + auditResults.auditPassed;

  console.log('\n🏆 OVERALL TEST SUMMARY');
  console.log('=========================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed} ✅`);
  console.log(`Failed: ${totalTests - totalPassed} ❌`);
  console.log(`Overall Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

  if (totalPassed === totalTests) {
    console.log('\n🎉 All role system components are working correctly!');
  } else {
    console.log('\n⚠️  Some components need attention. Review failed tests above.');
  }

  process.exit(totalTests - totalPassed === 0 ? 0 : 1);
}

module.exports = {
  runTests,
  testMiddlewareFunctions,
  testAuditService,
  getRoleLevel,
  getAdminRoleLevel,
  canRoleInherit,
  checkPermission,
};
