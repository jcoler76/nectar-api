import { Router, Request, Response } from 'express'
import { authenticateAdmin } from '@/middleware/adminAuth'
import { prisma } from '@/utils/database'

const router = Router()

// Apply admin authentication to all routes
router.use(authenticateAdmin)

// GET /api/admin/metrics - Get admin dashboard metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    // Get basic user statistics
    const [totalUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } })
    ])

    // For now, return basic stats with placeholder data for subscriptions and revenue
    // These would need to be implemented based on your actual billing/subscription system
    const metrics = {
      totalUsers,
      activeUsers,
      totalSubscriptions: 0, // TODO: Implement subscription counting
      monthlyRevenue: 0 // TODO: Implement revenue calculation
    }

    res.json(metrics)
  } catch (error) {
    console.error('Error fetching admin metrics:', error)
    res.status(500).json({
      error: 'Failed to fetch admin metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router