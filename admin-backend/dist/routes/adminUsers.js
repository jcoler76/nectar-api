"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_1 = require("@/middleware/adminAuth");
const database_1 = require("@/utils/database");
const auditService_1 = require("@/services/auditService");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const router = (0, express_1.Router)();
// Password validation function
function validatePassword(password) {
    const errors = [];
    if (!password) {
        errors.push('Password is required');
        return { isValid: false, errors };
    }
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return { isValid: errors.length === 0, errors };
}
// Apply admin authentication to all routes
router.use(adminAuth_1.authenticateAdmin);
// GET /api/admin/users - Get all admin users with pagination and filtering
router.get('/', (0, adminAuth_1.requireMinRole)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', role, isActive } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Math.min(Number(limit), 100); // Max 100 per request
        // Build where clause for filters
        const where = {};
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (role) {
            where.role = role;
        }
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }
        // Get total count for pagination
        const totalCount = await database_1.prisma.adminUser.count({ where });
        // Get admin users with pagination
        const adminUsers = await database_1.prisma.adminUser.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            users: adminUsers,
            pagination: {
                total: totalCount,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalCount / Number(limit)),
                hasNext: skip + take < totalCount,
                hasPrev: Number(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({
            error: 'Failed to fetch admin users',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// POST /api/admin/users - Create a new admin user (SUPER_ADMIN only)
router.post('/', (0, adminAuth_1.requireMinRole)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { email, firstName, lastName, role = 'SUPPORT_AGENT', password, notes } = req.body;
        if (!email || !firstName || !lastName || !password) {
            return res.status(400).json({
                error: 'Email, firstName, lastName, and password are required'
            });
        }
        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                details: passwordValidation.errors
            });
        }
        // Ensure email uniqueness
        const existing = await database_1.prisma.adminUser.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        // Hash the password server-side using bcrypt with 12 rounds
        const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
        const passwordHash = await bcryptjs_1.default.hash(password, BCRYPT_ROUNDS);
        const adminUser = await database_1.prisma.adminUser.create({
            data: {
                email,
                firstName,
                lastName,
                role: role,
                passwordHash,
                notes,
                createdBy: req.user?.adminId
            }
        });
        // Log admin user creation
        await (0, auditService_1.logRoleChange)({
            targetAdminId: adminUser.id,
            oldRole: 'NONE',
            newRole: adminUser.role,
            adminPerformedById: req.user?.adminId,
            reason: `Admin user created with role ${adminUser.role}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            user: adminUser
        });
    }
    catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).json({
            error: 'Failed to create admin user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/admin/users/:id - Get single admin user by ID
router.get('/:id', (0, adminAuth_1.requireMinRole)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const adminUser = await database_1.prisma.adminUser.findUnique({
            where: { id }
        });
        if (!adminUser) {
            return res.status(404).json({
                error: 'Admin user not found'
            });
        }
        res.json(adminUser);
    }
    catch (error) {
        console.error('Error fetching admin user:', error);
        res.status(500).json({
            error: 'Failed to fetch admin user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// PUT /api/admin/users/:id/role - Update admin user role (SUPER_ADMIN only)
router.put('/:id/role', (0, adminAuth_1.requireMinRole)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }
        // Validate role
        const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_AGENT', 'BILLING_ADMIN', 'ANALYST'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        // Check if admin user exists
        const existingAdminUser = await database_1.prisma.adminUser.findUnique({
            where: { id }
        });
        if (!existingAdminUser) {
            return res.status(404).json({
                error: 'Admin user not found'
            });
        }
        // Prevent changing your own role (for safety)
        if (id === req.user?.adminId) {
            return res.status(400).json({
                error: 'Cannot change your own role'
            });
        }
        const oldRole = existingAdminUser.role;
        // Update the role
        const updatedAdminUser = await database_1.prisma.adminUser.update({
            where: { id },
            data: { role }
        });
        // Log role change with enhanced audit logging
        await (0, auditService_1.logRoleChange)({
            targetAdminId: id,
            oldRole,
            newRole: role,
            adminPerformedById: req.user?.adminId,
            reason: `Admin role changed from ${oldRole} to ${role}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            message: 'Role updated successfully',
            user: updatedAdminUser
        });
    }
    catch (error) {
        console.error('Error updating admin user role:', error);
        res.status(500).json({
            error: 'Failed to update admin user role',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// PUT /api/admin/users/:id - Update admin user details
router.put('/:id', (0, adminAuth_1.requireMinRole)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, isActive, notes } = req.body;
        // Check if admin user exists
        const existingAdminUser = await database_1.prisma.adminUser.findUnique({
            where: { id }
        });
        if (!existingAdminUser) {
            return res.status(404).json({
                error: 'Admin user not found'
            });
        }
        // Update admin user
        const updatedAdminUser = await database_1.prisma.adminUser.update({
            where: { id },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(isActive !== undefined && { isActive }),
                ...(notes !== undefined && { notes })
            }
        });
        res.json({
            message: 'Admin user updated successfully',
            user: updatedAdminUser
        });
    }
    catch (error) {
        console.error('Error updating admin user:', error);
        res.status(500).json({
            error: 'Failed to update admin user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// PUT /api/admin/users/:id/deactivate - Deactivate admin user (SUPER_ADMIN only)
router.put('/:id/deactivate', (0, adminAuth_1.requireMinRole)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        // Check if admin user exists
        const existingAdminUser = await database_1.prisma.adminUser.findUnique({
            where: { id }
        });
        if (!existingAdminUser) {
            return res.status(404).json({
                error: 'Admin user not found'
            });
        }
        // Prevent deactivating yourself
        if (id === req.user?.adminId) {
            return res.status(400).json({
                error: 'Cannot deactivate your own account'
            });
        }
        // Deactivate by setting isActive to false
        await database_1.prisma.adminUser.update({
            where: { id },
            data: { isActive: false }
        });
        res.json({
            success: true,
            message: 'Admin user deactivated successfully'
        });
    }
    catch (error) {
        console.error('Error deactivating admin user:', error);
        res.status(500).json({
            error: 'Failed to deactivate admin user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=adminUsers.js.map