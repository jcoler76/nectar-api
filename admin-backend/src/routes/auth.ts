import { Router } from 'express'
import { AuthController } from '@/controllers/authController'
import { authenticateAdmin, auditAction } from '@/middleware/adminAuth'
import { authRateLimiter, passwordChangeRateLimiter } from '@/middleware/rateLimiter'

const router = Router()

/**
 * @route POST /api/auth/login
 * @desc Admin login
 * @access Public
 */
router.post(
  '/login',
  authRateLimiter,
  AuthController.loginValidation,
  AuthController.login
)

/**
 * @route POST /api/auth/logout
 * @desc Admin logout
 * @access Private
 */
router.post(
  '/logout',
  authenticateAdmin,
  auditAction('logout'),
  AuthController.logout
)

/**
 * @route GET /api/auth/profile
 * @desc Get current admin profile
 * @access Private
 */
router.get(
  '/profile',
  authenticateAdmin,
  AuthController.profile
)

/**
 * @route PUT /api/auth/password
 * @desc Change admin password
 * @access Private
 */
router.put(
  '/password',
  authenticateAdmin,
  passwordChangeRateLimiter,
  AuthController.changePasswordValidation,
  auditAction('change_password'),
  AuthController.changePassword
)

export default router