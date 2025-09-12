import { CreateAdminData, AdminUser, JWTPayload } from '@/types/auth';
export declare class AdminAuthService {
    private static readonly JWT_SECRET;
    private static readonly JWT_EXPIRES_IN;
    private static readonly BCRYPT_ROUNDS;
    /**
     * Create a new platform admin user
     */
    static createAdmin(data: CreateAdminData): Promise<AdminUser>;
    /**
     * Validate admin credentials and return user if valid
     */
    static validateAdmin(email: string, password: string): Promise<AdminUser | null>;
    /**
     * Generate JWT token for admin user
     */
    static generateToken(admin: AdminUser): string;
    /**
     * Verify and decode JWT token
     */
    static verifyToken(token: string): JWTPayload | null;
    /**
     * Get admin user by ID
     */
    static getAdminById(id: string): Promise<AdminUser | null>;
    /**
     * Change admin password
     */
    static changePassword(userId: string, newPassword: string): Promise<boolean>;
    /**
     * Deactivate admin user
     */
    static deactivateAdmin(userId: string): Promise<boolean>;
}
//# sourceMappingURL=adminAuth.d.ts.map