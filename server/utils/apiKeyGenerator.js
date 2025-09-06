const crypto = require('crypto');

/**
 * Generates a secure API key using cryptographically secure random bytes
 * @param {number} bytes - Number of random bytes to generate (default: 32)
 * @param {string} encoding - Encoding format: 'hex' or 'base64url' (default: 'hex')
 * @returns {string} Generated API key
 */
function generateApiKey(bytes = 32, encoding = 'hex') {
  return crypto.randomBytes(bytes).toString(encoding);
}

/**
 * Generates a standard 64-character hex API key
 * This is the preferred format for all API keys in the system
 * @returns {string} 64-character hex string
 */
function generateStandardApiKey() {
  return generateApiKey(32, 'hex');
}

/**
 * Validates if a string is a valid API key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if valid format
 */
function isValidApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Allow alphanumeric, underscores, and hyphens
  // This covers both hex keys and base64url keys
  return /^[a-zA-Z0-9_-]+$/.test(apiKey);
}

module.exports = {
  generateApiKey,
  generateStandardApiKey,
  isValidApiKeyFormat,
};
