const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('../../prisma/generated/client');

const prisma = new PrismaClient();

class LicenseService {
  constructor() {
    this.jwtSecret = process.env.LICENSE_JWT_SECRET;
    this.jwtExpiresIn = process.env.LICENSE_JWT_EXPIRES_IN || '365d';
    this.encryptionKey = process.env.LICENSE_ENCRYPTION_KEY;

    if (!this.jwtSecret || !this.encryptionKey) {
      throw new Error('License service configuration missing. Check LICENSE_JWT_SECRET and LICENSE_ENCRYPTION_KEY environment variables.');
    }
  }

  /**
   * Generate a unique license key
   * @param {Object} licenseData - License configuration data
   * @returns {string} - Generated license key
   */
  generateLicenseKey(licenseData) {
    const payload = {
      customerId: licenseData.customerId,
      plan: licenseData.plan,
      licenseType: licenseData.licenseType,
      features: licenseData.features || [],
      maxUsers: licenseData.maxUsers,
      maxWorkflows: licenseData.maxWorkflows,
      maxIntegrations: licenseData.maxIntegrations,
      issuedAt: new Date().toISOString(),
      expiresAt: licenseData.expiresAt?.toISOString(),
      deploymentId: licenseData.deploymentId,
      version: '1.0'
    };

    // Create JWT token
    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'nectar-license-server',
      audience: 'nectar-customer-app'
    });

    // Add additional encoding/obfuscation
    const encoded = Buffer.from(token).toString('base64url');

    // Create checksum for integrity
    const checksum = crypto.createHmac('sha256', this.encryptionKey)
      .update(encoded)
      .digest('hex')
      .substring(0, 8);

    return `NLS-${encoded}-${checksum}`;
  }

  /**
   * Validate and decode a license key
   * @param {string} licenseKey - License key to validate
   * @returns {Promise<Object>} - Validation result with decoded data
   */
  async validateLicenseKey(licenseKey, deploymentInfo = {}) {
    try {
      // Parse license key format
      if (!licenseKey.startsWith('NLS-')) {
        return { isValid: false, error: 'INVALID_FORMAT', message: 'Invalid license key format' };
      }

      const parts = licenseKey.substring(4).split('-');
      if (parts.length !== 2) {
        return { isValid: false, error: 'INVALID_FORMAT', message: 'Invalid license key structure' };
      }

      const [encoded, providedChecksum] = parts;

      // Verify checksum
      const expectedChecksum = crypto.createHmac('sha256', this.encryptionKey)
        .update(encoded)
        .digest('hex')
        .substring(0, 8);

      if (providedChecksum !== expectedChecksum) {
        return { isValid: false, error: 'CHECKSUM_MISMATCH', message: 'License key integrity check failed' };
      }

      // Decode JWT
      const token = Buffer.from(encoded, 'base64url').toString();

      let decoded;
      try {
        decoded = jwt.verify(token, this.jwtSecret, {
          issuer: 'nectar-license-server',
          audience: 'nectar-customer-app'
        });
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return { isValid: false, error: 'EXPIRED', message: 'License key has expired' };
        }
        return { isValid: false, error: 'INVALID_TOKEN', message: 'Invalid or corrupted license key' };
      }

      // Get license from database
      const license = await prisma.license.findUnique({
        where: { licenseKey },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              companyName: true,
              isActive: true
            }
          }
        }
      });

      if (!license) {
        return { isValid: false, error: 'NOT_FOUND', message: 'License not found in system' };
      }

      // Check license status
      if (!license.isActive) {
        return { isValid: false, error: 'INACTIVE', message: 'License is inactive' };
      }

      if (license.isSuspended) {
        return { isValid: false, error: 'SUSPENDED', message: 'License is suspended' };
      }

      if (!license.customer.isActive) {
        return { isValid: false, error: 'CUSTOMER_INACTIVE', message: 'Customer account is inactive' };
      }

      // Check expiration
      if (license.expiresAt && new Date() > license.expiresAt) {
        return { isValid: false, error: 'EXPIRED', message: 'License has expired' };
      }

      // Update deployment info if provided
      if (deploymentInfo.deploymentId || deploymentInfo.instanceUrl || deploymentInfo.version) {
        await this.updateDeploymentInfo(license.id, deploymentInfo);
      }

      // Log successful validation
      await this.logValidation(license.id, true, null, deploymentInfo);

      return {
        isValid: true,
        license: {
          id: license.id,
          customerId: license.customerId,
          plan: license.plan,
          licenseType: license.licenseType,
          features: license.features,
          maxUsers: license.maxUsers,
          maxWorkflows: license.maxWorkflows,
          maxIntegrations: license.maxIntegrations,
          issuedAt: license.issuedAt,
          expiresAt: license.expiresAt,
          billingCycle: license.billingCycle
        },
        customer: license.customer,
        decoded
      };

    } catch (error) {
      // Log failed validation
      await this.logValidation(null, false, error.message, deploymentInfo);

      return {
        isValid: false,
        error: 'SYSTEM_ERROR',
        message: 'License validation system error'
      };
    }
  }

  /**
   * Create a new license
   * @param {Object} licenseData - License creation data
   * @returns {Promise<Object>} - Created license with key
   */
  async createLicense(licenseData) {
    const {
      customerId,
      plan = 'STARTER',
      licenseType = 'STANDARD',
      features = [],
      maxUsers,
      maxWorkflows,
      maxIntegrations,
      expiresAt,
      billingCycle = 'MONTHLY',
      amount,
      currency = 'USD',
      deploymentId
    } = licenseData;

    // Generate deployment ID if not provided
    const finalDeploymentId = deploymentId || crypto.randomUUID();

    // Create license in database first (without key)
    const license = await prisma.license.create({
      data: {
        customerId,
        licenseKey: 'temp', // Temporary, will be updated
        plan,
        licenseType,
        features,
        maxUsers,
        maxWorkflows,
        maxIntegrations,
        expiresAt,
        billingCycle,
        amount,
        currency,
        deploymentId: finalDeploymentId
      },
      include: {
        customer: true
      }
    });

    // Generate license key with actual license data
    const licenseKey = this.generateLicenseKey({
      customerId: license.customerId,
      plan: license.plan,
      licenseType: license.licenseType,
      features: license.features,
      maxUsers: license.maxUsers,
      maxWorkflows: license.maxWorkflows,
      maxIntegrations: license.maxIntegrations,
      expiresAt: license.expiresAt,
      deploymentId: license.deploymentId
    });

    // Update license with generated key
    const updatedLicense = await prisma.license.update({
      where: { id: license.id },
      data: { licenseKey },
      include: {
        customer: true
      }
    });

    // Log license creation
    await prisma.auditLog.create({
      data: {
        customerId: license.customerId,
        licenseId: license.id,
        event: 'LICENSE_CREATED',
        description: `License created for ${license.customer.companyName || license.customer.email}`,
        actorType: 'SYSTEM',
        metadata: {
          plan: license.plan,
          licenseType: license.licenseType,
          deploymentId: license.deploymentId
        }
      }
    });

    return {
      ...updatedLicense,
      licenseKey: licenseKey
    };
  }

  /**
   * Update deployment information
   * @param {string} licenseId - License ID
   * @param {Object} deploymentInfo - Deployment information
   */
  async updateDeploymentInfo(licenseId, deploymentInfo) {
    const updateData = {
      lastHeartbeat: new Date()
    };

    if (deploymentInfo.instanceUrl) {
      updateData.instanceUrl = deploymentInfo.instanceUrl;
    }

    if (deploymentInfo.version) {
      updateData.version = deploymentInfo.version;
    }

    if (deploymentInfo.deploymentId) {
      updateData.deploymentId = deploymentInfo.deploymentId;
    }

    await prisma.license.update({
      where: { id: licenseId },
      data: updateData
    });
  }

  /**
   * Log validation attempt
   * @param {string} licenseId - License ID (null if validation failed before license lookup)
   * @param {boolean} isValid - Whether validation was successful
   * @param {string} errorMessage - Error message if validation failed
   * @param {Object} deploymentInfo - Deployment information
   */
  async logValidation(licenseId, isValid, errorMessage = null, deploymentInfo = {}) {
    try {
      const logData = {
        validatedAt: new Date(),
        isValid,
        errorMessage,
        clientIp: deploymentInfo.clientIp,
        userAgent: deploymentInfo.userAgent,
        instanceVersion: deploymentInfo.version
      };

      if (licenseId) {
        logData.licenseId = licenseId;
      }

      await prisma.validationLog.create({
        data: logData
      });
    } catch (error) {
      console.error('Failed to log validation:', error);
    }
  }

  /**
   * Suspend a license
   * @param {string} licenseId - License ID to suspend
   * @param {string} reason - Reason for suspension
   */
  async suspendLicense(licenseId, reason = 'Administrative action') {
    const license = await prisma.license.update({
      where: { id: licenseId },
      data: { isSuspended: true },
      include: { customer: true }
    });

    await prisma.auditLog.create({
      data: {
        customerId: license.customerId,
        licenseId: license.id,
        event: 'LICENSE_SUSPENDED',
        description: `License suspended: ${reason}`,
        actorType: 'SYSTEM',
        metadata: { reason }
      }
    });

    return license;
  }

  /**
   * Reactivate a suspended license
   * @param {string} licenseId - License ID to reactivate
   */
  async reactivateLicense(licenseId) {
    const license = await prisma.license.update({
      where: { id: licenseId },
      data: { isSuspended: false },
      include: { customer: true }
    });

    await prisma.auditLog.create({
      data: {
        customerId: license.customerId,
        licenseId: license.id,
        event: 'LICENSE_ACTIVATED',
        description: 'License reactivated',
        actorType: 'SYSTEM'
      }
    });

    return license;
  }

  /**
   * Get license usage statistics
   * @param {string} licenseId - License ID
   * @returns {Promise<Object>} - Usage statistics
   */
  async getLicenseUsage(licenseId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [license, recentUsage, totalUsage] = await Promise.all([
      prisma.license.findUnique({
        where: { id: licenseId },
        include: { customer: true }
      }),
      prisma.usageRecord.findMany({
        where: {
          licenseId,
          recordDate: { gte: thirtyDaysAgo }
        },
        orderBy: { recordDate: 'desc' }
      }),
      prisma.usageRecord.aggregate({
        where: { licenseId },
        _sum: {
          activeUsers: true,
          workflowRuns: true,
          apiCalls: true,
          storageUsed: true,
          integrationsUsed: true,
          dataProcessed: true
        }
      })
    ]);

    return {
      license,
      usage: {
        recent: recentUsage,
        totals: totalUsage._sum,
        period: { start: thirtyDaysAgo, end: now }
      }
    };
  }
}

module.exports = LicenseService;