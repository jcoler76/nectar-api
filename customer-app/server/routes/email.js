const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { Workflow } = require('../models/workflowModels');
const { executeWorkflow } = require('../services/workflows/engine');

const router = express.Router();

router.use(express.json());

// POST /api/email/trigger/:workflowId
// This endpoint would be configured in an email service (e.g., Mailgun)
// to be called when an email is received.
router.post('/trigger/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = await Workflow.findById(workflowId);

    if (!workflow || !workflow.active) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Workflow not found or is inactive.' } });
    }

    const triggerNode = workflow.nodes.find(node => node.data?.nodeType === 'trigger:email');

    if (!triggerNode) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'No email trigger configured for this workflow.' },
      });
    }

    // Verify webhook signature for email services
    const webhookSecret = triggerNode.data?.webhookSecret;
    if (!webhookSecret) {
      return res.status(500).json({
        message: 'Email webhook authentication not configured. Webhook secret is required.',
      });
    }

    // Support common email service webhook signatures
    const signature =
      req.header('X-Mailgun-Signature') ||
      req.header('X-SendGrid-Signature') ||
      req.header('X-Email-Signature');

    if (!signature) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Missing webhook signature' } });
    }

    // Verify signature (example for HMAC-SHA256)
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } });
    }

    // The email service would typically post a JSON payload.
    // For example: { from: "...", to: "...", subject: "...", body: "..." }
    const emailData = req.body;

    res.status(200).json({ message: 'Email received, workflow triggered.' });

    executeWorkflow(workflow, emailData);
  } catch (error) {
    logger.error('Email trigger error:', { error: error.message });
  }
});

module.exports = router;
