"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.licenseController = exports.validateSuspendLicense = exports.validateCustomerCreate = exports.validateLicenseUpdate = exports.validateLicenseCreate = exports.validateCustomerId = exports.validateLicenseId = exports.validateLicenseQuery = void 0;
const express_validator_1 = require("express-validator");
// License Server Configuration
const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'http://localhost:6000';
const LICENSE_ADMIN_KEY = process.env.LICENSE_ADMIN_KEY || '';
class LicenseController {
    async makeRequest(endpoint, options = {}) {
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
            return await response.json();
        }
        catch (error) {
            console.error('License server request failed:', error);
            throw new Error('Failed to communicate with license server');
        }
    }
    // GET /api/licenses - Get licenses with filtering and pagination
    async getLicenses(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const queryParams = new URLSearchParams();
            const allowedParams = ['page', 'limit', 'customerId', 'plan', 'licenseType', 'isActive', 'isSuspended', 'search'];
            allowedParams.forEach(param => {
                if (req.query[param] !== undefined) {
                    queryParams.append(param, req.query[param]);
                }
            });
            const result = await this.makeRequest(`/api/licenses?${queryParams}`);
            res.json({
                success: true,
                licenses: result.data || [],
                pagination: result.pagination,
            });
        }
        catch (error) {
            console.error('Error fetching licenses:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch licenses',
            });
        }
    }
    // GET /api/licenses/:id - Get single license
    async getLicense(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const { id } = req.params;
            const result = await this.makeRequest(`/api/licenses/${id}`);
            res.json({
                success: true,
                license: result.data,
            });
        }
        catch (error) {
            console.error('Error fetching license:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch license',
            });
        }
    }
    // POST /api/licenses - Create new license
    async createLicense(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
        }
        catch (error) {
            console.error('Error creating license:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create license',
            });
        }
    }
    // PUT /api/licenses/:id - Update license
    async updateLicense(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
        }
        catch (error) {
            console.error('Error updating license:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update license',
            });
        }
    }
    // POST /api/licenses/:id/suspend - Suspend license
    async suspendLicense(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
        }
        catch (error) {
            console.error('Error suspending license:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to suspend license',
            });
        }
    }
    // POST /api/licenses/:id/reactivate - Reactivate license
    async reactivateLicense(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
        }
        catch (error) {
            console.error('Error reactivating license:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to reactivate license',
            });
        }
    }
    // GET /api/customers - Get customers
    async getCustomers(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const queryParams = new URLSearchParams();
            const allowedParams = ['page', 'limit', 'search'];
            allowedParams.forEach(param => {
                if (req.query[param] !== undefined) {
                    queryParams.append(param, req.query[param]);
                }
            });
            const result = await this.makeRequest(`/api/customers?${queryParams}`);
            res.json({
                success: true,
                customers: result.data || [],
                pagination: result.pagination,
            });
        }
        catch (error) {
            console.error('Error fetching customers:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch customers',
            });
        }
    }
    // GET /api/customers/:id - Get single customer
    async getCustomer(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const { id } = req.params;
            const result = await this.makeRequest(`/api/customers/${id}`);
            res.json({
                success: true,
                customer: result.data,
            });
        }
        catch (error) {
            console.error('Error fetching customer:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch customer',
            });
        }
    }
    // POST /api/customers - Create customer
    async createCustomer(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
        }
        catch (error) {
            console.error('Error creating customer:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create customer',
            });
        }
    }
    // GET /api/admin/dashboard - Get dashboard stats
    async getDashboardStats(req, res) {
        try {
            const result = await this.makeRequest('/api/admin/dashboard');
            res.json({
                success: true,
                stats: result.data,
            });
        }
        catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch dashboard stats',
            });
        }
    }
    // GET /api/admin/health - Get system health
    async getSystemHealth(req, res) {
        try {
            const result = await this.makeRequest('/api/admin/health');
            res.json({
                success: true,
                health: result.data,
            });
        }
        catch (error) {
            console.error('Error fetching system health:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch system health',
            });
        }
    }
    // GET /api/usage/license/:id - Get license usage
    async getLicenseUsage(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const { id } = req.params;
            const queryParams = new URLSearchParams();
            const allowedParams = ['startDate', 'endDate', 'granularity'];
            allowedParams.forEach(param => {
                if (req.query[param] !== undefined) {
                    queryParams.append(param, req.query[param]);
                }
            });
            const result = await this.makeRequest(`/api/usage/license/${id}?${queryParams}`);
            res.json({
                success: true,
                usage: result.data,
            });
        }
        catch (error) {
            console.error('Error fetching license usage:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch license usage',
            });
        }
    }
    // GET /api/usage/customer/:id - Get customer usage
    async getCustomerUsage(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const { id } = req.params;
            const queryParams = new URLSearchParams();
            const allowedParams = ['startDate', 'endDate'];
            allowedParams.forEach(param => {
                if (req.query[param] !== undefined) {
                    queryParams.append(param, req.query[param]);
                }
            });
            const result = await this.makeRequest(`/api/usage/customer/${id}?${queryParams}`);
            res.json({
                success: true,
                usage: result.data,
            });
        }
        catch (error) {
            console.error('Error fetching customer usage:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch customer usage',
            });
        }
    }
}
// Validation middlewares
exports.validateLicenseQuery = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('plan').optional().isIn(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid plan'),
    (0, express_validator_1.query)('licenseType').optional().isIn(['TRIAL', 'STANDARD', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid license type'),
    (0, express_validator_1.query)('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    (0, express_validator_1.query)('isSuspended').optional().isBoolean().withMessage('isSuspended must be boolean'),
    (0, express_validator_1.query)('search').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Search must be 1-100 characters'),
];
exports.validateLicenseId = [
    (0, express_validator_1.param)('id').isUUID().withMessage('License ID must be a valid UUID'),
];
exports.validateCustomerId = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Customer ID must be a valid UUID'),
];
exports.validateLicenseCreate = [
    (0, express_validator_1.body)('customerId').isUUID().withMessage('Customer ID must be a valid UUID'),
    (0, express_validator_1.body)('plan').isIn(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid plan'),
    (0, express_validator_1.body)('licenseType').isIn(['TRIAL', 'STANDARD', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid license type'),
    (0, express_validator_1.body)('features').optional().isArray().withMessage('Features must be an array'),
    (0, express_validator_1.body)('maxUsers').optional().isInt({ min: 1 }).withMessage('Max users must be positive'),
    (0, express_validator_1.body)('maxWorkflows').optional().isInt({ min: 1 }).withMessage('Max workflows must be positive'),
    (0, express_validator_1.body)('maxIntegrations').optional().isInt({ min: 1 }).withMessage('Max integrations must be positive'),
    (0, express_validator_1.body)('expiresAt').optional().isISO8601().withMessage('Expires at must be valid date'),
    (0, express_validator_1.body)('billingCycle').optional().isIn(['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME']).withMessage('Invalid billing cycle'),
    (0, express_validator_1.body)('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive'),
    (0, express_validator_1.body)('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
];
exports.validateLicenseUpdate = [
    (0, express_validator_1.param)('id').isUUID().withMessage('License ID must be a valid UUID'),
    (0, express_validator_1.body)('plan').optional().isIn(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']).withMessage('Invalid plan'),
    (0, express_validator_1.body)('features').optional().isArray().withMessage('Features must be an array'),
    (0, express_validator_1.body)('maxUsers').optional().isInt({ min: 1 }).withMessage('Max users must be positive'),
    (0, express_validator_1.body)('maxWorkflows').optional().isInt({ min: 1 }).withMessage('Max workflows must be positive'),
    (0, express_validator_1.body)('maxIntegrations').optional().isInt({ min: 1 }).withMessage('Max integrations must be positive'),
    (0, express_validator_1.body)('expiresAt').optional().isISO8601().withMessage('Expires at must be valid date'),
    (0, express_validator_1.body)('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];
exports.validateCustomerCreate = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('companyName').optional().isString().isLength({ min: 1, max: 200 }).withMessage('Company name must be 1-200 characters'),
    (0, express_validator_1.body)('contactName').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Contact name must be 1-100 characters'),
    (0, express_validator_1.body)('phone').optional().isString().isLength({ min: 1, max: 50 }).withMessage('Phone must be 1-50 characters'),
    (0, express_validator_1.body)('address').optional().isString().isLength({ min: 1, max: 500 }).withMessage('Address must be 1-500 characters'),
    (0, express_validator_1.body)('country').optional().isString().isLength({ min: 2, max: 2 }).withMessage('Country must be 2 characters'),
    (0, express_validator_1.body)('stripeCustomerId').optional().isString().withMessage('Stripe customer ID must be string'),
];
exports.validateSuspendLicense = [
    (0, express_validator_1.param)('id').isUUID().withMessage('License ID must be a valid UUID'),
    (0, express_validator_1.body)('reason').optional().isString().isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters'),
];
exports.licenseController = new LicenseController();
//# sourceMappingURL=licenseController.js.map