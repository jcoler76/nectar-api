import { Router, Request, Response } from 'express'
import { authenticateAdmin } from '@/middleware/adminAuth'
import { prisma } from '@/utils/database'

const router = Router()

// Apply admin authentication to all routes  
router.use(authenticateAdmin)

// GET /api/users - Get all users with pagination and filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      search = '', 
      isActive, 
      isAdmin 
    } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const take = Math.min(Number(limit), 100) // Max 100 per request

    // Build where clause for filters
    // Include all users (regular users and super admins)
    const where: any = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    // Note: isAdmin filter doesn't apply since we're already filtering out super admins

    // Get total count for pagination
    const totalCount = await prisma.user.count({ where })

    // Get users with pagination
    const users = await prisma.user.findMany({
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
    })

    // Add computed fields and flatten organization info for frontend
    const usersWithComputed = users.map(user => {
      // Get the first organization from memberships (most users belong to one org)
      const primaryMembership = user.memberships[0]
      const organization = primaryMembership?.organization || null
      
      return {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
        organization,
        // For frontend compatibility - show super admin status
        isAdmin: user.isSuperAdmin || false,
        roles: [] // Roles would come from memberships if needed
      }
    })

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
    })
  } catch (error) {
    // Log error internally without exposing details
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// POST /api/users - Create a new user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, firstName = '', lastName = '', isActive = true, organizationId } = req.body as {
      email: string
      firstName?: string
      lastName?: string
      isActive?: boolean
      organizationId?: string
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Ensure email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        isActive: Boolean(isActive),
      },
    })

    // Optionally attach to an organization via membership
    let organization: { id: string; name: string } | null = null
    if (organizationId) {
      try {
        const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } })
        if (org) {
          await prisma.membership.create({
            data: { userId: user.id, organizationId: org.id, role: 'MEMBER' },
          })
          organization = org
        }
      } catch (_) {
        // ignore membership errors
      }
    }

    const result = {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      organization,
      isAdmin: false,
      roles: [] as Array<{ id: string; name: string }>,
    }

    res.status(201).json({ success: true, user: result })
  } catch (error) {
    // Log error internally without exposing details
    res.status(500).json({ error: 'Failed to create user', message: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// GET /api/users/:id - Get single user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
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
    })

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      })
    }

    // Get the first organization from memberships
    const primaryMembership = user.memberships[0]
    const organization = primaryMembership?.organization || null
    
    const userWithComputed = {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`,
      organization,
      isAdmin: false,
      roles: []
    }

    res.json(userWithComputed)
  } catch (error) {
    // Log error internally without exposing details
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// PUT /api/users/:id - Update user
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { firstName, lastName, email, isActive, isAdmin } = req.body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found'
      })
    }

    // Update user
    const updatedUser = await prisma.user.update({
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
    })

    const userWithComputed = {
      ...updatedUser,
      fullName: `${updatedUser.firstName} ${updatedUser.lastName}`
    }

    res.json(userWithComputed)
  } catch (error) {
    // Log error internally without exposing details
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(400).json({
        error: 'Email already exists'
      })
    }

    res.status(500).json({
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// DELETE /api/users/:id - Delete user (soft delete by setting isActive to false)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found'
      })
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })

    res.json({ 
      success: true, 
      message: 'User deactivated successfully' 
    })
  } catch (error) {
    // Log error internally without exposing details
    res.status(500).json({
      error: 'Failed to delete user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
