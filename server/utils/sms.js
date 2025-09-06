let twilioFactory = null;
try {
  // Optional dependency: allow server to run without Twilio installed
  twilioFactory = require('twilio');
} catch (e) {
  // Module not installed; we'll operate in mock mode unless configured
  twilioFactory = null;
}
const { logger } = require('./logger');

const getTwilioClient = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    logger.warn('Twilio credentials not configured. SMS sending is disabled.');
    return null;
  }
  if (!twilioFactory) {
    logger.warn('Twilio SDK not installed. SMS sending is disabled.');
    return null;
  }
  return twilioFactory(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

/**
 * Send an SMS message. No-op in development if Twilio is not configured.
 * @param {string} to E.164 phone number
 * @param {string} body message body
 */
const sendSMS = async ({ to, body }) => {
  const client = getTwilioClient();
  if (!client) {
    // Dev-friendly fallback
    logger.info(`[SMS MOCK] To: ${to} | Body: ${body}`);
    return { sid: 'mock', to, body };
  }
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    throw new Error('TWILIO_FROM_NUMBER is not configured');
  }
  try {
    const res = await client.messages.create({ to, from, body });
    logger.info(`SMS sent: ${res.sid}`);
    return res;
  } catch (err) {
    logger.error('Error sending SMS:', { error: err.message });
    throw err;
  }
};

module.exports = { sendSMS };
