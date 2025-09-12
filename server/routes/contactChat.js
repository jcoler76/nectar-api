const express = require('express');
const router = express.Router();
const {
  ensureContactTables,
  upsertContact,
  createConversation,
  addMessage,
  getConversationWithMessages,
} = require('../services/contactStorage');
const { logger } = require('../middleware/logger');

// Simple, rules-based lead capture flow
// Steps: name -> email -> company -> freeform message
function getNextPrompt(state) {
  if (!state.name) return 'Hi! What is your name?';
  if (!state.email) return 'Nice to meet you. What is your email?';
  if (!state.company) return 'Thanks! What company are you with?';
  if (!state.capturedMessage) return 'Great — what can we help you with?';
  return null;
}

router.post('/start', async (req, res) => {
  try {
    await ensureContactTables();

    const { name, email, company, phone, url, utm, source } = req.body || {};
    const contactId = await upsertContact({
      name,
      email,
      company,
      phone,
      source: source || 'website_chat',
      url: url || req.headers['referer'] || null,
      utm,
    });
    const conversationId = await createConversation(contactId);

    // First bot message/prompt
    const next = getNextPrompt({ name, email, company, capturedMessage: null });
    if (next) await addMessage(conversationId, 'bot', next, { type: 'prompt' });

    res.json({ success: true, contactId, conversationId, nextPrompt: next });
  } catch (err) {
    logger.error('Contact chat start error:', err);
    res.status(500).json({ success: false, error: 'Failed to start conversation' });
  }
});

router.post('/message', async (req, res) => {
  try {
    await ensureContactTables();

    const { conversationId, message } = req.body || {};
    if (!conversationId || !message) {
      return res.status(400).json({ success: false, error: 'conversationId and message required' });
    }

    // Persist user message
    await addMessage(conversationId, 'user', message, { type: 'user_input' });

    // Load convo state to decide next step
    const { conversation, messages } = await getConversationWithMessages(conversationId);
    if (!conversation)
      return res.status(404).json({ success: false, error: 'Conversation not found' });

    // Very simple state extraction from prior prompts
    const state = { name: null, email: null, company: null, capturedMessage: null };
    for (const m of messages) {
      if (m.role === 'user') {
        // Infer based on latest preceding bot prompt
        // Find previous bot prompt
        const idx = messages.findIndex(x => x.id === m.id);
        const prevBot =
          idx > 0
            ? [...messages]
                .slice(0, idx)
                .reverse()
                .find(x => x.role === 'bot')
            : null;
        const prevText = prevBot?.content?.toLowerCase?.() || '';
        if (prevText.includes('your name')) state.name = m.content.trim();
        else if (prevText.includes('your email')) state.email = m.content.trim();
        else if (prevText.includes('company')) state.company = m.content.trim();
        else state.capturedMessage = m.content.trim();
      }
    }

    const next = getNextPrompt(state);
    if (next) {
      await addMessage(conversationId, 'bot', next, { type: 'prompt' });
      return res.json({ success: true, done: false, reply: next });
    }

    // Close flow with thank-you
    const closing = 'Thanks! Our team will reach out shortly.';
    await addMessage(conversationId, 'bot', closing, { type: 'closing' });
    return res.json({ success: true, done: true, reply: closing });
  } catch (err) {
    logger.error('Contact chat message error:', err);
    res.status(500).json({ success: false, error: 'Failed to process message' });
  }
});

module.exports = router;
