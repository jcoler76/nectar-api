"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const licenseController_1 = require("../controllers/licenseController");
const adminAuth_1 = require("@/middleware/adminAuth");
const router = (0, express_1.Router)();
// Apply admin authentication to all routes
router.use(adminAuth_1.authenticateAdmin);
// License Management Routes
router.get('/licenses', licenseController_1.validateLicenseQuery, licenseController_1.licenseController.getLicenses.bind(licenseController_1.licenseController));
router.get('/licenses/:id', licenseController_1.validateLicenseId, licenseController_1.licenseController.getLicense.bind(licenseController_1.licenseController));
router.post('/licenses', licenseController_1.validateLicenseCreate, licenseController_1.licenseController.createLicense.bind(licenseController_1.licenseController));
router.put('/licenses/:id', licenseController_1.validateLicenseUpdate, licenseController_1.licenseController.updateLicense.bind(licenseController_1.licenseController));
router.post('/licenses/:id/suspend', licenseController_1.validateSuspendLicense, licenseController_1.licenseController.suspendLicense.bind(licenseController_1.licenseController));
router.post('/licenses/:id/reactivate', licenseController_1.validateLicenseId, licenseController_1.licenseController.reactivateLicense.bind(licenseController_1.licenseController));
// Customer Management Routes
router.get('/customers', licenseController_1.licenseController.getCustomers.bind(licenseController_1.licenseController));
router.get('/customers/:id', licenseController_1.validateCustomerId, licenseController_1.licenseController.getCustomer.bind(licenseController_1.licenseController));
router.post('/customers', licenseController_1.validateCustomerCreate, licenseController_1.licenseController.createCustomer.bind(licenseController_1.licenseController));
// Admin Dashboard Routes
router.get('/admin/dashboard', licenseController_1.licenseController.getDashboardStats.bind(licenseController_1.licenseController));
router.get('/admin/health', licenseController_1.licenseController.getSystemHealth.bind(licenseController_1.licenseController));
// Usage Analytics Routes
router.get('/usage/license/:id', licenseController_1.validateLicenseId, licenseController_1.licenseController.getLicenseUsage.bind(licenseController_1.licenseController));
router.get('/usage/customer/:id', licenseController_1.validateCustomerId, licenseController_1.licenseController.getCustomerUsage.bind(licenseController_1.licenseController));
exports.default = router;
//# sourceMappingURL=licenses.js.map