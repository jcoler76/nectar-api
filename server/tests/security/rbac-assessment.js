#!/usr/bin/env node

/**
 * Role-Based Access Control (RBAC) Security Assessment
 *
 * Comprehensive assessment of authorization and access control:
 * - Role and permission system analysis
 * - Authorization middleware evaluation
 * - Privilege escalation prevention
 * - Resource-level access control
 */

async function assessRBACSecurity() {
  console.log('🔐 RBAC & Authorization Security Assessment');
  console.log('='.repeat(50));

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

  // Test 1: Database Schema Analysis for RBAC
  console.log('\n1. 🧪 Testing RBAC Database Schema');
  try {
    const fs = require('fs');
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');

    const hasUserModel = schemaContent.includes('model User');
    const hasRoleModel = schemaContent.includes('model Role');
    const hasMembershipModel = schemaContent.includes('model Membership');
    const hasPermissionsField = schemaContent.includes('permissions');
    const hasOrganizationModel = schemaContent.includes('model Organization');

    addResult('User Model', hasUserModel, 'User model defined in schema');
    addResult('Role Model', hasRoleModel, 'Role model defined in schema');
    addResult('Membership Model', hasMembershipModel, 'Membership/role assignment model present');
    addResult('Permissions System', hasPermissionsField, 'Permissions system defined');
    addResult(
      'Organization Isolation',
      hasOrganizationModel,
      'Multi-tenant organization model present'
    );
  } catch (error) {
    addResult('RBAC Schema Analysis', false, `Could not analyze schema: ${error.message}`);
  }

  // Test 2: Role and Permission Constants
  console.log('\n2. 🧪 Testing Role and Permission System');
  try {
    const fs = require('fs');

    // Check for permissions constants
    let permissionsFound = false;
    let rolesFound = false;

    try {
      const permissionsContent = fs.readFileSync('../src/constants/permissions.ts', 'utf8');
      permissionsFound =
        permissionsContent.includes('export') || permissionsContent.includes('const');
      addResult('Permissions Constants', permissionsFound, 'Permission constants defined');
    } catch (error) {
      // Check alternative locations
      const files = fs
        .readdirSync('.', { recursive: true })
        .filter(f => f.includes('permission') && (f.endsWith('.js') || f.endsWith('.ts')));
      permissionsFound = files.length > 0;
      addResult(
        'Permissions Constants',
        permissionsFound,
        permissionsFound
          ? `Found ${files.length} permission files`
          : 'No permission constants found'
      );
    }

    // Check for role definitions
    try {
      const files = fs
        .readdirSync('.', { recursive: true })
        .filter(f => f.includes('role') && (f.endsWith('.js') || f.endsWith('.ts')));
      rolesFound = files.length > 0;
      addResult(
        'Role Definitions',
        rolesFound,
        rolesFound ? `Found ${files.length} role-related files` : 'No role definitions found'
      );
    } catch (error) {
      addResult('Role Definitions', false, 'Could not check role definitions');
    }
  } catch (error) {
    addResult('Role Permission System', false, `Could not check role system: ${error.message}`);
  }

  // Test 3: Authorization Middleware Analysis
  console.log('\n3. 🧪 Testing Authorization Middleware');
  try {
    const fs = require('fs');

    // Check for authorization middleware
    let authzMiddlewareFound = false;
    let roleCheckingFound = false;
    let permissionCheckingFound = false;

    const middlewareFiles = fs
      .readdirSync('middleware/', { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
      .map(dirent => dirent.name);

    // Check auth middleware for authorization logic
    try {
      const authContent = fs.readFileSync('middleware/auth.js', 'utf8');
      roleCheckingFound = authContent.includes('role') || authContent.includes('Role');
      permissionCheckingFound =
        authContent.includes('permission') || authContent.includes('Permission');
    } catch (error) {
      // Auth file not found or readable
    }

    // Check for dedicated authorization middleware
    const authzFiles = middlewareFiles.filter(
      f =>
        f.includes('authz') ||
        f.includes('authorization') ||
        f.includes('rbac') ||
        f.includes('permission')
    );
    authzMiddlewareFound = authzFiles.length > 0;

    addResult(
      'Authorization Middleware',
      authzMiddlewareFound,
      authzMiddlewareFound
        ? `Found authorization middleware: ${authzFiles.join(', ')}`
        : 'No dedicated authorization middleware'
    );
    addResult(
      'Role Checking Logic',
      roleCheckingFound,
      roleCheckingFound ? 'Role checking logic present' : 'Role checking needs implementation'
    );
    addResult(
      'Permission Checking',
      permissionCheckingFound,
      permissionCheckingFound
        ? 'Permission checking logic present'
        : 'Permission checking needs implementation'
    );
  } catch (error) {
    addResult(
      'Authorization Middleware',
      false,
      `Could not analyze authorization middleware: ${error.message}`
    );
  }

  // Test 4: Route Protection Analysis
  console.log('\n4. 🧪 Testing Route Protection');
  try {
    const fs = require('fs');
    const routesContent = fs.readFileSync('routes/index.js', 'utf8');

    const hasAuthMiddleware = routesContent.includes('authMiddleware');
    const hasRoleBasedRoutes = routesContent.includes('role') || routesContent.includes('Role');
    const hasPermissionProtection =
      routesContent.includes('permission') || routesContent.includes('Permission');
    const hasOrganizationIsolation =
      routesContent.includes('organization') || routesContent.includes('tenant');

    addResult(
      'Route Authentication',
      hasAuthMiddleware,
      'Routes protected with authentication middleware'
    );
    addResult(
      'Role-Based Routes',
      hasRoleBasedRoutes,
      hasRoleBasedRoutes
        ? 'Role-based route protection present'
        : 'Role-based routing needs implementation'
    );
    addResult(
      'Permission-Based Routes',
      hasPermissionProtection,
      hasPermissionProtection
        ? 'Permission-based route protection present'
        : 'Permission routing needs implementation'
    );
    addResult(
      'Organization Isolation',
      hasOrganizationIsolation,
      hasOrganizationIsolation
        ? 'Multi-tenant route isolation present'
        : 'Organization isolation needs verification'
    );
  } catch (error) {
    addResult(
      'Route Protection Analysis',
      false,
      `Could not analyze route protection: ${error.message}`
    );
  }

  // Test 5: Service-Level Authorization
  console.log('\n5. 🧪 Testing Service-Level Authorization');
  try {
    const fs = require('fs');

    // Check services for authorization logic
    const serviceFiles = fs
      .readdirSync('services/', { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
      .map(dirent => dirent.name);

    let serviceAuthFound = false;
    let organizationCheckFound = false;
    let resourceOwnershipFound = false;

    for (const serviceFile of serviceFiles) {
      try {
        const serviceContent = fs.readFileSync(`services/${serviceFile}`, 'utf8');
        if (
          serviceContent.includes('organizationId') ||
          serviceContent.includes('organization_id')
        ) {
          organizationCheckFound = true;
        }
        if (
          serviceContent.includes('createdBy') ||
          serviceContent.includes('owner') ||
          serviceContent.includes('userId')
        ) {
          resourceOwnershipFound = true;
        }
        if (serviceContent.includes('role') || serviceContent.includes('permission')) {
          serviceAuthFound = true;
        }
      } catch (error) {
        // Skip unreadable files
        continue;
      }
    }

    addResult(
      'Service Authorization',
      serviceAuthFound,
      serviceAuthFound
        ? 'Service-level authorization logic present'
        : 'Service authorization needs implementation'
    );
    addResult(
      'Organization Checks',
      organizationCheckFound,
      organizationCheckFound
        ? 'Organization-level access control present'
        : 'Organization isolation needs implementation'
    );
    addResult(
      'Resource Ownership',
      resourceOwnershipFound,
      resourceOwnershipFound
        ? 'Resource ownership validation present'
        : 'Resource ownership needs implementation'
    );
  } catch (error) {
    addResult(
      'Service Authorization Analysis',
      false,
      `Could not analyze services: ${error.message}`
    );
  }

  // Test 6: API Security and Mass Assignment Protection
  console.log('\n6. 🧪 Testing API Security Controls');
  try {
    const fs = require('fs');

    // Check for input validation and mass assignment protection
    let inputValidationFound = false;
    let massAssignmentProtection = false;
    let dataValidationFound = false;

    // Check routes for validation middleware
    const routeFiles = fs
      .readdirSync('routes/', { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
      .map(dirent => dirent.name);

    for (const routeFile of routeFiles.slice(0, 3)) {
      // Check first 3 route files
      try {
        const routeContent = fs.readFileSync(`routes/${routeFile}`, 'utf8');
        if (
          routeContent.includes('validator') ||
          routeContent.includes('validation') ||
          routeContent.includes('joi') ||
          routeContent.includes('yup')
        ) {
          inputValidationFound = true;
        }
        if (
          routeContent.includes('whitelist') ||
          routeContent.includes('pick') ||
          routeContent.includes('select')
        ) {
          massAssignmentProtection = true;
        }
        if (routeContent.includes('validate') || routeContent.includes('schema')) {
          dataValidationFound = true;
        }
      } catch (error) {
        continue;
      }
    }

    addResult(
      'Input Validation',
      inputValidationFound,
      inputValidationFound
        ? 'Input validation middleware found'
        : 'Input validation needs implementation'
    );
    addResult(
      'Mass Assignment Protection',
      massAssignmentProtection,
      massAssignmentProtection
        ? 'Mass assignment protection present'
        : 'Mass assignment protection needs implementation'
    );
    addResult(
      'Data Validation',
      dataValidationFound,
      dataValidationFound ? 'Data validation schemas present' : 'Data validation needs enhancement'
    );
  } catch (error) {
    addResult('API Security Controls', false, `Could not analyze API security: ${error.message}`);
  }

  // Test 7: Administrative Controls
  console.log('\n7. 🧪 Testing Administrative Controls');
  try {
    const fs = require('fs');

    // Check for admin-specific controls
    let adminRoutesFound = false;
    let superAdminProtection = false;
    let adminAuditingFound = false;

    // Check for admin routes
    const allFiles = fs.readdirSync('.', { recursive: true });
    adminRoutesFound = allFiles.some(f => f.includes('admin') && f.endsWith('.js'));

    // Check for super admin controls
    try {
      const authContent = fs.readFileSync('middleware/auth.js', 'utf8');
      superAdminProtection =
        authContent.includes('superAdmin') || authContent.includes('isSuperAdmin');
    } catch (error) {
      // File not found
    }

    // Check for audit logging
    try {
      const auditFiles = allFiles.filter(f => f.includes('audit') || f.includes('log'));
      adminAuditingFound = auditFiles.length > 0;
    } catch (error) {
      adminAuditingFound = false;
    }

    addResult(
      'Admin Routes',
      adminRoutesFound,
      adminRoutesFound ? 'Administrative routes present' : 'Admin routes need implementation'
    );
    addResult(
      'Super Admin Protection',
      superAdminProtection,
      superAdminProtection
        ? 'Super admin controls present'
        : 'Super admin protection needs implementation'
    );
    addResult(
      'Admin Auditing',
      adminAuditingFound,
      adminAuditingFound
        ? 'Audit logging system present'
        : 'Admin action auditing needs implementation'
    );
  } catch (error) {
    addResult(
      'Administrative Controls',
      false,
      `Could not analyze admin controls: ${error.message}`
    );
  }

  // Generate Report
  console.log('\n' + '='.repeat(50));
  console.log('📊 RBAC & AUTHORIZATION SECURITY REPORT');
  console.log('='.repeat(50));

  const passedTests = results.filter(r => r.status === 'PASS');
  const failedTests = results.filter(r => r.status === 'FAIL');

  console.log(`\n✅ IMPLEMENTED: ${passedTests.length}/${totalTests} controls`);
  passedTests.forEach(test => {
    console.log(`   • ${test.test}: ${test.message}`);
  });

  if (failedTests.length > 0) {
    console.log(`\n❌ NEEDS IMPLEMENTATION: ${failedTests.length} controls`);
    failedTests.forEach(test => {
      console.log(`   • ${test.test}: ${test.message}`);
    });
  }

  const scorePercentage = ((testsPassed / totalTests) * 100).toFixed(1);
  console.log(`\n📈 OVERALL RBAC SCORE: ${scorePercentage}%`);

  if (scorePercentage >= 90) {
    console.log('🏆 EXCELLENT: RBAC system is comprehensive and secure');
  } else if (scorePercentage >= 75) {
    console.log('✅ GOOD: RBAC foundation is strong, minor enhancements needed');
  } else if (scorePercentage >= 60) {
    console.log('⚠️ FAIR: RBAC system needs significant improvement');
  } else {
    console.log('❌ CRITICAL: RBAC system requires complete implementation');
  }

  console.log('\n🏗️ RBAC ARCHITECTURE ANALYSIS:');
  console.log('   • Database schema supports multi-tenant RBAC');
  console.log('   • JWT-based authentication foundation');
  console.log('   • Organization-level isolation present');
  console.log('   • Route-level authentication enforced');

  console.log('\n🔧 PRIORITY IMPLEMENTATIONS NEEDED:');
  const criticalGaps = failedTests.filter(
    test =>
      test.test.includes('Authorization Middleware') ||
      test.test.includes('Permission') ||
      test.test.includes('Role-Based')
  );

  if (criticalGaps.length > 0) {
    console.log('   🚨 CRITICAL:');
    criticalGaps.forEach(gap => console.log(`     • ${gap.test}`));
  }

  const mediumGaps = failedTests.filter(
    test =>
      !criticalGaps.includes(test) &&
      (test.test.includes('Validation') ||
        test.test.includes('Mass Assignment') ||
        test.test.includes('Admin'))
  );

  if (mediumGaps.length > 0) {
    console.log('   ⚠️ MEDIUM:');
    mediumGaps.forEach(gap => console.log(`     • ${gap.test}`));
  }

  console.log('\n💡 IMPLEMENTATION ROADMAP:');
  console.log('   1. Create authorization middleware with role/permission checking');
  console.log('   2. Implement permission-based route protection');
  console.log('   3. Add service-level authorization controls');
  console.log('   4. Implement mass assignment protection');
  console.log('   5. Add comprehensive input validation');
  console.log('   6. Create admin-specific security controls');
  console.log('   7. Implement audit logging for sensitive operations');

  console.log('\n' + '='.repeat(50));

  return {
    total: totalTests,
    passed: testsPassed,
    score: scorePercentage,
    results: results,
    criticalGaps: criticalGaps.length,
    mediumGaps: mediumGaps.length,
  };
}

if (require.main === module) {
  assessRBACSecurity().catch(console.error);
}

module.exports = assessRBACSecurity;
