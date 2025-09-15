const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { PrismaClient } = require('../../prisma/generated/client');
const LicenseService = require('../services/licenseService');
const { authenticateApiKey, requirePermissions } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const licenseService = new LicenseService();

/**
 * Create a new license
 * POST /api/licenses
 */
router.post('/',
  authenticateApiKey,
  requirePermissions(['license:create']),
  [
    body('customerId').isString().notEmpty().withMessage('Customer ID is required'),
    body('plan').isIn(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid plan'),
    body('licenseType').isIn(['TRIAL', 'STANDARD', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid license type'),
    body('features').optional().isArray().withMessage('Features must be an array'),
    body('maxUsers').optional().isInt({ min: 1 }).withMessage('Max users must be a positive integer'),
    body('maxWorkflows').optional().isInt({ min: 1 }).withMessage('Max workflows must be a positive integer'),
    body('maxIntegrations').optional().isInt({ min: 1 }).withMessage('Max integrations must be a positive integer'),
    body('expiresAt').optional().isISO8601().withMessage('Expires at must be a valid date'),
    body('billingCycle').optional().isIn(['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME']).withMessage('Invalid billing cycle'),
    body('amount').optional().isDecimal().withMessage('Amount must be a valid decimal'),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    body('deploymentId').optional().isString().withMessage('Deployment ID must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const licenseData = {
        ...req.body,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null
      };

      const license = await licenseService.createLicense(licenseData);

      res.status(201).json({
        success: true,
        license: {
          id: license.id,
          licenseKey: license.licenseKey,
          customerId: license.customerId,
          plan: license.plan,
          licenseType: license.licenseType,
          features: license.features,
          maxUsers: license.maxUsers,
          maxWorkflows: license.maxWorkflows,
          maxIntegrations: license.maxIntegrations,
          issuedAt: license.issuedAt,
          expiresAt: license.expiresAt,
          deploymentId: license.deploymentId,
          isActive: license.isActive,
          isSuspended: license.isSuspended
        }
      });

    } catch (error) {
      console.error('License creation error:', error);
      res.status(500).json({
        error: 'Failed to create license',
        message: error.message
      });
    }
  }
);

/**
 * Get license by ID
 * GET /api/licenses/:id
 */
router.get('/:id',
  authenticateApiKey,
  requirePermissions(['license:read']),
  [
    param('id').isString().notEmpty().withMessage('License ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const usage = await licenseService.getLicenseUsage(id);

      if (!usage.license) {
        return res.status(404).json({
          error: 'License not found'
        });
      }

      res.json({
        success: true,
        license: usage.license,
        usage: usage.usage
      });

    } catch (error) {
      console.error('License retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve license',
        message: error.message
      });
    }
  }
);

/**
 * Update license
 * PUT /api/licenses/:id
 */
router.put('/:id',
  authenticateApiKey,
  requirePermissions(['license:update']),
  [
    param('id').isString().notEmpty().withMessage('License ID is required'),
    body('plan').optional().isIn(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid plan'),
    body('features').optional().isArray().withMessage('Features must be an array'),
    body('maxUsers').optional().isInt({ min: 1 }).withMessage('Max users must be a positive integer'),
    body('maxWorkflows').optional().isInt({ min: 1 }).withMessage('Max workflows must be a positive integer'),
    body('maxIntegrations').optional().isInt({ min: 1 }).withMessage('Max integrations must be a positive integer'),
    body('expiresAt').optional().isISO8601().withMessage('Expires at must be a valid date'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = { ...req.body };

      if (updateData.expiresAt) {
        updateData.expiresAt = new Date(updateData.expiresAt);
      }

      const updatedLicense = await prisma.license.update({
        where: { id },
        data: updateData,
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

      res.json({
        success: true,
        license: updatedLicense
      });

    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          error: 'License not found'
        });
      }

      console.error('License update error:', error);
      res.status(500).json({
        error: 'Failed to update license',
        message: error.message
      });
    }
  }
);

/**
 * Suspend license
 * POST /api/licenses/:id/suspend
 */
router.post('/:id/suspend',
  authenticateApiKey,
  requirePermissions(['license:suspend']),
  [
    param('id').isString().notEmpty().withMessage('License ID is required'),
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { reason } = req.body;

      const license = await licenseService.suspendLicense(id, reason);

      res.json({
        success: true,
        message: 'License suspended successfully',
        license: {
          id: license.id,
          isSuspended: license.isSuspended,
          isActive: license.isActive
        }
      });

    } catch (error) {
      console.error('License suspension error:', error);
      res.status(500).json({
        error: 'Failed to suspend license',
        message: error.message
      });
    }
  }
);

/**
 * Reactivate license
 * POST /api/licenses/:id/reactivate
 */
router.post('/:id/reactivate',
  authenticateApiKey,
  requirePermissions(['license:activate']),
  [
    param('id').isString().notEmpty().withMessage('License ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;

      const license = await licenseService.reactivateLicense(id);

      res.json({
        success: true,
        message: 'License reactivated successfully',
        license: {
          id: license.id,
          isSuspended: license.isSuspended,
          isActive: license.isActive
        }
      });

    } catch (error) {
      console.error('License reactivation error:', error);
      res.status(500).json({
        error: 'Failed to reactivate license',
        message: error.message
      });
    }
  }
);

/**
 * List licenses with filtering and pagination
 * GET /api/licenses
 */
router.get('/',
  authenticateApiKey,
  requirePermissions(['license:read']),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        customerId,
        plan,
        licenseType,
        isActive,
        isSuspended,
        search
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where = {};

      if (customerId) where.customerId = customerId;
      if (plan) where.plan = plan;
      if (licenseType) where.licenseType = licenseType;
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (isSuspended !== undefined) where.isSuspended = isSuspended === 'true';

      if (search) {
        where.OR = [
          { licenseKey: { contains: search, mode: 'insensitive' } },
          { deploymentId: { contains: search, mode: 'insensitive' } },
          { customer: { email: { contains: search, mode: 'insensitive' } } },
          { customer: { companyName: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const [licenses, total] = await Promise.all([
        prisma.license.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                email: true,
                companyName: true,
                isActive: true
              }
            }
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.license.count({ where })
      ]);

      res.json({
        success: true,
        licenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('License listing error:', error);
      res.status(500).json({
        error: 'Failed to list licenses',
        message: error.message
      });
    }
  }
);

module.exports = router;