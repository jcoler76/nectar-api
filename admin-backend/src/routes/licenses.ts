import { Router } from 'express'
import {
  licenseController,
  validateLicenseQuery,
  validateLicenseId,
  validateCustomerId,
  validateLicenseCreate,
  validateLicenseUpdate,
  validateCustomerCreate,
  validateSuspendLicense,
} from '../controllers/licenseController'
import { authenticateAdmin } from '@/middleware/adminAuth'

const router = Router()

// Apply admin authentication to all routes
router.use(authenticateAdmin)

// License Management Routes
router.get('/licenses', validateLicenseQuery, licenseController.getLicenses.bind(licenseController))
router.get('/licenses/:id', validateLicenseId, licenseController.getLicense.bind(licenseController))
router.post('/licenses', validateLicenseCreate, licenseController.createLicense.bind(licenseController))
router.put('/licenses/:id', validateLicenseUpdate, licenseController.updateLicense.bind(licenseController))
router.post('/licenses/:id/suspend', validateSuspendLicense, licenseController.suspendLicense.bind(licenseController))
router.post('/licenses/:id/reactivate', validateLicenseId, licenseController.reactivateLicense.bind(licenseController))

// Customer Management Routes
router.get('/customers', licenseController.getCustomers.bind(licenseController))
router.get('/customers/:id', validateCustomerId, licenseController.getCustomer.bind(licenseController))
router.post('/customers', validateCustomerCreate, licenseController.createCustomer.bind(licenseController))

// Admin Dashboard Routes
router.get('/admin/dashboard', licenseController.getDashboardStats.bind(licenseController))
router.get('/admin/health', licenseController.getSystemHealth.bind(licenseController))

// Usage Analytics Routes
router.get('/usage/license/:id', validateLicenseId, licenseController.getLicenseUsage.bind(licenseController))
router.get('/usage/customer/:id', validateCustomerId, licenseController.getCustomerUsage.bind(licenseController))

export default router
