"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const express_validator_1 = require("express-validator");
const adminAuth_1 = require("@/services/adminAuth");
const auditService_1 = require("@/services/auditService");
class AuthController {
    /**
     * Admin login endpoint
     */
    static async login(req, res) {
        try {
            // Validate request
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
                return;
            }
            const { email, password } = req.body;
            // Validate credentials
            const admin = await adminAuth_1.AdminAuthService.validateAdmin(email, password);
            if (!admin) {
                // Log failed login attempt
                await auditService_1.AdminAuditLogger.log({
                    action: 'failed_login',
                    details: { email, reason: 'invalid_credentials' },
                    ipAddress: req.ip || 'unknown',
                    userAgent: req.get('User-Agent'),
                });
                res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
                return;
            }
            // Generate JWT token
            const token = adminAuth_1.AdminAuthService.generateToken(admin);
            // Log successful login
            await auditService_1.AdminAuditLogger.log({
                userId: admin.id,
                action: 'login',
                details: { loginMethod: 'password' },
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent'),
            });
            res.json({
                success: true,
                token,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    firstName: admin.firstName,
                    lastName: admin.lastName,
                    role: admin.role,
                    lastLoginAt: admin.lastLoginAt,
                },
            });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    /**
     * Admin logout endpoint
     */
    static async logout(req, res) {
        try {
            if (req.admin) {
                await auditService_1.AdminAuditLogger.log({
                    userId: req.admin.id,
                    action: 'logout',
                    ipAddress: req.ip || 'unknown',
                    userAgent: req.get('User-Agent'),
                });
            }
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        }
        catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    /**
     * Get current admin profile
     */
    static async profile(req, res) {
        try {
            const admin = req.admin;
            if (!admin) {
                res.status(401).json({
                    error: 'Not authenticated',
                    code: 'NOT_AUTHENTICATED'
                });
                return;
            }
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
            });
        }
        catch (error) {
            console.error('Profile error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    /**
     * Change password endpoint
     */
    static async changePassword(req, res) {
        try {
            // Validate request
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
                return;
            }
            const { currentPassword, newPassword } = req.body;
            const admin = req.admin;
            if (!admin) {
                res.status(401).json({
                    error: 'Not authenticated',
                    code: 'NOT_AUTHENTICATED'
                });
                return;
            }
            // Verify current password
            const isValidCurrentPassword = await adminAuth_1.AdminAuthService.validateAdmin(admin.email, currentPassword);
            if (!isValidCurrentPassword) {
                await auditService_1.AdminAuditLogger.log({
                    userId: admin.id,
                    action: 'failed_password_change',
                    details: { reason: 'invalid_current_password' },
                    ipAddress: req.ip || 'unknown',
                    userAgent: req.get('User-Agent'),
                });
                res.status(400).json({
                    error: 'Current password is incorrect',
                    code: 'INVALID_CURRENT_PASSWORD'
                });
                return;
            }
            // Change password
            const success = await adminAuth_1.AdminAuthService.changePassword(admin.id, newPassword);
            if (!success) {
                res.status(500).json({
                    error: 'Failed to change password',
                    code: 'PASSWORD_CHANGE_FAILED'
                });
                return;
            }
            // Log password change
            await auditService_1.AdminAuditLogger.log({
                userId: admin.id,
                action: 'password_changed',
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent'),
            });
            res.json({
                success: true,
                message: 'Password changed successfully',
            });
        }
        catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
}
exports.AuthController = AuthController;
/**
 * Validation rules for login
 */
AuthController.loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
];
/**
 * Validation rules for password change
 */
AuthController.changePasswordValidation = [
    (0, express_validator_1.body)('currentPassword')
        .isLength({ min: 1 })
        .withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must be at least 8 characters long and contain uppercase, lowercase, and number'),
];
//# sourceMappingURL=authController.js.map