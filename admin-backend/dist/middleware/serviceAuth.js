"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAdminOrService = exports.authenticateService = void 0;
/**
 * Service API keys for internal communication
 * In production, these should be stored in environment variables or a secure key management system
 */
const SERVICE_API_KEYS = {
    'marketing-backend': {
        key: process.env.MARKETING_SERVICE_API_KEY || 'marketing_service_key_dev_2024',
        permissions: ['crm:read', 'crm:write', 'contacts:create', 'contacts:update', 'notes:create']
    }
};
/**
 * Middleware to authenticate service-to-service requests using API keys
 */
const authenticateService = (requiredPermissions = []) => {
    return async (req, res, next) => {
        try {
            // Check for service API key in X-Service-Key header
            const serviceKey = req.header('X-Service-Key');
            if (!serviceKey) {
                res.status(401).json({
                    error: 'Service API key required',
                    code: 'NO_SERVICE_KEY'
                });
                return;
            }
            // Find matching service
            let matchedService = null;
            for (const [serviceName, config] of Object.entries(SERVICE_API_KEYS)) {
                if (config.key === serviceKey) {
                    matchedService = serviceName;
                    break;
                }
            }
            if (!matchedService) {
                res.status(401).json({
                    error: 'Invalid service API key',
                    code: 'INVALID_SERVICE_KEY'
                });
                return;
            }
            const serviceConfig = SERVICE_API_KEYS[matchedService];
            // Check permissions
            if (requiredPermissions.length > 0) {
                const hasAllPermissions = requiredPermissions.every(permission => serviceConfig.permissions.includes(permission));
                if (!hasAllPermissions) {
                    res.status(403).json({
                        error: 'Insufficient service permissions',
                        code: 'INSUFFICIENT_SERVICE_PERMISSIONS',
                        required: requiredPermissions,
                        available: serviceConfig.permissions
                    });
                    return;
                }
            }
            // Attach service info to request
            req.service = {
                name: matchedService,
                permissions: serviceConfig.permissions
            };
            next();
        }
        catch (error) {
            console.error('Service authentication error:', error);
            res.status(401).json({
                error: 'Service authentication failed',
                code: 'SERVICE_AUTH_ERROR'
            });
        }
    };
};
exports.authenticateService = authenticateService;
/**
 * Combined middleware that allows both admin user authentication and service authentication
 */
const authenticateAdminOrService = (servicePermissions = []) => {
    return async (req, res, next) => {
        // Check if it's a service request first
        const serviceKey = req.header('X-Service-Key');
        if (serviceKey) {
            // Use service authentication
            return (0, exports.authenticateService)(servicePermissions)(req, res, next);
        }
        else {
            // Use regular admin authentication
            const { authenticateAdmin } = await Promise.resolve().then(() => __importStar(require('./adminAuth')));
            return authenticateAdmin(req, res, next);
        }
    };
};
exports.authenticateAdminOrService = authenticateAdminOrService;
//# sourceMappingURL=serviceAuth.js.map