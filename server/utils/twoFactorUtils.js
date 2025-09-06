const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { logger } = require('./logger');

/**
 * Generate backup codes for 2FA recovery
 * @param {number} count - Number of codes to generate (default 10)
 * @param {number} length - Length of each code (default 8)
 * @returns {Array} Array of backup code objects with plaintext and hashed versions
 */
async function generateBackupCodes(count = 10, length = 8) {
  const codes = [];
  const plaintextCodes = [];

  for (let i = 0; i < count; i++) {
    // Generate a secure random code
    const code = crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toUpperCase();

    // Format code with hyphen for readability (e.g., ABCD-EFGH)
    const formattedCode = code.match(/.{1,4}/g).join('-');
    plaintextCodes.push(formattedCode);

    // Hash the code for storage
    const hashedCode = await bcrypt.hash(formattedCode, 10);

    codes.push({
      code: hashedCode,
      used: false,
    });
  }

  return { codes, plaintextCodes };
}

/**
 * Verify a backup code
 * @param {String} inputCode - The code to verify
 * @param {Array} storedCodes - Array of stored backup code objects
 * @returns {Object} { valid: boolean, codeIndex: number }
 */
async function verifyBackupCode(inputCode, storedCodes) {
  if (!inputCode || !storedCodes || storedCodes.length === 0) {
    return { valid: false, codeIndex: -1 };
  }

  // Normalize input code (remove spaces, uppercase)
  const normalizedInput = inputCode.replace(/\s/g, '').toUpperCase();

  for (let i = 0; i < storedCodes.length; i++) {
    const storedCode = storedCodes[i];

    // Skip already used codes
    if (storedCode.used) {
      continue;
    }

    // Verify the code
    const isValid = await bcrypt.compare(normalizedInput, storedCode.code);

    if (isValid) {
      return { valid: true, codeIndex: i };
    }
  }

  return { valid: false, codeIndex: -1 };
}

/**
 * Generate a device fingerprint from request
 * @param {Object} req - Express request object
 * @returns {String} Device fingerprint hash
 */
function generateDeviceFingerprint(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Create a stable fingerprint
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
}

/**
 * Check if device is trusted
 * @param {String} fingerprint - Device fingerprint
 * @param {Array} trustedDevices - Array of trusted device objects
 * @param {Number} maxAge - Maximum age in days (default 30)
 * @returns {Boolean}
 */
function isDeviceTrusted(fingerprint, trustedDevices, maxAge = 30) {
  if (!fingerprint || !trustedDevices || trustedDevices.length === 0) {
    return false;
  }

  const now = new Date();
  const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;

  return trustedDevices.some(device => {
    if (device.fingerprint !== fingerprint) {
      return false;
    }

    // Check if device trust has expired
    const deviceAge = now - new Date(device.createdAt);
    return deviceAge < maxAgeMs;
  });
}

/**
 * Add or update trusted device
 * @param {Object} user - User document
 * @param {String} fingerprint - Device fingerprint
 * @param {String} deviceName - Optional device name
 * @returns {Promise}
 */
async function addTrustedDevice(user, fingerprint, deviceName = null) {
  if (!user.trustedDevices) {
    user.trustedDevices = [];
  }

  // Remove existing entry for this fingerprint
  user.trustedDevices = user.trustedDevices.filter(device => device.fingerprint !== fingerprint);

  // Add new trusted device
  user.trustedDevices.push({
    fingerprint,
    name: deviceName || 'Unknown Device',
    lastUsed: new Date(),
    createdAt: new Date(),
  });

  // Keep only the last 10 trusted devices
  if (user.trustedDevices.length > 10) {
    user.trustedDevices = user.trustedDevices
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 10);
  }

  await user.save();
}

/**
 * Generate QR code data without exposing the secret
 * @param {String} email - User email
 * @param {String} issuer - App name/issuer
 * @returns {String} Partial data for QR generation
 */
function generateQRData(email, issuer = 'Mirabel API') {
  // Return only the label part, secret will be added server-side only
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
}

/**
 * Mask the 2FA secret for display
 * @param {String} secret - The full secret
 * @returns {String} Masked secret
 */
function maskSecret(secret) {
  if (!secret || secret.length < 8) {
    return '****';
  }
  return secret.substring(0, 4) + '****' + secret.substring(secret.length - 4);
}

module.exports = {
  generateBackupCodes,
  verifyBackupCode,
  generateDeviceFingerprint,
  isDeviceTrusted,
  addTrustedDevice,
  generateQRData,
  maskSecret,
};
