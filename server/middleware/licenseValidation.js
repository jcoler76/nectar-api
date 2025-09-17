const axios = require('axios');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/license.log' }),
  ],
});

class LicenseValidator {
  constructor() {
    this.licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://licenses.nectar.com';
    this.licenseKey = process.env.LICENSE_KEY;
    this.deploymentId = process.env.DEPLOYMENT_ID || this.generateDeploymentId();
    this.instanceUrl = process.env.INSTANCE_URL || 'http://localhost:3000';
    this.version = process.env.npm_package_version || '1.0.0';

    // Grace period and offline mode settings
    this.gracePeriodDays = parseInt(process.env.LICENSE_GRACE_PERIOD_DAYS) || 7;
    this.offlineModeMaxDays = parseInt(process.env.LICENSE_OFFLINE_MODE_MAX_DAYS) || 30;
    this.checkIntervalHours = parseInt(process.env.LICENSE_CHECK_INTERVAL_HOURS) || 24;

    // Cache for license validation results
    this.lastValidation = null;
    this.lastValidationTime = null;
    this.isOnline = true;

    // Start periodic validation
    this.startPeriodicValidation();
  }

  generateDeploymentId() {
    const { randomUUID } = require('crypto');
    return randomUUID();
  }

  /**
   * Validate license with the license server
   * @param {boolean} forceCheck - Force online validation
   * @returns {Promise<Object>} Validation result
   */
  async validateLicense(forceCheck = false) {
    try {
      if (!this.licenseKey) {
        return {
          isValid: false,
          error: 'NO_LICENSE_KEY',
          message: 'No license key configured. Please set LICENSE_KEY environment variable.',
          gracePeriod: false,
        };
      }

      // Check if we can use cached result
      if (!forceCheck && this.shouldUseCachedResult()) {
        return this.lastValidation;
      }

      // Attempt online validation
      const validationResult = await this.performOnlineValidation();

      // Cache the result
      this.lastValidation = validationResult;
      this.lastValidationTime = new Date();
      this.isOnline = true;

      // Send heartbeat if validation was successful
      if (validationResult.isValid) {
        this.sendHeartbeat().catch(error => {
          logger.warn('Heartbeat failed', { error: error.message });
        });
      }

      return validationResult;
    } catch (error) {
      logger.error('License validation failed', { error: error.message });
      this.isOnline = false;

      // Handle offline mode
      return this.handleOfflineMode(error);
    }
  }

  /**
   * Perform online license validation
   */
  async performOnlineValidation() {
    const validationPayload = {
      licenseKey: this.licenseKey,
      deploymentId: this.deploymentId,
      instanceUrl: this.instanceUrl,
      version: this.version,
      features: this.getRequestedFeatures(),
    };

    const response = await axios.post(
      `${this.licenseServerUrl}/api/validation/validate`,
      validationPayload,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Nectar-Customer-App/${this.version}`,
        },
      }
    );

    const result = response.data;

    if (!result.success || !result.isValid) {
      logger.warn('License validation failed', {
        error: result.error,
        message: result.message,
      });

      return {
        isValid: false,
        error: result.error,
        message: result.message,
        gracePeriod: this.isInGracePeriod(),
      };
    }

    logger.info('License validation successful', {
      plan: result.license.plan,
      expiresAt: result.license.expiresAt,
      customer: result.customer.companyName || result.customer.email,
    });

    return {
      isValid: true,
      license: result.license,
      customer: result.customer,
      permissions: result.permissions,
      validUntil: result.validUntil,
      gracePeriod: false,
    };
  }

  /**
   * Handle offline mode when license server is unreachable
   */
  handleOfflineMode(error) {
    const now = new Date();

    // If we have a recent successful validation, check if we're still in offline grace period
    if (this.lastValidation && this.lastValidation.isValid && this.lastValidationTime) {
      const daysSinceLastValidation = (now - this.lastValidationTime) / (1000 * 60 * 60 * 24);

      if (daysSinceLastValidation <= this.offlineModeMaxDays) {
        logger.info('Operating in offline mode', {
          daysSinceLastValidation: Math.floor(daysSinceLastValidation),
          maxOfflineDays: this.offlineModeMaxDays,
        });

        return {
          ...this.lastValidation,
          offlineMode: true,
          daysRemaining: Math.floor(this.offlineModeMaxDays - daysSinceLastValidation),
        };
      }
    }

    // No valid cached result or offline period expired
    return {
      isValid: false,
      error: 'OFFLINE_EXPIRED',
      message: 'License server unreachable and offline grace period expired',
      gracePeriod: this.isInGracePeriod(),
      offlineMode: true,
    };
  }

  /**
   * Check if we should use cached validation result
   */
  shouldUseCachedResult() {
    if (!this.lastValidation || !this.lastValidationTime) {
      return false;
    }

    const hoursSinceLastCheck = (new Date() - this.lastValidationTime) / (1000 * 60 * 60);
    return hoursSinceLastCheck < this.checkIntervalHours;
  }

  /**
   * Check if we're in grace period
   */
  isInGracePeriod() {
    if (!this.lastValidation || !this.lastValidation.isValid || !this.lastValidationTime) {
      return false;
    }

    const daysSinceLastValid = (new Date() - this.lastValidationTime) / (1000 * 60 * 60 * 24);
    return daysSinceLastValid <= this.gracePeriodDays;
  }

  /**
   * Get features that the application wants to check
   */
  getRequestedFeatures() {
    return [
      'workflows',
      'integrations',
      'api_access',
      'advanced_auth',
      'custom_branding',
      'priority_support',
    ];
  }

  /**
   * Send heartbeat to license server
   */
  async sendHeartbeat() {
    try {
      await axios.post(
        `${this.licenseServerUrl}/api/validation/heartbeat`,
        {
          licenseKey: this.licenseKey,
          deploymentId: this.deploymentId,
          instanceUrl: this.instanceUrl,
          version: this.version,
          stats: this.getUsageStats(),
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `Nectar-Customer-App/${this.version}`,
          },
        }
      );

      logger.debug('Heartbeat sent successfully');
    } catch (error) {
      logger.warn('Heartbeat failed', { error: error.message });
    }
  }

  /**
   * Get basic usage statistics for heartbeat
   */
  getUsageStats() {
    // This would collect real usage stats from your application
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Start periodic license validation
   */
  startPeriodicValidation() {
    const intervalMs = this.checkIntervalHours * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        await this.validateLicense(true); // Force check
      } catch (error) {
        logger.error('Periodic license validation failed', { error: error.message });
      }
    }, intervalMs);

    logger.info('Periodic license validation started', {
      intervalHours: this.checkIntervalHours,
    });
  }

  /**
   * Check if a specific feature is enabled
   * @param {string} feature - Feature name to check
   * @returns {Promise<boolean>} Whether feature is enabled
   */
  async isFeatureEnabled(feature) {
    const validation = await this.validateLicense();

    if (!validation.isValid && !validation.gracePeriod) {
      return false;
    }

    // During grace period, allow basic features
    if (validation.gracePeriod) {
      const basicFeatures = ['workflows', 'api_access'];
      return basicFeatures.includes(feature);
    }

    return validation.permissions?.features?.[feature]?.enabled || false;
  }

  /**
   * Check usage limits
   * @param {string} limitType - Type of limit (users, workflows, integrations)
   * @param {number} currentValue - Current usage value
   * @returns {Promise<boolean>} Whether usage is within limits
   */
  async isWithinUsageLimit(limitType, currentValue) {
    const validation = await this.validateLicense();

    if (!validation.isValid && !validation.gracePeriod) {
      return false;
    }

    // During grace period, allow reasonable usage
    if (validation.gracePeriod) {
      const graceLimits = { users: 5, workflows: 10, integrations: 3 };
      return currentValue <= (graceLimits[limitType] || 1);
    }

    const limit = validation.permissions?.limits?.[limitType];
    if (!limit) return true; // No limit defined

    return limit.unlimited || currentValue <= limit.max;
  }
}

// Create global license validator instance
const licenseValidator = new LicenseValidator();

/**
 * Express middleware for license validation
 */
const requireValidLicense = async (req, res, next) => {
  try {
    const validation = await licenseValidator.validateLicense();

    if (!validation.isValid && !validation.gracePeriod) {
      return res.status(402).json({
        error: 'License Required',
        message: validation.message,
        code: validation.error,
        contact: 'support@nectarstudio.ai',
      });
    }

    // Attach license info to request
    req.license = validation;

    // Add warning headers for grace period or offline mode
    if (validation.gracePeriod) {
      res.set('X-License-Warning', 'Operating in grace period');
    }

    if (validation.offlineMode) {
      res.set('X-License-Warning', 'Operating in offline mode');
      if (validation.daysRemaining !== undefined) {
        res.set('X-License-Days-Remaining', validation.daysRemaining.toString());
      }
    }

    next();
  } catch (error) {
    logger.error('License middleware error', { error: error.message });
    res.status(500).json({
      error: 'License validation system error',
      message: 'Please contact support if this persists',
    });
  }
};

/**
 * Middleware to require specific feature
 */
const requireFeature = feature => {
  return async (req, res, next) => {
    try {
      const isEnabled = await licenseValidator.isFeatureEnabled(feature);

      if (!isEnabled) {
        return res.status(402).json({
          error: 'Feature Not Available',
          message: `This feature (${feature}) is not available in your current license`,
          feature,
          upgrade: 'Contact support@nectarstudio.ai to upgrade your license',
        });
      }

      next();
    } catch (error) {
      logger.error('Feature check error', { error: error.message, feature });
      res.status(500).json({
        error: 'Feature validation error',
      });
    }
  };
};

/**
 * Middleware to check usage limits
 */
const checkUsageLimit = (limitType, getCurrentValue) => {
  return async (req, res, next) => {
    try {
      const currentValue =
        typeof getCurrentValue === 'function' ? await getCurrentValue(req) : getCurrentValue;

      const isWithinLimit = await licenseValidator.isWithinUsageLimit(limitType, currentValue);

      if (!isWithinLimit) {
        return res.status(402).json({
          error: 'Usage Limit Exceeded',
          message: `You have exceeded the ${limitType} limit for your current license`,
          limitType,
          currentValue,
          upgrade: 'Contact support@nectarstudio.ai to upgrade your license',
        });
      }

      next();
    } catch (error) {
      logger.error('Usage limit check error', { error: error.message, limitType });
      res.status(500).json({
        error: 'Usage limit validation error',
      });
    }
  };
};

module.exports = {
  licenseValidator,
  requireValidLicense,
  requireFeature,
  checkUsageLimit,
};
