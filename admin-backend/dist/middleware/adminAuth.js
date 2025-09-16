"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = exports.auditAction = exports.requireRole = exports.requireAdmin = exports.requireSuperAdmin = exports.authenticateAdmin = void 0;
const adminAuth_1 = require("@/services/adminAuth");
const auditService_1 = require("@/services/auditService");
/**
 * Middleware to authenticate admin users
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({
                error: 'Access token required',
                code: 'NO_TOKEN'
            });
            return;
        }
        const decoded = adminAuth_1.AdminAuthService.verifyToken(token);
        if (!decoded) {
            res.status(401).json({
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
            return;
        }
        const admin = await adminAuth_1.AdminAuthService.getAdminById(decoded.userId);
        if (!admin) {
            res.status(401).json({
                error: 'Admin user not found or inactive',
                code: 'ADMIN_NOT_FOUND'
            });
            return;
        }
        req.admin = admin;
        next();
    }
    catch (error) {
        // Log error internally without exposing details
        res.status(401).json({
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};
exports.authenticateAdmin = authenticateAdmin;
/**
 * Middleware to require super admin role
 */
const requireSuperAdmin = (req, res, next) => {
    if (req.admin?.role !== 'SUPER_ADMIN') {
        res.status(403).json({
            error: 'Super admin access required',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
/**
 * Middleware to require admin or super admin role
 */
const requireAdmin = (req, res, next) => {
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!req.admin?.role || !allowedRoles.includes(req.admin.role)) {
        res.status(403).json({
            error: 'Admin access required',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware to require specific roles
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.admin?.role || !roles.includes(req.admin.role)) {
            res.status(403).json({
                error: `Required roles: ${roles.join(', ')}`,
                code: 'INSUFFICIENT_PERMISSIONS'
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Middleware to log admin actions
 */
const auditAction = (action, resourceType) => {
    return async (req, res, next) => {
        // Log the action
        await auditService_1.AdminAuditLogger.log({
            userId: req.admin?.id,
            action,
            resource: req.params.id || req.body?.id,
            resourceType,
            details: {
                method: req.method,
                path: req.path,
                body: req.method !== 'GET' ? req.body : undefined,
                query: Object.keys(req.query).length > 0 ? req.query : undefined,
            },
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent'),
        });
        next();
    };
};
exports.auditAction = auditAction;
// Export alias for backwards compatibility
exports.adminAuth = exports.authenticateAdmin;
//# sourceMappingURL=adminAuth.js.map