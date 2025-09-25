import { Router, Request, Response } from 'express'
import { authenticateAdmin, requireMinRole } from '@/middleware/adminAuth'
import { mainApiClient } from '@/services/apiClient'
import { AdminRole } from '@/types/prisma'

const router = Router()

router.use(authenticateAdmin)

router.get('/', requireMinRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, search = '', role, isActive } = req.query

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search: String(search) }),
      ...(role && { role: String(role) }),
      ...(isActive !== undefined && { isActive: String(isActive) })
    })

    const data = await mainApiClient.get(`/api/admin-backend/users?${params}`)
    res.json(data)
  } catch (error) {
    console.error('Error fetching admin users:', error)
    res.status(500).json({
      error: 'Failed to fetch admin users',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/', requireMinRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, role = 'SUPPORT_AGENT', password, notes } = req.body

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({
        error: 'Email, firstName, lastName, and password are required'
      })
    }

    const data = await mainApiClient.post('/api/admin-backend/users', {
      email,
      firstName,
      lastName,
      role,
      password,
      notes,
      adminId: (req.user as any)?.adminId
    })

    res.status(201).json(data)
  } catch (error: any) {
    if (error.response?.status === 400) {
      return res.status(400).json(error.response.data)
    }
    console.error('Error creating admin user:', error)
    res.status(500).json({
      error: 'Failed to create admin user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.get('/:id', requireMinRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const adminUser = await mainApiClient.get(`/api/admin-backend/users/${id}`)
    res.json(adminUser)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Admin user not found' })
    }
    console.error('Error fetching admin user:', error)
    res.status(500).json({
      error: 'Failed to fetch admin user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.put('/:id/role', requireMinRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { role } = req.body as { role: AdminRole }

    if (!role) {
      return res.status(400).json({ error: 'Role is required' })
    }

    const validRoles: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_AGENT', 'BILLING_ADMIN', 'ANALYST']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    if (id === (req.user as any)?.adminId) {
      return res.status(400).json({
        error: 'Cannot change your own role'
      })
    }

    const data = await mainApiClient.put(`/api/admin-backend/users/${id}/role`, { role })

    await mainApiClient.post('/api/admin-backend/audit-log', {
      targetAdminId: id,
      oldRole: 'PENDING',
      newRole: role,
      adminPerformedById: (req.user as any)?.adminId,
      reason: `Admin role changed to ${role}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.json(data)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Admin user not found' })
    }
    console.error('Error updating admin user role:', error)
    res.status(500).json({
      error: 'Failed to update admin user role',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.put('/:id', requireMinRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { firstName, lastName, isActive, notes } = req.body

    const data = await mainApiClient.put(`/api/admin-backend/users/${id}`, {
      firstName,
      lastName,
      isActive,
      notes
    })

    res.json(data)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Admin user not found' })
    }
    console.error('Error updating admin user:', error)
    res.status(500).json({
      error: 'Failed to update admin user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.put('/:id/deactivate', requireMinRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (id === (req.user as any)?.adminId) {
      return res.status(400).json({
        error: 'Cannot deactivate your own account'
      })
    }

    const data = await mainApiClient.put(`/api/admin-backend/users/${id}/deactivate`, {})
    res.json(data)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Admin user not found' })
    }
    console.error('Error deactivating admin user:', error)
    res.status(500).json({
      error: 'Failed to deactivate admin user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router