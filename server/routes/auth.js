const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserLog = require('../models/UserLog');
const { logger } = require('../utils/logger');
const { validate } = require('../middleware/validation');
const validationRules = require('../middleware/validationRules');
const { body } = require('express-validator');
const crypto = require('crypto');
const {
  generateTokens,
  validateToken,
  blacklistToken,
  generateFingerprint,
} = require('../utils/tokenService');
const authController = require('../controllers/authController');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');
const otplib = require('otplib');
const qrcode = require('qrcode');
const { sendEmail } = require('../utils/mailer');
const { sendSMS } = require('../utils/sms');
const { getSmsEmailForCarrier } = require('../utils/smsGateway');
const { getSessionService } = require('../services/sessionService');
const { errorResponses } = require('../utils/errorHandler');
const {
  generateBackupCodes,
  verifyBackupCode,
  generateDeviceFingerprint,
  isDeviceTrusted,
  addTrustedDevice,
  maskSecret,
} = require('../utils/twoFactorUtils');

// Security monitoring and failed login tracking constants
const FAILED_LOGIN_ATTEMPTS = new Map(); // In production, use Redis
const MAX_FAILED_ATTEMPTS = process.env.MAX_FAILED_ATTEMPTS || 5;
const LOCKOUT_DURATION = process.env.LOCKOUT_DURATION_MS || 15 * 60 * 1000; // 15 minutes default

// Note: There are two lockout mechanisms:
// 1. IP-based lockout (here): Prevents brute force from same IP
// 2. Database-level lockout (User model): Locks specific user account (2 hours)
const SUSPICIOUS_ACTIVITY_THRESHOLD = 10; // Multiple failed attempts from same IP

// Clear all failed login attempts on server startup
FAILED_LOGIN_ATTEMPTS.clear();
logger.info('Cleared all failed login attempts on server startup');

// Helper function to create session and tokens
async function createSessionAndTokens(user, req) {
  const sessionService = await getSessionService();
  const fingerprint = generateFingerprint(req);

  // Create session
  const session = await sessionService.createSession(user._id.toString(), {
    email: user.email,
    isAdmin: user.isAdmin,
    userType: user.userType,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    fingerprint,
  });

  // Generate tokens
  const tokens = generateTokens(
    {
      userId: user._id,
      isAdmin: user.isAdmin,
      userType: user.userType,
      sessionId: session.sessionId,
    },
    fingerprint
  );

  return { session, tokens };
}

/**
 * Helper function to determine if an email address should have admin privileges
 * @param {string} email - The email address to check
 * @returns {boolean} - True if the email should have admin privileges
 */
function isAdminEmail(email) {
  if (!email) return false;

  // Get admin emails from environment variable, fallback to empty array
  const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
  const adminEmails = adminEmailsEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);

  // Log warning if no admin emails are configured
  if (adminEmails.length === 0) {
    logger.warn('No admin emails configured in ADMIN_EMAILS environment variable');
  }

  return adminEmails.includes(email.toLowerCase());
}

// Register validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail({ gmail_remove_dots: false })
    .trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter'),
  body('firstName')
    .isString()
    .withMessage('First name must be a string')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .isString()
    .withMessage('Last name must be a string')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  body('isAdmin').optional().isBoolean().withMessage('isAdmin must be a boolean value'),
];

// Register
router.post('/register', validate(registerValidation), async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.validatedData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: 'User already exists' } });
    }

    const user = new User({
      email,
      password,
      firstName,
      lastName,
      isAdmin: isAdminEmail(email),
      userType: isAdminEmail(email) ? 'admin' : 'user',
      isActive: false, // User is inactive until 2FA is verified
    });

    // Generate and save 2FA secret
    const secret = otplib.authenticator.generateSecret();
    user.twoFactorSecret = encryptDatabasePassword(secret);

    // Generate backup codes
    const { codes: backupCodes, plaintextCodes } = await generateBackupCodes();
    user.twoFactorBackupCodes = backupCodes;

    await user.save();

    // Respond with QR code for setup
    const otpAuthUrl = otplib.authenticator.keyuri(user.email, 'Mirabel API', secret);
    const qrCodeImage = await qrcode.toDataURL(otpAuthUrl);

    res.status(201).json({
      message: 'User registered. Please scan the QR code and verify to complete setup.',
      userId: user._id,
      qrCode: qrCodeImage,
      maskedSecret: maskSecret(secret), // Only show masked version
      backupCodes: plaintextCodes, // Show backup codes only during setup
      setupToken: crypto.randomBytes(32).toString('hex'), // One-time setup token
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message, stack: error.stack });
    errorResponses.serverError(res, error);
  }
});

// New endpoint to verify and activate user
router.post('/register/verify', async (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res
      .status(400)
      .json({ error: { code: 'BAD_REQUEST', message: 'User ID and token are required' } });
  }

  try {
    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found or registration incomplete.' },
      });
    }

    const decryptedSecret = decryptDatabasePassword(user.twoFactorSecret);
    const isValid = otplib.authenticator.check(token, decryptedSecret);

    if (isValid) {
      user.isActive = true;
      user.twoFactorEnabledAt = new Date();
      await user.save();

      // Log registration
      await UserLog.create({
        userId: user._id,
        email: user.email,
        action: 'register',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Issue tokens and create session
      const { session, tokens } = await createSessionAndTokens(user, req);

      res.status(200).json({
        message: 'Account activated successfully!',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionId: session.sessionId,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
        },
      });
    } else {
      res.status(400).json({ message: 'Invalid 2FA token.' });
    }
  } catch (error) {
    errorResponses.serverError(res, error);
  }
});

// New endpoint for setting up account from invitation
router.post('/setup-account', authController.setupAccount);

// Import auth middleware for protected auth routes
const { authMiddleware } = require('../middleware/auth');

// Add the new update-password route
// Note: Authentication is handled at app level, but this route needs explicit auth
router.post('/update-password', authMiddleware, authController.updatePassword);

// Verify 2FA token during initial setup (activates account)
router.post('/2fa/setup-verify', async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) {
    return res
      .status(400)
      .json({ error: { code: 'BAD_REQUEST', message: 'Email and token are required' } });
  }

  try {
    const user = await User.findOne({ email }).select('+twoFactorSecret +twoFactorOTP.code');
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication failed. User not found.' },
      });
    }

    if (!user.twoFactorSecret) {
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: '2FA setup not found for this account.' } });
    }

    let decryptedSecret;
    try {
      decryptedSecret = decryptDatabasePassword(user.twoFactorSecret);
    } catch (decryptError) {
      logger.error('Failed to decrypt 2FA secret during setup verification', {
        userId: user._id,
        email: user.email,
        error: decryptError.message,
      });
      // Clear corrupted 2FA data
      await User.findByIdAndUpdate(user._id, {
        $unset: {
          twoFactorSecret: 1,
          twoFactorEnabledAt: 1,
        },
        $set: { twoFactorBackupCodes: [] },
      });
      return res.status(400).json({
        error: {
          code: 'TWO_FACTOR_CORRUPTED',
          message: 'Your 2FA setup is corrupted and has been reset. Please set up 2FA again.',
        },
      });
    }

    // Validate either TOTP from authenticator or fallback email/SMS OTP
    let isValid = otplib.authenticator.check(String(token).trim(), decryptedSecret);

    if (!isValid && user.twoFactorOTP && user.twoFactorOTP.code && user.twoFactorOTP.expiresAt) {
      const now = new Date();
      if (now <= new Date(user.twoFactorOTP.expiresAt)) {
        const bcrypt = require('bcryptjs');
        const otpValid = await bcrypt.compare(String(token).trim(), user.twoFactorOTP.code);
        if (otpValid) {
          isValid = true;
          // Invalidate OTP after successful use
          user.twoFactorOTP = undefined;
          await user.save();
        } else {
          // Increment OTP attempts
          user.twoFactorOTP.attempts = (user.twoFactorOTP.attempts || 0) + 1;
          await user.save();
        }
      }
    }

    if (isValid) {
      // Token is valid, activate account and grant access
      user.isActive = true;
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens and create session for the newly activated user
      const { session, tokens } = await createSessionAndTokens(user, req);

      // Log the successful 2FA setup completion
      await UserLog.create({
        userId: user._id,
        email: user.email,
        action: 'login-2fa-setup',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
        details: { authMethod: 'local-2fa-setup' },
      });

      return res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 14400,
        token: tokens.accessToken,
        sessionId: session.sessionId,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          userType: user.userType,
          isActive: true,
          lastLogin: user.lastLogin,
        },
      });
    } else {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid 2FA token.' } });
    }
  } catch (error) {
    logger.error('2FA setup verification error', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Verify 2FA token during login (Now mandatory)
router.post('/2fa/verify', async (req, res) => {
  const { email, token, trustDevice } = req.body;
  if (!email || !token) {
    return res
      .status(400)
      .json({ error: { code: 'BAD_REQUEST', message: 'Email and token are required' } });
  }

  try {
    const user = await User.findOne({ email }).select(
      '+twoFactorSecret +twoFactorBackupCodes +trustedDevices +twoFactorOTP.code'
    );
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication failed. User not found.' },
      });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: '2FA is not properly configured for this account.',
        },
      });
    }

    // Check if device is trusted
    const deviceFingerprint = generateDeviceFingerprint(req);
    const deviceTrusted = isDeviceTrusted(deviceFingerprint, user.trustedDevices);

    let isValid = false;

    // Skip 2FA check if device is trusted and user indicates so
    if (deviceTrusted && token === 'TRUSTED_DEVICE') {
      isValid = true;
      logger.info('Login with trusted device', { userId: user._id, email: user.email });
    } else {
      // First try regular TOTP token
      try {
        const decryptedSecret = decryptDatabasePassword(user.twoFactorSecret);
        isValid = otplib.authenticator.check(token, decryptedSecret);
      } catch (decryptError) {
        logger.error('Failed to decrypt 2FA secret - encryption key may have changed', {
          userId: user._id,
          email: user.email,
          error: decryptError.message,
        });

        // If decryption fails, user needs to reset 2FA
        return res.status(400).json({
          error: {
            code: 'TWO_FACTOR_RESET_REQUIRED',
            message:
              'Your 2FA setup is corrupted and needs to be reset. Please contact an administrator or disable 2FA to continue.',
          },
        });
      }

      // If TOTP still not valid, try email/SMS OTP if one exists and not expired
      if (!isValid && user.twoFactorOTP && user.twoFactorOTP.code && user.twoFactorOTP.expiresAt) {
        const now = new Date();
        if (now <= new Date(user.twoFactorOTP.expiresAt)) {
          const bcrypt = require('bcryptjs');
          const otpValid = await bcrypt.compare(String(token).trim(), user.twoFactorOTP.code);
          if (otpValid) {
            isValid = true;
            // Invalidate OTP after successful use
            user.twoFactorOTP = undefined;
            await user.save();
          } else {
            // Increment OTP attempts (lockout logic can be expanded later)
            user.twoFactorOTP.attempts = (user.twoFactorOTP.attempts || 0) + 1;
            await user.save();
          }
        }
      }

      // If TOTP fails, try backup codes
      if (!isValid && user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
        const backupResult = await verifyBackupCode(token, user.twoFactorBackupCodes);
        if (backupResult.valid) {
          isValid = true;
          // Mark backup code as used
          user.twoFactorBackupCodes[backupResult.codeIndex].used = true;
          user.twoFactorBackupCodes[backupResult.codeIndex].usedAt = new Date();
          await user.save();

          logger.info('Backup code used for 2FA', {
            userId: user._id,
            remainingCodes: user.twoFactorBackupCodes.filter(c => !c.used).length,
          });
        }
      }
    }

    if (isValid) {
      // Add device to trusted list if requested
      if (trustDevice && !deviceTrusted) {
        await addTrustedDevice(user, deviceFingerprint, req.headers['user-agent']);
        logger.info('Device added to trusted list', { userId: user._id });
      }
      // Token is valid, grant access and create session
      const { session, tokens } = await createSessionAndTokens(user, req);

      user.lastLogin = new Date();
      await user.save();

      // Log the successful 2FA login
      await UserLog.create({
        userId: user._id,
        email: user.email,
        action: 'login-2fa',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
        details: { authMethod: 'local-2fa' },
      });

      return res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 14400,
        token: tokens.accessToken,
        sessionId: session.sessionId,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          userType: user.userType,
          isActive: true,
          lastLogin: user.lastLogin,
        },
      });
    } else {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid 2FA token.' } });
    }
  } catch (error) {
    errorResponses.serverError(res, error);
  }
});

// Request a one-time code by email or SMS as an alternative 2FA method
router.post('/2fa/request-otp', async (req, res) => {
  try {
    const { email, method, carrier } = req.body; // method: 'email' | 'sms'
    if (!email || !method || !['email', 'sms'].includes(method)) {
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: 'Email and valid method are required' } });
    }

    const user = await User.findOne({ email }).select('+twoFactorSecret +twoFactorOTP.code');
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    if (!user.twoFactorSecret) {
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: '2FA is not enabled for this account' } });
    }

    // Basic rate limiting: allow resend every 60 seconds
    const now = new Date();
    if (user.twoFactorOTP?.lastSentAt && now - new Date(user.twoFactorOTP.lastSentAt) < 60 * 1000) {
      return res.status(429).json({ message: 'Please wait before requesting another code.' });
    }

    // Generate a 6-digit numeric code
    const code = '' + Math.floor(100000 + Math.random() * 900000);
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(code, 10);

    // Save OTP metadata on user
    user.twoFactorOTP = {
      code: hash,
      method,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
      lastSentAt: now,
    };
    await user.save();

    let delivery = { ok: true, via: method };
    try {
      if (method === 'email') {
        const subject = 'Your Mirabel login code';
        const html = `<p>Your verification code is:</p><p style=\"font-size:24px;font-weight:bold;letter-spacing:4px;\">${code}</p><p>This code expires in 10 minutes.</p>`;
        await sendEmail({ to: user.email, subject, html });
      } else if (method === 'sms') {
        if (user.phone) {
          await sendSMS({
            to: user.phone,
            body: `Your Mirabel verification code is ${code}. It expires in 10 minutes.`,
          });
        } else {
          const smsEmail = getSmsEmailForCarrier(user.phone, carrier || user.phoneCarrier);
          if (smsEmail) {
            const subject = '';
            const html = `${code} (Mirabel verification code, expires in 10 minutes.)`;
            await sendEmail({ to: smsEmail, subject, html });
            delivery.via = 'sms-gateway';
          } else {
            delivery.ok = false;
            delivery.error = 'No phone or carrier available for SMS.';
          }
        }
      }
    } catch (sendErr) {
      delivery.ok = false;
      delivery.error = sendErr?.message || 'Send failed';
      logger.warn('OTP delivery failed', { email: user.email, method, error: delivery.error });
    }

    await UserLog.create({
      userId: user._id,
      email: user.email,
      action: 'otp-send',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { method, delivery },
    });
    if (process.env.NODE_ENV === 'development') {
      return res.json({ message: 'Verification code issued (dev)', otpDevEcho: code, delivery });
    }
    if (!delivery.ok) {
      return res.status(500).json({ message: 'Failed to send verification code' });
    }
    return res.json({ message: 'Verification code sent' });
  } catch (error) {
    logger.error('2FA OTP request error', { error: error.message });
    return res.status(500).json({ message: 'Failed to send verification code' });
  }
});

// Login with security monitoring
router.post('/login', validate(validationRules.auth.login), async (req, res) => {
  const { email, password } = req.validatedData;
  const originalEmail = req.body.email; // Get original email without normalization
  const ipAddress =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection.remoteAddress ||
    req.ip ||
    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  logger.debug('Login request received', { email: originalEmail });

  try {
    // Security: Check if account is locked due to failed attempts
    const lockoutKey = `${originalEmail}:${ipAddress}`;
    const attempts = FAILED_LOGIN_ATTEMPTS.get(lockoutKey) || [];
    logger.debug('Checking IP-based lockout', { key: lockoutKey, attempts: attempts.length });

    // Check for account lockout based on failed attempts
    if (isAccountLocked(originalEmail, ipAddress)) {
      logger.info('Account locked due to failed attempts');
      await trackFailedLogin(originalEmail, ipAddress, userAgent);
      return res.status(423).json({
        message:
          'Account temporarily locked due to multiple failed login attempts. Please try again later.',
        lockoutDuration: LOCKOUT_DURATION / 60000, // Return duration in minutes
      });
    }

    // Check if user exists in MongoDB for LOCAL authentication
    logger.debug('Looking up user in database');
    let user = await User.findOne({ email: originalEmail }).select('+password +twoFactorSecret');

    // If not found with normalized email, try original email
    if (!user && email !== originalEmail) {
      user = await User.findOne({ email: originalEmail }).select('+password +twoFactorSecret');
    }

    // If user not found, authentication fails
    if (!user) {
      logger.debug('User not found');
      await trackFailedLogin(originalEmail, ipAddress, userAgent);
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
    }

    if (!user.password && user.accountSetupToken) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message:
            'Account setup not complete. Please check your email for the setup link to create your password.',
        },
      });
    }

    // Check if account is locked at the database level
    logger.debug('User lockout check', {
      lockUntil: user.lockUntil,
      loginAttempts: user.loginAttempts,
      isLocked: user.isLocked,
    });

    // Check if account is locked at the database level
    if (user.isLocked) {
      logger.info('User account is locked');
      await trackFailedLogin(originalEmail, ipAddress, userAgent);
      return res.status(423).json({
        message:
          'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      await trackFailedLogin(originalEmail, ipAddress, userAgent);
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Account is not active. Please contact an administrator.',
        },
      });
    }

    // MongoDB authentication
    if (user.password) {
      // Check password against stored hash using the model's method
      const isMatch = await user.comparePassword(password);

      if (isMatch) {
        // Reset failed login attempts on successful login
        if (user.loginAttempts > 0) {
          await user.resetLoginAttempts();
        }

        // Clear failed attempts tracking
        clearFailedAttempts(originalEmail, ipAddress);

        // 2FA Check - Allow admin bypass for development
        logger.info('2FA Check', {
          userId: user._id,
          email: user.email,
          hasTwoFactorSecret: !!user.twoFactorSecret,
          isAdmin: user.isAdmin,
          nodeEnv: process.env.NODE_ENV,
          shouldBypass: user.isAdmin && process.env.NODE_ENV === 'development',
        });

        if (user.twoFactorSecret) {
          // Check if device is trusted before requiring 2FA
          const deviceFingerprint = generateDeviceFingerprint(req);
          const userWithTrustedDevices = await User.findOne({ email: originalEmail }).select(
            '+trustedDevices'
          );
          const deviceTrusted = isDeviceTrusted(
            deviceFingerprint,
            userWithTrustedDevices.trustedDevices
          );

          if (deviceTrusted) {
            // Device is trusted, skip 2FA and log in directly
            logger.info('Login with trusted device, skipping 2FA', {
              userId: user._id,
              email: user.email,
            });

            // Generate tokens and create session
            const { session, tokens } = await createSessionAndTokens(user, req);

            // Update last login and device last used
            user.lastLogin = new Date();
            await user.save();

            // Update device last used time
            await addTrustedDevice(
              userWithTrustedDevices,
              deviceFingerprint,
              req.headers['user-agent']
            );

            // Log successful login
            await UserLog.create({
              userId: user._id,
              email: user.email,
              action: 'login',
              ipAddress,
              userAgent,
              details: { method: 'trusted_device' },
            });

            logger.info('Trusted device login successful', {
              userId: user._id,
              email: user.email,
              ipAddress,
            });

            return res.json({
              user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isAdmin: user.isAdmin,
                userType: user.userType,
                isActive: true,
                lastLogin: user.lastLogin,
              },
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresIn: 14400,
              token: tokens.accessToken,
              sessionId: session.sessionId,
            });
          }

          // Device not trusted, prompt for 2FA token
          logger.info('User has 2FA secret, requiring 2FA token');
          return res.status(200).json({
            twoFactorRequired: true,
            email: user.email,
          });
        } else if (user.isAdmin && process.env.NODE_ENV === 'development') {
          // Allow admin users to bypass 2FA in development
          logger.info('Admin user bypassing 2FA requirement in development', {
            userId: user._id,
            email: user.email,
          });

          // Generate tokens and create session for admin
          const { tokens } = await createSessionAndTokens(user, req);

          // Update last login
          user.lastLogin = new Date();
          await user.save();

          // Log successful login
          await UserLog.create({
            userId: user._id,
            email: user.email,
            action: 'login',
            ipAddress,
            userAgent,
            details: { method: 'admin_bypass_2fa' },
          });

          logger.info('Admin login successful (2FA bypassed)', {
            userId: user._id,
            email: user.email,
            ipAddress,
          });

          res.json({
            user: {
              id: user._id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              isAdmin: user.isAdmin,
              roles: user.roles,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
          return;
        } else {
          // Regular user, force 2FA setup
          const secret = otplib.authenticator.generateSecret();
          user.twoFactorSecret = encryptDatabasePassword(secret);

          // Generate backup codes
          const { codes: backupCodes, plaintextCodes } = await generateBackupCodes();
          user.twoFactorBackupCodes = backupCodes;

          await user.save();

          const otpAuthUrl = otplib.authenticator.keyuri(user.email, 'Mirabel API', secret);
          const qrCodeImage = await qrcode.toDataURL(otpAuthUrl);

          return res.status(200).json({
            setupTwoFactorRequired: true,
            email: user.email,
            qrCode: qrCodeImage,
            secret, // provide manual entry key during setup
            backupCodes: plaintextCodes, // Show backup codes only during setup
            setupToken: crypto.randomBytes(32).toString('hex'), // One-time setup token
          });
        }
      } else {
        // Increment failed login attempts
        await user.incrementLoginAttempts();
        await trackFailedLogin(originalEmail, ipAddress, userAgent);

        return res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
      }
    } else {
      // User has no password set
      await trackFailedLogin(originalEmail, ipAddress, userAgent);
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
    }
  } catch (error) {
    logger.error('Login error:', error);
    await trackFailedLogin(originalEmail, ipAddress, userAgent);

    // Show detailed error in development
    if (process.env.NODE_ENV === 'development') {
      res.status(500).json({
        message: 'Login failed. Please try again.',
        error: error.message,
        stack: error.stack,
      });
    } else {
      res.status(500).json({ message: 'Login failed. Please try again.' });
    }
  }
});

// Refresh token validation rules
const refreshTokenValidation = [
  body('token').optional().isJWT().withMessage('Invalid token format'),
];

// Security monitoring and failed login tracking functions

// Track failed login attempt
const trackFailedLogin = async (email, ipAddress, userAgent) => {
  const key = `${email}:${ipAddress}`;
  const now = Date.now();

  if (!FAILED_LOGIN_ATTEMPTS.has(key)) {
    FAILED_LOGIN_ATTEMPTS.set(key, []);
  }

  const attempts = FAILED_LOGIN_ATTEMPTS.get(key);
  attempts.push(now);

  // Clean old attempts (older than lockout duration)
  const recentAttempts = attempts.filter(timestamp => now - timestamp < LOCKOUT_DURATION);
  FAILED_LOGIN_ATTEMPTS.set(key, recentAttempts);

  // Log failed login attempt
  try {
    await UserLog.create({
      email,
      action: 'failed_login',
      ipAddress,
      userAgent,
      timestamp: new Date(),
      details: {
        attemptCount: recentAttempts.length,
        suspicious: recentAttempts.length >= SUSPICIOUS_ACTIVITY_THRESHOLD,
      },
    });
  } catch (error) {
    logger.error('Error logging failed login', { error: error.message });
  }

  return recentAttempts.length;
};

// Check if account is locked
const isAccountLocked = (email, ipAddress) => {
  const key = `${email}:${ipAddress}`;
  const attempts = FAILED_LOGIN_ATTEMPTS.get(key) || [];
  const now = Date.now();

  const recentAttempts = attempts.filter(timestamp => now - timestamp < LOCKOUT_DURATION);
  return recentAttempts.length >= MAX_FAILED_ATTEMPTS;
};

// Clear failed attempts on successful login
const clearFailedAttempts = (email, ipAddress) => {
  const key = `${email}:${ipAddress}`;
  FAILED_LOGIN_ATTEMPTS.delete(key);
};

// Refresh token with enhanced security
router.post('/refresh', validate(refreshTokenValidation), async (req, res) => {
  try {
    const refreshToken = req.headers.authorization?.split(' ')[1] || req.body.refreshToken;
    if (!refreshToken) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'No refresh token provided' } });
    }

    // Validate the refresh token
    try {
      const decoded = validateToken(refreshToken);

      // Verify it's a refresh token
      if (decoded.type !== 'refresh') {
        return res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token type' } });
      }

      // Blacklist the old refresh token
      blacklistToken(refreshToken);

      // Generate new tokens
      const fingerprint = generateFingerprint(req);
      const tokens = generateTokens(
        {
          userId: decoded.userId,
          isAdmin: decoded.isAdmin,
          userType: decoded.userType,
        },
        fingerprint
      );

      logger.info('Token refresh successful', { userId: decoded.userId });

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 14400, // 4 hours in seconds
      });
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        name: error.name,
      });
      res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
  } catch (error) {
    logger.error('Refresh endpoint error', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

// Backwards compatibility: Legacy token refresh endpoint
router.post('/refresh-legacy', validate(refreshTokenValidation), async (req, res) => {
  try {
    const oldToken = req.headers.authorization?.split(' ')[1] || req.body.token;
    if (!oldToken) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    }

    try {
      // Verify the old token with basic JWT (ignore expiration for refresh)
      const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });

      // Generate new enhanced tokens
      const fingerprint = generateFingerprint(req);
      const tokens = generateTokens(
        {
          userId: decoded.userId,
          isAdmin: decoded.isAdmin,
          userType: decoded.userType,
        },
        fingerprint
      );

      // Also provide legacy token for backwards compatibility
      const legacyToken = jwt.sign(
        {
          userId: decoded.userId,
          isAdmin: decoded.isAdmin,
          userType: decoded.userType,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      logger.info('Legacy token refresh successful', { userId: decoded.userId });

      res.json({
        // New format
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 14400,
        // Backwards compatibility
        token: legacyToken,
      });
    } catch (error) {
      logger.error('Legacy token refresh failed', {
        error: error.message,
        name: error.name,
      });
      res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    logger.error('Legacy refresh endpoint error', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

// Add logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const { token, refreshToken } = req.body;

    // Blacklist both tokens if provided
    if (token) {
      await blacklistToken(token);
    }

    if (refreshToken) {
      await blacklistToken(refreshToken);
    }

    logger.info('User logged out successfully', {
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ message: 'Error during logout' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    // Extract the token from the request headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Authorization header required' } });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }

    const user = await User.findById(decoded.userId).select('-password').populate('roles');
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user profile', { error: error.message });
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Logout endpoint - destroys session and blacklists tokens
router.post('/logout', async (req, res) => {
  try {
    const sessionService = await getSessionService();
    const authHeader = req.headers.authorization;
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;

    // Blacklist tokens if provided
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1];
      await blacklistToken(accessToken);
    }

    if (req.body.refreshToken) {
      await blacklistToken(req.body.refreshToken);
    }

    // Destroy session if provided
    if (sessionId) {
      await sessionService.destroySession(sessionId);
    }

    logger.info('User logged out successfully', { sessionId });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    res.status(500).json({ message: 'Error during logout' });
  }
});

// Logout from all devices - destroys all user sessions
router.post('/logout-all', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await validateToken(token);

    const sessionService = await getSessionService();
    const destroyedCount = await sessionService.destroyAllUserSessions(decoded.userId);

    // TODO: Also blacklist all user's tokens (requires token tracking)

    logger.info('User logged out from all devices', {
      userId: decoded.userId,
      sessionsDestroyed: destroyedCount,
    });

    res.json({
      message: 'Logged out from all devices successfully',
      sessionsDestroyed: destroyedCount,
    });
  } catch (error) {
    logger.error('Logout all error', { error: error.message });
    res.status(500).json({ message: 'Error during logout from all devices' });
  }
});

// Get active sessions for current user
router.get('/sessions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await validateToken(token);

    const sessionService = await getSessionService();
    const sessions = await sessionService.getUserSessions(decoded.userId);

    res.json({ sessions });
  } catch (error) {
    logger.error('Get sessions error', { error: error.message });
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

// Get 2FA status and backup codes info
router.get('/2fa/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await validateToken(token);

    const user = await User.findById(decoded.userId).select(
      '+twoFactorSecret +twoFactorBackupCodes +trustedDevices'
    );

    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const status = {
      enabled: !!user.twoFactorSecret,
      enabledAt: user.twoFactorEnabledAt,
      backupCodesRemaining: user.twoFactorBackupCodes
        ? user.twoFactorBackupCodes.filter(c => !c.used).length
        : 0,
      trustedDevices: user.trustedDevices
        ? user.trustedDevices.map(d => ({
            name: d.name,
            lastUsed: d.lastUsed,
            createdAt: d.createdAt,
            fingerprint: d.fingerprint.substring(0, 8) + '...', // Show partial fingerprint
          }))
        : [],
    };

    res.json(status);
  } catch (error) {
    logger.error('Get 2FA status error', { error: error.message });
    res.status(500).json({ message: 'Error fetching 2FA status' });
  }
});

// Regenerate backup codes
router.post('/2fa/regenerate-backup-codes', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await validateToken(token);

    const user = await User.findById(decoded.userId).select('+twoFactorSecret');

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: '2FA must be enabled to regenerate backup codes' },
      });
    }

    // Generate new backup codes
    const { codes: backupCodes, plaintextCodes } = await generateBackupCodes();
    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    logger.info('Backup codes regenerated', { userId: user._id });

    res.json({
      message: 'Backup codes regenerated successfully',
      backupCodes: plaintextCodes, // Show only once during regeneration
    });
  } catch (error) {
    logger.error('Regenerate backup codes error', { error: error.message });
    res.status(500).json({ message: 'Error regenerating backup codes' });
  }
});

// Remove trusted device
router.delete('/2fa/trusted-devices/:fingerprint', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await validateToken(token);
    const { fingerprint } = req.params;

    const user = await User.findById(decoded.userId).select('+trustedDevices');

    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    // Remove the trusted device
    user.trustedDevices = user.trustedDevices.filter(
      device => !device.fingerprint.startsWith(fingerprint)
    );
    await user.save();

    logger.info('Trusted device removed', { userId: user._id });

    res.json({ message: 'Trusted device removed successfully' });
  } catch (error) {
    logger.error('Remove trusted device error', { error: error.message });
    res.status(500).json({ message: 'Error removing trusted device' });
  }
});

module.exports = router;
