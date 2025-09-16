"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("@/controllers/authController");
const adminAuth_1 = require("@/middleware/adminAuth");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const router = (0, express_1.Router)();
/**
 * @route POST /api/auth/login
 * @desc Admin login
 * @access Public
 */
router.post('/login', rateLimiter_1.authRateLimiter, authController_1.AuthController.loginValidation, authController_1.AuthController.login);
/**
 * @route POST /api/auth/logout
 * @desc Admin logout
 * @access Private
 */
router.post('/logout', adminAuth_1.authenticateAdmin, (0, adminAuth_1.auditAction)('logout'), authController_1.AuthController.logout);
/**
 * @route GET /api/auth/profile
 * @desc Get current admin profile
 * @access Private
 */
router.get('/profile', adminAuth_1.authenticateAdmin, authController_1.AuthController.profile);
/**
 * @route PUT /api/auth/password
 * @desc Change admin password
 * @access Private
 */
router.put('/password', adminAuth_1.authenticateAdmin, rateLimiter_1.passwordChangeRateLimiter, authController_1.AuthController.changePasswordValidation, (0, adminAuth_1.auditAction)('change_password'), authController_1.AuthController.changePassword);
exports.default = router;
//# sourceMappingURL=auth.js.map