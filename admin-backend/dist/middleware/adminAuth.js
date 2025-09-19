"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermissions = exports.requireAdminRole = exports.adminAuth = exports.auditAction = exports.checkAdminPermissions = exports.requireMinRole = exports.requireSupportAgent = exports.requireBillingAdmin = exports.requireRole = exports.requireAdmin = exports.requireSuperAdmin = exports.authenticateAdmin = void 0;
const adminAuth_1 = require("@/services/adminAuth");
const auditService_1 = require("@/services/auditService");
/**
 * Middleware to authenticate admin users
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        // Check for token in httpOnly cookie first, then fallback to Authorization header for backwards compatibility
        let token = req.cookies?.adminToken;
        let tokenSource = 'cookie';
        if (!token) {
            const authHeader = req.header('Authorization');
            token = authHeader?.replace('Bearer ', '');
            tokenSource = 'header';
        }
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
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'BILLING_ADMIN', 'SUPPORT_AGENT', 'ANALYST'];
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
 * Middleware to require billing admin or super admin role
 */
const requireBillingAdmin = (req, res, next) => {
    const allowedRoles = ['BILLING_ADMIN', 'SUPER_ADMIN'];
    if (!req.admin?.role || !allowedRoles.includes(req.admin.role)) {
        res.status(403).json({
            error: 'Billing admin access required',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
    }
    next();
};
exports.requireBillingAdmin = requireBillingAdmin;
/**
 * Middleware to require support agent or higher role
 */
const requireSupportAgent = (req, res, next) => {
    const allowedRoles = ['SUPPORT_AGENT', 'ADMIN', 'BILLING_ADMIN', 'SUPER_ADMIN'];
    if (!req.admin?.role || !allowedRoles.includes(req.admin.role)) {
        res.status(403).json({
            error: 'Support agent access required',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
    }
    next();
};
exports.requireSupportAgent = requireSupportAgent;
/**
 * Middleware to require minimum role level (hierarchical role checking)
 */
const requireMinRole = (minRole) => {
    return (req, res, next) => {
        const roleHierarchy = ['ANALYST', 'SUPPORT_AGENT', 'BILLING_ADMIN', 'ADMIN', 'SUPER_ADMIN'];
        const userRoleIndex = roleHierarchy.indexOf(req.admin?.role || '');
        const minRoleIndex = roleHierarchy.indexOf(minRole);
        if (userRoleIndex === -1 || userRoleIndex < minRoleIndex) {
            res.status(403).json({
                error: `Required minimum role: ${minRole}`,
                code: 'INSUFFICIENT_PERMISSIONS'
            });
            return;
        }
        next();
    };
};
exports.requireMinRole = requireMinRole;
/**
 * Check if admin has specific permissions based on role
 */
const checkAdminPermissions = (requiredPermissions) => {
    return (req, res, next) => {
        const adminRole = req.admin?.role;
        if (!adminRole) {
            res.status(403).json({
                error: 'Authentication required',
                code: 'UNAUTHENTICATED'
            });
            return;
        }
        const rolePermissions = getAdminRolePermissions(adminRole);
        const hasPermission = requiredPermissions.every(permission => rolePermissions.includes(permission));
        if (!hasPermission) {
            res.status(403).json({
                error: `Required permissions: ${requiredPermissions.join(', ')}`,
                code: 'INSUFFICIENT_PERMISSIONS'
            });
            return;
        }
        next();
    };
};
exports.checkAdminPermissions = checkAdminPermissions;
/**
 * Get permissions for admin role
 */
function getAdminRolePermissions(role) {
    const basePermissions = {
        SUPER_ADMIN: [
            'user:create', 'user:read', 'user:update', 'user:delete',
            'organization:create', 'organization:read', 'organization:update', 'organization:delete',
            'license:create', 'license:read', 'license:update', 'license:delete',
            'billing:create', 'billing:read', 'billing:update', 'billing:delete',
            'audit:read', 'system:admin', 'admin:manage'
        ],
        ADMIN: [
            'user:read', 'user:update',
            'organization:read', 'organization:update',
            'license:read', 'license:update',
            'billing:read', 'billing:update',
            'audit:read'
        ],
        BILLING_ADMIN: [
            'user:read', 'organization:read',
            'license:read', 'license:update',
            'billing:create', 'billing:read', 'billing:update', 'billing:delete'
        ],
        SUPPORT_AGENT: [
            'user:read', 'organization:read',
            'license:read', 'billing:read'
        ],
        ANALYST: [
            'user:read', 'organization:read',
            'license:read', 'billing:read',
            'audit:read'
        ]
    };
    return basePermissions[role] || [];
}
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
// Export aliases for backwards compatibility
exports.adminAuth = exports.authenticateAdmin;
exports.requireAdminRole = exports.requireRole;
exports.checkPermissions = exports.checkAdminPermissions;
//# sourceMappingURL=adminAuth.js.map