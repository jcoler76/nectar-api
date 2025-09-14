const express = require('express');
const router = express.Router();
const {
  ensureContactTables,
  listContacts,
  listConversations,
  getConversationWithMessages,
  updateConversation,
  getContactById,
} = require('../services/contactStorage');
const { authMiddleware } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

// Protect all admin CRM routes
router.use(authMiddleware);
router.use(csrfProtection({ excludePaths: [] }));

router.get('/contacts', async (req, res) => {
  try {
    await ensureContactTables();
    const { q, limit, offset } = req.query;
    const rows = await listContacts({
      search: q,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to list contacts' });
  }
});

router.get('/contacts/:id', async (req, res) => {
  try {
    await ensureContactTables();
    const contact = await getContactById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get contact' });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    await ensureContactTables();
    const { status, limit, offset } = req.query;
    const rows = await listConversations({
      status,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to list conversations' });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    await ensureContactTables();
    const result = await getConversationWithMessages(req.params.id);
    if (!result.conversation) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get conversation' });
  }
});

router.patch('/conversations/:id', async (req, res) => {
  try {
    await ensureContactTables();
    const { status, assigned_to } = req.body || {};
    await updateConversation(req.params.id, { status, assigned_to });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update conversation' });
  }
});

module.exports = router;
