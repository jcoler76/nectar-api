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
 * Middleware to log admin actions
 */
export declare const auditAction: (action: string, resourceType?: string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=adminAuth.d.ts.map