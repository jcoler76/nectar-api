const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // Optional phone number for SMS-based authentication codes
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    // Optional carrier key for email-to-SMS gateway (e.g., 'att', 'verizon')
    phoneCarrier: {
      type: String,
      required: false,
      trim: true,
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    accountSetupToken: {
      type: String,
    },
    accountSetupTokenExpires: {
      type: Date,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorBackupCodes: [
      {
        code: {
          type: String,
          required: true,
        },
        used: {
          type: Boolean,
          default: false,
        },
        usedAt: Date,
      },
    ],
    twoFactorEnabledAt: Date,
    // Ephemeral one-time passcode (OTP) for email/SMS fallback during 2FA
    twoFactorOTP: {
      code: { type: String, select: false }, // bcrypt hash of OTP
      method: { type: String, enum: ['email', 'sms'], required: false },
      expiresAt: { type: Date },
      attempts: { type: Number, default: 0 },
      lastSentAt: { type: Date },
    },
    trustedDevices: [
      {
        fingerprint: String,
        name: String,
        lastUsed: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    lastLogin: {
      type: Date,
    },
    // Security tracking fields
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
    // Notification preferences
    notificationPreferences: {
      inbox: {
        system: {
          type: Boolean,
          default: true,
        },
        workflow: {
          type: Boolean,
          default: true,
        },
        security: {
          type: Boolean,
          default: true,
        },
        user_message: {
          type: Boolean,
          default: true,
        },
      },
      email: {
        system: {
          type: Boolean,
          default: false,
        },
        workflow: {
          type: Boolean,
          default: false,
        },
        security: {
          type: Boolean,
          default: true,
        },
        user_message: {
          type: Boolean,
          default: false,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving with increased security
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    // Use higher salt rounds for better security (12 rounds minimum)
    const saltRounds = process.env.NODE_ENV === 'production' ? 14 : 12;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);

    // Update password changed timestamp
    this.passwordChangedAt = new Date();

    next();
  } catch (error) {
    next(error);
  }
});

// Add password comparison method with timing attack protection
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Account lockout methods
userSchema.methods.incrementLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
