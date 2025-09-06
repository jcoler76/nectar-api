const crypto = require('crypto');
const { logger } = require('./logger');

/**
 * Verify Jira webhook signature using timing-safe comparison
 * @param {Object} req - Express request object
 * @returns {boolean} - True if signature is valid, false otherwise
 */
const verifyJiraWebhookSignature = req => {
  const secret = process.env.JIRA_WEBHOOK_SECRET || process.env.JIRA_WEBHOOK_HMAC_SECRET;
  const signatureHeader = req.get(
    process.env.JIRA_WEBHOOK_HMAC_HEADER || 'x-atlassian-webhook-signature'
  );

  // Fail-safe: Reject if secret not configured
  if (!secret) {
    logger.error('Jira webhook secret not configured - rejecting request for security');
    return false;
  }

  // Fail-safe: Reject if signature header missing
  if (!signatureHeader) {
    logger.warn('Jira webhook signature header missing - rejecting request');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const expected = Buffer.from(expectedSignature, 'hex');
    const received = Buffer.from(signatureHeader, 'hex');

    // Buffers must be same length for timingSafeEqual
    if (expected.length !== received.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, received);
  } catch (error) {
    logger.error('Error comparing webhook signatures:', error);
    return false;
  }
};

/**
 * Check if MIRABEL_API_KEY is configured
 * @throws {Error} - If API key is not configured
 */
const requireApiKey = () => {
  const apiKey = process.env.MIRABEL_API_KEY;
  if (!apiKey) {
    throw new Error('MIRABEL_API_KEY environment variable is required');
  }
  return apiKey;
};

module.exports = {
  verifyJiraWebhookSignature,
  requireApiKey,
};
