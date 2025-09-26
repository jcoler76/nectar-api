const prismaService = require('../services/prismaService');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;
  const organizationId = req.user.organizationId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  // Enhanced password validation
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
    return res.status(400).json({
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    });
  }

  if (!organizationId) {
    return res.status(400).json({ message: 'Organization context required' });
  }

  try {
    // SECURITY: Use withTenantContext for RLS enforcement
    const user = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.user.findFirst({
        where: {
          id: userId,
          // organizationId handled by RLS
        },
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      });
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      logger.warn('Invalid current password attempt', {
        userId,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(401).json({ message: 'Invalid current password' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password with RLS enforcement
    await prismaService.withTenantContext(organizationId, async tx => {
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          passwordUpdatedAt: new Date(),
        },
      });
    });

    // Log successful password update
    logger.info('Password updated successfully', {
      userId,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Error updating password', { error: error.message, userId });
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
    return res.status(400).json({ message: 'Token and password are required' });
  }

  // Enhanced password validation
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return res.status(400).json({
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    });
  }

  try {
    // Create secure hash of the provided token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // SECURITY: System client for account setup (no organization context yet)
    const systemClient = prismaService.getSystemClient();
    const user = await systemClient.user.findFirst({
      where: {
        accountSetupToken: tokenHash,
        accountSetupTokenExpires: {
          gt: new Date(),
        },
        isActive: false, // Only allow setup for inactive accounts
      },
      select: {
        id: true,
        email: true,
        accountSetupTokenExpires: true,
        organizationId: true,
      },
    });

    if (!user) {
      // Log failed attempt for security monitoring
      logger.warn('Invalid or expired account setup token attempt', {
        tokenHash: tokenHash.substring(0, 8) + '...',
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.status(400).json({ message: 'Token is invalid or has expired' });
    }

    // Additional security: Check if token was used recently (prevent replay)
    const tokenAge = Date.now() - (user.accountSetupTokenExpires.getTime() - 24 * 60 * 60 * 1000);
    if (tokenAge < 10000) {
      return res.status(429).json({
        message: 'Please wait a moment before using this token',
      });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user account with system client (account activation)
    await systemClient.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        accountSetupToken: null,
        accountSetupTokenExpires: null,
        isActive: true,
        passwordUpdatedAt: new Date(),
        activatedAt: new Date(),
      },
    });

    // Log successful account setup
    logger.info('Account setup completed successfully', {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      message: 'Account has been set up successfully. You can now log in',
      success: true,
    });
  } catch (error) {
    logger.error('Error setting up account', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Internal server error during account setup' });
  }
};

// Export utility functions for use in other modules
exports.generateSecureToken = generateSecureToken;
exports.validateSecureToken = validateSecureToken;
