import { Router, Request, Response } from 'express'
import { authenticateAdmin } from '@/middleware/adminAuth'
import { authenticateAdminOrService } from '@/middleware/serviceAuth'
import { mainApiClient } from '@/services/apiClient'

const router = Router()

router.get('/contacts', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const params = new URLSearchParams()
    if (req.query.q) params.append('q', req.query.q as string)
    if (req.query.status) params.append('status', req.query.status as string)
    if (req.query.owner) params.append('owner', req.query.owner as string)
    if (req.query.source) params.append('source', req.query.source as string)
    if (req.query.created_after) params.append('created_after', req.query.created_after as string)
    if (req.query.created_before) params.append('created_before', req.query.created_before as string)
    if (req.query.score_min) params.append('score_min', req.query.score_min as string)
    if (req.query.score_max) params.append('score_max', req.query.score_max as string)
    params.append('limit', String(Math.min(Number(req.query.limit || 50), 100)))
    params.append('offset', String(req.query.offset || 0))

    const data = await mainApiClient.get(`/api/admin-backend/crm/contacts?${params}`)
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to list contacts' })
  }
})

router.post('/contacts', authenticateAdminOrService(['contacts:create']), async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.post('/api/admin-backend/crm/contacts', req.body)
    res.status(201).json(data)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to create contact' })
  }
})

router.get('/contacts/:id', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.get(`/api/admin-backend/crm/contacts/${req.params.id}`)
    res.json(data)
  } catch (e: any) {
    if (e.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to get contact' })
  }
})

router.patch('/contacts/:id', authenticateAdminOrService(['crm:write']), async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.patch(`/api/admin-backend/crm/contacts/${req.params.id}`, req.body)
    res.json(data)
  } catch (e: any) {
    if (e.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to update contact' })
  }
})

router.delete('/contacts/:id', authenticateAdminOrService(['crm:write']), async (req: Request, res: Response) => {
  try {
    await mainApiClient.delete(`/api/admin-backend/crm/contacts/${req.params.id}`)
    res.json({ success: true })
  } catch (e: any) {
    if (e.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to delete contact' })
  }
})

router.patch('/contacts/bulk', authenticateAdminOrService(['crm:write']), async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.patch('/api/admin-backend/crm/contacts/bulk', req.body)
    res.json(data)
  } catch (e: any) {
    if (e.response?.status === 400) {
      return res.status(400).json(e.response.data)
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to execute bulk operation' })
  }
})

router.get('/conversations', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const params = new URLSearchParams()
    if (req.query.status) params.append('status', req.query.status as string)
    params.append('limit', String(Math.min(Number(req.query.limit || 50), 100)))
    params.append('offset', String(req.query.offset || 0))

    const data = await mainApiClient.get(`/api/admin-backend/crm/conversations?${params}`)
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to list conversations' })
  }
})

router.get('/conversations/:id', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.get(`/api/admin-backend/crm/conversations/${req.params.id}`)
    res.json(data)
  } catch (e: any) {
    if (e.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'Conversation not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to get conversation' })
  }
})

router.patch('/conversations/:id', authenticateAdminOrService(['crm:write']), async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.patch(`/api/admin-backend/crm/conversations/${req.params.id}`, req.body)
    res.json(data)
  } catch (e: any) {
    if (e.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'Conversation not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to update conversation' })
  }
})

router.post('/contacts/:id/convert', authenticateAdminOrService(['crm:write']), async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.post(`/api/admin-backend/crm/contacts/${req.params.id}/convert`)
    res.json(data)
  } catch (e: any) {
    if (e.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to convert lead' })
  }
})

router.get('/contacts/:id/notes', authenticateAdminOrService(['notes:read']), async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.get(`/api/admin-backend/crm/contacts/${req.params.id}/notes`)
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to list notes' })
  }
})

router.post('/contacts/:id/notes', authenticateAdminOrService(['notes:create']), async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin?.id
    const serviceName = (req as any).service?.name
    const data = await mainApiClient.post(`/api/admin-backend/crm/contacts/${req.params.id}/notes`, {
      ...req.body,
      createdBy: adminId || (serviceName ? `service:${serviceName}` : null)
    })
    res.status(201).json(data)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to create note' })
  }
})

router.delete('/contacts/:id/notes/:noteId', authenticateAdminOrService(['notes:delete']), async (req: Request, res: Response) => {
  try {
    await mainApiClient.delete(`/api/admin-backend/crm/contacts/${req.params.id}/notes/${req.params.noteId}`)
    res.json({ success: true })
  } catch (e: any) {
    if (e.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'Note not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to delete note' })
  }
})

router.get('/analytics', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.get('/api/admin-backend/crm/analytics')
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to get analytics' })
  }
})

router.get('/pipeline', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const data = await mainApiClient.get('/api/admin-backend/crm/pipeline')
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to get pipeline data' })
  }
})

export default router