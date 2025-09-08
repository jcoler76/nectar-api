const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prismaService = require('./prismaService');
const { logger } = require('../utils/logger');
const crypto = require('crypto');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtIssuer = process.env.JWT_ISSUER || 'nectar-api';
    this.jwtAudience = process.env.JWT_AUDIENCE || 'nectar-users';
    this.tokenExpiry = process.env.JWT_EXPIRES_IN || '24h';
  }

  /**
   * Authenticate user with email and password
   */
  async login(email, password, ipAddress = 'unknown', userAgent = 'unknown') {
    try {
      logger.info('Login attempt', { email, ipAddress });

      // Find user by email
      const user = await prismaService.findUserByEmail(email);
      
      if (!user) {
        logger.warn('Login failed - user not found', { email, ipAddress });
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        logger.warn('Login failed - user inactive', { email, userId: user.id, ipAddress });
        throw new Error('Account is inactive');
      }

      // Verify password
      if (!user.passwordHash) {
        logger.warn('Login failed - no password set', { email, userId: user.id, ipAddress });
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        logger.warn('Login failed - invalid password', { email, userId: user.id, ipAddress });
        throw new Error('Invalid email or password');
      }

      // Check if user has any organization memberships
      if (!user.memberships || user.memberships.length === 0) {
        logger.warn('Login failed - no organization memberships', { email, userId: user.id, ipAddress });
        throw new Error('No organization access found');
      }

      // Get primary organization (first one)
      const primaryMembership = user.memberships[0];
      const organization = primaryMembership.organization;

      // Generate JWT token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: organization.id,
        organizationSlug: organization.slug,
        role: primaryMembership.role,
        isAdmin: primaryMembership.role === 'OWNER',
        isSuperAdmin: user.isSuperAdmin || false, // Platform-level access
        type: 'access', // Required by tokenService validation
      };

      const token = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.tokenExpiry,
        issuer: this.jwtIssuer,
        audience: 'nectar-users', // Match JWT_AUDIENCE in .env
      });

      // Update last login
      await prismaService.updateUserLastLogin(user.id);

      logger.info('Login successful', {
        userId: user.id,
        email: user.email,
        organizationId: organization.id,
        role: primaryMembership.role,
        ipAddress,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          lastLoginAt: new Date(),
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          subscription: organization.subscription,
        },
        membership: {
          role: primaryMembership.role,
          joinedAt: primaryMembership.joinedAt,
        },
        token,
        expiresIn: this.tokenExpiry,
      };

    } catch (error) {
      logger.error('Login error', { error: error.message, email, ipAddress });
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      });

      // Get fresh user data
      const user = await prismaService.findUserById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return {
        ...decoded,
        user,
      };
    } catch (error) {
      logger.warn('Token verification failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Register new user (simplified version)
   */
  async register(userData, organizationData) {
    try {
      const { email, password, firstName, lastName } = userData;
      const { organizationName } = organizationData || {};

      logger.info('Registration attempt', { email, organizationName });

      // Check if user already exists
      const existingUser = await prismaService.findUserByEmail(email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate organization slug
      const orgSlug = organizationName
        ? organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
        : `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '-');

      // Create user, organization, subscription, and membership in a transaction
      const prisma = await prismaService.getClient();
      
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            id: crypto.randomUUID(),
            email,
            passwordHash,
            firstName,
            lastName,
            isActive: true,
            emailVerified: true, // For now, skip email verification
            emailVerifiedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create organization
        const organization = await tx.organization.create({
          data: {
            id: crypto.randomUUID(),
            name: organizationName || `${firstName} ${lastName}`,
            slug: orgSlug,
            updatedAt: new Date(),
          },
        });

        // Create subscription (free tier)
        const subscription = await tx.subscription.create({
          data: {
            id: crypto.randomUUID(),
            plan: 'FREE',
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            maxDatabaseConnections: 1,
            maxApiCallsPerMonth: 10000,
            maxUsersPerOrg: 3,
            maxWorkflows: 5,
            organizationId: organization.id,
            updatedAt: new Date(),
          },
        });

        // Create membership
        const membership = await tx.membership.create({
          data: {
            id: crypto.randomUUID(),
            role: 'OWNER',
            userId: user.id,
            organizationId: organization.id,
          },
        });

        return { user, organization, subscription, membership };
      });

      logger.info('Registration successful', {
        userId: result.user.id,
        email: result.user.email,
        organizationId: result.organization.id,
      });

      return result;

    } catch (error) {
      logger.error('Registration error', { error: error.message, userData });
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await prismaService.findUserById(userId);
      if (!user || !user.passwordHash) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      const prisma = await prismaService.getClient();
      await prisma.user.update({
        where: { id: userId },
        data: { 
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      });

      logger.info('Password changed successfully', { userId });
      return true;

    } catch (error) {
      logger.error('Password change error', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user profile with organizations
   */
  async getProfile(userId) {
    try {
      const user = await prismaService.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        organizations: user.memberships.map(m => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
          joinedAt: m.joinedAt,
          subscription: m.organization.subscription,
        })),
      };
    } catch (error) {
      logger.error('Get profile error', { error: error.message, userId });
      throw error;
    }
  }
}

module.exports = new AuthService();