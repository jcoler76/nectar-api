/**
 * Real Authentication Test Utilities for Nectar Studio
 * NO MOCKS - Uses real JWT tokens, real bcrypt, real authentication flow
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prismaService = require('../services/prismaService');
const { logger } = require('../middleware/logger');
const crypto = require('crypto');

/**
 * Real JWT Token Manager for Tests
 */
class RealJWTTestManager {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-32-chars';
    this.refreshSecret =
      process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-for-testing-32-chars';
  }

  /**
   * Generate real JWT token for testing
   */
  generateToken(payload, options = {}) {
    const defaultOptions = {
      expiresIn: '1h',
      issuer: 'nectar-api-test',
      audience: 'nectar-test-users',
    };

    const tokenOptions = { ...defaultOptions, ...options };
    return jwt.sign(payload, this.secret, tokenOptions);
  }

  /**
   * Generate real refresh token for testing
   */
  generateRefreshToken(payload, options = {}) {
    const defaultOptions = {
      expiresIn: '7d',
      issuer: 'nectar-api-test',
      audience: 'nectar-test-users',
    };

    const tokenOptions = { ...defaultOptions, ...options };
    return jwt.sign(payload, this.refreshSecret, tokenOptions);
  }

  /**
   * Verify real JWT token
   */
  verifyToken(token, options = {}) {
    const defaultOptions = {
      issuer: 'nectar-api-test',
      audience: 'nectar-test-users',
    };

    const verifyOptions = { ...defaultOptions, ...options };
    return jwt.verify(token, this.secret, verifyOptions);
  }

  /**
   * Verify real refresh token
   */
  verifyRefreshToken(token, options = {}) {
    const defaultOptions = {
      issuer: 'nectar-api-test',
      audience: 'nectar-test-users',
    };

    const verifyOptions = { ...defaultOptions, ...options };
    return jwt.verify(token, this.refreshSecret, verifyOptions);
  }

  /**
   * Decode token without verification (for testing)
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Generate expired token for testing
   */
  generateExpiredToken(payload) {
    return this.generateToken(payload, { expiresIn: '1ms' });
  }

  /**
   * Generate token with invalid signature for testing
   */
  generateInvalidToken(payload) {
    return jwt.sign(payload, 'invalid-secret', { expiresIn: '1h' });
  }
}

/**
 * Real Authentication Test Helper
 */
class RealAuthTestHelper {
  constructor(dbManager, jwtManager) {
    this.db = dbManager;
    this.jwt = jwtManager || new RealJWTTestManager();
  }

  /**
   * Create real authenticated user with hashed password using Prisma
   */
  async createAuthenticatedUser(userData = {}, organizationData = {}) {
    const defaultUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      password: 'testpassword123',
      role: 'MEMBER',
      isActive: true,
      emailVerified: true,
    };

    const defaultOrganization = {
      name: userData.organizationName || `Test Org ${Date.now()}`,
    };

    const userToCreate = { ...defaultUser, ...userData };
    const orgToCreate = { ...defaultOrganization, ...organizationData };

    // Hash password with real bcrypt
    let plainPassword = null;
    if (userToCreate.password) {
      plainPassword = userToCreate.password;
      userToCreate.passwordHash = await bcrypt.hash(plainPassword, 12);
      delete userToCreate.password; // Remove plain password
    }

    const prisma = await prismaService.getClient();

    // Create user with organization in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization first
      const organization = await tx.organization.create({
        data: {
          id: crypto.randomUUID(),
          name: orgToCreate.name,
          slug: orgToCreate.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          updatedAt: new Date(),
        },
      });

      // Create subscription
      const subscription = await tx.subscription.create({
        data: {
          id: crypto.randomUUID(),
          plan: 'FREE',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          maxDatabaseConnections: 1,
          maxApiCallsPerMonth: 10000,
          maxUsersPerOrg: 3,
          maxWorkflows: 5,
          organizationId: organization.id,
          updatedAt: new Date(),
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          email: userToCreate.email,
          passwordHash: userToCreate.passwordHash,
          firstName: userToCreate.firstName,
          lastName: userToCreate.lastName,
          isActive: userToCreate.isActive,
          emailVerified: userToCreate.emailVerified,
          emailVerifiedAt: userToCreate.emailVerified ? new Date() : null,
          updatedAt: new Date(),
        },
      });

      // Create membership
      const membership = await tx.membership.create({
        data: {
          id: crypto.randomUUID(),
          role: userToCreate.role,
          userId: user.id,
          organizationId: organization.id,
        },
      });

      return { user, organization, subscription, membership };
    });

    // Generate real JWT tokens
    const tokenPayload = {
      userId: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      organizationId: result.organization.id,
      organizationSlug: result.organization.slug,
      role: result.membership.role,
      isAdmin: result.membership.role === 'OWNER',
      type: 'access',
    };

    const accessToken = this.jwt.generateToken(tokenPayload);
    const refreshToken = this.jwt.generateRefreshToken({ userId: result.user.id });

    logger.info(`Created authenticated test user: ${result.user.email}`);

    return {
      user: {
        ...result.user,
        plainPassword,
      },
      organization: result.organization,
      membership: result.membership,
      tokens: {
        accessToken,
        refreshToken,
      },
      payload: tokenPayload,
    };
  }

  /**
   * Create multiple users with different roles
   */
  async createUsersByRole() {
    const owner = await this.createAuthenticatedUser({
      role: 'OWNER',
      email: `owner${Date.now()}@example.com`,
    });

    const admin = await this.createAuthenticatedUser({
      role: 'ADMIN',
      email: `admin${Date.now()}@example.com`,
    });

    const member = await this.createAuthenticatedUser({
      role: 'MEMBER',
      email: `member${Date.now()}@example.com`,
    });

    const viewer = await this.createAuthenticatedUser({
      role: 'VIEWER',
      email: `viewer${Date.now()}@example.com`,
    });

    return { owner, admin, member, viewer };
  }

  /**
   * Perform real login attempt using Prisma
   */
  async attemptLogin(email, password) {
    try {
      const prisma = await prismaService.getClient();
      
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          memberships: {
            include: {
              organization: {
                include: {
                  subscription: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.isActive) {
        return { success: false, error: 'User not found or inactive' };
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return { success: false, error: 'Invalid password' };
      }

      if (!user.memberships || user.memberships.length === 0) {
        return { success: false, error: 'No organization access found' };
      }

      // Get primary membership
      const primaryMembership = user.memberships[0];
      const organization = primaryMembership.organization;

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: organization.id,
        organizationSlug: organization.slug,
        role: primaryMembership.role,
        isAdmin: primaryMembership.role === 'OWNER',
        type: 'access',
      };

      const accessToken = this.jwt.generateToken(tokenPayload);
      const refreshToken = this.jwt.generateRefreshToken({ userId: user.id });

      return {
        success: true,
        user: {
          ...user,
          organization,
          membership: primaryMembership,
        },
        tokens: { accessToken, refreshToken },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test token refresh flow using Prisma
   */
  async refreshTokens(refreshToken) {
    try {
      const decoded = this.jwt.verifyRefreshToken(refreshToken);
      const prisma = await prismaService.getClient();
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        return { success: false, error: 'Invalid refresh token' };
      }

      if (!user.memberships || user.memberships.length === 0) {
        return { success: false, error: 'No organization access found' };
      }

      const primaryMembership = user.memberships[0];
      const organization = primaryMembership.organization;

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: organization.id,
        organizationSlug: organization.slug,
        role: primaryMembership.role,
        isAdmin: primaryMembership.role === 'OWNER',
        type: 'access',
      };

      const newAccessToken = this.jwt.generateToken(tokenPayload);
      const newRefreshToken = this.jwt.generateRefreshToken({ userId: user.id });

      return {
        success: true,
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test password reset flow using Prisma
   */
  async initiatePasswordReset(email) {
    try {
      const prisma = await prismaService.getClient();
      
      const user = await prisma.user.findUnique({
        where: { email, isActive: true },
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Generate real password reset token
      const resetToken = this.jwt.generateToken(
        { userId: user.id, type: 'password_reset' },
        { expiresIn: '1h' }
      );

      // In real implementation, this would be saved to database and sent via email
      // For tests, we'll return it directly
      return {
        success: true,
        resetToken,
        user,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test password reset completion using Prisma
   */
  async completePasswordReset(resetToken, newPassword) {
    try {
      const decoded = this.jwt.verifyToken(resetToken);

      if (decoded.type !== 'password_reset') {
        return { success: false, error: 'Invalid reset token' };
      }

      const prisma = await prismaService.getClient();
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId, isActive: true },
      });

      if (!user) {
        return { success: false, error: 'Invalid user' };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { 
          passwordHash: hashedPassword,
          updatedAt: new Date(),
        },
      });

      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Simulate different authentication scenarios
   */
  async createAuthScenarios() {
    const scenarios = {};

    // Valid user
    scenarios.validUser = await this.createAuthenticatedUser();

    // Inactive user
    scenarios.inactiveUser = await this.createAuthenticatedUser({
      isActive: false,
      email: `inactive${Date.now()}@example.com`,
    });

    // Unverified user
    scenarios.unverifiedUser = await this.createAuthenticatedUser({
      emailVerified: false,
      email: `unverified${Date.now()}@example.com`,
    });

    // Expired token user
    const expiredUser = await this.createAuthenticatedUser({
      email: `expired${Date.now()}@example.com`,
    });
    scenarios.expiredUser = {
      ...expiredUser,
      tokens: {
        accessToken: this.jwt.generateExpiredToken(expiredUser.payload),
        refreshToken: expiredUser.tokens.refreshToken,
      },
    };

    // Invalid token user
    scenarios.invalidTokenUser = {
      ...scenarios.validUser,
      tokens: {
        accessToken: this.jwt.generateInvalidToken(scenarios.validUser.payload),
        refreshToken: scenarios.validUser.tokens.refreshToken,
      },
    };

    return scenarios;
  }

  /**
   * Create API client with authentication
   */
  createAuthenticatedApiClient(app, authData) {
    const { RealApiTestClient } = require('./testUtils');
    const apiClient = new RealApiTestClient(app, this.db);

    if (authData && authData.tokens && authData.tokens.accessToken) {
      apiClient.setAuthToken(authData.tokens.accessToken);
    }

    return apiClient;
  }
}

/**
 * Permission Test Utilities
 */
class RealPermissionTestUtils {
  constructor(authHelper) {
    this.auth = authHelper;
  }

  /**
   * Test role-based access control
   */
  async testRoleBasedAccess(app, endpoint, method = 'GET', data = null) {
    const users = await this.auth.createUsersByRole();
    const results = {};

    for (const [roleName, userData] of Object.entries(users)) {
      const apiClient = this.auth.createAuthenticatedApiClient(app, userData);

      try {
        const response = await apiClient.request(method, endpoint, data);
        results[roleName] = {
          status: response.status,
          allowed: response.status < 400,
          body: response.body,
        };
      } catch (error) {
        results[roleName] = {
          status: 500,
          allowed: false,
          error: error.message,
        };
      }
    }

    return results;
  }

  /**
   * Test tier-based access control
   */
  async testTierBasedAccess(app, endpoint, method = 'GET', data = null) {
    const tiers = ['free', 'premium', 'enterprise'];
    const results = {};

    for (const tier of tiers) {
      const userData = await this.auth.createAuthenticatedUser({ tier });
      const apiClient = this.auth.createAuthenticatedApiClient(app, userData);

      try {
        const response = await apiClient.request(method, endpoint, data);
        results[tier] = {
          status: response.status,
          allowed: response.status < 400,
          body: response.body,
        };
      } catch (error) {
        results[tier] = {
          status: 500,
          allowed: false,
          error: error.message,
        };
      }
    }

    return results;
  }
}

module.exports = {
  RealJWTTestManager,
  RealAuthTestHelper,
  RealPermissionTestUtils,
};
