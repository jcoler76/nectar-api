import { Router, Request, Response } from 'express'
import { authenticateAdmin } from '@/middleware/adminAuth'
import { prisma } from '@/utils/database'
import crypto from 'crypto'

const router = Router()

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      company TEXT,
      phone TEXT,
      source TEXT,
      url TEXT,
      utm JSONB,
      lead_score INTEGER DEFAULT 0,
      lead_status TEXT DEFAULT 'new',
      owner TEXT,
      tags JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  // Backfill columns if table already existed
  await prisma.$executeRawUnsafe(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'new';`)
  await prisma.$executeRawUnsafe(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS owner TEXT;`)
  await prisma.$executeRawUnsafe(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS contact_conversations (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      assigned_to TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_message_at TIMESTAMPTZ,
      CONSTRAINT fk_contact FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT fk_conversation FOREIGN KEY(conversation_id) REFERENCES contact_conversations(id) ON DELETE CASCADE
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS contact_notes (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT fk_note_contact FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );
  `)
}

router.use(authenticateAdmin)

router.get('/contacts', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const q = (req.query.q as string | undefined)?.toLowerCase()
    const status = (req.query.status as string | undefined) || undefined
    const owner = (req.query.owner as string | undefined) || undefined
    const limit = Number(req.query.limit || 50)
    const offset = Number(req.query.offset || 0)

    const clauses: string[] = []
    const params: any[] = []
    if (q) {
      params.push(`%${q}%`)
      clauses.push(`(lower(email) LIKE $${params.length} OR lower(name) LIKE $${params.length} OR lower(company) LIKE $${params.length})`)
    }
    if (status) {
      params.push(status)
      clauses.push(`lead_status = $${params.length}`)
    }
    if (owner) {
      params.push(owner.toLowerCase())
      clauses.push(`lower(owner) = $${params.length}`)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    params.push(limit)
    params.push(offset)
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM contacts ${where} ORDER BY updated_at DESC LIMIT $${params.length-1} OFFSET $${params.length};`,
      ...params
    )
    res.json({ success: true, data: rows })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to list contacts' })
  }
})

router.post('/contacts', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const { id, name, email, company, phone, source, url, utm, lead_score, lead_status, owner, tags } = req.body || {}
    const newId = id || crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO contacts (id,name,email,company,phone,source,url,utm,lead_score,lead_status,owner,tags,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,0),COALESCE($10,'new'),$11,COALESCE($12,'[]'::jsonb),NOW(),NOW());`,
      newId, name || null, email || null, company || null, phone || null, source || null, url || null,
      utm ? JSON.stringify(utm) : null, typeof lead_score === 'number' ? lead_score : 0, lead_status || 'new', owner || null,
      Array.isArray(tags) ? JSON.stringify(tags) : '[]'
    )
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM contacts WHERE id=$1;`, newId)
    res.status(201).json({ success: true, data: rows[0] })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to create contact' })
  }
})

router.get('/contacts/:id', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const id = req.params.id
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM contacts WHERE id=$1 LIMIT 1;`, id)
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Not found' })
    }
    res.json({ success: true, data: rows[0] })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to get contact' })
  }
})

router.patch('/contacts/:id', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const id = req.params.id
    const { name, email, company, phone, lead_score, lead_status, owner, tags } = req.body || {}
    await prisma.$executeRawUnsafe(
      `UPDATE contacts SET name=COALESCE($1,name), email=COALESCE($2,email), company=COALESCE($3,company), phone=COALESCE($4,phone), lead_score=COALESCE($5,lead_score), lead_status=COALESCE($6,lead_status), owner=COALESCE($7,owner), tags=COALESCE($8,tags), updated_at=NOW() WHERE id=$9;`,
      name || null,
      email || null,
      company || null,
      phone || null,
      typeof lead_score === 'number' ? lead_score : null,
      lead_status || null,
      owner || null,
      Array.isArray(tags) ? JSON.stringify(tags) : null,
      id
    )
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM contacts WHERE id=$1 LIMIT 1;`, id)
    res.json({ success: true, data: rows[0] || null })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to update contact' })
  }
})

router.delete('/contacts/:id', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const id = req.params.id
    await prisma.$executeRawUnsafe(`DELETE FROM contacts WHERE id=$1;`, id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to delete contact' })
  }
})

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const status = req.query.status as string | undefined
    const limit = Number(req.query.limit || 50)
    const offset = Number(req.query.offset || 0)
    const sql = status
      ? `SELECT c.*, ct.email, ct.name, ct.company FROM contact_conversations c JOIN contacts ct ON ct.id=c.contact_id WHERE c.status=$1 ORDER BY c.updated_at DESC LIMIT $2 OFFSET $3;`
      : `SELECT c.*, ct.email, ct.name, ct.company FROM contact_conversations c JOIN contacts ct ON ct.id=c.contact_id ORDER BY c.updated_at DESC LIMIT $1 OFFSET $2;`
    const rows = status
      ? await prisma.$queryRawUnsafe(sql, status, limit, offset)
      : await prisma.$queryRawUnsafe(sql, limit, offset)
    res.json({ success: true, data: rows })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to list conversations' })
  }
})

router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const id = req.params.id
    const convo = await prisma.$queryRawUnsafe(
      `SELECT c.*, ct.email, ct.name, ct.company FROM contact_conversations c JOIN contacts ct ON ct.id=c.contact_id WHERE c.id=$1 LIMIT 1;`,
      id
    )
    const messages = await prisma.$queryRawUnsafe(
      `SELECT * FROM contact_messages WHERE conversation_id=$1 ORDER BY created_at ASC;`,
      id
    )
    res.json({ success: true, data: { conversation: convo[0] || null, messages } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to get conversation' })
  }
})

router.patch('/conversations/:id', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const id = req.params.id
    const { status, assigned_to } = req.body || {}
    await prisma.$executeRawUnsafe(
      `UPDATE contact_conversations SET status=COALESCE($1,status), assigned_to=COALESCE($2,assigned_to), updated_at=NOW() WHERE id=$3;`,
      status || null, assigned_to || null, id
    )
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to update conversation' })
  }
})

// Convert lead to customer (simple: mark as converted; optional: future user/org creation)
router.post('/contacts/:id/convert', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const id = req.params.id
    await prisma.$executeRawUnsafe(`UPDATE contacts SET lead_status='converted', updated_at=NOW() WHERE id=$1;`, id)
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM contacts WHERE id=$1;`, id)
    res.json({ success: true, data: rows[0] || null })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to convert lead' })
  }
})

// Notes endpoints
router.get('/contacts/:id/notes', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const id = req.params.id
    const notes = await prisma.$queryRawUnsafe(`SELECT * FROM contact_notes WHERE contact_id=$1 ORDER BY created_at DESC;`, id)
    res.json({ success: true, data: notes })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to list notes' })
  }
})

router.post('/contacts/:id/notes', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const id = req.params.id
    const noteId = crypto.randomUUID()
    const body = (req.body?.body as string) || ''
    const createdBy = (req.admin?.id as string) || null
    await prisma.$executeRawUnsafe(
      `INSERT INTO contact_notes (id,contact_id,body,created_by,created_at) VALUES ($1,$2,$3,$4,NOW());`,
      noteId, id, body, createdBy
    )
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM contact_notes WHERE id=$1;`, noteId)
    res.status(201).json({ success: true, data: rows[0] })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to create note' })
  }
})

router.delete('/contacts/:id/notes/:noteId', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    await prisma.$executeRawUnsafe(`DELETE FROM contact_notes WHERE id=$1 AND contact_id=$2;`, req.params.noteId, req.params.id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to delete note' })
  }
})

export default router
