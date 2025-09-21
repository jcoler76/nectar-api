import { Request, Response } from 'express';
import { body, validationResult, query, param } from 'express-validator';

// License Server Configuration
const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'http://localhost:6000';

// Validate required LICENSE_ADMIN_KEY - fail fast if not configured
if (!process.env.LICENSE_ADMIN_KEY) {
  throw new Error('LICENSE_ADMIN_KEY environment variable is required for license server communication');
}
const LICENSE_ADMIN_KEY = process.env.LICENSE_ADMIN_KEY;

interface LicenseServerResponse {
  success: boolean;
  data?: any;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class LicenseController {
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<LicenseServerResponse> {
    const url = `${LICENSE_SERVER_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': LICENSE_ADMIN_KEY,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`License server error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as LicenseServerResponse;
    } catch (error) {
      console.error('License server request failed:', error);
      throw new Error('Failed to communicate with license server');
    }
  }

  // GET /api/licenses - Get licenses with filtering and pagination
  async getLicenses(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const queryParams = new URLSearchParams();
      const allowedParams = ['page', 'limit', 'customerId', 'plan', 'licenseType', 'isActive', 'isSuspended', 'search'];

      allowedParams.forEach(param => {
        if (req.query[param] !== undefined) {
          queryParams.append(param, req.query[param] as string);
        }
      });

      const result = await this.makeRequest(`/api/licenses?${queryParams}`);

      res.json({
        success: true,
        licenses: result.data || [],
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error fetching licenses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch licenses',
      });
    }
  }

  // GET /api/licenses/:id - Get single license
  async getLicense(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const result = await this.makeRequest(`/api/licenses/${id}`);

      res.json({
        success: true,
        license: result.data,
      });
    } catch (error) {
      console.error('Error fetching license:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch license',
      });
    }
  }

  // POST /api/licenses - Create new license
  async createLicense(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const licenseData = req.body;
      const result = await this.makeRequest('/api/licenses', {
        method: 'POST',
        body: JSON.stringify(licenseData),
      });

      res.status(201).json({
        success: true,
        license: result.data,
      });
    } catch (error) {
      console.error('Error creating license:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create license',
      });
    }
  }

  // PUT /api/licenses/:id - Update license
  async updateLicense(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;

      const result = await this.makeRequest(`/api/licenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      res.json({
        success: true,
        license: result.data,
      });
    } catch (error) {
      console.error('Error updating license:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update license',
      });
    }
  }

  // POST /api/licenses/:id/suspend - Suspend license
  async suspendLicense(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { reason } = req.body;

      const result = await this.makeRequest(`/api/licenses/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      res.json({
        success: true,
        message: 'License suspended successfully',
      });
    } catch (error) {
      console.error('Error suspending license:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suspend license',
      });
    }
  }

  // POST /api/licenses/:id/reactivate - Reactivate license
  async reactivateLicense(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      const result = await this.makeRequest(`/api/licenses/${id}/reactivate`, {
        method: 'POST',
      });

      res.json({
        success: true,
        message: 'License reactivated successfully',
      });
    } catch (error) {
      console.error('Error reactivating license:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate license',
      });
    }
  }

  // GET /api/customers - Get customers
  async getCustomers(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const queryParams = new URLSearchParams();
      const allowedParams = ['page', 'limit', 'search'];

      allowedParams.forEach(param => {
        if (req.query[param] !== undefined) {
          queryParams.append(param, req.query[param] as string);
        }
      });

      const result = await this.makeRequest(`/api/customers?${queryParams}`);

      res.json({
        success: true,
        customers: result.data || [],
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customers',
      });
    }
  }

  // GET /api/customers/:id - Get single customer
  async getCustomer(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const result = await this.makeRequest(`/api/customers/${id}`);

      res.json({
        success: true,
        customer: result.data,
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer',
      });
    }
  }

  // POST /api/customers - Create customer
  async createCustomer(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const customerData = req.body;
      const result = await this.makeRequest('/api/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });

      res.status(201).json({
        success: true,
        customer: result.data,
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create customer',
      });
    }
  }

  // GET /api/admin/dashboard - Get dashboard stats
  async getDashboardStats(req: Request, res: Response) {
    try {
      const result = await this.makeRequest('/api/admin/dashboard');

      res.json({
        success: true,
        stats: result.data,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard stats',
      });
    }
  }

  // GET /api/admin/health - Get system health
  async getSystemHealth(req: Request, res: Response) {
    try {
      const result = await this.makeRequest('/api/admin/health');

      res.json({
        success: true,
        health: result.data,
      });
    } catch (error) {
      console.error('Error fetching system health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system health',
      });
    }
  }

  // GET /api/usage/license/:id - Get license usage
  async getLicenseUsage(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const queryParams = new URLSearchParams();
      const allowedParams = ['startDate', 'endDate', 'granularity'];

      allowedParams.forEach(param => {
        if (req.query[param] !== undefined) {
          queryParams.append(param, req.query[param] as string);
        }
      });

      const result = await this.makeRequest(`/api/usage/license/${id}?${queryParams}`);

      res.json({
        success: true,
        usage: result.data,
      });
    } catch (error) {
      console.error('Error fetching license usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch license usage',
      });
    }
  }

  // GET /api/usage/customer/:id - Get customer usage
  async getCustomerUsage(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const queryParams = new URLSearchParams();
      const allowedParams = ['startDate', 'endDate'];

      allowedParams.forEach(param => {
        if (req.query[param] !== undefined) {
          queryParams.append(param, req.query[param] as string);
        }
      });

      const result = await this.makeRequest(`/api/usage/customer/${id}?${queryParams}`);

      res.json({
        success: true,
        usage: result.data,
      });
    } catch (error) {
      console.error('Error fetching customer usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer usage',
      });
    }
  }
}

// Validation middlewares
export const validateLicenseQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('plan').optional().isIn(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid plan'),
  query('licenseType').optional().isIn(['TRIAL', 'STANDARD', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid license type'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('isSuspended').optional().isBoolean().withMessage('isSuspended must be boolean'),
  query('search').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Search must be 1-100 characters'),
];

export const validateLicenseId = [
  param('id').isUUID().withMessage('License ID must be a valid UUID'),
];

export const validateCustomerId = [
  param('id').isUUID().withMessage('Customer ID must be a valid UUID'),
];

export const validateLicenseCreate = [
  body('customerId').isUUID().withMessage('Customer ID must be a valid UUID'),
  body('plan').isIn(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid plan'),
  body('licenseType').isIn(['TRIAL', 'STANDARD', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid license type'),
  body('features').optional().isArray().withMessage('Features must be an array'),
  body('maxUsers').optional().isInt({ min: 1 }).withMessage('Max users must be positive'),
  body('maxWorkflows').optional().isInt({ min: 1 }).withMessage('Max workflows must be positive'),
  body('maxIntegrations').optional().isInt({ min: 1 }).withMessage('Max integrations must be positive'),
  body('expiresAt').optional().isISO8601().withMessage('Expires at must be valid date'),
  body('billingCycle').optional().isIn(['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME']).withMessage('Invalid billing cycle'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
];

export const validateLicenseUpdate = [
  param('id').isUUID().withMessage('License ID must be a valid UUID'),
  body('plan').optional().isIn(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid plan'),
  body('features').optional().isArray().withMessage('Features must be an array'),
  body('maxUsers').optional().isInt({ min: 1 }).withMessage('Max users must be positive'),
  body('maxWorkflows').optional().isInt({ min: 1 }).withMessage('Max workflows must be positive'),
  body('maxIntegrations').optional().isInt({ min: 1 }).withMessage('Max integrations must be positive'),
  body('expiresAt').optional().isISO8601().withMessage('Expires at must be valid date'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

export const validateCustomerCreate = [
  body('email').isEmail().withMessage('Valid email required'),
  body('companyName').optional().isString().isLength({ min: 1, max: 200 }).withMessage('Company name must be 1-200 characters'),
  body('contactName').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Contact name must be 1-100 characters'),
  body('phone').optional().isString().isLength({ min: 1, max: 50 }).withMessage('Phone must be 1-50 characters'),
  body('address').optional().isString().isLength({ min: 1, max: 500 }).withMessage('Address must be 1-500 characters'),
  body('country').optional().isString().isLength({ min: 2, max: 2 }).withMessage('Country must be 2 characters'),
  body('stripeCustomerId').optional().isString().withMessage('Stripe customer ID must be string'),
];

export const validateSuspendLicense = [
  param('id').isUUID().withMessage('License ID must be a valid UUID'),
  body('reason').optional().isString().isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters'),
];

export const licenseController = new LicenseController();