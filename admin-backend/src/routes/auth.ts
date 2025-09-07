import { Router } from 'express'
import { AuthController } from '@/controllers/authController'
import { authenticateAdmin, auditAction } from '@/middleware/adminAuth'

const router = Router()

/**
 * @route POST /api/auth/login
 * @desc Admin login
 * @access Public
 */
router.post(
  '/login',
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
  AuthController.changePasswordValidation,
  auditAction('change_password'),
  AuthController.changePassword
)

export default router