// MongoDB models replaced with Prisma for PostgreSQL migration
// const User = require('../models/User');

const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  try {
    // TODO: Replace MongoDB query with Prisma query during migration
    // const user = await User.findById(userId).select('+password');
    // For now, skip user query to allow server startup
    const user = null;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Error updating password', { error: error.message, userId: req.user.userId });
    res.status(500).json({ message: 'Failed to update password' });
  }
};

// Secure token generation function
const generateSecureToken = () => {
  // Generate 32 bytes of random data
  const randomBytes = crypto.randomBytes(32);

  // Add timestamp to prevent replay attacks
  const timestamp = Date.now().toString();

  // Combine random bytes with timestamp
  const combined = Buffer.concat([randomBytes, Buffer.from(timestamp)]);

  // Create secure hash
  return crypto.createHash('sha256').update(combined).digest('hex');
};

// Secure token validation function
const validateSecureToken = (token, storedHash, expirationTime) => {
  if (!token || !storedHash || !expirationTime) {
    return false;
  }

  // Check if token has expired
  if (Date.now() > expirationTime) {
    return false;
  }

  // Create hash of provided token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(tokenHash, 'hex'), Buffer.from(storedHash, 'hex'));
};

exports.setupAccount = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and password are required.' });
  }

  // Enhanced password validation
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return res.status(400).json({
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
    });
  }

  try {
    // Create secure hash of the provided token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // TODO: Replace MongoDB query with Prisma query during migration
    // const user = await User.findOne({
    //   accountSetupToken: tokenHash,
    //   accountSetupTokenExpires: { $gt: Date.now() },
    // });
    // For now, skip user query to allow server startup  
    const user = null;

    if (!user) {
      // Log failed attempt for security monitoring
      logger.warn('Invalid or expired account setup token attempt', {
        tokenHash: tokenHash.substring(0, 8) + '...',
        timestamp: new Date().toISOString(),
        ip: req.ip,
      });

      return res.status(400).json({ message: 'Token is invalid or has expired.' });
    }

    // Additional security: Check if token was used recently (prevent replay)
    const tokenAge = Date.now() - (user.accountSetupTokenExpires - 24 * 60 * 60 * 1000);
    if (tokenAge < 10000) {
      // Less than 10 seconds  old
      return res.status(429).json({
        message: 'Please wait a moment before using this token.',
      });
    }

    user.password = password; // The pre-save hook will hash this
    user.accountSetupToken = undefined;
    user.accountSetupTokenExpires = undefined;
    user.isActive = true; // Activate the account

    await user.save();

    // Log successful account setup
    logger.info('Account setup completed successfully', {
      userId: user._id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ message: 'Account has been set up successfully. You can now log in.' });
  } catch (error) {
    logger.error('Error setting up account', { error: error.message });
    res.status(500).json({ message: 'Internal server error during account setup.' });
  }
};

// Export utility functions for use in other modules
exports.generateSecureToken = generateSecureToken;
exports.validateSecureToken = validateSecureToken;
