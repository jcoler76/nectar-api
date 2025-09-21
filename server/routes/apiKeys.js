/**
 * API Key Management Routes with Role-Based Access Control
 * Implements proper role restrictions for API key operations
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AuthFactory = require('../middleware/authFactory');
const { logApiKeyEvent } = require('../services/auditService');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(AuthFactory.createJWTMiddleware());

/**
 * GET /api/organizations/:orgId/api-keys
 * List API keys - requires MEMBER level or higher
 */
router.get(
  '/',
  AuthFactory.requireMinimumRole('MEMBER'),
  AuthFactory.requireOrganizationAccess([
    'MEMBER',
    'DEVELOPER',
    'ORGANIZATION_ADMIN',
    'ORGANIZATION_OWNER',
  ]),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.memberships?.find(m => m.organizationId === orgId)?.role;

      // Different visibility based on role
      const includeOptions = {
        organization: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      };

      // Members can only see their own keys
      let whereClause = { organizationId: orgId };
      if (userRole === 'MEMBER') {
        whereClause.createdById = userId;
      }

      // Developers and above can see all keys but with different detail levels
      const selectOptions = {
        id: true,
        name: true,
        description: true,
        environment: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
        permissions: true,
        organizationId: true,
        createdById: true,
      };

      // Only show partial key for security (except for owners/admins)
      if (!['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'].includes(userRole)) {
        selectOptions.keyPreview = true;
      } else {
        selectOptions.keyPreview = true;
        selectOptions.keyHash = true; // For regeneration purposes
      }

      const apiKeys = await prisma.apiKey.findMany({
        where: whereClause,
        select: selectOptions,
        include: includeOptions,
        orderBy: { createdAt: 'desc' },
      });

      // Add usage statistics for developers and above
      const keysWithStats = await Promise.all(
        apiKeys.map(async key => {
          if (['DEVELOPER', 'ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER'].includes(userRole)) {
            // Get usage stats for the last 30 days
            const usageStats = await prisma.apiUsage.aggregate({
              where: {
                apiKeyId: key.id,
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
              _count: { id: true },
              _sum: { requestCount: true },
            });

            return {
              ...key,
              usage: {
                totalRequests: usageStats._sum.requestCount || 0,
                last30Days: usageStats._count.id || 0,
              },
            };
          }
          return key;
        })
      );

      res.json({
        apiKeys: keysWithStats,
        canCreate: ['DEVELOPER', 'ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER'].includes(userRole),
        canRevoke: ['ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER'].includes(userRole),
        canRotate: ['DEVELOPER', 'ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER'].includes(userRole),
      });
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({
        error: 'Failed to fetch API keys',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/organizations/:orgId/api-keys
 * Create new API key - requires DEVELOPER level or higher
 */
router.post(
  '/',
  AuthFactory.requireMinimumRole('DEVELOPER'),
  AuthFactory.requireOrganizationAccess(['DEVELOPER', 'ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER']),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.memberships?.find(m => m.organizationId === orgId)?.role;

      const {
        name,
        description,
        environment = 'development',
        permissions = [],
        expiresIn = '1y', // Default 1 year expiration
      } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          error: 'API key name is required',
        });
      }

      // Validate environment
      const validEnvironments = ['development', 'staging', 'production'];
      if (!validEnvironments.includes(environment)) {
        return res.status(400).json({
          error: 'Invalid environment. Must be: development, staging, or production',
        });
      }

      // Role-based restrictions
      const restrictions = {
        DEVELOPER: {
          maxKeys: 10,
          allowedEnvironments: ['development', 'staging'],
          maxPermissions: 5,
          maxExpirationMonths: 12,
        },
        ORGANIZATION_ADMIN: {
          maxKeys: 50,
          allowedEnvironments: ['development', 'staging', 'production'],
          maxPermissions: 20,
          maxExpirationMonths: 24,
        },
        ORGANIZATION_OWNER: {
          maxKeys: 100,
          allowedEnvironments: ['development', 'staging', 'production'],
          maxPermissions: -1, // unlimited
          maxExpirationMonths: -1, // unlimited
        },
      };

      const userRestrictions = restrictions[userRole] || restrictions['DEVELOPER'];

      // Check environment restrictions
      if (!userRestrictions.allowedEnvironments.includes(environment)) {
        return res.status(403).json({
          error: `${userRole} cannot create ${environment} API keys`,
        });
      }

      // Check key count limits
      const existingKeysCount = await prisma.apiKey.count({
        where: {
          organizationId: orgId,
          createdById: userId,
          isActive: true,
        },
      });

      if (existingKeysCount >= userRestrictions.maxKeys) {
        return res.status(403).json({
          error: `Maximum API key limit reached (${userRestrictions.maxKeys})`,
        });
      }

      // Validate permissions
      if (permissions.length > 0 && userRestrictions.maxPermissions > 0) {
        if (permissions.length > userRestrictions.maxPermissions) {
          return res.status(403).json({
            error: `Maximum ${userRestrictions.maxPermissions} permissions allowed`,
          });
        }
      }

      // Calculate expiration date
      let expiresAt = null;
      if (expiresIn && expiresIn !== 'never') {
        const expirationMs = parseExpiration(expiresIn);
        const maxMs =
          userRestrictions.maxExpirationMonths > 0
            ? userRestrictions.maxExpirationMonths * 30 * 24 * 60 * 60 * 1000
            : null;

        if (maxMs && expirationMs > maxMs) {
          return res.status(403).json({
            error: `Maximum expiration period is ${userRestrictions.maxExpirationMonths} months`,
          });
        }

        expiresAt = new Date(Date.now() + expirationMs);
      }

      // Generate API key
      const apiKey = generateApiKey();
      const keyHash = await bcrypt.hash(apiKey, 12);

      // Create API key record
      const createdKey = await prisma.apiKey.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          keyHash,
          keyPreview: `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`,
          environment,
          permissions: permissions,
          organizationId: orgId,
          createdById: userId,
          expiresAt,
          isActive: true,
        },
        include: {
          organization: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      // Log API key creation
      await logApiKeyEvent({
        action: 'CREATE',
        apiKeyId: createdKey.id,
        userId,
        organizationId: orgId,
        metadata: {
          name: createdKey.name,
          environment: createdKey.environment,
          permissions: createdKey.permissions,
          expiresAt: createdKey.expiresAt,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(201).json({
        message: 'API key created successfully',
        apiKey: {
          ...createdKey,
          keyHash: undefined, // Don't return hash
        },
        // Return the actual key only once
        key: apiKey,
        warning: 'Store this API key securely. It will not be shown again.',
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({
        error: 'Failed to create API key',
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/organizations/:orgId/api-keys/:keyId/revoke
 * Revoke API key - requires ORGANIZATION_ADMIN or higher
 */
router.put(
  '/:keyId/revoke',
  AuthFactory.requireMinimumRole('ORGANIZATION_ADMIN'),
  AuthFactory.requireOrganizationAccess(['ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER']),
  async (req, res) => {
    try {
      const { orgId, keyId } = req.params;
      const userId = req.user.userId;
      const { reason } = req.body;

      const apiKey = await prisma.apiKey.findFirst({
        where: {
          id: keyId,
          organizationId: orgId,
        },
        include: {
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      if (!apiKey) {
        return res.status(404).json({
          error: 'API key not found',
        });
      }

      if (!apiKey.isActive) {
        return res.status(400).json({
          error: 'API key is already revoked',
        });
      }

      // Update key status
      await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedById: userId,
          revokeReason: reason,
        },
      });

      // Log revocation
      await logApiKeyEvent({
        action: 'REVOKE',
        apiKeyId: keyId,
        userId,
        organizationId: orgId,
        metadata: {
          name: apiKey.name,
          reason: reason,
          revokedBy: userId,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        message: 'API key revoked successfully',
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({
        error: 'Failed to revoke API key',
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/organizations/:orgId/api-keys/:keyId/rotate
 * Rotate API key - requires DEVELOPER level or higher
 */
router.put(
  '/:keyId/rotate',
  AuthFactory.requireMinimumRole('DEVELOPER'),
  AuthFactory.requireOrganizationAccess(['DEVELOPER', 'ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER']),
  async (req, res) => {
    try {
      const { orgId, keyId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.memberships?.find(m => m.organizationId === orgId)?.role;

      const apiKey = await prisma.apiKey.findFirst({
        where: {
          id: keyId,
          organizationId: orgId,
        },
      });

      if (!apiKey) {
        return res.status(404).json({
          error: 'API key not found',
        });
      }

      if (!apiKey.isActive) {
        return res.status(400).json({
          error: 'Cannot rotate inactive API key',
        });
      }

      // Developers can only rotate their own keys
      if (userRole === 'DEVELOPER' && apiKey.createdById !== userId) {
        return res.status(403).json({
          error: 'Can only rotate your own API keys',
        });
      }

      // Generate new API key
      const newApiKey = generateApiKey();
      const newKeyHash = await bcrypt.hash(newApiKey, 12);

      // Update with new key
      await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          keyHash: newKeyHash,
          keyPreview: `${newApiKey.substring(0, 8)}...${newApiKey.slice(-4)}`,
          lastRotatedAt: new Date(),
          rotatedById: userId,
        },
      });

      // Log rotation
      await logApiKeyEvent({
        action: 'ROTATE',
        apiKeyId: keyId,
        userId,
        organizationId: orgId,
        metadata: {
          name: apiKey.name,
          rotatedBy: userId,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        message: 'API key rotated successfully',
        key: newApiKey,
        warning: 'Update your applications with the new API key. The old key is now invalid.',
      });
    } catch (error) {
      console.error('Error rotating API key:', error);
      res.status(500).json({
        error: 'Failed to rotate API key',
        message: error.message,
      });
    }
  }
);

// Utility functions

function generateApiKey() {
  // Generate a secure API key
  const prefix = 'nk_'; // nectar key
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}${randomBytes}`;
}

function parseExpiration(expiresIn) {
  // Parse expiration string like '1y', '6m', '30d'
  const match = expiresIn.match(/^(\d+)([ymwd])$/);
  if (!match) {
    throw new Error('Invalid expiration format');
  }

  const [, amount, unit] = match;
  const multipliers = {
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    m: 30 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  return parseInt(amount) * multipliers[unit];
}

module.exports = router;
