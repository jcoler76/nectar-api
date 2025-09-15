const express = require('express');
const { body, validationResult } = require('express-validator');
const LicenseService = require('../services/licenseService');
const router = express.Router();

const licenseService = new LicenseService();

/**
 * Validate license key
 * POST /api/validation/validate
 * This is the main endpoint that customer applications will call
 */
router.post('/validate',
  [
    body('licenseKey').isString().notEmpty().withMessage('License key is required'),
    body('deploymentId').optional().isString().withMessage('Deployment ID must be a string'),
    body('instanceUrl').optional().isURL().withMessage('Instance URL must be a valid URL'),
    body('version').optional().isString().withMessage('Version must be a string'),
    body('features').optional().isArray().withMessage('Features must be an array')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: errors.array()
        });
      }

      const {
        licenseKey,
        deploymentId,
        instanceUrl,
        version,
        features = []
      } = req.body;

      // Get client information from request
      const deploymentInfo = {
        deploymentId,
        instanceUrl,
        version,
        clientIp: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      // Validate the license
      const validation = await licenseService.validateLicenseKey(licenseKey, deploymentInfo);

      if (!validation.isValid) {
        return res.status(401).json({
          success: false,
          isValid: false,
          error: validation.error,
          message: validation.message,
          timestamp: new Date().toISOString()
        });
      }

      // Check feature permissions if requested
      const enabledFeatures = validation.license.features || [];
      const featurePermissions = {};

      if (features.length > 0) {
        features.forEach(feature => {
          featurePermissions[feature] = enabledFeatures.includes(feature);
        });
      }

      // Calculate usage limits
      const usageLimits = {
        users: {
          max: validation.license.maxUsers,
          unlimited: validation.license.maxUsers === null
        },
        workflows: {
          max: validation.license.maxWorkflows,
          unlimited: validation.license.maxWorkflows === null
        },
        integrations: {
          max: validation.license.maxIntegrations,
          unlimited: validation.license.maxIntegrations === null
        }
      };

      // Return successful validation response
      res.json({
        success: true,
        isValid: true,
        license: {
          id: validation.license.id,
          plan: validation.license.plan,
          licenseType: validation.license.licenseType,
          issuedAt: validation.license.issuedAt,
          expiresAt: validation.license.expiresAt,
          billingCycle: validation.license.billingCycle
        },
        customer: {
          id: validation.customer.id,
          email: validation.customer.email,
          companyName: validation.customer.companyName
        },
        permissions: {
          features: featurePermissions,
          limits: usageLimits
        },
        timestamp: new Date().toISOString(),
        validUntil: validation.license.expiresAt || null
      });

    } catch (error) {
      console.error('License validation error:', error);

      // Log the validation failure
      await licenseService.logValidation(null, false, error.message, {
        clientIp: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(500).json({
        success: false,
        isValid: false,
        error: 'SYSTEM_ERROR',
        message: 'License validation system temporarily unavailable',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Quick license status check
 * GET /api/validation/status/:licenseKey
 * Lightweight endpoint for quick status checks
 */
router.get('/status/:licenseKey', async (req, res) => {
  try {
    const { licenseKey } = req.params;

    if (!licenseKey || !licenseKey.startsWith('NLS-')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FORMAT',
        message: 'Invalid license key format'
      });
    }

    const validation = await licenseService.validateLicenseKey(licenseKey, {
      clientIp: req.ip,
      userAgent: req.get('User-Agent')
    });

    const response = {
      success: true,
      isValid: validation.isValid,
      status: validation.isValid ? 'ACTIVE' : 'INVALID',
      timestamp: new Date().toISOString()
    };

    if (!validation.isValid) {
      response.error = validation.error;
      response.message = validation.message;
    } else {
      response.expiresAt = validation.license.expiresAt;
      response.plan = validation.license.plan;
    }

    res.json(response);

  } catch (error) {
    console.error('License status check error:', error);
    res.status(500).json({
      success: false,
      error: 'SYSTEM_ERROR',
      message: 'Status check temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Heartbeat endpoint for deployment monitoring
 * POST /api/validation/heartbeat
 */
router.post('/heartbeat',
  [
    body('licenseKey').isString().notEmpty().withMessage('License key is required'),
    body('deploymentId').optional().isString().withMessage('Deployment ID must be a string'),
    body('instanceUrl').optional().isURL().withMessage('Instance URL must be a valid URL'),
    body('version').optional().isString().withMessage('Version must be a string'),
    body('stats').optional().isObject().withMessage('Stats must be an object')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: errors.array()
        });
      }

      const {
        licenseKey,
        deploymentId,
        instanceUrl,
        version,
        stats = {}
      } = req.body;

      // Quick validation to ensure license exists and is active
      const validation = await licenseService.validateLicenseKey(licenseKey);

      if (!validation.isValid) {
        return res.status(401).json({
          success: false,
          error: validation.error,
          message: validation.message
        });
      }

      // Update deployment info with heartbeat
      await licenseService.updateDeploymentInfo(validation.license.id, {
        deploymentId,
        instanceUrl,
        version
      });

      // If stats are provided, you could record them for usage tracking
      // This would integrate with the usage tracking system

      res.json({
        success: true,
        message: 'Heartbeat recorded',
        timestamp: new Date().toISOString(),
        nextHeartbeat: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });

    } catch (error) {
      console.error('Heartbeat error:', error);
      res.status(500).json({
        success: false,
        error: 'SYSTEM_ERROR',
        message: 'Heartbeat recording failed',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Feature availability check
 * POST /api/validation/features
 */
router.post('/features',
  [
    body('licenseKey').isString().notEmpty().withMessage('License key is required'),
    body('features').isArray().notEmpty().withMessage('Features array is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: errors.array()
        });
      }

      const { licenseKey, features } = req.body;

      const validation = await licenseService.validateLicenseKey(licenseKey);

      if (!validation.isValid) {
        return res.status(401).json({
          success: false,
          error: validation.error,
          message: validation.message
        });
      }

      const enabledFeatures = validation.license.features || [];
      const featureStatus = {};

      features.forEach(feature => {
        featureStatus[feature] = {
          enabled: enabledFeatures.includes(feature),
          plan: validation.license.plan,
          licenseType: validation.license.licenseType
        };
      });

      res.json({
        success: true,
        features: featureStatus,
        license: {
          plan: validation.license.plan,
          licenseType: validation.license.licenseType
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({
        success: false,
        error: 'SYSTEM_ERROR',
        message: 'Feature check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
);

module.exports = router;