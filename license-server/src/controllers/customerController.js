const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { PrismaClient } = require('../../prisma/generated/client');
const { authenticateApiKey, requirePermissions } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Create customer
 * POST /api/customers
 */
router.post('/',
  authenticateApiKey,
  requirePermissions(['customer:create']),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('companyName').optional().isString().withMessage('Company name must be a string'),
    body('contactName').optional().isString().withMessage('Contact name must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('stripeCustomerId').optional().isString().withMessage('Stripe customer ID must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const customer = await prisma.customer.create({
        data: req.body
      });

      res.status(201).json({
        success: true,
        customer
      });
    } catch (error) {
      console.error('Customer creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create customer'
      });
    }
  }
);

/**
 * Get customer by ID
 * GET /api/customers/:id
 */
router.get('/:id',
  authenticateApiKey,
  requirePermissions(['customer:read']),
  async (req, res) => {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
        include: {
          licenses: true,
          _count: {
            select: {
              licenses: true,
              usageRecords: true
            }
          }
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      res.json({
        success: true,
        customer
      });
    } catch (error) {
      console.error('Customer retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve customer'
      });
    }
  }
);

module.exports = router;