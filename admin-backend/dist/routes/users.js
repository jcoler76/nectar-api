"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_1 = require("@/middleware/adminAuth");
const database_1 = require("@/utils/database");
const router = (0, express_1.Router)();
// Apply admin authentication to all routes  
router.use(adminAuth_1.authenticateAdmin);
// GET /api/users - Get all users with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 100, search = '', isActive, isAdmin } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Math.min(Number(limit), 100); // Max 100 per request
        // Build where clause for filters
        // Exclude super admins by default - we're managing regular users
        const where = {
            isSuperAdmin: false
        };
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }
        // Note: isAdmin filter doesn't apply since we're already filtering out super admins
        // Get total count for pagination
        const totalCount = await database_1.prisma.user.count({ where });
        // Get users with pagination
        const users = await database_1.prisma.user.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                memberships: {
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });
        // Add computed fields and flatten organization info for frontend
        const usersWithComputed = users.map(user => {
            // Get the first organization from memberships (most users belong to one org)
            const primaryMembership = user.memberships[0];
            const organization = primaryMembership?.organization || null;
            return {
                ...user,
                fullName: `${user.firstName} ${user.lastName}`,
                organization,
                // For frontend compatibility - using isSuperAdmin field from User model
                isAdmin: false, // Regular users are not admins
                roles: [] // Roles would come from memberships if needed
            };
        });
        res.json({
            users: usersWithComputed,
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
        console.error('Error fetching users:', error);
        res.status(500).json({
            error: 'Failed to fetch users',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/users/:id - Get single user by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await database_1.prisma.user.findUnique({
            where: { id },
            include: {
                memberships: {
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        // Get the first organization from memberships
        const primaryMembership = user.memberships[0];
        const organization = primaryMembership?.organization || null;
        const userWithComputed = {
            ...user,
            fullName: `${user.firstName} ${user.lastName}`,
            organization,
            isAdmin: false,
            roles: []
        };
        res.json(userWithComputed);
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            error: 'Failed to fetch user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, isActive, isAdmin } = req.body;
        // Check if user exists
        const existingUser = await database_1.prisma.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        // Update user
        const updatedUser = await database_1.prisma.user.update({
            where: { id },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(email && { email }),
                ...(isActive !== undefined && { isActive })
                // Note: We don't update isSuperAdmin from the admin portal
            },
            include: {
                memberships: {
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });
        const userWithComputed = {
            ...updatedUser,
            fullName: `${updatedUser.firstName} ${updatedUser.lastName}`
        };
        res.json(userWithComputed);
    }
    catch (error) {
        console.error('Error updating user:', error);
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            return res.status(400).json({
                error: 'Email already exists'
            });
        }
        res.status(500).json({
            error: 'Failed to update user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// DELETE /api/users/:id - Delete user (soft delete by setting isActive to false)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = await database_1.prisma.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        // Soft delete by setting isActive to false
        await database_1.prisma.user.update({
            where: { id },
            data: { isActive: false }
        });
        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            error: 'Failed to delete user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map