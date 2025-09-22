import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { AdminAuthService } from '@/services/adminAuth'
import { AdminAuditLogger } from '@/services/auditService'
import { LoginCredentials, AuthRequest } from '@/types/auth'

export class AuthController {
  /**
   * Admin login endpoint
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        })
        return
      }

      const { email, password }: LoginCredentials = req.body

      // Validate credentials
      const admin = await AdminAuthService.validateAdmin(email, password)
      
      if (!admin) {
        // Log failed login attempt
        await AdminAuditLogger.log({
          action: 'failed_login',
          details: { email, reason: 'invalid_credentials' },
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent'),
        })
        
        res.status(401).json({ 
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        })
        return
      }

      // Generate JWT tokens
      const sessionToken = AdminAuthService.generateToken(admin)
      const apiToken = AdminAuthService.generateApiToken(admin)

      // Set secure httpOnly cookie for session management
      res.cookie('adminToken', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      })

      // Log successful login
      await AdminAuditLogger.log({
        userId: admin.id,
        action: 'login',
        details: { loginMethod: 'password' },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent'),
      })

      res.json({
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          lastLoginAt: admin.lastLoginAt,
        },
        // Include API token for GraphQL requests
        apiToken: apiToken,
      })
    } catch (error) {
      // Log error internally without exposing details
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Admin logout endpoint
   */
  static async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.admin) {
        await AdminAuditLogger.log({
          userId: req.admin.id,
          action: 'logout',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent'),
        })
      }

      // Clear the httpOnly cookie
      res.clearCookie('adminToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      })

      res.json({
        success: true,
        message: 'Logged out successfully'
      })
    } catch (error) {
      // Log error internally without exposing details
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Get current admin profile
   */
  static async profile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const admin = req.admin
      
      if (!admin) {
        res.status(401).json({ 
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        })
        return
      }

      // Generate API token for GraphQL requests if user is authenticated
      const apiToken = AdminAuthService.generateApiToken(admin)

      res.json({
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          isActive: admin.isActive,
          lastLoginAt: admin.lastLoginAt,
          createdAt: admin.createdAt,
        },
        // Include API token for GraphQL requests
        apiToken: apiToken,
      })
    } catch (error) {
      // Log error internally without exposing details
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Change password endpoint
   */
  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        })
        return
      }

      const { currentPassword, newPassword } = req.body
      const admin = req.admin

      if (!admin) {
        res.status(401).json({ 
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        })
        return
      }

      // Verify current password
      const isValidCurrentPassword = await AdminAuthService.validateAdmin(
        admin.email, 
        currentPassword
      )

      if (!isValidCurrentPassword) {
        await AdminAuditLogger.log({
          userId: admin.id,
          action: 'failed_password_change',
          details: { reason: 'invalid_current_password' },
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent'),
        })

        res.status(400).json({ 
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD'
        })
        return
      }

      // Change password
      const success = await AdminAuthService.changePassword(admin.id, newPassword)

      if (!success) {
        res.status(500).json({ 
          error: 'Failed to change password',
          code: 'PASSWORD_CHANGE_FAILED'
        })
        return
      }

      // Log password change
      await AdminAuditLogger.log({
        userId: admin.id,
        action: 'password_changed',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent'),
      })

      res.json({
        success: true,
        message: 'Password changed successfully',
      })
    } catch (error) {
      // Log error internally without exposing details
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Validation rules for login
   */
  static loginValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ]

  /**
   * Validation rules for password change
   */
  static changePasswordValidation = [
    body('currentPassword')
      .isLength({ min: 1 })
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must be at least 8 characters long and contain uppercase, lowercase, and number'),
  ]
}