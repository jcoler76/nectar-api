import { Router, Request, Response } from 'express'
import { authenticateAdmin } from '@/middleware/adminAuth'
import { authenticateAdminOrService } from '@/middleware/serviceAuth'
import { prisma } from '@/utils/database'
import { ContactStatus, ConversationStatus } from '../../prisma/generated/client'

const router = Router()

router.get('/contacts', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.toLowerCase()
    const status = req.query.status as keyof typeof ContactStatus | undefined
    const owner = (req.query.owner as string | undefined)
    const source = (req.query.source as string | undefined)
    const createdAfter = req.query.created_after as string | undefined
    const createdBefore = req.query.created_before as string | undefined
    const scoreMin = req.query.score_min ? Number(req.query.score_min) : undefined
    const scoreMax = req.query.score_max ? Number(req.query.score_max) : undefined
    const limit = Math.min(Number(req.query.limit || 50), 100)
    const offset = Number(req.query.offset || 0)

    const where: any = {}

    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } }
      ]
    }

    if (status) {
      where.leadStatus = status
    }

    if (owner) {
      where.owner = { contains: owner, mode: 'insensitive' }
    }

    if (source) {
      where.source = { contains: source, mode: 'insensitive' }
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {}
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter)
      }
      if (createdBefore) {
        where.createdAt.lte = new Date(createdBefore)
      }
    }

    if (scoreMin !== undefined || scoreMax !== undefined) {
      where.leadScore = {}
      if (scoreMin !== undefined) {
        where.leadScore.gte = scoreMin
      }
      if (scoreMax !== undefined) {
        where.leadScore.lte = scoreMax
      }
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset
    })

    res.json({ success: true, data: contacts })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to list contacts' })
  }
})

router.post('/contacts', authenticateAdminOrService(['contacts:create']), async (req: Request, res: Response) => {
  try {
    const { name, email, company, phone, source, url, utm, leadScore, leadStatus, owner, tags } = req.body || {}

    const contact = await prisma.contact.create({
      data: {
        name: name || null,
        email: email || null,
        company: company || null,
        phone: phone || null,
        source: source || null,
        url: url || null,
        utm: utm || null,
        leadScore: typeof leadScore === 'number' ? leadScore : 0,
        leadStatus: leadStatus || ContactStatus.NEW,
        owner: owner || null,
        tags: Array.isArray(tags) ? tags : []
      }
    })

    res.status(201).json({ success: true, data: contact })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to create contact' })
  }
})

router.get('/contacts/:id', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        conversations: {
          include: {
            messages: true
          }
        },
        notes: true
      }
    })

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }

    res.json({ success: true, data: contact })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to get contact' })
  }
})

router.patch('/contacts/:id', authenticateAdminOrService(['crm:write']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const { name, email, company, phone, leadScore, leadStatus, owner, tags } = req.body || {}

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (company !== undefined) updateData.company = company
    if (phone !== undefined) updateData.phone = phone
    if (typeof leadScore === 'number') updateData.leadScore = leadScore
    if (leadStatus) updateData.leadStatus = leadStatus
    if (owner !== undefined) updateData.owner = owner
    if (Array.isArray(tags)) updateData.tags = tags

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData
    })

    res.json({ success: true, data: contact })
  } catch (e: any) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to update contact' })
  }
})

router.delete('/contacts/:id', authenticateAdminOrService(['crm:write']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    await prisma.contact.delete({
      where: { id }
    })
    res.json({ success: true })
  } catch (e: any) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to delete contact' })
  }
})

// Bulk operations
router.patch('/contacts/bulk', authenticateAdminOrService(['crm:write']), async (req: Request, res: Response) => {
  try {
    const { ids, action, value } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or empty IDs array' })
    }

    if (!action) {
      return res.status(400).json({ success: false, error: 'Action is required' })
    }

    let updateData: any = {}
    let result: any

    switch (action) {
      case 'status':
        if (!value || !Object.values(ContactStatus).includes(value)) {
          return res.status(400).json({ success: false, error: 'Invalid status value' })
        }
        updateData = { leadStatus: value }
        break

      case 'owner':
        updateData = { owner: value || null }
        break

      case 'delete':
        result = await prisma.contact.deleteMany({
          where: { id: { in: ids } }
        })
        return res.json({ success: true, data: { deleted: result.count } })

      default:
        return res.status(400).json({ success: false, error: 'Invalid action' })
    }

    result = await prisma.contact.updateMany({
      where: { id: { in: ids } },
      data: updateData
    })

    res.json({ success: true, data: { updated: result.count } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to execute bulk operation' })
  }
})

router.get('/conversations', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const status = req.query.status as keyof typeof ConversationStatus | undefined
    const limit = Math.min(Number(req.query.limit || 50), 100)
    const offset = Number(req.query.offset || 0)

    const where: any = {}
    if (status) {
      where.status = status
    }

    const conversations = await prisma.contactConversation.findMany({
      where,
      include: {
        contact: {
          select: {
            email: true,
            name: true,
            company: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset
    })

    res.json({ success: true, data: conversations })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to list conversations' })
  }
})

router.get('/conversations/:id', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const conversation = await prisma.contactConversation.findUnique({
      where: { id },
      include: {
        contact: {
          select: {
            email: true,
            name: true,
            company: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' })
    }

    res.json({ success: true, data: conversation })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to get conversation' })
  }
})

router.patch('/conversations/:id', authenticateAdminOrService(['crm:write']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const { status, assignedTo } = req.body || {}

    const updateData: any = {}
    if (status) updateData.status = status
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo

    await prisma.contactConversation.update({
      where: { id },
      data: updateData
    })

    res.json({ success: true })
  } catch (e: any) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Conversation not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to update conversation' })
  }
})

// Convert lead to customer (simple: mark as converted; optional: future user/org creation)
router.post('/contacts/:id/convert', authenticateAdminOrService(['crm:write']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const contact = await prisma.contact.update({
      where: { id },
      data: { leadStatus: ContactStatus.CONVERTED }
    })
    res.json({ success: true, data: contact })
  } catch (e: any) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to convert lead' })
  }
})

// Notes endpoints
router.get('/contacts/:id/notes', authenticateAdminOrService(['notes:read']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const notes = await prisma.contactNote.findMany({
      where: { contactId: id },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: notes })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to list notes' })
  }
})

router.post('/contacts/:id/notes', authenticateAdminOrService(['notes:create']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const body = (req.body?.body as string) || ''
    const createdBy = (req.admin?.id as string) || (req.service ? `service:${req.service.name}` : null)

    const note = await prisma.contactNote.create({
      data: {
        contactId: id,
        body,
        createdBy
      }
    })

    res.status(201).json({ success: true, data: note })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to create note' })
  }
})

router.delete('/contacts/:id/notes/:noteId', authenticateAdminOrService(['notes:delete']), async (req: Request, res: Response) => {
  try {
    await prisma.contactNote.delete({
      where: {
        id: req.params.noteId,
        contactId: req.params.id
      }
    })
    res.json({ success: true })
  } catch (e: any) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Note not found' })
    }
    res.status(500).json({ success: false, error: e?.message || 'Failed to delete note' })
  }
})

// Analytics endpoints
router.get('/analytics', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    // Get basic metrics
    const totalContacts = await prisma.contact.count()
    const contactsByStatus = await prisma.contact.groupBy({
      by: ['leadStatus'],
      _count: { leadStatus: true }
    })

    // Get conversion funnel data
    const conversionFunnel = Object.values(ContactStatus).map(status => ({
      status,
      count: contactsByStatus.find(item => item.leadStatus === status)?._count.leadStatus || 0
    }))

    // Get source attribution
    const sourceData = await prisma.contact.groupBy({
      by: ['source'],
      _count: { source: true },
      where: { source: { not: null } }
    })

    // Get lead creation over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyLeads = await prisma.contact.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: { gte: thirtyDaysAgo }
      }
    })

    // Process daily leads data
    const leadsByDay = dailyLeads.reduce((acc, item) => {
      const date = new Date(item.createdAt).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + item._count.id
      return acc
    }, {} as Record<string, number>)

    // Average lead score
    const avgLeadScore = await prisma.contact.aggregate({
      _avg: { leadScore: true }
    })

    res.json({
      success: true,
      data: {
        totalContacts,
        conversionFunnel,
        sourceAttribution: sourceData.map(item => ({
          source: item.source || 'Unknown',
          count: item._count.source
        })),
        leadsByDay,
        averageLeadScore: Math.round(avgLeadScore._avg.leadScore || 0)
      }
    })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to get analytics' })
  }
})

// Pipeline data endpoint
router.get('/pipeline', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const pipelineData = await Promise.all(
      Object.values(ContactStatus).map(async (status) => {
        const contacts = await prisma.contact.findMany({
          where: { leadStatus: status },
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            leadScore: true,
            owner: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' }
        })

        return {
          status,
          count: contacts.length,
          contacts
        }
      })
    )

    res.json({ success: true, data: pipelineData })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to get pipeline data' })
  }
})

export default router
