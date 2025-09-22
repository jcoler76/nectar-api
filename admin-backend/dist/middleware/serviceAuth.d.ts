import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            service?: {
                name: string;
                permissions: string[];
            };
        }
    }
}
/**
 * Middleware to authenticate service-to-service requests using API keys
 */
export declare const authenticateService: (requiredPermissions?: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Combined middleware that allows both admin user authentication and service authentication
 */
export declare const authenticateAdminOrService: (servicePermissions?: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=serviceAuth.d.ts.map