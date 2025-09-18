import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types/auth';
declare global {
    namespace Express {
        interface Request {
            admin?: any;
        }
    }
}
/**
 * Middleware to authenticate admin users
 */
export declare const authenticateAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to require super admin role
 */
export declare const requireSuperAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to require admin or super admin role
 */
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to require specific roles
 */
export declare const requireRole: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to require billing admin or super admin role
 */
export declare const requireBillingAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to require support agent or higher role
 */
export declare const requireSupportAgent: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to require minimum role level (hierarchical role checking)
 */
export declare const requireMinRole: (minRole: string) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Check if admin has specific permissions based on role
 */
export declare const checkAdminPermissions: (requiredPermissions: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to log admin actions
 */
export declare const auditAction: (action: string, resourceType?: string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const adminAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAdminRole: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const checkPermissions: (requiredPermissions: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=adminAuth.d.ts.map