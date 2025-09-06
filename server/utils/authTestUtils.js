/**
 * Real Authentication Test Utilities for Mirabel API
 * NO MOCKS - Uses real JWT tokens, real bcrypt, real authentication flow
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { logger } = require('../middleware/logger');

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
      issuer: 'mirabel-api-test',
      audience: 'mirabel-test-users',
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
      issuer: 'mirabel-api-test',
      audience: 'mirabel-test-users',
    };

    const tokenOptions = { ...defaultOptions, ...options };
    return jwt.sign(payload, this.refreshSecret, tokenOptions);
  }

  /**
   * Verify real JWT token
   */
  verifyToken(token, options = {}) {
    const defaultOptions = {
      issuer: 'mirabel-api-test',
      audience: 'mirabel-test-users',
    };

    const verifyOptions = { ...defaultOptions, ...options };
    return jwt.verify(token, this.secret, verifyOptions);
  }

  /**
   * Verify real refresh token
   */
  verifyRefreshToken(token, options = {}) {
    const defaultOptions = {
      issuer: 'mirabel-api-test',
      audience: 'mirabel-test-users',
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
   * Create real authenticated user with hashed password
   */
  async createAuthenticatedUser(userData = {}) {
    const defaultUser = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'testpassword123',
      role: 'user',
      tier: 'free',
      isActive: true,
      emailVerified: true,
    };

    const userToCreate = { ...defaultUser, ...userData };

    // Hash password with real bcrypt
    if (userToCreate.password) {
      const plainPassword = userToCreate.password;
      userToCreate.password = await bcrypt.hash(plainPassword, 10);
      userToCreate.plainPassword = plainPassword; // Store for test login
    }

    const user = new User(userToCreate);
    await user.save();

    // Generate real JWT tokens
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      tier: user.tier,
      name: user.name,
    };

    const accessToken = this.jwt.generateToken(tokenPayload);
    const refreshToken = this.jwt.generateRefreshToken({ id: user._id.toString() });

    logger.info(`Created authenticated test user: ${user.email}`);

    return {
      user: {
        ...user.toObject(),
        plainPassword: userToCreate.plainPassword,
      },
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
    const admin = await this.createAuthenticatedUser({
      role: 'admin',
      tier: 'enterprise',
      email: `admin${Date.now()}@example.com`,
    });

    const manager = await this.createAuthenticatedUser({
      role: 'manager',
      tier: 'premium',
      email: `manager${Date.now()}@example.com`,
    });

    const user = await this.createAuthenticatedUser({
      role: 'user',
      tier: 'free',
      email: `user${Date.now()}@example.com`,
    });

    return { admin, manager, user };
  }

  /**
   * Perform real login attempt
   */
  async attemptLogin(email, password) {
    try {
      const user = await User.findOne({ email, isActive: true });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return { success: false, error: 'Invalid password' };
      }

      const tokenPayload = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        tier: user.tier,
        name: user.name,
      };

      const accessToken = this.jwt.generateToken(tokenPayload);
      const refreshToken = this.jwt.generateRefreshToken({ id: user._id.toString() });

      return {
        success: true,
        user: user.toObject(),
        tokens: { accessToken, refreshToken },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test token refresh flow
   */
  async refreshTokens(refreshToken) {
    try {
      const decoded = this.jwt.verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return { success: false, error: 'Invalid refresh token' };
      }

      const tokenPayload = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        tier: user.tier,
        name: user.name,
      };

      const newAccessToken = this.jwt.generateToken(tokenPayload);
      const newRefreshToken = this.jwt.generateRefreshToken({ id: user._id.toString() });

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
   * Test password reset flow
   */
  async initiatePasswordReset(email) {
    try {
      const user = await User.findOne({ email, isActive: true });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Generate real password reset token
      const resetToken = this.jwt.generateToken(
        { id: user._id.toString(), type: 'password_reset' },
        { expiresIn: '1h' }
      );

      // In real implementation, this would be saved to database and sent via email
      // For tests, we'll return it directly
      return {
        success: true,
        resetToken,
        user: user.toObject(),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test password reset completion
   */
  async completePasswordReset(resetToken, newPassword) {
    try {
      const decoded = this.jwt.verifyToken(resetToken);

      if (decoded.type !== 'password_reset') {
        return { success: false, error: 'Invalid reset token' };
      }

      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return { success: false, error: 'Invalid user' };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      user.password = hashedPassword;
      await user.save();

      return { success: true, user: user.toObject() };
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
