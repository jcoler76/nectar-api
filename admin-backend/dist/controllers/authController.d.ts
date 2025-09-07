import { Request, Response } from 'express';
import { AuthRequest } from '@/types/auth';
export declare class AuthController {
    /**
     * Admin login endpoint
     */
    static login(req: Request, res: Response): Promise<void>;
    /**
     * Admin logout endpoint
     */
    static logout(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get current admin profile
     */
    static profile(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Change password endpoint
     */
    static changePassword(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Validation rules for login
     */
    static loginValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for password change
     */
    static changePasswordValidation: import("express-validator").ValidationChain[];
}
//# sourceMappingURL=authController.d.ts.map