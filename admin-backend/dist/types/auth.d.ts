export interface CreateAdminData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER' | 'SUPPORT';
}
export interface LoginCredentials {
    email: string;
    password: string;
}
export interface AdminUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
}
export interface JWTPayload {
    adminId: string;
    email: string;
    role: string;
    type: 'platform_admin';
    iat?: number;
    exp?: number;
}
import { Request } from 'express';
export interface AuthRequest extends Request {
    admin?: AdminUser;
}
//# sourceMappingURL=auth.d.ts.map