import { Router, Request, Response } from 'express'
import { authenticateAdmin } from '@/middleware/adminAuth'
import { mainApiClient } from '@/services/apiClient'

const router = Router()

router.use(authenticateAdmin)

router.get('/', async (req: Request, res: Response) => {
  try {
    const params = new URLSearchParams()
    if (req.query.page) params.append('page', req.query.page as string)
    if (req.query.limit) params.append('limit', req.query.limit as string)
    if (req.query.search) params.append('search', req.query.search as string)
    if (req.query.isActive !== undefined) params.append('isActive', req.query.isActive as string)
    if (req.query.isAdmin !== undefined) params.append('isAdmin', req.query.isAdmin as string)

    const data = await mainApiClient.get(`/api/admin-backend/users?${params}`)
    res.json(data)
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.post('/api/admin-backend/users', req.body)
    res.status(201).json(data)
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.get(`/api/admin-backend/users/${req.params.id}`)
    res.json(data)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.put(`/api/admin-backend/users/${req.params.id}`, req.body)
    res.json(data)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'User not found' })
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(400).json({ error: 'Email already exists' })
    }
    res.status(500).json({
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.delete(`/api/admin-backend/users/${req.params.id}`)
    res.json(data)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.status(500).json({
      error: 'Failed to delete user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router