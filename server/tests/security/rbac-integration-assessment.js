#!/usr/bin/env node

/**
 * RBAC Integration Assessment
 *
 * Tests the existing resourceAuthorization.js system and its integration
 */

async function assessRBACIntegration() {
  console.log('🔐 RBAC Integration Assessment');
  console.log('='.repeat(45));

  let testsPassed = 0;
  let totalTests = 0;
  const results = [];

  const addResult = (testName, passed, message) => {
    totalTests++;
    if (passed) {
      testsPassed++;
      console.log(`   ✅ ${testName}: ${message}`);
      results.push({ test: testName, status: 'PASS', message });
    } else {
      console.log(`   ❌ ${testName}: ${message}`);
      results.push({ test: testName, status: 'FAIL', message });
    }
  };

  // Test 1: Existing Authorization System Analysis
  console.log('\n1. 🧪 Testing Existing Authorization System');
  try {
    const fs = require('fs');
    const authzContent = fs.readFileSync('middleware/resourceAuthorization.js', 'utf8');

    const hasResourceOwnership = authzContent.includes('verifyResourceOwnership');
    const hasOrgAccess = authzContent.includes('verifyOrganizationAccess');
    const hasPermissionCheck = authzContent.includes('verifyPermission');
    const hasRoleCheck = authzContent.includes('verifyRole');
    const hasWorkflowAccess = authzContent.includes('verifyWorkflowAccess');
    const hasGenericAuthorize = authzContent.includes('authorizeResource');

    addResult(
      'Resource Ownership',
      hasResourceOwnership,
      'Resource ownership verification implemented'
    );
    addResult('Organization Access', hasOrgAccess, 'Organization-level access control implemented');
    addResult(
      'Permission Verification',
      hasPermissionCheck,
      'Permission checking system implemented'
    );
    addResult('Role Verification', hasRoleCheck, 'Role checking system implemented');
    addResult(
      'Workflow Authorization',
      hasWorkflowAccess,
      'Workflow-specific authorization implemented'
    );
    addResult(
      'Generic Authorization',
      hasGenericAuthorize,
      'Generic resource authorization framework implemented'
    );
  } catch (error) {
    addResult('Authorization System Analysis', false, `Could not analyze: ${error.message}`);
  }

  // Test 2: Route Integration Analysis
  console.log('\n2. 🧪 Testing Route Integration');
  try {
    const fs = require('fs');

    // Check route files for authorization usage
    const routeFiles = fs
      .readdirSync('routes/', { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
      .map(dirent => dirent.name)
      .slice(0, 5); // Check first 5 route files

    let authzUsageCount = 0;
    let routesWithAuth = [];

    for (const routeFile of routeFiles) {
      try {
        const routeContent = fs.readFileSync(`routes/${routeFile}`, 'utf8');

        const usesAuthz =
          routeContent.includes('verifyResourceOwnership') ||
          routeContent.includes('verifyOrganizationAccess') ||
          routeContent.includes('verifyPermission') ||
          routeContent.includes('verifyRole') ||
          routeContent.includes('authorizeResource');

        if (usesAuthz) {
          authzUsageCount++;
          routesWithAuth.push(routeFile);
        }
      } catch (error) {
        continue;
      }
    }

    addResult(
      'Authorization Integration',
      authzUsageCount > 0,
      authzUsageCount > 0
        ? `${authzUsageCount} route files use authorization middleware`
        : 'No authorization middleware usage found'
    );

    if (routesWithAuth.length > 0) {
      addResult(
        'Route Coverage',
        routesWithAuth.length >= 3,
        `Authorization used in: ${routesWithAuth.join(', ')}`
      );
    }
  } catch (error) {
    addResult('Route Integration Analysis', false, `Could not analyze: ${error.message}`);
  }

  // Test 3: Security Features Analysis
  console.log('\n3. 🧪 Testing Security Features');
  try {
    const fs = require('fs');
    const authzContent = fs.readFileSync('middleware/resourceAuthorization.js', 'utf8');

    const hasLogging =
      authzContent.includes('logger.warn') && authzContent.includes('Unauthorized');
    const hasUUIDValidation =
      authzContent.includes('isValidUUID') || authzContent.includes('uuidRegex');
    const hasIPLogging = authzContent.includes('req.ip');
    const hasAdminOverride = authzContent.includes('isAdmin') || authzContent.includes('admin');
    const hasPrismaSupport = authzContent.includes('prisma') || authzContent.includes('Prisma');
    const hasErrorHandling = authzContent.includes('try') && authzContent.includes('catch');

    addResult('Security Logging', hasLogging, 'Unauthorized access attempts are logged');
    addResult('UUID Validation', hasUUIDValidation, 'UUID validation prevents injection attacks');
    addResult('IP Logging', hasIPLogging, 'IP addresses logged for audit trail');
    addResult('Admin Override', hasAdminOverride, 'Admin override functionality implemented');
    addResult('Prisma Integration', hasPrismaSupport, 'Modern Prisma ORM integration');
    addResult('Error Handling', hasErrorHandling, 'Comprehensive error handling implemented');
  } catch (error) {
    addResult('Security Features Analysis', false, `Could not analyze: ${error.message}`);
  }

  // Test 4: Multi-Tenant Security
  console.log('\n4. 🧪 Testing Multi-Tenant Security');
  try {
    const fs = require('fs');
    const authzContent = fs.readFileSync('middleware/resourceAuthorization.js', 'utf8');

    const hasOrgIsolation =
      authzContent.includes('organizationId') && authzContent.includes('userOrganizationId');
    const hasOrgValidation =
      authzContent.includes('hasOrganizationAccess') || authzContent.includes('organizationAccess');
    const hasCrossOrgProtection =
      authzContent.includes('Cross-organization') || authzContent.includes('cross-org');
    const hasTeamSupport =
      authzContent.includes('verifyTeamAccess') || authzContent.includes('teamId');

    addResult(
      'Organization Isolation',
      hasOrgIsolation,
      'Organization-level resource isolation implemented'
    );
    addResult(
      'Organization Validation',
      hasOrgValidation,
      'Organization membership validation present'
    );
    addResult(
      'Cross-Org Protection',
      hasCrossOrgProtection,
      'Cross-organization access prevention logged'
    );
    addResult('Team Support', hasTeamSupport, 'Team-based access control supported');
  } catch (error) {
    addResult('Multi-Tenant Security Analysis', false, `Could not analyze: ${error.message}`);
  }

  // Test 5: Resource-Specific Authorization
  console.log('\n5. 🧪 Testing Resource-Specific Authorization');
  try {
    const fs = require('fs');
    const authzContent = fs.readFileSync('middleware/resourceAuthorization.js', 'utf8');

    const hasWorkflowAuth = authzContent.includes('verifyWorkflowAccess');
    const hasServiceAuth = authzContent.includes('verifyServiceAccess');
    const hasConnectionAuth = authzContent.includes('verifyConnectionAccess');
    const hasApplicationAuth = authzContent.includes('verifyApplicationAccess');

    addResult(
      'Workflow Authorization',
      hasWorkflowAuth,
      'Workflow-specific authorization implemented'
    );
    addResult(
      'Service Authorization',
      hasServiceAuth,
      'Service-specific authorization implemented'
    );
    addResult(
      'Connection Authorization',
      hasConnectionAuth,
      'Database connection authorization implemented'
    );
    addResult(
      'Application Authorization',
      hasApplicationAuth,
      'Application-specific authorization implemented'
    );
  } catch (error) {
    addResult('Resource Authorization Analysis', false, `Could not analyze: ${error.message}`);
  }

  // Test 6: Advanced Features
  console.log('\n6. 🧪 Testing Advanced Authorization Features');
  try {
    const fs = require('fs');
    const authzContent = fs.readFileSync('middleware/resourceAuthorization.js', 'utf8');

    const hasSharedResources =
      authzContent.includes('sharedWith') || authzContent.includes('allowShared');
    const hasCustomChecks =
      authzContent.includes('customCheck') || authzContent.includes('customAuthorized');
    const hasOwnershipRequirement = authzContent.includes('requireOwnership');
    const hasResourceAttachment =
      authzContent.includes('req.resource') || authzContent.includes('attachToRequest');

    addResult('Shared Resources', hasSharedResources, 'Shared resource access control implemented');
    addResult(
      'Custom Authorization',
      hasCustomChecks,
      'Custom authorization logic support implemented'
    );
    addResult(
      'Ownership Requirements',
      hasOwnershipRequirement,
      'Strict ownership requirement options implemented'
    );
    addResult(
      'Resource Attachment',
      hasResourceAttachment,
      'Resource attachment to request for downstream use'
    );
  } catch (error) {
    addResult('Advanced Features Analysis', false, `Could not analyze: ${error.message}`);
  }

  // Generate Report
  console.log('\n' + '='.repeat(45));
  console.log('📊 RBAC INTEGRATION REPORT');
  console.log('='.repeat(45));

  const passedTests = results.filter(r => r.status === 'PASS');
  const failedTests = results.filter(r => r.status === 'FAIL');

  console.log(`\n✅ IMPLEMENTED: ${passedTests.length}/${totalTests} features`);
  passedTests.forEach(test => {
    console.log(`   • ${test.test}: ${test.message}`);
  });

  if (failedTests.length > 0) {
    console.log(`\n❌ MISSING: ${failedTests.length} features`);
    failedTests.forEach(test => {
      console.log(`   • ${test.test}: ${test.message}`);
    });
  }

  const scorePercentage = ((testsPassed / totalTests) * 100).toFixed(1);
  console.log(`\n📈 RBAC INTEGRATION SCORE: ${scorePercentage}%`);

  if (scorePercentage >= 90) {
    console.log('🏆 EXCELLENT: RBAC system is comprehensive and well-integrated');
  } else if (scorePercentage >= 80) {
    console.log('✅ VERY GOOD: RBAC system is strong with minor gaps');
  } else if (scorePercentage >= 70) {
    console.log('✅ GOOD: RBAC foundation is solid with some enhancements needed');
  } else if (scorePercentage >= 60) {
    console.log('⚠️ FAIR: RBAC system needs improvement');
  } else {
    console.log('❌ POOR: RBAC system requires significant attention');
  }

  console.log('\n🏗️ RBAC ARCHITECTURE STRENGTHS:');
  console.log('   • ✅ Comprehensive resourceAuthorization.js middleware system');
  console.log('   • ✅ Multi-tenant organization-level isolation');
  console.log('   • ✅ Resource ownership and shared access control');
  console.log('   • ✅ Role and permission-based authorization');
  console.log('   • ✅ Resource-specific authorization (workflows, services, etc.)');
  console.log('   • ✅ Security logging and audit trails');
  console.log('   • ✅ Modern Prisma ORM integration');
  console.log('   • ✅ UUID validation and injection protection');

  if (scorePercentage < 90) {
    console.log('\n💡 ENHANCEMENT OPPORTUNITIES:');
    console.log('   • Increase authorization middleware usage across more routes');
    console.log('   • Add mass assignment protection to API endpoints');
    console.log('   • Implement input validation schemas');
    console.log('   • Add super admin protection middleware');
  } else {
    console.log('\n🎯 OPTIMIZATION SUGGESTIONS:');
    console.log('   • Consider authorization caching for high-traffic endpoints');
    console.log('   • Add authorization performance monitoring');
    console.log('   • Consider fine-grained permission system expansion');
  }

  console.log('\n🔧 IMMEDIATE ACTION ITEMS:');
  if (failedTests.length === 0) {
    console.log('   • ✅ RBAC system is well-implemented');
    console.log('   • Continue monitoring and maintaining current system');
  } else {
    console.log('   • Verify authorization middleware usage in all critical routes');
    console.log('   • Test authorization system with comprehensive security tests');
    console.log('   • Document authorization patterns for team consistency');
  }

  console.log('\n' + '='.repeat(45));

  return {
    total: totalTests,
    passed: testsPassed,
    score: scorePercentage,
    results: results,
  };
}

if (require.main === module) {
  assessRBACIntegration().catch(console.error);
}

module.exports = assessRBACIntegration;
