"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_1 = require("@/middleware/adminAuth");
const database_1 = require("@/utils/database");
const router = (0, express_1.Router)();
// Apply admin authentication to all routes
router.use(adminAuth_1.authenticateAdmin);
// GET /api/admin/metrics - Get admin dashboard metrics
router.get('/metrics', async (req, res) => {
    try {
        // Get basic user statistics
        const [totalUsers, activeUsers] = await Promise.all([
            database_1.prisma.user.count(),
            database_1.prisma.user.count({ where: { isActive: true } })
        ]);
        // For now, return basic stats with placeholder data for subscriptions and revenue
        // These would need to be implemented based on your actual billing/subscription system
        const metrics = {
            totalUsers,
            activeUsers,
            totalSubscriptions: 0, // TODO: Implement subscription counting
            monthlyRevenue: 0 // TODO: Implement revenue calculation
        };
        res.json(metrics);
    }
    catch (error) {
        console.error('Error fetching admin metrics:', error);
        res.status(500).json({
            error: 'Failed to fetch admin metrics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map