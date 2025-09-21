import { Router, Request, Response } from 'express'
import { authenticateAdmin } from '@/middleware/adminAuth'
import { authenticateAdminOrService } from '@/middleware/serviceAuth'
import { prisma } from '@/utils/database'
import { ContactStatus, ConversationStatus } from '@prisma/client'

const router = Router()

router.get('/contacts', authenticateAdminOrService(['crm:read']), async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.toLowerCase()
    const status = req.query.status as keyof typeof ContactStatus | undefined
    const owner = (req.query.owner as string | undefined)
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

router.get('/contacts/:id', async (req: Request, res: Response) => {
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

router.patch('/contacts/:id', async (req: Request, res: Response) => {
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

router.delete('/contacts/:id', async (req: Request, res: Response) => {
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

router.get('/conversations', async (req: Request, res: Response) => {
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

router.get('/conversations/:id', async (req: Request, res: Response) => {
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

router.patch('/conversations/:id', async (req: Request, res: Response) => {
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
router.post('/contacts/:id/convert', async (req: Request, res: Response) => {
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
router.get('/contacts/:id/notes', async (req: Request, res: Response) => {
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

router.delete('/contacts/:id/notes/:noteId', async (req: Request, res: Response) => {
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

export default router
