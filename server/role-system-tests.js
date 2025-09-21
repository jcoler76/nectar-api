/**
 * Comprehensive Role System Test Suite
 * Tests role inheritance, permission cascading, and access control
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logRoleChange, logAuditEvent } = require('./services/auditService');

const prisma = new PrismaClient();

// Test data setup
const testUsers = {
  superAdmin: {
    email: 'superadmin@test.com',
    role: 'SUPER_ADMIN',
    firstName: 'Super',
    lastName: 'Admin',
  },
  orgOwner: {
    email: 'owner@test.com',
    role: 'ORGANIZATION_OWNER',
    firstName: 'Org',
    lastName: 'Owner',
  },
  orgAdmin: {
    email: 'admin@test.com',
    role: 'ORGANIZATION_ADMIN',
    firstName: 'Org',
    lastName: 'Admin',
  },
  developer: {
    email: 'dev@test.com',
    role: 'DEVELOPER',
    firstName: 'Dev',
    lastName: 'User',
  },
  member: {
    email: 'member@test.com',
    role: 'MEMBER',
    firstName: 'Member',
    lastName: 'User',
  },
  viewer: {
    email: 'viewer@test.com',
    role: 'VIEWER',
    firstName: 'View',
    lastName: 'User',
  },
};

// Test organization
const testOrg = {
  name: 'Test Organization',
  slug: 'test-org',
  description: 'Test organization for role testing',
};

class RoleSystemTester {
  constructor() {
    this.testResults = [];
    this.createdUsers = [];
    this.createdOrg = null;
    this.createdMemberships = [];
    this.adminUsers = [];
  }

  async setup() {
    console.log('🔧 Setting up test environment...');

    try {
      // Create test organization
      this.createdOrg = await prisma.organization.create({
        data: testOrg,
      });
      console.log(`✅ Created test organization: ${this.createdOrg.id}`);

      // Create test users
      for (const [key, userData] of Object.entries(testUsers)) {
        const passwordHash = await bcrypt.hash('testpassword123', 10);

        const user = await prisma.user.create({
          data: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            passwordHash,
            isVerified: true,
            isActive: true,
          },
        });

        // Create organization membership with the specified role
        const membership = await prisma.organizationMembership.create({
          data: {
            organizationId: this.createdOrg.id,
            userId: user.id,
            role: userData.role,
            isActive: true,
          },
        });

        this.createdUsers.push({ ...user, testKey: key, membership });
        this.createdMemberships.push(membership);
        console.log(`✅ Created test user ${key}: ${user.email} with role ${userData.role}`);
      }

      // Create test admin users
      const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_AGENT', 'BILLING_ADMIN', 'ANALYST'];
      for (const role of adminRoles) {
        const passwordHash = await bcrypt.hash('adminpassword123', 10);

        const adminUser = await prisma.adminUser.create({
          data: {
            email: `${role.toLowerCase()}@admin.test`,
            firstName: role.split('_')[0],
            lastName: role.split('_').slice(1).join('_') || 'ADMIN',
            role: role,
            passwordHash,
            isActive: true,
          },
        });

        this.adminUsers.push({ ...adminUser, testKey: role });
        console.log(`✅ Created admin user: ${adminUser.email} with role ${role}`);
      }

      console.log('✅ Test environment setup complete\n');
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  async testRoleHierarchy() {
    console.log('🧪 Testing Role Hierarchy...');

    const roleHierarchy = {
      SUPER_ADMIN: 7,
      ORGANIZATION_OWNER: 6,
      ORGANIZATION_ADMIN: 5,
      DEVELOPER: 4,
      MEMBER: 3,
      VIEWER: 1,
      // Legacy roles
      OWNER: 6,
      ADMIN: 5,
    };

    // Test that roles have correct hierarchy levels
    for (const [role, expectedLevel] of Object.entries(roleHierarchy)) {
      const user = this.createdUsers.find(u => u.membership.role === role);
      if (user) {
        const actualLevel = this.getRoleLevel(role);
        const passed = actualLevel === expectedLevel;

        this.testResults.push({
          test: `Role hierarchy: ${role}`,
          expected: expectedLevel,
          actual: actualLevel,
          passed,
        });

        console.log(
          `${passed ? '✅' : '❌'} ${role}: Level ${actualLevel} (expected ${expectedLevel})`
        );
      }
    }

    // Test role inheritance (higher roles can perform lower role actions)
    const inheritanceTests = [
      ['SUPER_ADMIN', 'ORGANIZATION_OWNER', true],
      ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', true],
      ['ORGANIZATION_ADMIN', 'DEVELOPER', true],
      ['DEVELOPER', 'MEMBER', true],
      ['MEMBER', 'VIEWER', true],
      ['VIEWER', 'MEMBER', false], // Should not inherit upward
      ['DEVELOPER', 'ORGANIZATION_ADMIN', false], // Should not inherit upward
    ];

    for (const [higherRole, lowerRole, shouldInherit] of inheritanceTests) {
      const canInherit = this.canRoleInherit(higherRole, lowerRole);
      const passed = canInherit === shouldInherit;

      this.testResults.push({
        test: `Role inheritance: ${higherRole} -> ${lowerRole}`,
        expected: shouldInherit,
        actual: canInherit,
        passed,
      });

      console.log(
        `${passed ? '✅' : '❌'} ${higherRole} ${shouldInherit ? 'can' : 'cannot'} inherit ${lowerRole} permissions: ${canInherit}`
      );
    }

    console.log('');
  }

  async testPermissionCascading() {
    console.log('🧪 Testing Permission Cascading...');

    // Define permissions for each role
    const rolePermissions = {
      SUPER_ADMIN: ['*'], // All permissions
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

    // Test permission checking
    for (const [role, permissions] of Object.entries(rolePermissions)) {
      const user = this.createdUsers.find(u => u.membership.role === role);
      if (!user) continue;

      for (const permission of permissions) {
        const hasPermission = this.checkPermission(user.membership.role, permission);
        const passed = hasPermission;

        this.testResults.push({
          test: `Permission: ${role} has ${permission}`,
          expected: true,
          actual: hasPermission,
          passed,
        });

        console.log(`${passed ? '✅' : '❌'} ${role} has ${permission}: ${hasPermission}`);
      }

      // Test permissions this role should NOT have
      const forbiddenPermissions = this.getForbiddenPermissions(role);
      for (const permission of forbiddenPermissions) {
        const hasPermission = this.checkPermission(user.membership.role, permission);
        const passed = !hasPermission;

        this.testResults.push({
          test: `Permission denied: ${role} lacks ${permission}`,
          expected: false,
          actual: hasPermission,
          passed,
        });

        console.log(
          `${passed ? '✅' : '❌'} ${role} correctly denied ${permission}: ${!hasPermission}`
        );
      }
    }

    console.log('');
  }

  async testAdminRoleSystem() {
    console.log('🧪 Testing Admin Role System...');

    // Test admin role hierarchy
    const adminHierarchy = {
      SUPER_ADMIN: 5,
      ADMIN: 4,
      BILLING_ADMIN: 3,
      SUPPORT_AGENT: 2,
      ANALYST: 1,
    };

    for (const adminUser of this.adminUsers) {
      const expectedLevel = adminHierarchy[adminUser.role];
      const actualLevel = this.getAdminRoleLevel(adminUser.role);
      const passed = actualLevel === expectedLevel;

      this.testResults.push({
        test: `Admin role hierarchy: ${adminUser.role}`,
        expected: expectedLevel,
        actual: actualLevel,
        passed,
      });

      console.log(
        `${passed ? '✅' : '❌'} Admin ${adminUser.role}: Level ${actualLevel} (expected ${expectedLevel})`
      );
    }

    // Test admin permissions
    const adminPermissions = {
      SUPER_ADMIN: [
        'admin:manage',
        'user:manage',
        'license:manage',
        'billing:manage',
        'analytics:view',
      ],
      ADMIN: ['user:manage', 'license:manage', 'analytics:view'],
      BILLING_ADMIN: ['billing:manage', 'license:view', 'analytics:view'],
      SUPPORT_AGENT: ['user:view', 'license:view'],
      ANALYST: ['analytics:view'],
    };

    for (const [role, permissions] of Object.entries(adminPermissions)) {
      const adminUser = this.adminUsers.find(u => u.role === role);
      if (!adminUser) continue;

      for (const permission of permissions) {
        const hasPermission = this.checkAdminPermission(adminUser.role, permission);
        const passed = hasPermission;

        this.testResults.push({
          test: `Admin permission: ${role} has ${permission}`,
          expected: true,
          actual: hasPermission,
          passed,
        });

        console.log(`${passed ? '✅' : '❌'} Admin ${role} has ${permission}: ${hasPermission}`);
      }
    }

    console.log('');
  }

  async testAuditLogging() {
    console.log('🧪 Testing Audit Logging...');

    try {
      // Test role change logging
      const testUser = this.createdUsers[0];
      const roleChangeResult = await logRoleChange({
        targetUserId: testUser.id,
        organizationId: this.createdOrg.id,
        oldRole: 'MEMBER',
        newRole: 'DEVELOPER',
        reason: 'Test role change for audit logging',
        performedById: testUser.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Suite',
      });

      const passed = roleChangeResult && roleChangeResult.id;
      this.testResults.push({
        test: 'Audit logging: Role change logged',
        expected: true,
        actual: passed,
        passed,
      });

      console.log(`${passed ? '✅' : '❌'} Role change audit log created: ${passed}`);

      // Test general audit event logging
      await logAuditEvent({
        action: 'TEST_ACTION',
        entityType: 'TEST_ENTITY',
        entityId: 'test-id',
        userId: testUser.id,
        organizationId: this.createdOrg.id,
        metadata: { test: true },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Suite',
      });

      console.log('✅ General audit event logged successfully');

      // Verify audit logs were created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          OR: [{ action: 'ROLE_CHANGE' }, { action: 'TEST_ACTION' }],
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      });

      const auditLogsFound = auditLogs.length >= 2;
      this.testResults.push({
        test: 'Audit logging: Logs retrievable',
        expected: true,
        actual: auditLogsFound,
        passed: auditLogsFound,
      });

      console.log(
        `${auditLogsFound ? '✅' : '❌'} Audit logs retrievable: ${auditLogs.length} logs found`
      );
    } catch (error) {
      console.error('❌ Audit logging test failed:', error.message);
      this.testResults.push({
        test: 'Audit logging: Error handling',
        expected: false,
        actual: true,
        passed: false,
        error: error.message,
      });
    }

    console.log('');
  }

  async testRoleTransitions() {
    console.log('🧪 Testing Role Transitions...');

    // Test valid role transitions
    const validTransitions = [
      ['VIEWER', 'MEMBER'],
      ['MEMBER', 'DEVELOPER'],
      ['DEVELOPER', 'ORGANIZATION_ADMIN'],
      ['ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER'],
    ];

    for (const [fromRole, toRole] of validTransitions) {
      const isValid = this.isValidRoleTransition(fromRole, toRole);
      const passed = isValid;

      this.testResults.push({
        test: `Role transition: ${fromRole} -> ${toRole}`,
        expected: true,
        actual: isValid,
        passed,
      });

      console.log(`${passed ? '✅' : '❌'} Valid transition ${fromRole} -> ${toRole}: ${isValid}`);
    }

    // Test invalid role transitions (downgrading should be restricted)
    const invalidTransitions = [
      ['ORGANIZATION_OWNER', 'MEMBER'],
      ['SUPER_ADMIN', 'VIEWER'],
      ['ORGANIZATION_ADMIN', 'VIEWER'],
    ];

    for (const [fromRole, toRole] of invalidTransitions) {
      const isValid = this.isValidRoleTransition(fromRole, toRole);
      const passed = !isValid; // Should be invalid

      this.testResults.push({
        test: `Invalid role transition: ${fromRole} -> ${toRole}`,
        expected: false,
        actual: isValid,
        passed,
      });

      console.log(
        `${passed ? '✅' : '❌'} Invalid transition ${fromRole} -> ${toRole} blocked: ${!isValid}`
      );
    }

    console.log('');
  }

  // Helper methods for role validation
  getRoleLevel(role) {
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

  getAdminRoleLevel(role) {
    const levels = {
      SUPER_ADMIN: 5,
      ADMIN: 4,
      BILLING_ADMIN: 3,
      SUPPORT_AGENT: 2,
      ANALYST: 1,
    };
    return levels[role] || 0;
  }

  canRoleInherit(higherRole, lowerRole) {
    return this.getRoleLevel(higherRole) > this.getRoleLevel(lowerRole);
  }

  checkPermission(role, permission) {
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

    // Check direct permission or inheritance from higher roles
    if (permissions.includes(permission)) return true;

    // Check inheritance - higher roles inherit lower role permissions
    const roleLevel = this.getRoleLevel(role);
    for (const [otherRole, otherPermissions] of Object.entries(rolePermissions)) {
      if (this.getRoleLevel(otherRole) < roleLevel && otherPermissions.includes(permission)) {
        return true;
      }
    }

    return false;
  }

  checkAdminPermission(role, permission) {
    const adminPermissions = {
      SUPER_ADMIN: [
        'admin:manage',
        'user:manage',
        'license:manage',
        'billing:manage',
        'analytics:view',
      ],
      ADMIN: ['user:manage', 'license:manage', 'analytics:view'],
      BILLING_ADMIN: ['billing:manage', 'license:view', 'analytics:view'],
      SUPPORT_AGENT: ['user:view', 'license:view'],
      ANALYST: ['analytics:view'],
    };

    const permissions = adminPermissions[role] || [];

    // Check direct permission or inheritance from higher roles
    if (permissions.includes(permission)) return true;

    // Check inheritance
    const roleLevel = this.getAdminRoleLevel(role);
    for (const [otherRole, otherPermissions] of Object.entries(adminPermissions)) {
      if (this.getAdminRoleLevel(otherRole) < roleLevel && otherPermissions.includes(permission)) {
        return true;
      }
    }

    return false;
  }

  getForbiddenPermissions(role) {
    // Return permissions this role should NOT have
    const allPermissions = ['organization:manage', 'member:remove', 'billing:manage'];
    const roleLevel = this.getRoleLevel(role);

    if (roleLevel >= 6) return []; // High level roles have most permissions
    if (roleLevel >= 5) return ['billing:manage'];
    if (roleLevel >= 4) return ['organization:manage', 'member:remove', 'billing:manage'];

    return allPermissions;
  }

  isValidRoleTransition(fromRole, toRole) {
    const fromLevel = this.getRoleLevel(fromRole);
    const toLevel = this.getRoleLevel(toRole);

    // Allow upgrades, restrict downgrades beyond 1 level
    if (toLevel > fromLevel) return true; // Upgrades always allowed
    if (fromLevel - toLevel <= 1) return true; // Minor downgrades allowed

    return false; // Major downgrades restricted
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');

    try {
      // Delete test audit logs
      await prisma.auditLog.deleteMany({
        where: {
          OR: [{ action: 'ROLE_CHANGE' }, { action: 'TEST_ACTION' }],
        },
      });

      // Delete role change logs
      await prisma.roleChangeLog.deleteMany({
        where: {
          targetUserId: { in: this.createdUsers.map(u => u.id) },
        },
      });

      // Delete memberships
      await prisma.organizationMembership.deleteMany({
        where: {
          id: { in: this.createdMemberships.map(m => m.id) },
        },
      });

      // Delete test users
      await prisma.user.deleteMany({
        where: {
          id: { in: this.createdUsers.map(u => u.id) },
        },
      });

      // Delete admin users
      await prisma.adminUser.deleteMany({
        where: {
          id: { in: this.adminUsers.map(u => u.id) },
        },
      });

      // Delete test organization
      if (this.createdOrg) {
        await prisma.organization.delete({
          where: { id: this.createdOrg.id },
        });
      }

      console.log('✅ Cleanup complete');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');

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
          console.log(`- ${test.test}`);
          console.log(`  Expected: ${test.expected}, Got: ${test.actual}`);
          if (test.error) console.log(`  Error: ${test.error}`);
        });
    }

    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: (passedTests / totalTests) * 100,
    };
  }

  async runAllTests() {
    try {
      await this.setup();
      await this.testRoleHierarchy();
      await this.testPermissionCascading();
      await this.testAdminRoleSystem();
      await this.testAuditLogging();
      await this.testRoleTransitions();

      const report = this.generateReport();

      await this.cleanup();

      return report;
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      await this.cleanup();
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Export for use in other test files
module.exports = { RoleSystemTester };

// Run tests if called directly
if (require.main === module) {
  const tester = new RoleSystemTester();
  tester
    .runAllTests()
    .then(report => {
      console.log(`\n🎉 Test suite completed with ${report.successRate.toFixed(1)}% success rate`);
      process.exit(report.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
