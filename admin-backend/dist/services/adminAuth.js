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
        const admin = await database_1.prisma.platformAdmin.create({
            data: {
                email: data.email,
                passwordHash,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role || 'ADMIN',
            },
        });
        const { passwordHash: _, ...adminUser } = admin;
        return adminUser;
    }
    /**
     * Validate admin credentials and return user if valid
     */
    static async validateAdmin(email, password) {
        const admin = await database_1.prisma.platformAdmin.findUnique({
            where: { email, isActive: true },
        });
        if (!admin || !await bcryptjs_1.default.compare(password, admin.passwordHash)) {
            return null;
        }
        // Update last login timestamp
        await database_1.prisma.platformAdmin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
        });
        const { passwordHash: _, ...adminUser } = admin;
        return adminUser;
    }
    /**
     * Generate JWT token for admin user
     */
    static generateToken(admin) {
        const payload = {
            adminId: admin.id,
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
        const admin = await database_1.prisma.platformAdmin.findUnique({
            where: { id, isActive: true },
        });
        if (!admin) {
            return null;
        }
        const { passwordHash: _, ...adminUser } = admin;
        return adminUser;
    }
    /**
     * Change admin password
     */
    static async changePassword(adminId, newPassword) {
        try {
            const passwordHash = await bcryptjs_1.default.hash(newPassword, this.BCRYPT_ROUNDS);
            await database_1.prisma.platformAdmin.update({
                where: { id: adminId },
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
    static async deactivateAdmin(adminId) {
        try {
            await database_1.prisma.platformAdmin.update({
                where: { id: adminId },
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