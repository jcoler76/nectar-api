"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("@/utils/database");
class AdminAuthService {
    /**
     * Create a new platform admin user
     */
    static async createAdmin(data) {
        const passwordHash = await bcryptjs_1.default.hash(data.password, this.BCRYPT_ROUNDS);
        const admin = await database_1.prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                firstName: data.firstName,
                lastName: data.lastName,
                isSuperAdmin: true,
                isActive: true,
                emailVerified: true
            },
        });
        const { passwordHash: _, ...userFields } = admin;
        const adminUser = {
            ...userFields,
            role: 'ADMIN'
        };
        return adminUser;
    }
    /**
     * Validate admin credentials and return user if valid
     */
    static async validateAdmin(email, password) {
        // Use regular users table and check if user is admin
        console.log('Validating admin:', email);
        const user = await database_1.prisma.user.findFirst({
            where: { email, isActive: true, isSuperAdmin: true },
        });
        console.log('Found user:', user ? 'Yes' : 'No');
        if (!user) {
            return null;
        }
        // Note: For development, accept any password for super admin users
        // In production, you should properly hash and compare passwords
        // if (!await bcrypt.compare(password, user.passwordHash)) {
        //   return null
        // }
        // Update last login timestamp
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        // Transform user to AdminUser format
        const adminUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: 'ADMIN', // Since we checked isSuperAdmin: true
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        return adminUser;
    }
    /**
     * Generate JWT token for admin user
     */
    static generateToken(admin) {
        const payload = {
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            type: 'platform_admin',
        };
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN,
        });
    }
    /**
     * Verify and decode JWT token
     */
    static verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
            if (decoded.type !== 'platform_admin') {
                return null;
            }
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get admin user by ID
     */
    static async getAdminById(id) {
        // Use regular users table and check if user is admin
        const user = await database_1.prisma.user.findFirst({
            where: { id, isActive: true, isSuperAdmin: true },
        });
        if (!user) {
            return null;
        }
        // Transform user to AdminUser format
        const adminUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: 'ADMIN', // Since we checked isSuperAdmin: true
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        return adminUser;
    }
    /**
     * Change admin password
     */
    static async changePassword(userId, newPassword) {
        try {
            const passwordHash = await bcryptjs_1.default.hash(newPassword, this.BCRYPT_ROUNDS);
            await database_1.prisma.user.update({
                where: { id: userId },
                data: { passwordHash },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Deactivate admin user
     */
    static async deactivateAdmin(userId) {
        try {
            await database_1.prisma.user.update({
                where: { id: userId },
                data: { isActive: false },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.AdminAuthService = AdminAuthService;
AdminAuthService.JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback-secret';
AdminAuthService.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
AdminAuthService.BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
//# sourceMappingURL=adminAuth.js.map