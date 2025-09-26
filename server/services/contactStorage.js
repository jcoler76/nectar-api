const prismaService = require('../services/prismaService');
const crypto = require('crypto');

// Use system client for marketing leads (no organization context initially)
const prisma = prismaService.getSystemClient();

// Generate a URL-safe UUID string
function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

// Ensure contact tables exist (id as TEXT to avoid DB extensions)
async function ensureContactTables() {
  // contacts table
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // conversations table
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
  `);

  // messages table
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
  `);

  // helpful indexes
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts((lower(email)));`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_convos_contact ON contact_conversations(contact_id);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_msgs_convo ON contact_messages(conversation_id);`
  );
}

async function upsertContact({ name, email, company, phone, source, url, utm }) {
  const id = generateId();
  const now = new Date().toISOString();
  // Try to find by email first
  const existing = email
    ? await prisma.$queryRawUnsafe(
        `SELECT * FROM contacts WHERE lower(email)=lower($1) LIMIT 1;`,
        email
      )
    : [];
  if (existing && existing.length) {
    const contact = existing[0];
    await prisma.$executeRawUnsafe(
      `UPDATE contacts SET name=COALESCE($1,name), company=COALESCE($2,company), phone=COALESCE($3,phone), source=COALESCE($4,source), url=COALESCE($5,url), utm=COALESCE($6,utm), updated_at=$7 WHERE id=$8;`,
      name || null,
      company || null,
      phone || null,
      source || null,
      url || null,
      utm ? JSON.stringify(utm) : null,
      now,
      contact.id
    );
    return contact.id;
  }
  await prisma.$executeRawUnsafe(
    `INSERT INTO contacts (id,name,email,company,phone,source,url,utm,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9);`,
    id,
    name || null,
    email || null,
    company || null,
    phone || null,
    source || null,
    url || null,
    utm ? JSON.stringify(utm) : null,
    now
  );
  return id;
}

async function createConversation(contactId) {
  const id = generateId();
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `INSERT INTO contact_conversations (id,contact_id,status,created_at,updated_at,last_message_at) VALUES ($1,$2,'open',$3,$3,$3);`,
    id,
    contactId,
    now
  );
  return id;
}

async function addMessage(conversationId, role, content, metadata) {
  const id = generateId();
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `INSERT INTO contact_messages (id,conversation_id,role,content,metadata,created_at) VALUES ($1,$2,$3,$4,$5,$6);`,
    id,
    conversationId,
    role,
    content,
    metadata ? JSON.stringify(metadata) : null,
    now
  );
  await prisma.$executeRawUnsafe(
    `UPDATE contact_conversations SET updated_at=$1,last_message_at=$1 WHERE id=$2;`,
    now,
    conversationId
  );
  return id;
}

async function getContactById(id) {
  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM contacts WHERE id=$1;`, id);
  return rows[0] || null;
}

async function listContacts({ search, limit = 50, offset = 0 }) {
  if (search) {
    const q = `%${search.toLowerCase()}%`;
    return prisma.$queryRawUnsafe(
      `SELECT * FROM contacts WHERE lower(email) LIKE $1 OR lower(name) LIKE $1 OR lower(company) LIKE $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3;`,
      q,
      Number(limit),
      Number(offset)
    );
  }
  return prisma.$queryRawUnsafe(
    `SELECT * FROM contacts ORDER BY updated_at DESC LIMIT $1 OFFSET $2;`,
    Number(limit),
    Number(offset)
  );
}

async function listConversations({ status, limit = 50, offset = 0 }) {
  if (status) {
    return prisma.$queryRawUnsafe(
      `SELECT c.*, ct.email, ct.name, ct.company FROM contact_conversations c JOIN contacts ct ON ct.id=c.contact_id WHERE c.status=$1 ORDER BY c.updated_at DESC LIMIT $2 OFFSET $3;`,
      status,
      Number(limit),
      Number(offset)
    );
  }
  return prisma.$queryRawUnsafe(
    `SELECT c.*, ct.email, ct.name, ct.company FROM contact_conversations c JOIN contacts ct ON ct.id=c.contact_id ORDER BY c.updated_at DESC LIMIT $1 OFFSET $2;`,
    Number(limit),
    Number(offset)
  );
}

async function getConversationWithMessages(id) {
  const convo = await prisma.$queryRawUnsafe(
    `SELECT c.*, ct.email, ct.name, ct.company FROM contact_conversations c JOIN contacts ct ON ct.id=c.contact_id WHERE c.id=$1 LIMIT 1;`,
    id
  );
  const messages = await prisma.$queryRawUnsafe(
    `SELECT * FROM contact_messages WHERE conversation_id=$1 ORDER BY created_at ASC;`,
    id
  );
  return { conversation: convo[0] || null, messages };
}

async function updateConversation(id, { status, assigned_to }) {
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `UPDATE contact_conversations SET status=COALESCE($1,status), assigned_to=COALESCE($2,assigned_to), updated_at=$3 WHERE id=$4;`,
    status || null,
    assigned_to || null,
    now,
    id
  );
}

module.exports = {
  ensureContactTables,
  upsertContact,
  createConversation,
  addMessage,
  getContactById,
  listContacts,
  listConversations,
  getConversationWithMessages,
  updateConversation,
};
